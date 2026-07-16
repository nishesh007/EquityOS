/**
 * Institutional Watchlist Platform — registry (Sprint 10B.R1).
 * Register, load, search, sort, filter, and cache watchlists.
 */

import {
  BUILTIN_WATCHLIST_DEFINITIONS,
  definitionToRecordId,
  type WatchlistDefinition,
} from "./WatchlistDefinition";
import {
  WATCHLIST_EMPTY,
  emptyWatchlistRecord,
  normalizeSymbols,
  normalizeWatchlistRecord,
  safeWatchlistNumber,
  safeWatchlistText,
  type CreateWatchlistInput,
  type UpdateWatchlistInput,
  type WatchlistKind,
  type WatchlistQuery,
  type WatchlistRecord,
  type WatchlistSortField,
} from "./WatchlistModels";

const watchlists = new Map<string, WatchlistRecord>();
const definitions = new Map<string, WatchlistDefinition>();
const metricsCache = new Map<string, { key: string; at: string }>();
let watchlistSeq = 0;
let builtinsRegistered = false;

function stamp(now?: Date | null): string {
  return (now ?? new Date()).toISOString();
}

function invalidateCache(id: string): void {
  metricsCache.delete(id);
}

export function registerWatchlistDefinition(
  definition: Omit<WatchlistDefinition, "registeredAt"> & {
    registeredAt?: string;
  },
  options?: { force?: boolean }
): { registered: boolean; skipped: boolean } {
  const key = definitionToRecordId(definition.definitionId);
  if (definitions.has(key) && !options?.force) {
    return { registered: false, skipped: true };
  }
  definitions.set(key, {
    ...definition,
    registeredAt: definition.registeredAt ?? stamp(),
  });
  return { registered: true, skipped: false };
}

export function registerBuiltinWatchlistDefinitions(options?: {
  force?: boolean;
}): { registered: number; skipped: number; total: number } {
  if (builtinsRegistered && !options?.force) {
    return {
      registered: 0,
      skipped: definitions.size,
      total: definitions.size,
    };
  }
  let added = 0;
  let skipped = 0;
  for (const def of BUILTIN_WATCHLIST_DEFINITIONS) {
    const result = registerWatchlistDefinition(def, { force: options?.force });
    if (result.registered) added += 1;
    else skipped += 1;
  }
  builtinsRegistered = true;
  return { registered: added, skipped, total: definitions.size };
}

export function loadWatchlistDefinitions(): WatchlistDefinition[] {
  return Array.from(definitions.values()).sort(
    (a, b) => b.priority - a.priority
  );
}

export function createWatchlistRecord(
  input?: CreateWatchlistInput | null
): WatchlistRecord {
  registerBuiltinWatchlistDefinitions();
  watchlistSeq += 1;
  const now = stamp(input?.now);
  const id = safeWatchlistText(
    input?.id,
    `watchlist-${watchlistSeq}-${Date.now()}`
  ).toLowerCase();

  const name = safeWatchlistText(input?.name, `Watchlist ${watchlistSeq}`);
  const record = normalizeWatchlistRecord({
    id,
    kind: input?.kind ?? "custom",
    status: "active",
    symbols: normalizeSymbols(input?.symbols),
    pinned: Boolean(input?.pinned),
    favorite: Boolean(input?.favorite),
    metadata: {
      name,
      description: safeWatchlistText(input?.description, ""),
      owner: safeWatchlistText(input?.owner, "analyst"),
      color: safeWatchlistText(input?.color, "#2563eb"),
      icon: safeWatchlistText(input?.icon, "list"),
      tags: Array.isArray(input?.tags)
        ? input.tags.map((t) => safeWatchlistText(t, "")).filter(Boolean)
        : [],
      priority: safeWatchlistNumber(input?.priority, 50),
      createdAt: now,
      updatedAt: now,
    },
    cachedMetricsKey: `metrics:${id}`,
    empty: false,
  });

  watchlists.set(id, record);
  invalidateCache(id);
  return record;
}

export function ensureBuiltinWatchlists(now?: Date | null): WatchlistRecord[] {
  registerBuiltinWatchlistDefinitions();
  const created: WatchlistRecord[] = [];
  for (const def of BUILTIN_WATCHLIST_DEFINITIONS) {
    const id = definitionToRecordId(def.definitionId);
    if (watchlists.has(id)) {
      created.push(watchlists.get(id)!);
      continue;
    }
    const record = createWatchlistRecord({
      id,
      kind: def.kind,
      name: def.label,
      description: def.description,
      owner: "platform",
      color: def.color,
      icon: def.icon,
      tags: def.tags,
      priority: def.priority,
      symbols: def.symbols,
      pinned: def.pinned,
      favorite: def.favorite,
      now,
    });
    created.push(record);
  }
  return created;
}

