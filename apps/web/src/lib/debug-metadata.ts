import { execFile } from "node:child_process";
import { mkdtemp, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import {
  formatKstDateTime,
  getKstDateKey,
  getMediaDir,
  getRelativeMediaPath,
  getSortIso,
  getSortMillis,
  pickTakenAtInOrder,
  type MediaDocument,
} from "@photo-drive/shared";
import exifr from "exifr";
import { v4 as uuidv4 } from "uuid";
import {
  buildInitialMediaDoc,
  computeSha256,
  detectMediaType,
  getExtension,
} from "./upload";

const execFileAsync = promisify(execFile);

const IMAGE_EXIF_DATE_KEYS = [
  "DateTimeOriginal",
  "DateTimeDigitized",
  "CreateDate",
  "MetadataDate",
  "DateCreated",
  "ModifyDate",
  "DateTime",
  "FileModifyDate",
  "FileCreateDate",
] as const;

function exifDateCandidates(
  exif: Record<string, unknown> | null
): Record<string, unknown> {
  if (!exif) return {};
  return IMAGE_EXIF_DATE_KEYS.reduce(
    (acc, key) => {
      if (exif[key] != null) acc[key] = exif[key];
      return acc;
    },
    {} as Record<string, unknown>
  );
}

/** EXIF/ffprobe만 참고 — 저장 takenAt은 변경하지 않음 */
function exifTakenAtIfUsed(
  exif: Record<string, unknown> | null,
  fallback: string,
  notAfter: Date
): string | undefined {
  if (!exif) return undefined;
  const candidates: unknown[] = [];
  for (const key of IMAGE_EXIF_DATE_KEYS) {
    if (exif[key] != null) candidates.push(exif[key]);
  }
  for (const [key, value] of Object.entries(exif)) {
    if (/date|time|created|modified|digitized/i.test(key)) {
      candidates.push(value);
    }
  }
  return pickTakenAtInOrder([...candidates, fallback], { notAfter });
}

function ffprobeTakenAtIfUsed(
  probe: {
    format?: { tags?: Record<string, string | undefined> };
    streams?: { tags?: Record<string, string | undefined> }[];
  },
  fallback: string,
  notAfter: Date
): string | undefined {
  const formatTags = probe.format?.tags ?? {};
  const candidates: unknown[] = [
    formatTags.creation_time,
    formatTags["com.apple.quicktime.creationdate"],
    formatTags.date,
  ];
  for (const stream of probe.streams ?? []) {
    if (stream.tags?.creation_time) candidates.push(stream.tags.creation_time);
    if (stream.tags?.date) candidates.push(stream.tags.date);
  }
  return pickTakenAtInOrder([...candidates, fallback], { notAfter });
}

async function ffprobeBuffer(
  buffer: Buffer,
  extension: string
): Promise<{
  format?: { duration?: string; tags?: Record<string, string | undefined> };
  streams?: Array<{
    codec_type?: string;
    codec_name?: string;
    width?: number;
    height?: number;
    tags?: Record<string, string | undefined>;
  }>;
} | null> {
  const dir = await mkdtemp(path.join(tmpdir(), "photo-drive-debug-"));
  const filePath = path.join(dir, `probe.${extension}`);
  try {
    await writeFile(filePath, buffer);
    const { stdout } = await execFileAsync("ffprobe", [
      "-v",
      "quiet",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      filePath,
    ]);
    return JSON.parse(stdout);
  } catch {
    return null;
  } finally {
    await unlink(filePath).catch(() => {});
  }
}

export interface DebugMetadataPreview {
  note: string;
  file: {
    name: string;
    mimeType: string;
    size: number;
    lastModified: number;
    lastModifiedIso: string;
  };
  initialDocument: MediaDocument;
  previewPaths: { storageRoot: string; dir: string; relativeOriginal: string };
  /** 워커 후 ES 스냅샷 (takenAt/sortAt 유지) */
  afterWorker: Record<string, unknown> | null;
  workerError?: string;
  displaySort: {
    sortIsoUtc: string;
    sortMillis: number;
    kstLabel: string;
    kstDateKey: string;
  };
}

export async function previewUploadMetadata(params: {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  fileLastModified: number;
}): Promise<DebugMetadataPreview> {
  const mediaType = detectMediaType(params.mimeType);
  if (!mediaType) {
    throw new Error(`unsupported media type: ${params.mimeType}`);
  }

  const mediaId = uuidv4();
  const uploadedAt = new Date();
  const extension = getExtension(params.filename, params.mimeType);
  const sha256 = computeSha256(params.buffer);
  const storageRoot = process.env.STORAGE_ROOT ?? "/mnt/extra/photo-drive";
  const dir = getMediaDir(storageRoot, uploadedAt, mediaId);
  const relativeOriginalPath = getRelativeMediaPath(
    uploadedAt,
    mediaId,
    `original.${extension}`
  );

  const initialDocument = buildInitialMediaDoc({
    id: mediaId,
    type: mediaType,
    filename: params.filename,
    mimeType: params.mimeType,
    extension,
    size: params.buffer.length,
    sha256,
    relativeOriginalPath,
    uploadedAt,
    fileLastModified: params.fileLastModified,
  });

  let afterWorker: Record<string, unknown> | null = null;
  let workerError: string | undefined;

  if (mediaType === "image") {
    try {
      const exif = (await exifr
        .parse(params.buffer, {
          reviveValues: true,
          tiff: true,
          exif: true,
          xmp: true,
        })
        .catch(() => null)) as Record<string, unknown> | null;

      const exifWouldBe = exifTakenAtIfUsed(
        exif,
        initialDocument.takenAt,
        uploadedAt
      );

      afterWorker = {
        status: "ready",
        takenAt: initialDocument.takenAt,
        sortAt: initialDocument.sortAt,
        takenAtDateKst: initialDocument.takenAtDateKst,
        note: "takenAt/sortAt는 업로드 값 유지 (EXIF로 덮어쓰지 않음)",
        exifReference: {
          dateCandidates: exifDateCandidates(exif),
          wouldBeTakenAtIfOldLogic: exifWouldBe,
          wouldBeTakenAtKst: exifWouldBe
            ? formatKstDateTime(exifWouldBe)
            : undefined,
        },
        exif: exif ?? undefined,
      };
    } catch (e) {
      workerError = String(e);
    }
  } else {
    const probe = await ffprobeBuffer(params.buffer, extension);
    if (probe) {
      const videoStream = probe.streams?.find((s) => s.codec_type === "video");
      const ffWouldBe = ffprobeTakenAtIfUsed(
        probe,
        initialDocument.takenAt,
        uploadedAt
      );

      afterWorker = {
        status: "ready",
        takenAt: initialDocument.takenAt,
        sortAt: initialDocument.sortAt,
        takenAtDateKst: initialDocument.takenAtDateKst,
        note: "takenAt/sortAt는 업로드 값 유지 (ffprobe로 덮어쓰지 않음)",
        ffprobeReference: {
          wouldBeTakenAtIfOldLogic: ffWouldBe,
          wouldBeTakenAtKst: ffWouldBe
            ? formatKstDateTime(ffWouldBe)
            : undefined,
          formatTags: probe.format?.tags,
          streamTags: probe.streams
            ?.filter((s) => s.codec_type === "video")
            .map((s) => s.tags),
        },
        duration: probe.format?.duration
          ? parseFloat(probe.format.duration)
          : undefined,
        width: videoStream?.width,
        height: videoStream?.height,
        codec: videoStream?.codec_name,
      };
    } else {
      workerError = "ffprobe unavailable (install ffmpeg on server)";
      afterWorker = {
        status: "ready",
        takenAt: initialDocument.takenAt,
        sortAt: initialDocument.sortAt,
        note: workerError,
      };
    }
  }

  const sortIsoUtc = getSortIso(initialDocument);
  const sortMillis = getSortMillis(initialDocument);

  return {
    note: "저장·ES 인덱싱·워커 큐 없음. takenAt은 file.lastModified(UTC), 표시는 KST.",
    file: {
      name: params.filename,
      mimeType: params.mimeType,
      size: params.buffer.length,
      lastModified: params.fileLastModified,
      lastModifiedIso:
        params.fileLastModified > 0
          ? new Date(params.fileLastModified).toISOString()
          : "(없음)",
    },
    initialDocument,
    previewPaths: {
      storageRoot,
      dir,
      relativeOriginal: relativeOriginalPath,
    },
    afterWorker,
    workerError,
    displaySort: {
      sortIsoUtc,
      sortMillis,
      kstLabel: formatKstDateTime(sortIsoUtc),
      kstDateKey: getKstDateKey(sortIsoUtc),
    },
  };
}
