"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FolderOpen, GripVertical } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export interface AlbumGridItem {
  id: string;
  name: string;
  mediaCount: number;
  coverThumbnailUrl?: string;
}

interface AlbumGridProps {
  albums: AlbumGridItem[];
  columnCount?: number;
  reorderMode?: boolean;
  onReorder?: (albums: AlbumGridItem[]) => void;
}

function getColumnCount(width: number) {
  if (width < 640) return 2;
  if (width < 1024) return 3;
  return 4;
}

function AlbumCardContent({ album }: { album: AlbumGridItem }) {
  return (
    <>
      <div className="relative aspect-square overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-900">
        {album.coverThumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={album.coverThumbnailUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <FolderOpen className="h-10 w-10 text-zinc-400" />
          </div>
        )}
      </div>
      <p className="mt-1 truncate px-0.5 text-sm font-medium">{album.name}</p>
      <p className="px-0.5 text-xs text-zinc-500">{album.mediaCount}개</p>
    </>
  );
}

function SortableAlbumItem({
  album,
  reorderMode,
}: {
  album: AlbumGridItem;
  reorderMode: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: album.id, disabled: !reorderMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (!reorderMode) {
    return (
      <Link
        href={`/collections/albums/${album.id}`}
        className="group flex flex-col overflow-hidden rounded-lg"
      >
        <AlbumCardContent album={album} />
      </Link>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative flex flex-col overflow-hidden rounded-lg bg-white ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-700"
    >
      <button
        type="button"
        className="absolute left-1 top-1 z-10 flex h-8 w-8 items-center justify-center rounded-md bg-black/40 text-white"
        aria-label="드래그하여 순서 변경"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="p-1 pt-2">
        <AlbumCardContent album={album} />
      </div>
    </div>
  );
}

export function AlbumGrid({
  albums,
  columnCount: columnCountProp,
  reorderMode = false,
  onReorder,
}: AlbumGridProps) {
  const [items, setItems] = useState(albums);
  const [columnCount, setColumnCount] = useState(columnCountProp ?? 3);

  useEffect(() => {
    setItems(albums);
  }, [albums]);

  useEffect(() => {
    if (columnCountProp) return;
    const update = () => setColumnCount(getColumnCount(window.innerWidth));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [columnCountProp]);

  const cols = columnCountProp ?? columnCount;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const oldIndex = prev.findIndex((a) => a.id === active.id);
      const newIndex = prev.findIndex((a) => a.id === over.id);
      const next = arrayMove(prev, oldIndex, newIndex);
      onReorder?.(next);
      return next;
    });
  }

  if (items.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-zinc-500">
        앨범이 없습니다. 위에서 새 앨범을 만드세요.
      </p>
    );
  }

  const grid = (
    <div
      className="grid gap-2 px-2"
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
      }}
    >
      {items.map((album) => (
        <SortableAlbumItem
          key={album.id}
          album={album}
          reorderMode={reorderMode}
        />
      ))}
    </div>
  );

  if (!reorderMode) return grid;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map((a) => a.id)} strategy={rectSortingStrategy}>
        {grid}
      </SortableContext>
    </DndContext>
  );
}
