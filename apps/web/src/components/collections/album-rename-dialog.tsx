"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface AlbumRenameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  albumName: string;
  onSave: (name: string) => void | Promise<void>;
  saving?: boolean;
}

export function AlbumRenameDialog({
  open,
  onOpenChange,
  albumName,
  onSave,
  saving = false,
}: AlbumRenameDialogProps) {
  const [name, setName] = useState(albumName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(albumName);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open, albumName]);

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    await onSave(trimmed);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="!inset-auto !left-1/2 !top-1/2 !h-auto !w-[min(100%,24rem)] !-translate-x-1/2 !-translate-y-1/2 !flex-none rounded-xl bg-zinc-900 p-0 text-white shadow-xl"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="border-b border-zinc-800 px-4 py-3 pr-12">
          <DialogTitle className="text-base font-semibold">
            앨범 이름 수정
          </DialogTitle>
        </div>
        <div className="px-4 py-4">
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="앨범 이름"
            disabled={saving}
            inputMode="text"
            enterKeyHint="done"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm disabled:opacity-50"
            onKeyDown={(e) => e.key === "Enter" && !saving && void handleSave()}
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-zinc-800 px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            취소
          </Button>
          <Button
            size="sm"
            disabled={saving || !name.trim()}
            onClick={() => void handleSave()}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "저장"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
