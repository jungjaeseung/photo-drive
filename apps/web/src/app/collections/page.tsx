import Link from "next/link";
import { Image, Film, FolderOpen } from "lucide-react";

const items = [
  {
    href: "/collections/albums",
    label: "앨범",
    description: "직접 만든 앨범",
    icon: FolderOpen,
  },
  {
    href: "/collections/photos",
    label: "사진",
    description: "이미지만 보기",
    icon: Image,
  },
  {
    href: "/collections/videos",
    label: "동영상",
    description: "동영상만 보기",
    icon: Film,
  },
];

export default function CollectionsPage() {
  return (
    <div className="pb-24">
      <header className="border-b border-zinc-200/80 px-4 py-3 dark:border-zinc-800">
        <h1 className="text-xl font-bold">모음</h1>
      </header>
      <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {items.map(({ href, label, description, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex items-center gap-4 px-4 py-4 hover:bg-zinc-100 dark:hover:bg-zinc-900"
            >
              <Icon className="h-8 w-8 text-blue-500" />
              <div>
                <p className="font-medium">{label}</p>
                <p className="text-sm text-zinc-500">{description}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
