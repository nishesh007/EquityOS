/**
 * Sprint 9D — AI Screener data service.
 * Server-side universe building and screening orchestration.
 */

import { CACHE_TTL, cacheKey, getCached } from "@/lib/cache";
import {
  getFilterCount,
  runScreener,
  buildUniverseSnapshot,
  SCREENER_FILTER_REGISTRY,
  FILTER_REGISTRY_BY_CATEGORY,
  type ScreenerQuery,
  type ScreenerResult,
  type ScreenerUniverseSnapshot,
  type FilterCategory,
} from "@/lib/screener";

export interface ScreenerCatalog {
  filterCount: number;
  categories: Record<FilterCategory, number>;
  filters: typeof SCREENER_FILTER_REGISTRY;
}

export async function fetchScreenerUniverse(): Promise<ScreenerUniverseSnapshot> {
  return getCached(
    {
      key: cacheKey("screener-universe"),
      ttlMs: CACHE_TTL.FUNDAMENTALS,
    },
    async () => buildUniverseSnapshot()
  );
}

export async function fetchScreenerCatalog(): Promise<ScreenerCatalog> {
  return getCached(
    {
      key: cacheKey("screener-catalog"),
      ttlMs: CACHE_TTL.DAILY,
    },
    async () => {
      const categories = Object.entries(FILTER_REGISTRY_BY_CATEGORY).reduce<
        Record<string, number>
      >((acc, [cat, filters]) => {
        acc[cat] = filters.length;
        return acc;
      }, {});

      return {
        filterCount: getFilterCount(),
        categories: categories as Record<FilterCategory, number>,
        filters: SCREENER_FILTER_REGISTRY,
      };
    }
  );
}

export async function executeScreener(query: ScreenerQuery): Promise<ScreenerResult> {
  const universe = await fetchScreenerUniverse();
  return runScreener(query, universe);
}

export async function fetchScreenerInitialData(): Promise<{
  universe: ScreenerUniverseSnapshot;
  catalog: ScreenerCatalog;
}> {
  const [universe, catalog] = await Promise.all([
    fetchScreenerUniverse(),
    fetchScreenerCatalog(),
  ]);
  return { universe, catalog };
}
