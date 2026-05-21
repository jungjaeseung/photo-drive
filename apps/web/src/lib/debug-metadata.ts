import { execFile } from "node:child_process";
import { mkdtemp, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import {
  computeSortAt,
  getEffectiveSortIso,
  getEffectiveSortMillis,
  getMediaDir,
  getRelativeMediaPath,
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
  "SubSecDateTimeOriginal",
  "SubSecCreateDate",
  "SubSecDateTimeDigitized",
] as const;

function takenAtFromExif(
  exif: Record<string, unknown> | null | undefined,
  fallback: string,
  notAfter: Date
): string {
  if (!exif) return fallback;

  const candidates: unknown[] = [];
  const seen = new Set<unknown>();

  function add(value: unknown) {
    if (value == null || seen.has(value)) return;
    seen.add(value);
    candidates.push(value);
  }

  for (const key of IMAGE_EXIF_DATE_KEYS) {
    add(exif[key]);
  }

  for (const [key, value] of Object.entries(exif)) {
    if (/date|time|created|modified|digitized/i.test(key)) {
      add(value);
    }
  }

  return pickTakenAtInOrder([...candidates, fallback], { notAfter }) ?? fallback;
}

function takenAtFromFfprobe(
  probe: {
    format?: { tags?: Record<string, string | undefined> };
    streams?: { tags?: Record<string, string | undefined> }[];
  },
  fallback: string,
  notAfter: Date
): string {
  const formatTags = probe.format?.tags ?? {};
  const streamDates: unknown[] = [];
  for (const stream of probe.streams ?? []) {
    if (stream.tags?.creation_time) streamDates.push(stream.tags.creation_time);
    if (stream.tags?.date) streamDates.push(stream.tags.date);
  }

  const candidates: unknown[] = [
    formatTags.creation_time,
    formatTags["com.apple.quicktime.creationdate"],
    formatTags.date,
    formatTags["DATE"],
    ...streamDates,
    fallback,
  ];

  for (const [key, value] of Object.entries(formatTags)) {
    if (/date|time|created/i.test(key) && value) candidates.push(value);
  }
  for (const stream of probe.streams ?? []) {
    for (const [key, value] of Object.entries(stream.tags ?? {})) {
      if (/date|time|created/i.test(key) && value) candidates.push(value);
    }
  }

  return pickTakenAtInOrder(candidates, { notAfter }) ?? fallback;
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
  /** 업로드 API 직후 ES에 넣을 문서 (실제 저장 안 함) */
  initialDocument: MediaDocument;
  /** 저장 시 사용될 경로 미리보기 */
  previewPaths: { storageRoot: string; dir: string; relativeOriginal: string };
  /** 워커 processImage / processVideo 후 예상 필드 */
  afterWorker: Record<string, unknown> | null;
  workerError?: string;
  /** 그리드 정렬에 쓰이는 값 */
  displaySort: {
    effectiveSortIso: string;
    effectiveSortMillis: number;
    kstLabel: string;
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

      const takenAt = takenAtFromExif(
        exif,
        initialDocument.takenAt,
        uploadedAt
      );
      const sortAt = computeSortAt({
        type: "image",
        takenAt,
        uploadedAt: initialDocument.uploadedAt,
        createdAt: initialDocument.createdAt,
        exif: exif ?? undefined,
      });

      afterWorker = {
        status: "ready",
        takenAt,
        sortAt,
        exif: exif ?? undefined,
        exifDateCandidates: IMAGE_EXIF_DATE_KEYS.reduce(
          (acc, key) => {
            if (exif?.[key] != null) acc[key] = exif[key];
            return acc;
          },
          {} as Record<string, unknown>
        ),
      };
    } catch (e) {
      workerError = String(e);
    }
  } else {
    const probe = await ffprobeBuffer(params.buffer, extension);
    if (probe && !("error" in probe)) {
      const videoStream = probe.streams?.find((s) => s.codec_type === "video");
      const takenAt = takenAtFromFfprobe(
        probe,
        initialDocument.takenAt,
        uploadedAt
      );
      const sortAt = computeSortAt({
        type: "video",
        takenAt,
        uploadedAt: initialDocument.uploadedAt,
        createdAt: initialDocument.createdAt,
      });

      afterWorker = {
        status: "ready",
        takenAt,
        sortAt,
        duration: probe.format?.duration
          ? parseFloat(probe.format.duration)
          : undefined,
        width: videoStream?.width,
        height: videoStream?.height,
        codec: videoStream?.codec_name,
        ffprobeFormatTags: probe.format?.tags,
        ffprobeStreamTags: probe.streams
          ?.filter((s) => s.codec_type === "video")
          .map((s) => s.tags),
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

  const docForSort = afterWorker
    ? {
        type: mediaType,
        takenAt: String(afterWorker.takenAt),
        uploadedAt: initialDocument.uploadedAt,
        createdAt: initialDocument.createdAt,
        sortAt: afterWorker.sortAt as string | undefined,
        exif: afterWorker.exif as Record<string, unknown> | undefined,
      }
    : initialDocument;

  const effectiveSortIso = getEffectiveSortIso(docForSort);
  const effectiveSortMillis = getEffectiveSortMillis(docForSort);

  return {
    note: "저장·ES 인덱싱·워커 큐 없음. 미리보기만 합니다.",
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
      effectiveSortIso,
      effectiveSortMillis,
      kstLabel: new Date(effectiveSortMillis).toLocaleString("ko-KR", {
        timeZone: "Asia/Seoul",
        dateStyle: "medium",
        timeStyle: "medium",
      }),
    },
  };
}
