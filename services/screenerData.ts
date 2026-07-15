/**
 * Sprint 9D — AI Screener data service.
 * Server-side universe building and screening orchestration.
 * Bridges lib/screener filter engine with src/core/screener composition layer.
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
import {
  clearCache as clearInstitutionalScreenCache,
  getMetrics as getInstitutionalScreenMetrics,
  getResults as getInstitutionalScreenResults,
  listScreens,
  registerAIScreener,
  registerScreen,
  runScreen,
  runTechnicalScreen,
  runFundamentalScreen,
  runMultiFactorScreen,
  runEarningsScreen,
  runNewsScreen,
  runCorporateActionScreen,
  runManagementScreen,
  runEventScreen,
  runPortfolioScreen,
  runWatchlistScreen,
  runOpportunityScreen,
  buildExplainability,
  buildEventExplainability,
  buildInstitutionalInsights,
  scoreCandidate,
  scoreEventCandidate,
  scoreInstitutionalCandidate,
  generateResearchPriority,
  runStrategy,
  listStrategies,
  listTemplates,
  SCREEN_INTELLIGENCE_EMPTY,
  BUILTIN_TEMPLATE_IDS,
  type ScreenEngineScores,
  type ScreenRunOptions,
  type ScreenSnapshot,
  type ScreenUniverseCandidate,
  type IntelligenceScreenResult,
  type MultiFactorScreenOptions,
  type ScreenEventCandidate,
  type EventScreenResult,
  type EventCorrelationOptions,
  type InstitutionalCandidate,
  type InstitutionalScreenResult,
  type PortfolioScreenOptions,
  type WatchlistScreenOptions,
  type OpportunityScreenOptions,
} from "@/src/core/screener";

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

/** Map filter-engine rows into institutional screener candidates. */
export function toScreenUniverseCandidates(
  rows: ScreenerRow[]
): ScreenUniverseCandidate[] {
  return rows.map((row) => ({
    ticker: row.symbol,
    company: row.name,
    sector: row.sector,
    industry: row.industry,
    price:
      typeof row.metrics.cmp === "number"
        ? row.metrics.cmp
        : typeof row.quote?.price === "number"
          ? row.quote.price
          : null,
    marketCap:
      typeof row.metrics.market_cap === "number" ? row.metrics.market_cap : null,
    metrics: row.metrics,
  }));
}

/**
 * Run an institutional AI screen composing Opportunity / Trust / Validation scores.
 * Used by /screener, /dashboard, /results, and Research surfaces.
 */
export function runInstitutionalScreen(
  screenId: string,
  options?: ScreenRunOptions & {
    rows?: ScreenerRow[];
    engineScores?: ScreenEngineScores[];
  }
): ScreenSnapshot {
  registerAIScreener();
  const universe =
    options?.universe ??
    (options?.rows ? toScreenUniverseCandidates(options.rows) : undefined);
  return runScreen(screenId, {
    ...options,
    universe,
    engineScores: options?.engineScores,
  });
}

export {
  clearInstitutionalScreenCache,
  getInstitutionalScreenMetrics,
  getInstitutionalScreenResults,
  listScreens,
  registerAIScreener,
  registerScreen,
  runTechnicalScreen,
  runFundamentalScreen,
  runMultiFactorScreen,
  runEarningsScreen,
  runNewsScreen,
  runCorporateActionScreen,
  runManagementScreen,
  runEventScreen,
  runPortfolioScreen,
  runWatchlistScreen,
  runOpportunityScreen,
  runStrategy,
  listStrategies,
  listTemplates,
};

/** Health/status bridge for /dashboard, /results, Research, /screener, /ai/screener. */
export function fetchInstitutionalScreenerHealth(): {
  registered: boolean;
  screenCount: number;
  metrics: ReturnType<typeof getInstitutionalScreenMetrics>;
  emptyMessage: string;
  technicalFilters: number;
  fundamentalFilters: number;
  earningsScreens: number;
  newsScreens: number;
  corporateActionScreens: number;
  portfolioScreens: number;
  watchlistScreens: number;
  intelligenceReady: boolean;
  eventIntelligenceReady: boolean;
  institutionalReady: boolean;
  strategyReady: boolean;
  strategyTemplateCount: number;
} {
  const registration = registerAIScreener();
  const templates = listTemplates({ origin: "built-in" });
  return {
    registered: registration.registered || registration.skipped,
    screenCount: listScreens({ enabledOnly: true }).length,
    metrics: getInstitutionalScreenMetrics(),
    emptyMessage: getInstitutionalScreenResults().emptyMessage,
    technicalFilters: 19,
    fundamentalFilters: 19,
    earningsScreens: 15,
    newsScreens: 12,
    corporateActionScreens: 14,
    portfolioScreens: 11,
    watchlistScreens: 10,
    intelligenceReady: true,
    eventIntelligenceReady: true,
    institutionalReady: true,
    strategyReady: true,
    strategyTemplateCount:
      templates.length > 0 ? templates.length : BUILTIN_TEMPLATE_IDS.length,
  };
}

