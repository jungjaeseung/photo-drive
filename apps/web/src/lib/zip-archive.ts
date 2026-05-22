import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import { PassThrough } from "node:stream";
import path from "node:path";
import type Archiver from "archiver";

export interface ZipEntry {
  zipName: string;
  fullPath: string;
  size: number;
}

export function sumZipEntryBytes(entries: ZipEntry[]): number {
  return entries.reduce((sum, e) => sum + e.size, 0);
}

/** ZIP 안에서 파일명이 겹치면 `이름 (2).ext` 형식으로 구분 */
export function uniqueZipEntryName(filename: string, used: Set<string>): string {
  const ext = path.extname(filename);
  const stem = ext ? filename.slice(0, -ext.length) : filename;
  let candidate = filename;
  let n = 2;

  while (used.has(candidate)) {
    candidate = `${stem} (${n})${ext}`;
    n += 1;
  }

  used.add(candidate);
  return candidate;
}

export async function buildZipStream(
  entries: Pick<ZipEntry, "zipName" | "fullPath">[]
): Promise<PassThrough> {
  const archiver = (await import("archiver")).default;
  const archive: Archiver.Archiver = archiver("zip", { zlib: { level: 5 } });
  const passThrough = new PassThrough();

  archive.pipe(passThrough);
  archive.on("error", (err: Error) => passThrough.destroy(err));

  for (const { zipName, fullPath } of entries) {
    archive.append(createReadStream(fullPath), { name: zipName });
  }

  void archive.finalize();
  return passThrough;
}

export async function collectZipEntries(
  storageRoot: string,
  mediaIds: string[],
  getMedia: (id: string) => Promise<{
    originalPath?: string;
    status: string;
    filename: string;
  } | null>
): Promise<ZipEntry[]> {
  const entries: ZipEntry[] = [];
  const usedNames = new Set<string>();

  for (const mediaId of mediaIds) {
    const doc = await getMedia(mediaId);
    if (!doc?.originalPath || doc.status !== "ready") continue;

    const fullPath = path.join(storageRoot, doc.originalPath);
    try {
      await access(fullPath);
      const { size } = await stat(fullPath);
      const zipName = uniqueZipEntryName(
        path.basename(doc.filename),
        usedNames
      );
      entries.push({
        zipName,
        fullPath,
        size,
      });
    } catch {
      continue;
    }
  }

  return entries;
}
