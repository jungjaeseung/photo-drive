import { QUEUE_MEDIA } from "@photo-drive/shared";
import { Worker } from "bullmq";
import { getRedisUrl } from "./config.js";
import { processImage } from "./process-image.js";
import { processVideo } from "./process-video.js";
import { deleteMedia } from "./delete-media.js";
import { finalizeUploadBatch } from "./push-notify.js";

const connection = { url: getRedisUrl() };

const worker = new Worker(
  QUEUE_MEDIA,
  async (job) => {
    switch (job.name) {
      case "processImage": {
        const { mediaId, storageRoot } = job.data as {
          mediaId: string;
          storageRoot?: string;
        };
        await processImage(mediaId, storageRoot);
        break;
      }
      case "processVideo": {
        const { mediaId, storageRoot } = job.data as {
          mediaId: string;
          storageRoot?: string;
        };
        await processVideo(mediaId, storageRoot);
        break;
      }
      case "deleteMedia": {
        const { mediaId, storageRoot } = job.data as {
          mediaId: string;
          storageRoot?: string;
        };
        await deleteMedia(mediaId, storageRoot);
        break;
      }
      case "notifyUploadBatch": {
        const { batchId, count } = job.data as {
          batchId: string;
          count: number;
        };
        await finalizeUploadBatch(batchId, count);
        break;
      }
      default:
        throw new Error(`Unknown job: ${job.name}`);
    }
  },
  {
    connection,
    concurrency: 2,
  }
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} (${job.name}) completed`);
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} (${job?.name}) failed:`, err);
});

console.log("Photo Drive worker started");
