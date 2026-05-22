/** basePath 제거 후 앱 내부 경로 기준 */
export function isPublicPath(path: string): boolean {
  if (path === "/login" || path === "/login/new") return true;
  if (path.startsWith("/api/auth")) return true;
  if (path === "/api/health") return true;
  if (path.startsWith("/_next")) return true;
  if (path.startsWith("/icons")) return true;
  if (path === "/manifest.webmanifest") return true;
  if (path.endsWith("/sw.js")) return true;
  return false;
}
