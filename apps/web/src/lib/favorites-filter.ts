const STORAGE_KEY = "photo-drive:favorites-only";
const LEGACY_KEY = "photo-drive:library-favorites-only";

export function getFavoritesOnly(): boolean {
  if (typeof window === "undefined") return false;
  if (window.localStorage.getItem(STORAGE_KEY) === "1") return true;
  if (window.localStorage.getItem(LEGACY_KEY) === "1") return true;
  return false;
}

export function setFavoritesOnly(enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  window.localStorage.removeItem(LEGACY_KEY);
}
