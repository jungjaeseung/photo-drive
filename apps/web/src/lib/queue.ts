import { QUEUE_MEDIA, type MediaJobName } from "@photo-drive/shared";
import { Queue } from "bullmq";
import { getRedisUrl } from "./config";

let queue: Queue | null = null;

export function getMediaQueue(): Queue {
  if (!queue) {
    queue = new Queue(QUEUE_MEDIA, {
      connection: { url: getRedisUrl() },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });
  }
  return queue;
}

export async function enqueueMediaJob(
  name: MediaJobName,
  data: Record<string, unknown>
): Promise<void> {
  const q = getMediaQueue();
  await q.add(name, data, { jobId: `${name}-${data.mediaId}-${Date.now()}` });
}
