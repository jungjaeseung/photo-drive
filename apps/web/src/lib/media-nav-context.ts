export interface MediaNavItem {
  id: string;
  thumbnailUrl?: string;
}

const STORAGE_KEY = "photo-drive-nav";

export function setMediaNavContext(
  items: MediaNavItem[],
  currentId: string
): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ items, currentId })
  );
}

export function getMediaNavContext(): {
  items: MediaNavItem[];
  currentId: string;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { items: MediaNavItem[]; currentId: string };
  } catch {
    return null;
  }
}

export function updateMediaNavCurrentId(currentId: string): void {
  const ctx = getMediaNavContext();
  if (!ctx) return;
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...ctx, currentId })
  );
}
