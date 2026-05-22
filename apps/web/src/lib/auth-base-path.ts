import { getBasePath } from "@/lib/config";

/** NextAuth handlers basePath — next.config basePath + /api/auth */
export function getAuthApiBasePath(): string {
  const base = getBasePath();
  return base ? `${base}/api/auth` : "/api/auth";
}
