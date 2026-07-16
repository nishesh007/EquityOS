/**
 * Institutional Watchlist Platform — presentation models (Sprint 10B.R1).
 * Cards, views, and empty states. Never surface null / undefined / NaN.
 */

import {
  WATCHLIST_EMPTY,
  WATCHLIST_KIND_LABELS,
  WATCHLIST_SURFACE_ROUTES,
  assertNoSentinelText,
  safeWatchlistText,
  type WatchlistEmptyMessage,
  type WatchlistKind,
  type WatchlistRecord,
} from "./WatchlistModels";
import {
  emptyWatchlistMetrics,
  type WatchlistMetricsBundle,
} from "./WatchlistMetrics";

export { WATCHLIST_EMPTY, assertNoSentinelText };
export type { WatchlistEmptyMessage };

export interface WatchlistCard {
  id: string;
  title: string;
  subtitle: string;
  kind: WatchlistKind;
  kindLabel: string;
  color: string;
  icon: string;
  tags: string[];
  companies: number;
  pinned: boolean;
  favorite: boolean;
  archived: boolean;
  empty: boolean;
  emptyMessage: WatchlistEmptyMessage;
}

export interface WatchlistPlatformView {
  watchlists: WatchlistCard[];
  pinned: WatchlistCard[];
  favorites: WatchlistCard[];
  archived: WatchlistCard[];
  active: WatchlistCard | null;
  metrics: WatchlistMetricsBundle;
  empty: boolean;
  emptyMessage: WatchlistEmptyMessage;
  surfaceHints: {
    watchlist: string;
    dashboard: string;
    research: string;
    results: string;
    company: string;
  };
}

export function emptyWatchlistCard(
  message: WatchlistEmptyMessage = WATCHLIST_EMPTY.noWatchlists
): WatchlistCard {
  return {
    id: "",
    title: message,
    subtitle: message,
    kind: "custom",
    kindLabel: WATCHLIST_KIND_LABELS.custom,
    color: "",
    icon: "list",
    tags: [],
    companies: 0,
    pinned: false,
    favorite: false,
    archived: false,
    empty: true,
    emptyMessage: message,
  };
}

export function normalizeWatchlistCard(
  input?: Partial<WatchlistCard> | null,
  message: WatchlistEmptyMessage = WATCHLIST_EMPTY.noWatchlists
): WatchlistCard {
  if (!input) return emptyWatchlistCard(message);
  const id = safeWatchlistText(input.id, "");
  const empty = !id || Boolean(input.empty);
  const kind = (input.kind ?? "custom") as WatchlistKind;
  return {
    id,
    title: safeWatchlistText(input.title, message),
    subtitle: safeWatchlistText(input.subtitle, message),
    kind,
    kindLabel: WATCHLIST_KIND_LABELS[kind] ?? WATCHLIST_KIND_LABELS.custom,
    color: safeWatchlistText(input.color, "#2563eb"),
    icon: safeWatchlistText(input.icon, "list"),
    tags: Array.isArray(input.tags)
      ? input.tags.map((t) => safeWatchlistText(t, "")).filter(Boolean)
      : [],
    companies: Math.max(0, Math.floor(input.companies ?? 0)),
    pinned: Boolean(input.pinned),
    favorite: Boolean(input.favorite),
    archived: Boolean(input.archived),
    empty,
    emptyMessage: empty
      ? (safeWatchlistText(input.emptyMessage, message) as WatchlistEmptyMessage) ||
        message
      : WATCHLIST_EMPTY.noCompanies,
  };
}

export function watchlistToCard(
  record: WatchlistRecord,
  metrics?: WatchlistMetricsBundle | null
): WatchlistCard {
  if (record.empty) {
    return emptyWatchlistCard(record.emptyMessage);
  }
  const companies = metrics?.companies ?? record.symbols.length;
  return normalizeWatchlistCard({
    id: record.id,
    title: record.metadata.name,
    subtitle: `${companies} companies · ${record.metadata.owner}`,
    kind: record.kind,
    color: record.metadata.color,
    icon: record.metadata.icon,
    tags: record.metadata.tags,
    companies,
    pinned: record.pinned,
    favorite: record.favorite,
    archived: record.status === "archived",
    empty: false,
  });
}

export function emptyWatchlistPlatformView(
  message: WatchlistEmptyMessage = WATCHLIST_EMPTY.noWatchlists
): WatchlistPlatformView {
  return {
    watchlists: [],
    pinned: [],
    favorites: [],
    archived: [],
    active: null,
    metrics: emptyWatchlistMetrics(message),
    empty: true,
    emptyMessage: message,
    surfaceHints: { ...WATCHLIST_SURFACE_ROUTES },
  };
}

export function buildWatchlistPlatformView(input: {
  records: WatchlistRecord[];
  active?: WatchlistRecord | null;
  metrics?: WatchlistMetricsBundle | null;
  metricsById?: Map<string, WatchlistMetricsBundle>;
}): WatchlistPlatformView {
  const activeRecords = input.records.filter((r) => r.status === "active");
  const archivedRecords = input.records.filter((r) => r.status === "archived");

  const cards = activeRecords.map((record) =>
    watchlistToCard(record, input.metricsById?.get(record.id) ?? null)
  );
  const pinned = cards.filter((c) => c.pinned && !c.empty);
  const favorites = cards.filter((c) => c.favorite && !c.empty);
  const archived = archivedRecords.map((record) =>
    watchlistToCard(record, input.metricsById?.get(record.id) ?? null)
  );

  const empty = activeRecords.length === 0;
  const activeCard = input.active
    ? watchlistToCard(
        input.active,
        input.metricsById?.get(input.active.id) ?? input.metrics ?? null
      )
    : cards[0] ?? null;

  return {
    watchlists: cards,
    pinned,
    favorites,
    archived,
    active: activeCard,
    metrics: input.metrics ?? emptyWatchlistMetrics(),
    empty,
    emptyMessage: empty
      ? WATCHLIST_EMPTY.noWatchlists
      : favorites.length === 0
        ? WATCHLIST_EMPTY.noFavorites
        : WATCHLIST_EMPTY.noCompanies,
    surfaceHints: { ...WATCHLIST_SURFACE_ROUTES },
  };
}

export function archiveEmptyView(): WatchlistPlatformView {
  return {
    ...emptyWatchlistPlatformView(WATCHLIST_EMPTY.archiveEmpty),
    archived: [],
    emptyMessage: WATCHLIST_EMPTY.archiveEmpty,
  };
}