export function getWatchlistRecord(id: string): WatchlistRecord | null {
  const key = safeWatchlistText(id, "").toLowerCase();
  if (!key) return null;
  const record = watchlists.get(key);
  if (!record || record.status === "deleted") return null;
  return record;
}

export function updateWatchlistRecord(
  id: string,
  input?: UpdateWatchlistInput | null
): WatchlistRecord {
  const existing = getWatchlistRecord(id);
  if (!existing) return emptyWatchlistRecord(WATCHLIST_EMPTY.noWatchlists);

  const now = stamp(input?.now);
  const meta = existing.metadata;
  const next = normalizeWatchlistRecord({
    ...existing,
    symbols:
      input?.symbols != null
        ? normalizeSymbols(input.symbols)
        : existing.symbols,
    pinned: input?.pinned != null ? Boolean(input.pinned) : existing.pinned,
    favorite:
      input?.favorite != null ? Boolean(input.favorite) : existing.favorite,
    metadata: {
      ...meta,
      name:
        input?.name != null
          ? safeWatchlistText(input.name, meta.name)
          : meta.name,
      description:
        input?.description != null
          ? safeWatchlistText(input.description, meta.description)
          : meta.description,
      owner:
        input?.owner != null
          ? safeWatchlistText(input.owner, meta.owner)
          : meta.owner,
      color:
        input?.color != null
          ? safeWatchlistText(input.color, meta.color)
          : meta.color,
      icon:
        input?.icon != null
          ? safeWatchlistText(input.icon, meta.icon)
          : meta.icon,
      tags:
        input?.tags != null
          ? input.tags.map((t) => safeWatchlistText(t, "")).filter(Boolean)
          : meta.tags,
      priority:
        input?.priority != null
          ? safeWatchlistNumber(input.priority, meta.priority)
          : meta.priority,
      updatedAt: now,
    },
    empty: false,
  });

  watchlists.set(next.id, next);
  invalidateCache(next.id);
  return next;
}

export function archiveWatchlistRecord(
  id: string,
  now?: Date | null
): WatchlistRecord {
  const existing = getWatchlistRecord(id);
  if (!existing) return emptyWatchlistRecord(WATCHLIST_EMPTY.noWatchlists);

  const next = normalizeWatchlistRecord({
    ...existing,
    status: "archived",
    metadata: { ...existing.metadata, updatedAt: stamp(now) },
    empty: false,
  });
  watchlists.set(next.id, next);
  invalidateCache(next.id);
  return next;
}

export function restoreWatchlistRecord(
  id: string,
  now?: Date | null
): WatchlistRecord {
  const key = safeWatchlistText(id, "").toLowerCase();
  const existing = watchlists.get(key);
  if (!existing || existing.status === "deleted") {
    return emptyWatchlistRecord(WATCHLIST_EMPTY.noWatchlists);
  }

  const next = normalizeWatchlistRecord({
    ...existing,
    status: "active",
    metadata: { ...existing.metadata, updatedAt: stamp(now) },
    empty: false,
  });
  watchlists.set(key, next);
  invalidateCache(key);
  return next;
}

export function deleteWatchlistRecord(id: string): boolean {
  const key = safeWatchlistText(id, "").toLowerCase();
  const existing = watchlists.get(key);
  if (!existing) return false;

  watchlists.set(
    key,
    normalizeWatchlistRecord({
      ...existing,
      status: "deleted",
      empty: false,
    })
  );
  invalidateCache(key);
  return true;
}

export function cloneWatchlistRecord(
  id: string,
  options?: { name?: string | null; now?: Date | null }
): WatchlistRecord {
  const existing = getWatchlistRecord(id);
  if (!existing) return emptyWatchlistRecord(WATCHLIST_EMPTY.noWatchlists);

  return createWatchlistRecord({
    kind: existing.kind,
    name: safeWatchlistText(
      options?.name,
      `${existing.metadata.name} (copy)`
    ),
    description: existing.metadata.description,
    owner: existing.metadata.owner,
    color: existing.metadata.color,
    icon: existing.metadata.icon,
    tags: [...existing.metadata.tags, "clone"],
    priority: existing.metadata.priority,
    symbols: [...existing.symbols],
    pinned: false,
    favorite: false,
    now: options?.now,
  });
}

export function duplicateWatchlistRecord(
  id: string,
  now?: Date | null
): WatchlistRecord {
  return cloneWatchlistRecord(id, { now });
}

export function pinWatchlistRecord(
  id: string,
  pinned = true,
  now?: Date | null
): WatchlistRecord {
  return updateWatchlistRecord(id, { pinned, now });
}

