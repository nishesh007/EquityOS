/**
 * Sprint 9D — AI Screener Engine.
 * AI Screener filtering with indexing, memoization, and lazy evaluation.
 */

import {
  collectFilterKeys,
  countActiveConditions,
  evaluateFilterGroup,
} from "@/lib/screener/filters";
import { ScreenerIndexer, intersectSets, unionSets } from "@/lib/screener/engine/indexer";
import { buildUniverseSnapshot } from "@/lib/screener/engine/universe";
import { getFilterDefinition } from "@/lib/screener/registry";
import type {
  FilterCondition,
  FilterGroup,
  FilterOperator,
  ScreenerQuery,
  ScreenerResult,
  ScreenerRow,
  ScreenerUniverseSnapshot,
} from "@/lib/screener/types";

let indexerInstance: ScreenerIndexer | null = null;
let indexedKeys: Set<string> = new Set();
const resultCache = new Map<string, ScreenerResult>();

function cacheKey(query: ScreenerQuery): string {
  return JSON.stringify({
    root: query.root,
    limit: query.limit,
    sortBy: query.sortBy,
    sortDirection: query.sortDirection,
  });
}

function ensureIndexer(universe: ScreenerUniverseSnapshot, activeKeys: Set<string>): ScreenerIndexer {
  const keysArray = Array.from(activeKeys).sort();
  const keysStr = keysArray.join(",");

  if (!indexerInstance || keysStr !== Array.from(indexedKeys).sort().join(",")) {
    indexerInstance = new ScreenerIndexer();
    indexerInstance.build(universe.rows, keysArray);
    indexedKeys = activeKeys;
  }
  return indexerInstance;
}

function tryIndexedFilter(
  indexer: ScreenerIndexer,
  condition: FilterCondition
): Set<number> | null {
  const filter = getFilterDefinition(condition.filterKey);
  if (!filter || filter.valueType === "text") {
    if (filter?.valueType === "text") {
      if (condition.operator === "contains" && typeof condition.value === "string") {
        return indexer.queryTextContains(condition.filterKey, condition.value);
      }
      if (condition.operator === "eq" && typeof condition.value === "string") {
        return indexer.queryTextContains(condition.filterKey, condition.value);
      }
    }
    return null;
  }

  const threshold = typeof condition.value === "number" ? condition.value : Number(condition.value);
  if (!Number.isFinite(threshold)) return null;

  switch (condition.operator as FilterOperator) {
    case "gt":
      return indexer.queryGreaterThan(condition.filterKey, threshold);
    case "gte":
      return indexer.queryGreaterThan(condition.filterKey, threshold - 0.0001);
    case "lt":
      return indexer.queryLessThan(condition.filterKey, threshold);
    case "lte":
      return indexer.queryLessThan(condition.filterKey, threshold + 0.0001);
    case "between": {
      const max = condition.valueTo ?? threshold;
      return indexer.queryRange(condition.filterKey, threshold, max);
    }
    default:
      return null;
  }
}

function tryIndexedGroup(
  indexer: ScreenerIndexer,
  group: FilterGroup
): Set<number> | null {
  if (group.groups.length > 0) return null;

  const indexedResults: Set<number>[] = [];
  for (const condition of group.conditions) {
    const result = tryIndexedFilter(indexer, condition);
    if (result === null) return null;
    indexedResults.push(result);
  }

  if (indexedResults.length === 0) return null;

  return group.logic === "and"
    ? intersectSets(indexedResults)
    : unionSets(indexedResults);
}

function sortRows(
  rows: ScreenerRow[],
  sortBy: string | undefined,
  direction: "asc" | "desc" = "desc"
): ScreenerRow[] {
  if (!sortBy) return rows;

  return [...rows].sort((a, b) => {
    const aVal = a.metrics[sortBy];
    const bVal = b.metrics[sortBy];

    if (typeof aVal === "string" && typeof bVal === "string") {
      return direction === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }

    const aNum = typeof aVal === "number" ? aVal : -Infinity;
    const bNum = typeof bVal === "number" ? bVal : -Infinity;
    return direction === "asc" ? aNum - bNum : bNum - aNum;
  });
}

export function runScreener(
  query: ScreenerQuery,
  universe?: ScreenerUniverseSnapshot
): ScreenerResult {
  const key = cacheKey(query);
  const cached = resultCache.get(key);
  if (cached) return cached;

  const start = performance.now();
  const snapshot = universe ?? buildUniverseSnapshot();
  const activeFilters = countActiveConditions(query.root);
  const activeKeys = collectFilterKeys(query.root);

  // Add sort key to indexed keys
  if (query.sortBy) activeKeys.add(query.sortBy);

  let matchedRows: ScreenerRow[];

  if (activeFilters === 0) {
    matchedRows = snapshot.rows;
  } else {
    const indexer = ensureIndexer(snapshot, activeKeys);
    const indexedResult = tryIndexedGroup(indexer, query.root);

    if (indexedResult !== null) {
      matchedRows = Array.from(indexedResult)
        .sort((a, b) => a - b)
        .map((idx) => snapshot.rows[idx]);
    } else {
      // Fallback to lazy row-by-row evaluation
      matchedRows = snapshot.rows.filter((row) =>
        evaluateFilterGroup(query.root, row)
      );
    }
  }

  const sorted = sortRows(matchedRows, query.sortBy, query.sortDirection ?? "desc");
  const limit = query.limit ?? 100;
  const limited = sorted.slice(0, limit);

  const result: ScreenerResult = {
    rows: limited,
    totalMatched: matchedRows.length,
    totalUniverse: snapshot.totalCount,
    executionMs: Math.round(performance.now() - start),
    activeFilters,
    query,
  };

  resultCache.set(key, result);
  return result;
}

export function getUniverse(): ScreenerUniverseSnapshot {
  return buildUniverseSnapshot();
}

export function clearScreenerCache(): void {
  resultCache.clear();
  indexerInstance = null;
  indexedKeys = new Set();
}

export function getRequiredTiers(query: ScreenerQuery): Set<"fast" | "standard" | "deep"> {
  const tiers = new Set<"fast" | "standard" | "deep">();
  const keys = collectFilterKeys(query.root);
  for (const key of keys) {
    const def = getFilterDefinition(key);
    if (def) tiers.add(def.tier);
  }
  return tiers;
}
