import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import { PassThrough } from "node:stream";
import path from "node:path";
import type Archiver from "archiver";

export async function buildZipStream(
  entries: { zipName: string; fullPath: string }[]
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
): Promise<{ zipName: string; fullPath: string }[]> {
  const entries: { zipName: string; fullPath: string }[] = [];

  for (const id of mediaIds) {
    const doc = await getMedia(id);
    if (!doc?.originalPath || doc.status !== "ready") continue;

    const fullPath = path.join(storageRoot, doc.originalPath);
    try {
      await access(fullPath);
    } catch {
      continue;
    }

    entries.push({
      zipName: `${id.slice(0, 8)}_${doc.filename}`,
      fullPath,
    });
  }

  return entries;
}
