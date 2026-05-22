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

/**
 * callbackUrl 등 외부·쿼리 경로 → App Router 내부 경로 (/login, / …).
 * router.push / Link 에는 basePath 없이 사용 (next.config basePath가 한 번만 붙음).
 */
export function normalizeAppPath(pathOrUrl: string): string {
  let path = pathOrUrl.trim();
  if (!path) return "/";
  try {
    if (path.startsWith("http://") || path.startsWith("https://")) {
      path = new URL(path).pathname;
    }
  } catch {
    /* pathname 그대로 */
  }
  const q = path.indexOf("?");
  const withoutQuery = q >= 0 ? path.slice(0, q) : path;
  const query = q >= 0 ? path.slice(q) : "";
  const normalized = stripBasePath(withoutQuery) || "/";
  return `${normalized}${query}`;
}
