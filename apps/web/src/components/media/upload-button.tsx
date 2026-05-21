"use client";

import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { useRef, useState } from "react";

interface UploadButtonProps {
  onUploaded?: () => void;
}

export function UploadButton({ onUploaded }: UploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError(null);

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        if (file.lastModified > 0) {
          formData.append("fileLastModified", String(file.lastModified));
        }
        const res = await fetch(`${getApiBase()}/api/media/upload`, {
          method: "POST",
          body: formData,
        });
        if (res.status === 409) {
          const data = await res.json();
          setError(`중복 파일: 기존 미디어 ${data.existingMediaId}`);
          continue;
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "upload failed");
        }
      }
      onUploaded?.();
    } catch (e) {
      setError(String(e));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Button
        size="icon"
        className="bottom-above-nav fixed right-4 z-50 shadow-lg"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="h-5 w-5" />
      </Button>
      {error && (
        <p className="fixed bottom-32 right-4 max-w-[200px] rounded bg-red-500/90 px-2 py-1 text-xs text-white">
          {error}
        </p>
      )}
    </div>
  );
}

function getApiBase(): string {
  return process.env.NEXT_PUBLIC_BASE_PATH ?? "";
}
