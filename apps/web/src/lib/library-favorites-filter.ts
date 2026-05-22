const STORAGE_KEY = "photo-drive:library-favorites-only";

export function getLibraryFavoritesOnly(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

export function setLibraryFavoritesOnly(enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
}
