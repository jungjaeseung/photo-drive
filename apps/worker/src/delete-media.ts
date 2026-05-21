import { rm } from "node:fs/promises";
import path from "node:path";
import { getMediaById, deleteMediaDoc } from "./es.js";
import { getStorageRoot } from "./config.js";

export async function deleteMedia(mediaId: string, storageRoot?: string): Promise<void> {
  const root = storageRoot ?? getStorageRoot();
  const doc = await getMediaById(mediaId);
  if (!doc) return;

  const mediaDir = path.join(root, path.dirname(doc.originalPath));
  try {
    await rm(mediaDir, { recursive: true, force: true });
  } catch (error) {
    console.warn(`Failed to remove ${mediaDir}:`, error);
  }

  await deleteMediaDoc(mediaId);
}
