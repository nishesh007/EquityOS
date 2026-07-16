/**
 * Institutional Watchlist Platform — domain models (Sprint 10B.R1).
 * Multi-watchlist architecture foundation — no duplicated engine logic.
 */

export const WATCHLIST_EMPTY = {
  noWatchlists: "No Watchlists",
  noFavorites: "No Favorites",
  noCompanies: "No Companies",
  archiveEmpty: "Archive Empty",
} as const;

export type WatchlistEmptyMessage =
  (typeof WATCHLIST_EMPTY)[keyof typeof WATCHLIST_EMPTY];

export const WATCHLIST_KINDS = [
  "default",
  "portfolio",
  "sector",
  "theme",
  "custom",
] as const;

export type WatchlistKind = (typeof WATCHLIST_KINDS)[number];

export const WATCHLIST_KIND_LABELS: Record<WatchlistKind, string> = {
  default: "Default",
  portfolio: "Portfolio",
  sector: "Sector",
  theme: "Theme",
  custom: "Custom",
};

export type WatchlistStatus = "active" | "archived" | "deleted";

export type WatchlistSortField =
  | "name"
  | "priority"
  | "updated"
  | "created"
  | "companies";

export type WatchlistSortDirection = "asc" | "desc";

export interface WatchlistMetadata {
  name: string;
  description: string;
  owner: string;
  color: string;
  icon: string;
  tags: string[];
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface WatchlistRecord {
  id: string;
  kind: WatchlistKind;
  status: WatchlistStatus;
  symbols: string[];
  pinned: boolean;
  favorite: boolean;
  metadata: WatchlistMetadata;
  cachedMetricsKey: string;
  empty: boolean;
  emptyMessage: WatchlistEmptyMessage;
}

export interface CreateWatchlistInput {
  id?: string | null;
  kind?: WatchlistKind | null;
  name?: string | null;
  description?: string | null;
  owner?: string | null;
  color?: string | null;
  icon?: string | null;
  tags?: string[] | null;
  priority?: number | null;
  symbols?: string[] | null;
  pinned?: boolean | null;
  favorite?: boolean | null;
  now?: Date | null;
}

export interface UpdateWatchlistInput {
  name?: string | null;
  description?: string | null;
  owner?: string | null;
  color?: string | null;
  icon?: string | null;
  tags?: string[] | null;
  priority?: number | null;
  symbols?: string[] | null;
  pinned?: boolean | null;
  favorite?: boolean | null;
  now?: Date | null;
}

export interface WatchlistQuery {
  kind?: WatchlistKind | WatchlistKind[];
  status?: WatchlistStatus | WatchlistStatus[];
  pinned?: boolean;
  favorite?: boolean;
  owner?: string;
  tag?: string;
  search?: string;
  includeArchived?: boolean;
  includeDeleted?: boolean;
  sortBy?: WatchlistSortField;
  sortDirection?: WatchlistSortDirection;
  limit?: number;
}

/** Existing platform routes — compose, do not rebuild modules. */
export const WATCHLIST_SURFACE_ROUTES = {
  watchlist: "/watchlist",
  dashboard: "/",
  research: "/research",
  results: "/results",
  company: "/company",
} as const;

export function safeWatchlistText(
  value: string | null | undefined,
  fallback: string
): string {
  if (value == null) return fallback;
  const trimmed = String(value).trim();
  if (
    trimmed === "" ||
    trimmed === "null" ||
    trimmed === "undefined" ||
    trimmed === "NaN"
  ) {
    return fallback;
  }
  return trimmed;
}

export function safeWatchlistNumber(
  value: number | null | undefined,
  fallback = 0
): number {
  if (value == null || !Number.isFinite(value)) return fallback;
  return value;
}

export function normalizeSymbols(symbols?: string[] | null): string[] {
  if (!Array.isArray(symbols)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of symbols) {
    const symbol = safeWatchlistText(raw, "").toUpperCase();
    if (!symbol || seen.has(symbol)) continue;
    seen.add(symbol);
    out.push(symbol);
  }
  return out;
}

export function isWatchlistKind(
  value: string | null | undefined
): value is WatchlistKind {
  return (WATCHLIST_KINDS as readonly string[]).includes(
    safeWatchlistText(value, "")
  );
}

export function emptyWatchlistRecord(
  message: WatchlistEmptyMessage = WATCHLIST_EMPTY.noWatchlists
): WatchlistRecord {
  const now = new Date().toISOString();
  return {
    id: "",
    kind: "custom",
    status: "active",
    symbols: [],
    pinned: false,
    favorite: false,
    metadata: {
      name: message,
      description: "",
      owner: "",
      color: "",
      icon: "",
      tags: [],
      priority: 0,
      createdAt: now,
      updatedAt: now,
    },
    cachedMetricsKey: "",
    empty: true,
    emptyMessage: message,
  };
}

export function normalizeWatchlistRecord(
  input?: Partial<WatchlistRecord> | null,
  message: WatchlistEmptyMessage = WATCHLIST_EMPTY.noWatchlists
): WatchlistRecord {
  if (!input) return emptyWatchlistRecord(message);
  const id = safeWatchlistText(input.id, "");
  const empty = !id || Boolean(input.empty);
  const now = new Date().toISOString();
  const meta = input.metadata;
  return {
    id,
    kind: isWatchlistKind(input.kind) ? input.kind : "custom",
    status: input.status ?? "active",
    symbols: normalizeSymbols(input.symbols),
    pinned: Boolean(input.pinned),
    favorite: Boolean(input.favorite),
    metadata: {
      name: safeWatchlistText(meta?.name, message),
      description: safeWatchlistText(meta?.description, ""),
      owner: safeWatchlistText(meta?.owner, "platform"),
      color: safeWatchlistText(meta?.color, "#2563eb"),
      icon: safeWatchlistText(meta?.icon, "list"),
      tags: Array.isArray(meta?.tags)
        ? meta.tags.map((t) => safeWatchlistText(t, "")).filter(Boolean)
        : [],
      priority: safeWatchlistNumber(meta?.priority, 0),
      createdAt: safeWatchlistText(meta?.createdAt, now),
      updatedAt: safeWatchlistText(meta?.updatedAt, now),
    },
    cachedMetricsKey: safeWatchlistText(input.cachedMetricsKey, id ? `metrics:${id}` : ""),
    empty,
    emptyMessage: empty
      ? (safeWatchlistText(input.emptyMessage, message) as WatchlistEmptyMessage) ||
        message
      : WATCHLIST_EMPTY.noCompanies,
  };
}

export function assertNoSentinelText(value: string): boolean {
  const trimmed = value.trim();
  return (
    trimmed !== "" &&
    trimmed !== "null" &&
    trimmed !== "undefined" &&
    trimmed !== "NaN"
  );
}
