"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    const swUrl = `${base}/sw.js`;
    const scope = base ? `${base}/` : "/";

    navigator.serviceWorker
      .register(swUrl, { scope })
      .catch((err) => console.warn("SW registration failed", err));
  }, []);

  return null;
}
