let cached: {
  enabled: boolean;
  canSend: boolean;
  vapidPublicKey: string | null;
} | null = null;

/** 빌드 env 없을 때 /photos 경로에서도 API 호출되도록 */
export function getClientBasePath(): string {
  const env = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  if (env) return env.replace(/\/$/, "");
  if (typeof window === "undefined") return "";
  const { pathname } = window.location;
  if (pathname === "/photos" || pathname.startsWith("/photos/")) {
    return "/photos";
  }
  return "";
}

export function getServiceWorkerScope(): string {
  const base = getClientBasePath();
  return base ? `${base}/` : "/";
}

export async function fetchPushConfig(): Promise<{
  enabled: boolean;
  canSend: boolean;
  vapidPublicKey: string | null;
}> {
  if (cached) return cached;

  const base = getClientBasePath();
  const path = `${base}/api/push/config`;

  try {
    const res = await fetch(path, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      cached = { enabled: false, canSend: false, vapidPublicKey: null };
      return cached;
    }
    const data = (await res.json()) as {
      enabled?: boolean;
      canSend?: boolean;
      vapidPublicKey?: string | null;
    };
    cached = {
      enabled: !!data.enabled && !!data.vapidPublicKey,
      canSend: !!data.canSend,
      vapidPublicKey: data.vapidPublicKey ?? null,
    };
    return cached;
  } catch (e) {
    cached = { enabled: false, canSend: false, vapidPublicKey: null };
    throw e;
  }
}

export function clearPushConfigCache(): void {
  cached = null;
}
