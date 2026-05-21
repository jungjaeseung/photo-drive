import { QUEUE_MEDIA } from "@photo-drive/shared";
import { Worker } from "bullmq";
import { getRedisUrl } from "./config.js";
import { processImage } from "./process-image.js";
import { processVideo } from "./process-video.js";
import { deleteMedia } from "./delete-media.js";

const connection = { url: getRedisUrl() };

const worker = new Worker(
  QUEUE_MEDIA,
  async (job) => {
    const { mediaId, storageRoot } = job.data as {
      mediaId: string;
      storageRoot?: string;
    };

    switch (job.name) {
      case "processImage":
        await processImage(mediaId, storageRoot);
        break;
      case "processVideo":
        await processVideo(mediaId, storageRoot);
        break;
      case "deleteMedia":
        await deleteMedia(mediaId, storageRoot);
        break;
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
