"use client";

import { CategoryPreviewThumb } from "@/components/collections/category-preview-thumb";
import { Film, Heart, Image } from "lucide-react";
import Link from "next/link";

interface CategoryGridProps {
  photoThumbnailUrl?: string;
  videoThumbnailUrl?: string;
  photoMediaId?: string;
  videoMediaId?: string;
}

const categories = [
  {
    href: "/collections/photos",
    label: "사진",
    icon: Image,
    thumbKey: "photo" as const,
  },
  {
    href: "/collections/videos",
    label: "동영상",
    icon: Film,
    thumbKey: "video" as const,
  },
];

export function CategoryGrid({
  photoThumbnailUrl,
  videoThumbnailUrl,
  photoMediaId,
  videoMediaId,
}: CategoryGridProps) {
  const thumbs = {
    photo: photoThumbnailUrl,
    video: videoThumbnailUrl,
  };
  const thumbKeys = {
    photo: photoMediaId,
    video: videoMediaId,
  };

  return (
    <div className="flex flex-col gap-2 px-2">
    <div className="grid grid-cols-2 gap-2">
      {categories.map(({ href, label, icon: Icon, thumbKey }) => {
        const thumb = thumbs[thumbKey];
        return (
          <Link
            key={href}
            href={href}
            className="group relative aspect-[4/3] overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-900"
          >
            <CategoryPreviewThumb
              key={thumbKeys[thumbKey] ?? thumb ?? thumbKey}
              src={thumb}
              fallbackIcon={Icon}
              className="transition-transform group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <span className="absolute bottom-2 left-2 text-sm font-semibold text-white">
              {label}
            </span>
          </Link>
        );
      })}
    </div>
    <Link
      href="/collections/favorites"
      className="group relative flex aspect-[4/1] items-center overflow-hidden rounded-lg bg-zinc-100 px-4 dark:bg-zinc-900"
    >
      <Heart className="h-5 w-5 text-red-500" />
      <span className="ml-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        즐겨찾기
      </span>
    </Link>
    </div>
  );
}