export function favoriteWatchlistRecord(
  id: string,
  favorite = true,
  now?: Date | null
): WatchlistRecord {
  return updateWatchlistRecord(id, { favorite, now });
}

function matchesKind(
  record: WatchlistRecord,
  kind?: WatchlistKind | WatchlistKind[]
): boolean {
  if (!kind) return true;
  const kinds = Array.isArray(kind) ? kind : [kind];
  return kinds.includes(record.kind);
}

function matchesStatus(
  record: WatchlistRecord,
  status?: WatchlistQuery["status"],
  includeArchived = false,
  includeDeleted = false
): boolean {
  if (record.status === "deleted" && !includeDeleted) return false;
  if (record.status === "archived" && !includeArchived) return false;
  if (!status) return true;
  const statuses = Array.isArray(status) ? status : [status];
  return statuses.includes(record.status);
}

export function searchWatchlists(query?: WatchlistQuery | null): WatchlistRecord[] {
  const q = query ?? {};
  const term = safeWatchlistText(q.search, "").toLowerCase();

  let results = Array.from(watchlists.values()).filter((record) => {
    if (!matchesStatus(record, q.status, q.includeArchived, q.includeDeleted)) {
      return false;
    }
    if (!matchesKind(record, q.kind)) return false;
    if (q.pinned != null && record.pinned !== q.pinned) return false;
    if (q.favorite != null && record.favorite !== q.favorite) return false;
    if (q.owner && record.metadata.owner !== q.owner) return false;
    if (q.tag && !record.metadata.tags.includes(q.tag)) return false;
    if (term) {
      const haystack = [
        record.metadata.name,
        record.metadata.description,
        record.id,
        ...record.metadata.tags,
        ...record.symbols,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  });

  results = sortWatchlistRecords(
    results,
    q.sortBy ?? "priority",
    q.sortDirection ?? "desc"
  );

  if (q.limit != null && q.limit > 0) {
    results = results.slice(0, q.limit);
  }

  return results;
}

export function sortWatchlistRecords(
  records: WatchlistRecord[],
  sortBy: WatchlistSortField = "priority",
  direction: "asc" | "desc" = "desc"
): WatchlistRecord[] {
  const factor = direction === "asc" ? 1 : -1;
  return [...records].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return (
          factor * a.metadata.name.localeCompare(b.metadata.name)
        );
      case "created":
        return (
          factor *
          a.metadata.createdAt.localeCompare(b.metadata.createdAt)
        );
      case "updated":
        return (
          factor *
          a.metadata.updatedAt.localeCompare(b.metadata.updatedAt)
        );
      case "companies":
        return factor * (a.symbols.length - b.symbols.length);
      case "priority":
      default:
        return factor * (a.metadata.priority - b.metadata.priority);
    }
  });
}

export function filterWatchlists(
  predicate: (record: WatchlistRecord) => boolean
): WatchlistRecord[] {
  return Array.from(watchlists.values()).filter(predicate);
}

export function cacheWatchlistMetricsKey(
  id: string,
  key: string,
  now?: Date | null
): void {
  const recordId = safeWatchlistText(id, "").toLowerCase();
  if (!recordId) return;
  metricsCache.set(recordId, {
    key: safeWatchlistText(key, `metrics:${recordId}`),
    at: stamp(now),
  });
}

export function getCachedWatchlistMetricsKey(id: string): string | null {
  const entry = metricsCache.get(safeWatchlistText(id, "").toLowerCase());
  return entry?.key ?? null;
}

export function getWatchlistCacheCount(): number {
  return metricsCache.size;
}

export function resetWatchlistRegistry(): void {
  watchlists.clear();
  definitions.clear();
  metricsCache.clear();
  watchlistSeq = 0;
  builtinsRegistered = false;
}

export class WatchlistRegistry {
  registerBuiltinWatchlistDefinitions = registerBuiltinWatchlistDefinitions;
  loadWatchlistDefinitions = loadWatchlistDefinitions;
  ensureBuiltinWatchlists = ensureBuiltinWatchlists;
  createWatchlist = createWatchlistRecord;
  getWatchlist = getWatchlistRecord;
  updateWatchlist = updateWatchlistRecord;
  archiveWatchlist = archiveWatchlistRecord;
  restoreWatchlist = restoreWatchlistRecord;
  deleteWatchlist = deleteWatchlistRecord;
  cloneWatchlist = cloneWatchlistRecord;
  duplicateWatchlist = duplicateWatchlistRecord;
  pinWatchlist = pinWatchlistRecord;
  favoriteWatchlist = favoriteWatchlistRecord;
  searchWatchlists = searchWatchlists;
  sortWatchlists = sortWatchlistRecords;
  filterWatchlists = filterWatchlists;
  reset = resetWatchlistRegistry;
}
