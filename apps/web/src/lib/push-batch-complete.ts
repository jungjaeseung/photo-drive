import { getMediaQueue } from "@/lib/queue";

export async function finalizeUploadBatch(
  batchId: string,
  expectedCount: number
): Promise<void> {
  if (expectedCount <= 0) return;
  const q = getMediaQueue();
  await q.add(
    "notifyUploadBatch",
    { batchId, count: expectedCount },
    {
      jobId: `notifyUploadBatch-${batchId}`,
      removeOnComplete: true,
      removeOnFail: 50,
    }
  );
}
