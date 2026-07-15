/**
 * Institutional Screener Workspace — saved screens store (Sprint 9D.R7).
 */

import { safeScreenNumber, safeScreenText } from "../ScreenModels";
import {
  normalizeSavedScreenRecord,
  type InstitutionalScoresSummary,
  type SavedScreenRecord,
  type WorkspaceScreenOrigin,
} from "./WorkspacePresentationModels";

export interface SaveScreenInput {
  id?: string | null;
  name?: string | null;
  strategyId?: string | null;
  screenId?: string | null;
  runAt?: string | null;
  topTickers?: string[] | null;
  institutionalScores?: Partial<InstitutionalScoresSummary> | null;
  trustAvg?: number | null;
  validationAvg?: number | null;
  tags?: string[] | null;
  pinned?: boolean | null;
  favorite?: boolean | null;
  archived?: boolean | null;
  origin?: WorkspaceScreenOrigin | null;
}

const saved = new Map<string, SavedScreenRecord>();
const recentIds: string[] = [];
const MAX_RECENT = 40;

function touchRecent(id: string): void {
  const idx = recentIds.indexOf(id);
  if (idx >= 0) recentIds.splice(idx, 1);
  recentIds.unshift(id);
  if (recentIds.length > MAX_RECENT) recentIds.length = MAX_RECENT;
}

function nextId(name: string): string {
  const base = safeScreenText(name, "screen")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base || "screen"}-${Date.now()}`;
}

export function saveScreen(input: SaveScreenInput): SavedScreenRecord {
  const name = safeScreenText(input.name, "Untitled Screen");
  const id = safeScreenText(input.id, nextId(name)).toLowerCase();
  const existing = saved.get(id);
  const record = normalizeSavedScreenRecord({
    id,
    name,
    strategyId: input.strategyId ?? existing?.strategyId,
    screenId: input.screenId ?? existing?.screenId,
    runAt: input.runAt ?? existing?.runAt ?? new Date().toISOString(),
    topTickers: input.topTickers ?? existing?.topTickers,
    institutionalScores:
      input.institutionalScores ?? existing?.institutionalScores,
    trustAvg:
      input.trustAvg ??
      existing?.trustAvg ??
      safeScreenNumber(input.institutionalScores?.trust, 0),
    validationAvg:
      input.validationAvg ??
      existing?.validationAvg ??
      safeScreenNumber(input.institutionalScores?.validation, 0),
    tags: input.tags ?? existing?.tags,
    pinned: input.pinned ?? existing?.pinned ?? false,
    favorite: input.favorite ?? existing?.favorite ?? false,
    archived: input.archived ?? existing?.archived ?? false,
    origin: input.origin ?? existing?.origin ?? "user",
    empty: false,
  });
  saved.set(id, record);
  touchRecent(id);
  return record;
}

export function loadScreen(id: string): SavedScreenRecord | null {
  const key = safeScreenText(id, "").toLowerCase();
  if (!key) return null;
  return saved.get(key) ?? null;
}

export function listSavedScreens(options?: {
  includeArchived?: boolean;
  pinnedOnly?: boolean;
  favoriteOnly?: boolean;
  recentOnly?: boolean;
}): SavedScreenRecord[] {
  let list = [...saved.values()];
  if (!options?.includeArchived) {
    list = list.filter((s) => !s.archived);
  }
  if (options?.pinnedOnly) {
    list = list.filter((s) => s.pinned);
  }
  if (options?.favoriteOnly) {
    list = list.filter((s) => s.favorite);
  }
  if (options?.recentOnly) {
    const order = new Map(recentIds.map((rid, i) => [rid, i]));
    return list
      .filter((s) => order.has(s.id))
      .sort((a, b) => (order.get(a.id)! - order.get(b.id)!));
  }
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

export function deleteSavedScreen(id: string): boolean {
  const key = safeScreenText(id, "").toLowerCase();
  const removed = saved.delete(key);
  const idx = recentIds.indexOf(key);
  if (idx >= 0) recentIds.splice(idx, 1);
  return removed;
}

export function pinSavedScreen(
  id: string,
  pinned = true
): SavedScreenRecord | null {
  const record = loadScreen(id);
  if (!record) return null;
  return saveScreen({ ...record, pinned });
}

export function favoriteSavedScreen(
  id: string,
  favorite = true
): SavedScreenRecord | null {
  const record = loadScreen(id);
  if (!record) return null;
  return saveScreen({ ...record, favorite });
}

export function archiveSavedScreen(
  id: string,
  archived = true
): SavedScreenRecord | null {
  const record = loadScreen(id);
  if (!record) return null;
  return saveScreen({ ...record, archived });
}

export function listRecentSavedScreens(limit = 10): SavedScreenRecord[] {
  return listSavedScreens({ recentOnly: true }).slice(
    0,
    Math.max(0, Math.floor(safeScreenNumber(limit, 10)))
  );
}

export function listPinnedSavedScreens(): SavedScreenRecord[] {
  return listSavedScreens({ pinnedOnly: true });
}

export function listFavoriteSavedScreens(): SavedScreenRecord[] {
  return listSavedScreens({ favoriteOnly: true });
}

export function resetSavedScreens(): void {
  saved.clear();
  recentIds.length = 0;
}

export const SavedScreenEngine = {
  saveScreen,
  loadScreen,
  listSavedScreens,
  deleteSavedScreen,
  pin: pinSavedScreen,
  favorite: favoriteSavedScreen,
  archive: archiveSavedScreen,
  recent: listRecentSavedScreens,
  pinned: listPinnedSavedScreens,
  favorites: listFavoriteSavedScreens,
  reset: resetSavedScreens,
};
