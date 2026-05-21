"use client";

import { MediaDetail, type MediaDetailData } from "@/components/media/media-detail";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function MediaPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [media, setMedia] = useState<MediaDetailData | null>(null);

  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  useEffect(() => {
    fetch(`${base}/api/media/${id}`)
      .then((r) => r.json())
      .then(setMedia);
  }, [id, base]);

  async function handleDelete() {
    if (!confirm("이 미디어를 삭제할까요?")) return;
    await fetch(`${base}/api/media/${id}`, { method: "DELETE" });
    router.push("/");
  }

  if (!media) {
    return (
      <div className="flex h-dvh items-center justify-center text-zinc-500">
        불러오는 중…
      </div>
    );
  }

  return (
    <MediaDetail
      media={media}
      open={true}
      onOpenChange={(open) => {
        if (!open) router.back();
      }}
      onDelete={handleDelete}
    />
  );
}
