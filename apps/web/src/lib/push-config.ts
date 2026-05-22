let cached: { enabled: boolean; vapidPublicKey: string | null } | null = null;

export async function fetchPushConfig(): Promise<{
  enabled: boolean;
  vapidPublicKey: string | null;
}> {
  if (cached) return cached;

  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  try {
    const res = await fetch(`${base}/api/push/config`);
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
