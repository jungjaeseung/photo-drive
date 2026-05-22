export type MediaJobName =
  | "processImage"
  | "processVideo"
  | "deleteMedia"
  | "notifyUploadBatch";

export interface NotifyUploadBatchJobData {
  batchId: string;
  count: number;
}

export interface ProcessImageJobData {
  mediaId: string;
  storageRoot: string;
}

export interface ProcessVideoJobData {
  mediaId: string;
  storageRoot: string;
}

export interface DeleteMediaJobData {
  mediaId: string;
  storageRoot: string;
}

export type MediaJobData =
  | ProcessImageJobData
  | ProcessVideoJobData
  | DeleteMediaJobData
  | NotifyUploadBatchJobData;
