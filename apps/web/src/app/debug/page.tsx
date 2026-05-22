"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRef, useState } from "react";

type PreviewResult = Record<string, unknown>;

export default function DebugMetadataPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);

  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    setPreview(null);

    try {
      const file = files[0];
      const formData = new FormData();
      formData.append("file", file);
      if (file.lastModified > 0) {
        formData.append("fileLastModified", String(file.lastModified));
      }

      const res = await fetch(`${base}/api/debug/metadata`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail ?? data.error ?? "미리보기 실패");
      }
      setPreview(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="pb-safe-page">
      <header className="border-b border-zinc-200/80 px-4 py-3 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            ← 보관함
          </Link>
        </div>
        <h1 className="mt-1 text-xl font-bold">Metadata Debug</h1>
        <p className="mt-1 text-xs text-zinc-500">
          업로드 시 저장될 메타데이터 미리보기 (실제 적재 없음)
        </p>
      </header>

      <section className="space-y-4 px-4 py-6">
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="w-full sm:w-auto"
        >
          {busy ? "분석 중…" : "사진/동영상 선택"}
        </Button>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
            {error}
          </p>
        )}

        {preview && (
          <div className="space-y-4">
            {"displaySort" in preview && preview.displaySort != null && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-3 dark:border-blue-900 dark:bg-blue-950/40">
                <p className="text-xs font-medium text-blue-800 dark:text-blue-200">
                  그리드 정렬 기준 (KST)
                </p>
                <p className="mt-1 text-lg font-semibold">
                  {String(
                    (preview.displaySort as { kstLabel?: string }).kstLabel
                  )}
                </p>
                <p className="mt-1 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                  UTC{" "}
                  {String(
                    (preview.displaySort as { sortIsoUtc?: string }).sortIsoUtc
                  )}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  KST 날짜 키:{" "}
                  {String(
                    (preview.displaySort as { kstDateKey?: string }).kstDateKey
                  )}
                </p>
              </div>
            )}

            <MetadataBlock title="파일" data={preview.file} />
            <MetadataBlock
              title="업로드 직후 (initialDocument → ES)"
              data={preview.initialDocument}
            />
            <MetadataBlock
              title="워커 처리 후 예상 (afterWorker)"
              data={preview.afterWorker}
            />
            {preview.workerError != null && (
              <p className="text-sm text-amber-700 dark:text-amber-300">
                워커 분석 경고: {String(preview.workerError)}
              </p>
            )}
            <MetadataBlock title="전체 JSON" data={preview} />
          </div>
        )}
      </section>
    </div>
  );
}

function MetadataBlock({
  title,
  data,
}: {
  title: string;
  data: unknown;
}) {
  if (data == null) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
      <h2 className="border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-semibold dark:border-zinc-800 dark:bg-zinc-900">
        {title}
      </h2>
      <pre className="max-h-[min(50vh,480px)] overflow-auto p-3 text-xs leading-relaxed text-zinc-800 dark:text-zinc-200">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
