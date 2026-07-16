/**
 * Workspace favorites engine (Sprint 10A.R7).
 */

import { safeWorkspaceText } from "../WorkspaceModels";
import {
  AUTOMATION_EMPTY,
  FAVORITE_KINDS,
  emptyFavorite,
  normalizeFavorite,
  type FavoriteKind,
  type FavoritesView,
  type WorkspaceFavorite,
} from "./AutomationPresentationModels";

export interface AddFavoriteInput {
  workspaceId: string;
  kind: FavoriteKind;
  label: string;
  target: string;
  ticker?: string | null;
  pinned?: boolean | null;
  now?: Date | null;
}

const favorites = new Map<string, WorkspaceFavorite>();
let favSeq = 0;

function stamp(now?: Date | null): string {
  return (now ?? new Date()).toISOString();
}

export function addFavorite(input: AddFavoriteInput): WorkspaceFavorite {
  const workspaceId = safeWorkspaceText(input.workspaceId, "").toLowerCase();
  if (!workspaceId || !FAVORITE_KINDS.includes(input.kind)) {
    return emptyFavorite(AUTOMATION_EMPTY.noFavorites);
  }

  favSeq += 1;
  const fav = normalizeFavorite({
    id: `fav-${favSeq}-${Date.now()}`,
    workspaceId,
    kind: input.kind,
    label: safeWorkspaceText(input.label, AUTOMATION_EMPTY.awaitingWorkspace),
    target: safeWorkspaceText(input.target, ""),
    ticker: input.ticker ? safeWorkspaceText(input.ticker, "").toUpperCase() : null,
    pinned: Boolean(input.pinned),
    createdAt: stamp(input.now),
    empty: false,
  });
  favorites.set(fav.id, fav);
  return fav;
}

export function listFavorites(options?: {
  workspaceId?: string | null;
  kind?: FavoriteKind | null;
  pinnedOnly?: boolean;
}): WorkspaceFavorite[] {
  const wid = options?.workspaceId
    ? safeWorkspaceText(options.workspaceId, "").toLowerCase()
    : null;
  return Array.from(favorites.values()).filter((f) => {
    if (f.empty) return false;
    if (wid && f.workspaceId !== wid) return false;
    if (options?.kind && f.kind !== options.kind) return false;
    if (options?.pinnedOnly && !f.pinned) return false;
    return true;
  });
}

export function getFavoritesView(options?: {
  workspaceId?: string | null;
}): FavoritesView {
  const items = listFavorites(options);
  if (items.length === 0) {
    return { favorites: [], empty: true, emptyMessage: AUTOMATION_EMPTY.noFavorites };
  }
  return {
    favorites: items,
    empty: false,
    emptyMessage: AUTOMATION_EMPTY.awaitingWorkspace,
  };
}

export function resetWorkspaceFavorites(): void {
  favorites.clear();
  favSeq = 0;
}

export class WorkspaceFavoritesEngine {
  addFavorite = addFavorite;
  listFavorites = listFavorites;
  reset = resetWorkspaceFavorites;
}
