/**
 * Bookmark engine (Sprint 10A.R4).
 * Company, report, research, alert, screen, strategy, workspace bookmarks.
 */

import { safeWorkspaceText } from "../WorkspaceModels";
import {
  KNOWLEDGE_EMPTY,
  emptyBookmark,
  normalizeBookmark,
  type BookmarkKind,
  type ResearchBookmark,
} from "./KnowledgePresentationModels";

export interface BookmarkResearchInput {
  workspaceId: string;
  kind: BookmarkKind;
  label: string;
  target: string;
  route?: string | null;
  ticker?: string | null;
  now?: Date | null;
}

const bookmarks = new Map<string, ResearchBookmark>();
let bmSeq = 0;

function stamp(now?: Date | null): string {
  return (now ?? new Date()).toISOString();
}

function defaultRoute(kind: BookmarkKind, target: string, ticker?: string | null): string {
  const symbol = ticker ? safeWorkspaceText(ticker, "").toUpperCase() : null;
  const q = symbol ? encodeURIComponent(symbol) : "";
  switch (kind) {
    case "company":
      return symbol ? `/company/${q}` : "/company";
    case "report":
      return symbol ? `/ai/research?ticker=${q}&report=1` : "/ai/research";
    case "research":
      return symbol ? `/ai/research?ticker=${q}` : "/ai/research";
    case "alert":
      return symbol ? `/results?alerts=1&ticker=${q}` : "/results?alerts=1";
    case "screen":
      return symbol ? `/screener?ticker=${q}` : "/screener";
    case "strategy":
      return `/screener?strategy=${encodeURIComponent(target)}`;
    case "workspace":
      return "/research";
    default:
      return "/research";
  }
}

export function bookmarkResearch(input: BookmarkResearchInput): ResearchBookmark {
  const workspaceId = safeWorkspaceText(input.workspaceId, "").toLowerCase();
  if (!workspaceId) return emptyBookmark(KNOWLEDGE_EMPTY.awaitingResearch);

  bmSeq += 1;
  const ticker = input.ticker
    ? safeWorkspaceText(input.ticker, "").toUpperCase()
    : null;
  const id = `bm-${bmSeq}-${Date.now()}`;
  const bm = normalizeBookmark({
    id,
    workspaceId,
    kind: input.kind,
    label: safeWorkspaceText(input.label, "Bookmark"),
    target: safeWorkspaceText(input.target, "—"),
    route: safeWorkspaceText(
      input.route,
      defaultRoute(input.kind, input.target, ticker)
    ),
    ticker,
    createdAt: stamp(input.now),
    empty: false,
  });
  bookmarks.set(id, bm);
  return bm;
}

export function listBookmarks(options?: {
  workspaceId?: string | null;
  kind?: BookmarkKind | null;
  ticker?: string | null;
}): ResearchBookmark[] {
  const wid = options?.workspaceId
    ? safeWorkspaceText(options.workspaceId, "").toLowerCase()
    : null;
  const ticker = options?.ticker
    ? safeWorkspaceText(options.ticker, "").toUpperCase()
    : null;

  return Array.from(bookmarks.values())
    .filter((b) => {
      if (b.empty) return false;
      if (wid && b.workspaceId !== wid) return false;
      if (ticker && b.ticker !== ticker) return false;
      if (options?.kind && b.kind !== options.kind) return false;
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function deleteBookmark(id: string): boolean {
  return bookmarks.delete(safeWorkspaceText(id, "").toLowerCase());
}

export function resetBookmarks(): void {
  bookmarks.clear();
  bmSeq = 0;
}

export class BookmarkEngine {
  bookmarkResearch = bookmarkResearch;
  listBookmarks = listBookmarks;
  reset = resetBookmarks;
}
