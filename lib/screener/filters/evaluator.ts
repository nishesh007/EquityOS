/**
 * Sprint 9D — AI Screener filter group evaluator with memoization.
 */

import { evaluateCondition } from "@/lib/screener/filters/operators";
import type { FilterGroup, ScreenerRow } from "@/lib/screener/types";

const evaluationCache = new WeakMap<ScreenerRow, Map<string, boolean>>();

function getRowCache(row: ScreenerRow): Map<string, boolean> {
  let cache = evaluationCache.get(row);
  if (!cache) {
    cache = new Map();
    evaluationCache.set(row, cache);
  }
  return cache;
}

function groupCacheKey(group: FilterGroup): string {
  const conditions = group.conditions
    .map((c) => `${c.filterKey}:${c.operator}:${c.value}:${c.valueTo ?? ""}`)
    .join("|");
  const nested = group.groups.map(groupCacheKey).join(";");
  return `${group.logic}[${conditions}](${nested})`;
}

export function evaluateFilterGroup(
  group: FilterGroup,
  row: ScreenerRow
): boolean {
  const cacheKey = groupCacheKey(group);
  const rowCache = getRowCache(row);
  const cached = rowCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const getMetric = (key: string) => row.metrics[key] ?? null;

  const conditionResults = group.conditions.map((condition) =>
    evaluateCondition(condition, getMetric)
  );
  const nestedResults = group.groups.map((nested) =>
    evaluateFilterGroup(nested, row)
  );

  const allResults = [...conditionResults, ...nestedResults];

  let result: boolean;
  if (allResults.length === 0) {
    result = true;
  } else if (group.logic === "and") {
    result = allResults.every(Boolean);
  } else {
    result = allResults.some(Boolean);
  }

  rowCache.set(cacheKey, result);
  return result;
}

export function countActiveConditions(group: FilterGroup): number {
  let count = group.conditions.length;
  for (const nested of group.groups) {
    count += countActiveConditions(nested);
  }
  return count;
}

export function collectFilterKeys(group: FilterGroup): Set<string> {
  const keys = new Set<string>();
  for (const condition of group.conditions) {
    keys.add(condition.filterKey);
  }
  for (const nested of group.groups) {
    for (const key of collectFilterKeys(nested)) {
      keys.add(key);
    }
  }
  return keys;
}

export function clearEvaluationCache(): void {
  // WeakMap clears automatically when rows are GC'd
}