/**
 * Run multi-factor / technical / fundamental institutional screens
 * from filter-engine universe rows (composition only).
 */
export function runIntelligenceScreen(
  mode: "technical" | "fundamental" | "multi-factor",
  options?: MultiFactorScreenOptions & { rows?: ScreenerRow[] }
): IntelligenceScreenResult {
  registerAIScreener();
  const universe =
    options?.universe ??
    (options?.rows ? toScreenUniverseCandidates(options.rows) : undefined);
  const payload = { ...options, universe };
  if (mode === "technical") return runTechnicalScreen(payload);
  if (mode === "fundamental") return runFundamentalScreen(payload);
  return runMultiFactorScreen(payload);
}

/** Company / Research Drawer — explainability for a single ticker. */
export function fetchSymbolScreenerInsight(input: {
  ticker: string;
  company?: string | null;
  metrics?: Record<string, number | string | null | undefined>;
  price?: number | null;
  engineScores?: ScreenEngineScores;
  event?: ScreenEventCandidate;
}): {
  score: number;
  eventScore: number;
  reasonSummary: string;
  emptyMessage: string;
  whyMatched: string;
} {
  registerAIScreener();
  const candidate: ScreenUniverseCandidate = {
    ticker: input.ticker,
    company: input.company,
    price: input.price,
    metrics: input.metrics,
  };
  const factors = scoreCandidate(candidate, input.engineScores);
  const explain = buildExplainability({
    ticker: input.ticker,
    company: input.company,
    matchedRules: input.engineScores?.matchedRules ?? [],
    failedRules: [],
    factors,
    reasonSummary: input.engineScores?.reasonSummary,
  });

  let eventScore = 0;
  let eventWhy = explain.whyMatched;
  if (input.event) {
    const eventFactors = scoreEventCandidate({
      ...input.event,
      ticker: input.ticker,
      company: input.company ?? input.event.company,
    });
    eventScore = eventFactors.finalEventScore;
    const eventExplain = buildEventExplainability({
      ticker: input.ticker,
      company: input.company,
      matchedRules: input.event.tags ?? [],
      supportingEvent: input.event.upcomingEvent,
      factors: eventFactors,
      reasonSummary: input.event.reasonSummary,
      evidence: input.event.evidence,
    });
    if (!eventExplain.empty) {
      eventWhy = eventExplain.whyMatched;
    }
  }

  return {
    score: factors.finalAiScreenerScore,
    eventScore,
    reasonSummary: explain.aiReasoning,
    emptyMessage: explain.empty
      ? SCREEN_INTELLIGENCE_EMPTY.awaitingScreening
      : "",
    whyMatched: eventWhy,
  };
}

/** Run correlated event screen for dashboard / AI screener surfaces. */
export function runEventIntelligenceScreen(
  options?: EventCorrelationOptions
): EventScreenResult {
  registerAIScreener();
  return runEventScreen(options);
}

/** Portfolio / watchlist / opportunity institutional screens. */
export function runInstitutionalIntelligenceScreen(
  mode: "portfolio" | "watchlist" | "opportunity",
  options?: {
    holdings?: InstitutionalCandidate[];
    items?: InstitutionalCandidate[];
    opportunities?: InstitutionalCandidate[];
  } & PortfolioScreenOptions &
    WatchlistScreenOptions &
    OpportunityScreenOptions
): InstitutionalScreenResult {
  registerAIScreener();
  if (mode === "portfolio") {
    return runPortfolioScreen({
      holdings: options?.holdings,
      screens: options?.screens as PortfolioScreenOptions["screens"],
      resultLimit: options?.resultLimit,
      minMatches: options?.minMatches,
    });
  }
  if (mode === "watchlist") {
    return runWatchlistScreen({
      items: options?.items,
      screens: options?.screens as WatchlistScreenOptions["screens"],
      resultLimit: options?.resultLimit,
      minMatches: options?.minMatches,
    });
  }
  return runOpportunityScreen({
    opportunities: options?.opportunities,
    resultLimit: options?.resultLimit,
    minInstitutionalScore: options?.minInstitutionalScore,
    minConviction: options?.minConviction,
  });
}
