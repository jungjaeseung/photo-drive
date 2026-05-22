import { syncAlbumCover } from "@/lib/album-cover";
import {
  collectAlbumIdsForMediaIds,
  markMediaDeletingBulk,
  refreshMediaIndex,
} from "@/lib/es";
import { getStorageRoot } from "@/lib/config";
import { enqueueMediaJob, enqueueMediaJobsBulk } from "@/lib/queue";

export async function deleteMediaItems(
  mediaIds: string[]
): Promise<{ deleted: number; skipped: number }> {
  const unique = [...new Set(mediaIds.filter(Boolean))];
  if (unique.length === 0) {
    return { deleted: 0, skipped: 0 };
  }

  const { deletableIds, albumIds } = await collectAlbumIdsForMediaIds(unique);
  const skipped = unique.length - deletableIds.length;
  if (deletableIds.length === 0) {
    return { deleted: 0, skipped };
  }

  const deletedAt = new Date().toISOString();
  const storageRoot = getStorageRoot();

  await markMediaDeletingBulk(deletableIds, deletedAt);
  await refreshMediaIndex();

  await Promise.all([...albumIds].map((albumId) => syncAlbumCover(albumId)));

  if (deletableIds.length === 1) {
    await enqueueMediaJob("deleteMedia", {
      mediaId: deletableIds[0],
      storageRoot,
    });
  } else {
    await enqueueMediaJobsBulk(
      "deleteMedia",
      deletableIds.map((mediaId) => ({ mediaId, storageRoot }))
    );
  }

  return { deleted: deletableIds.length, skipped };
}
