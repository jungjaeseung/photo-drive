"use client";

import { MediaDetail, type MediaDetailData } from "@/components/media/media-detail";
import { useMediaNav } from "@/hooks/use-media-nav";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function MediaPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [media, setMedia] = useState<MediaDetailData | null>(null);

  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  const navigateToId = useCallback(
    (nextId: string) => {
      router.push(`/p/${nextId}`);
    },
    [router]
  );

  const { items, index, hasNav, goTo, goPrev, goNext, prevId, nextId } =
    useMediaNav(id, navigateToId);

  const fetchMedia = useCallback(
    (mediaId: string) => {
      setMedia(null);
      fetch(`${base}/api/media/${mediaId}`)
        .then((r) => r.json())
        .then(setMedia);
    },
    [base]
  );

  useEffect(() => {
    fetchMedia(id);
  }, [id, fetchMedia]);

  async function handleDelete() {
    if (!confirm("이 미디어를 삭제할까요?")) return;
    await fetch(`${base}/api/media/${id}`, { method: "DELETE" });
    if (nextId) {
      goTo(nextId);
    } else if (prevId) {
      goTo(prevId);
    } else {
      router.push("/");
    }
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
      navItems={items}
      currentIndex={index}
      onNavigate={goTo}
      onPrev={goPrev}
      onNext={goNext}
      hasPrev={hasNav && !!prevId}
      hasNext={hasNav && !!nextId}
    />
  );
}
