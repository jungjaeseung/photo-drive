"use client";

import { BottomNav } from "@/components/layout/bottom-nav";
import { stripBasePath } from "@/lib/paths";
import { usePathname } from "next/navigation";

const HIDE_NAV_PREFIXES = ["/login"];

export function NavShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const path = stripBasePath(pathname);
  const hideNav =
    HIDE_NAV_PREFIXES.some(
      (p) => path === p || path.startsWith(`${p}/`)
    );

  return (
    <>
      {children}
      {!hideNav && <BottomNav />}
    </>
  );
}
