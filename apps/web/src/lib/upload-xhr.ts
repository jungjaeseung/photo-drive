export type UploadXhrResult =
  | { ok: true; mediaId: string }
  | { ok: false; duplicate: true }
  | { ok: false; duplicate: false; message: string };

export interface UploadXhrOptions {
  onProgress?: (percent: number) => void;
}

export function uploadMediaFile(
  file: File,
  options: UploadXhrOptions = {}
): Promise<UploadXhrResult> {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);
    if (file.lastModified > 0) {
      formData.append("fileLastModified", String(file.lastModified));
    }

    xhr.upload.addEventListener("progress", (e) => {
      if (!e.lengthComputable || !options.onProgress) return;
      const percent = Math.round((e.loaded / e.total) * 100);
      options.onProgress(Math.min(100, Math.max(0, percent)));
    });

    xhr.addEventListener("load", () => {
      if (xhr.status === 409) {
        resolve({ ok: false, duplicate: true });
        return;
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        let message = "upload failed";
        try {
          const data = JSON.parse(xhr.responseText) as { error?: string };
          if (data.error) message = data.error;
        } catch {
          /* ignore */
        }
        resolve({ ok: false, duplicate: false, message });
        return;
      }
      try {
        const data = JSON.parse(xhr.responseText) as { mediaId?: string };
        if (data.mediaId) {
          resolve({ ok: true, mediaId: data.mediaId });
        } else {
          resolve({ ok: false, duplicate: false, message: "missing mediaId" });
        }
      } catch {
        reject(new Error("invalid response"));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("network error")));
    xhr.addEventListener("abort", () => reject(new Error("upload aborted")));

    xhr.open("POST", `${base}/api/media/upload`);
    xhr.send(formData);
  });
}
