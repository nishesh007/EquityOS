/**
 * Sprint 10C.R7 — recents, favorites and pins.
 *
 * Presentation-side productivity state: recently viewed items, recent
 * searches, favorite/pinned companies and research. localStorage-backed
 * (injectable for tests, SSR-safe).
 */

export type RecentKind = "company" | "research" | "page" | "search" | "command";

export interface RecentItem {
  id: string;
  kind: RecentKind;
  label: string;
  href?: string;
  at: number;
}

export type ProductivityStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

const RECENTS_KEY = "equityos.productivity.recents";
const FAVORITES_KEY = "equityos.productivity.favorites";
const MAX_RECENTS = 30;

function browserStorage(): ProductivityStorage | undefined {
  return typeof window !== "undefined" ? window.localStorage : undefined;
}

function readJson<T>(
  key: string,
  fallback: T,
  storage: ProductivityStorage | undefined
): T {
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(
  key: string,
  value: unknown,
  storage: ProductivityStorage | undefined
): void {
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage failures
  }
}

/** Record a viewed item / executed search (most recent first, de-duped). */
export function recordRecent(
  item: Omit<RecentItem, "at">,
  storage: ProductivityStorage | undefined = browserStorage()
): RecentItem[] {
  const recents = readJson<RecentItem[]>(RECENTS_KEY, [], storage).filter(
    (existing) => !(existing.id === item.id && existing.kind === item.kind)
  );
  recents.unshift({ ...item, at: Date.now() });
  const trimmed = recents.slice(0, MAX_RECENTS);
  writeJson(RECENTS_KEY, trimmed, storage);
  return trimmed;
}

/** Recently viewed items, optionally filtered by kind. */
export function getRecents(
  kind?: RecentKind,
  limit = 8,
  storage: ProductivityStorage | undefined = browserStorage()
): RecentItem[] {
  const recents = readJson<RecentItem[]>(RECENTS_KEY, [], storage);
  const filtered = kind ? recents.filter((item) => item.kind === kind) : recents;
  return filtered.slice(0, limit);
}

export function clearRecents(
  storage: ProductivityStorage | undefined = browserStorage()
): void {
  writeJson(RECENTS_KEY, [], storage);
}

export interface FavoriteItem {
  id: string;
  kind: RecentKind;
  label: string;
  href?: string;
}

/** Toggle a favorite/pin; returns the new favorite state. */
export function toggleFavorite(
  item: FavoriteItem,
  storage: ProductivityStorage | undefined = browserStorage()
): boolean {
  const favorites = readJson<FavoriteItem[]>(FAVORITES_KEY, [], storage);
  const index = favorites.findIndex(
    (existing) => existing.id === item.id && existing.kind === item.kind
  );
  if (index >= 0) {
    favorites.splice(index, 1);
    writeJson(FAVORITES_KEY, favorites, storage);
    return false;
  }
  favorites.unshift(item);
  writeJson(FAVORITES_KEY, favorites, storage);
  return true;
}

export function isFavorite(
  id: string,
  kind: RecentKind,
  storage: ProductivityStorage | undefined = browserStorage()
): boolean {
  return readJson<FavoriteItem[]>(FAVORITES_KEY, [], storage).some(
    (item) => item.id === id && item.kind === kind
  );
}

/** Favorites/pins, optionally filtered by kind (pinned companies, …). */
export function getFavorites(
  kind?: RecentKind,
  storage: ProductivityStorage | undefined = browserStorage()
): FavoriteItem[] {
  const favorites = readJson<FavoriteItem[]>(FAVORITES_KEY, [], storage);
  return kind ? favorites.filter((item) => item.kind === kind) : favorites;
}
