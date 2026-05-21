"use client";

import { Film, Image } from "lucide-react";
import Link from "next/link";

interface CategoryGridProps {
  photoThumbnailUrl?: string;
  videoThumbnailUrl?: string;
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
}: CategoryGridProps) {
  const thumbs = {
    photo: photoThumbnailUrl,
    video: videoThumbnailUrl,
  };

  return (
    <div className="grid grid-cols-2 gap-2 px-2">
      {categories.map(({ href, label, icon: Icon, thumbKey }) => {
        const thumb = thumbs[thumbKey];
        return (
          <Link
            key={href}
            href={href}
            className="group relative aspect-[4/3] overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-900"
          >
            {thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumb}
                alt=""
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Icon className="h-12 w-12 text-blue-500/80" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <span className="absolute bottom-2 left-2 text-sm font-semibold text-white">
              {label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
