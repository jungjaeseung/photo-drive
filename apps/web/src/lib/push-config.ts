let cached: { enabled: boolean; vapidPublicKey: string | null } | null = null;

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

export async function fetchPushConfig(): Promise<{
  enabled: boolean;
  vapidPublicKey: string | null;
}> {
  if (cached) return cached;

  const base = getClientBasePath();
  const url = `${base}/api/push/config`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      cached = { enabled: false, vapidPublicKey: null };
      return cached;
    }
    const data = (await res.json()) as {
      enabled?: boolean;
      vapidPublicKey?: string | null;
    };
    cached = {
      enabled: !!data.enabled && !!data.vapidPublicKey,
      vapidPublicKey: data.vapidPublicKey ?? null,
    };
    return cached;
  } catch {
    cached = { enabled: false, vapidPublicKey: null };
    return cached;
  }
}

export function clearPushConfigCache(): void {
  cached = null;
}
