"use client";

import { getClientBasePath, getServiceWorkerScope } from "@/lib/push-config";
import { SW_READY_EVENT } from "@/lib/push-client";
import { useEffect, useRef } from "react";

export function PwaRegister() {
  const reloadedRef = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const base = getClientBasePath();
    const swUrl = `${base}/sw.js`;
    const scope = getServiceWorkerScope();

    navigator.serviceWorker
      .register(swUrl, { scope })
      .then((reg) => {
        const notifyReady = () => {
          window.dispatchEvent(new CustomEvent(SW_READY_EVENT));
        };
        if (reg.active) notifyReady();
        reg.addEventListener("updatefound", () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "activated") notifyReady();
            if (
              installing.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              installing.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });
        reg.update().catch(() => {});
        void navigator.serviceWorker.ready.then(notifyReady);
      })
      .catch((err) => console.warn("SW registration failed", err));

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.dispatchEvent(new CustomEvent(SW_READY_EVENT));
      if (reloadedRef.current) return;
      reloadedRef.current = true;
      window.location.reload();
    });
  }, []);

  return null;
}
