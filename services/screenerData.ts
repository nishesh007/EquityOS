/**
 * Sprint 9D — AI Screener data service.
 * Server-side universe building and screening orchestration.
 */

import { CACHE_TTL, cacheKey, getCached } from "@/lib/cache";
import { marketDataService } from "@/lib/market-data";
import {
  getFilterCount,
  runScreener,
  buildUniverseSnapshot,
  SCREENER_FILTER_REGISTRY,
  FILTER_REGISTRY_BY_CATEGORY,
  type ScreenerQuery,
  type ScreenerResult,
  type ScreenerRow,
  type ScreenerUniverseSnapshot,
  type FilterCategory,
} from "@/lib/screener";

async function enrichScreenerRows(rows: ScreenerRow[]): Promise<ScreenerRow[]> {
  const symbols = rows.map((row) => String(row.metrics.symbol ?? ""));
  const quotes = await marketDataService.getEnrichedQuotes(symbols);

  return rows.map((row) => {
    const symbol = String(row.metrics.symbol ?? "").toUpperCase();
    const quote = quotes.get(symbol);
    if (!quote || quote.availability === "unavailable") {
      return {
        ...row,
        metrics: {
          ...row.metrics,
          cmp: null,
          change_percent: null,
        },
      };
    }
    return {
      ...row,
      metrics: {
        ...row.metrics,
        cmp: quote.price,
        change_percent: quote.changePercent,
      },
      quote,
    };
  });
}

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
  const result = runScreener(query, universe);
  const enrichedRows = await enrichScreenerRows(result.rows);
  return { ...result, rows: enrichedRows };
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
