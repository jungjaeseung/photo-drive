import { getBasePath } from "@/lib/config";

/** App Router 경로 → 공개 URL (basePath 포함) */
export function withBasePath(path: string): string {
  const base = getBasePath();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (!base) return normalized;
  return `${base}${normalized}`;
}

/** request pathname에서 basePath 제거 */
export function stripBasePath(pathname: string): string {
  const base = getBasePath();
  if (!base || !pathname.startsWith(base)) return pathname;
  const rest = pathname.slice(base.length);
  return rest || "/";
}
