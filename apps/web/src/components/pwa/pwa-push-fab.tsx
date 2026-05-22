"use client";

import { PushSetupDialog } from "@/components/pwa/push-setup-dialog";
import { Bell } from "lucide-react";
import { useState } from "react";

/** 항상 보이는 알림 설정 버튼 (상태와 무관) */
export function PwaPushFab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="업로드 알림 설정"
        className="fixed right-3 z-[100] flex h-11 w-11 items-center justify-center rounded-full border border-pink-200 bg-white shadow-lg dark:border-pink-900 dark:bg-zinc-900"
        style={{ top: "max(0.5rem, env(safe-area-inset-top))" }}
        onClick={() => setOpen(true)}
      >
        <Bell className="h-5 w-5 text-pink-500" />
      </button>
      <PushSetupDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
