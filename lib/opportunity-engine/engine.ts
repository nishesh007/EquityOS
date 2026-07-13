import { getCompanyMasterRecords } from "@/lib/company-master";
import { marketDataService } from "@/lib/market-data";
import { isMarketOpen, getMarketStatus } from "@/lib/market/session";
import { buildTradeLevels } from "@/lib/opportunity-engine/levels";
import {
  buildConfidenceReasons,
  formatConfidenceReasons,
} from "@/lib/opportunity-engine/reasons";
import { computeLiveAiConviction } from "@/lib/opportunity-engine/conviction";
import { generatePostMarketReport } from "@/lib/opportunity-engine/post-market";
import {
  collectShortlistSymbols,
  rescoreCategory,
  scanLiveMetrics,
  scoreSwingRelaxed,
  selectSwingPrefetchSymbols,
  selectTopCandidatesWithFallback,
} from "@/lib/opportunity-engine/scanner";
import {
  clearScanningOnError,
  finalizeScan,
  freezeScan,
  getOpportunityEngineState,
  mergeCategoryResults,
  setScanning,
  setUniverseSize,
  unfreezeIfMarketOpen,
} from "@/lib/opportunity-engine/store";
import type {
  OpportunityCandidate,
  OpportunityCategory,
  ScanResult,
} from "@/lib/opportunity-engine/types";
import {
  OPPORTUNITY_CATEGORIES,
  SCAN_INTERVAL_MS,
} from "@/lib/opportunity-engine/types";
import type { CategoryScanCandidate } from "@/lib/opportunity-engine/types";
import {
  buildQuoteOnlyMetrics,
  enrichMetricsWithFundamentals,
  enrichMetricsWithTechnicals,
  type LiveMetricsRecord,
  type LiveSymbolContext,
} from "@/lib/opportunity-engine/live-metrics";
import { getOhlcCandles } from "@/lib/market/ohlc-engine";

const QUOTE_BATCH_SIZE = 50;
const METRICS_CONCURRENCY = 8;

let scanInFlight: Promise<ScanResult> | null = null;

function getISTDateKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function fetchQuotesInBatches(symbols: string[]) {
  const quoteMap = new Map<
    string,
    Awaited<ReturnType<typeof marketDataService.getEnrichedQuote>>
  >();

  for (let i = 0; i < symbols.length; i += QUOTE_BATCH_SIZE) {
    const batch = symbols.slice(i, i + QUOTE_BATCH_SIZE);
    const batchQuotes = await marketDataService.getEnrichedQuotes(batch);
    for (const [symbol, quote] of batchQuotes) {
      quoteMap.set(symbol.toUpperCase(), quote);
    }
  }

  return quoteMap;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker(): Promise<void> {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await mapper(items[current]);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

function buildSymbolContexts(): LiveSymbolContext[] {
  return getCompanyMasterRecords().map((record) => ({
    symbol: record.displaySymbol.toUpperCase(),
    name: record.name,
    sector: record.sector || "Unknown",
    industry: record.industry || "Unknown",
  }));
}

async function buildQuoteMetricsRows(
  contexts: LiveSymbolContext[],
  quoteMap: Map<string, Awaited<ReturnType<typeof marketDataService.getEnrichedQuote>>>
): Promise<LiveMetricsRecord[]> {
  const rows: LiveMetricsRecord[] = [];

  for (const ctx of contexts) {
    const quote = quoteMap.get(ctx.symbol);
    if (!quote) continue;
    const metrics = buildQuoteOnlyMetrics(ctx, quote);
    if (metrics) rows.push(metrics);
  }

  return rows;
}

async function enrichMetricsRows(
  rows: LiveMetricsRecord[],
  options?: { fundamentalsSymbols?: Set<string> }
): Promise<LiveMetricsRecord[]> {
  const fundamentalsSymbols = options?.fundamentalsSymbols ?? new Set<string>();
  return mapWithConcurrency(rows, METRICS_CONCURRENCY, async (row) => {
    const symbol = String(row.symbol ?? "").toUpperCase();
    const ohlc = await getOhlcCandles(symbol, "3M");
    let enriched = await enrichMetricsWithTechnicals(row, ohlc.data);
    if (fundamentalsSymbols.has(symbol)) {
      enriched = await enrichMetricsWithFundamentals(enriched, symbol);
    }
    return enriched;
  });
}

function toOpportunityCandidate(
  candidate: CategoryScanCandidate,
  rank: number,
  price: number,
  quote?: Awaited<ReturnType<typeof marketDataService.getEnrichedQuote>>,
  atr?: number | null,
  fullMetrics?: LiveMetricsRecord
): OpportunityCandidate {
  const levels = buildTradeLevels(price, candidate.side, candidate.category, atr ?? null);
  const now = new Date().toISOString();
  const metrics = fullMetrics ?? candidate.metrics;
  const aiConvictionScore = computeLiveAiConviction(
    metrics,
    candidate.category,
    candidate.side,
    levels.riskReward
  );
  const confidenceReasons = buildConfidenceReasons(
    metrics,
    candidate.category,
    candidate.side
  );
  const reason =
    confidenceReasons.length > 0
      ? formatConfidenceReasons(confidenceReasons)
      : candidate.reason;

  return {
    id: `${candidate.symbol.toUpperCase()}:${candidate.category}`,
    symbol: candidate.symbol.toUpperCase(),
    company: candidate.company,
    category: candidate.category,
    side: candidate.side,
    rank,
    previousRank: null,
    aiConvictionScore,
    entryZone: levels.entryZone,
    stopLoss: levels.stopLoss,
    target1: levels.target1,
    target2: levels.target2,
    riskReward: levels.riskReward,
    confidencePercent: candidate.confidencePercent,
    reason,
    confidenceReasons,
    scanMetrics: metrics,
    firstDetectedAt: now,
    lastDetectedAt: now,
    lastUpdatedAt: now,
    timeHorizon: levels.timeHorizon,
    quote,
  };
}

function buildCategoryCandidates(
  category: OpportunityCategory,
  shortlist: CategoryScanCandidate[],
  metricsBySymbol: Map<string, LiveMetricsRecord>,
  quoteMap: Map<string, Awaited<ReturnType<typeof marketDataService.getEnrichedQuote>>>
): OpportunityCandidate[] {
  const rescored: CategoryScanCandidate[] = [];

  for (const item of shortlist) {
    const symbol = item.symbol.toUpperCase();
    const metrics = metricsBySymbol.get(symbol);
    if (!metrics) continue;

    const rescoredCandidate = rescoreCategory(category, metrics);
    if (!rescoredCandidate) continue;

    const quote = quoteMap.get(symbol);
    const price = quote?.price ?? (typeof metrics.cmp === "number" ? metrics.cmp : 0);
    if (price <= 0) continue;

    rescored.push(rescoredCandidate);
  }

  let fallback: CategoryScanCandidate[] = [];
  if (category === "swing" && rescored.length === 0) {
    for (const metrics of metricsBySymbol.values()) {
      const relaxed = scoreSwingRelaxed(metrics);
      if (!relaxed) continue;
      const symbol = relaxed.symbol.toUpperCase();
      const quote = quoteMap.get(symbol);
      const price = quote?.price ?? (typeof metrics.cmp === "number" ? metrics.cmp : 0);
      if (price <= 0) continue;
      fallback.push(relaxed);
    }
  }

  const top = selectTopCandidatesWithFallback(category, rescored, fallback);

  return top.map((candidate, index) => {
    const symbol = candidate.symbol.toUpperCase();
    const quote = quoteMap.get(symbol);
    const metrics = metricsBySymbol.get(symbol);
    const price =
      quote?.price ??
      (typeof metrics?.cmp === "number" ? metrics.cmp : 0);
    const atr = typeof metrics?.atr === "number" ? metrics.atr : null;
    return toOpportunityCandidate(candidate, index + 1, price, quote, atr, metrics);
  });
}

async function executeScan(force = false): Promise<ScanResult> {
  const start = Date.now();
  unfreezeIfMarketOpen();

  const current = getOpportunityEngineState();
  if (current.isFrozen && !force) {
    return {
      state: current,
      added: 0,
      removed: 0,
      updated: 0,
      durationMs: Date.now() - start,
      symbolsScanned: 0,
    };
  }

  setScanning(true);

  try {
    const contexts = buildSymbolContexts();
    setUniverseSize(contexts.length);

    const symbols = contexts.map((ctx) => ctx.symbol);
    const quoteMap = await fetchQuotesInBatches(symbols);
    const quoteMetricsRows = await buildQuoteMetricsRows(contexts, quoteMap);
    const symbolsScanned = quoteMetricsRows.length;

    const categoryShortlists = scanLiveMetrics(quoteMetricsRows);
    const swingPrefetchSymbols = selectSwingPrefetchSymbols(quoteMetricsRows);
    const shortlistSymbols = [
      ...new Set([
        ...collectShortlistSymbols(categoryShortlists),
        ...swingPrefetchSymbols,
      ]),
    ];

    const shortlistRows = quoteMetricsRows.filter((row) =>
      shortlistSymbols.includes(String(row.symbol ?? "").toUpperCase())
    );

    const fundamentalsSymbols = new Set<string>([
      ...swingPrefetchSymbols,
      ...categoryShortlists.swing.map((candidate) => candidate.symbol.toUpperCase()),
      ...categoryShortlists.ai_high_conviction.map((candidate) =>
        candidate.symbol.toUpperCase()
      ),
    ]);

    const enrichedRows = await enrichMetricsRows(shortlistRows, {
      fundamentalsSymbols,
    });

    const metricsBySymbol = new Map<string, LiveMetricsRecord>();
    for (const row of enrichedRows) {
      const symbol = String(row.symbol ?? "").toUpperCase();
      if (symbol) metricsBySymbol.set(symbol, row);
    }

    const fullRescan = scanLiveMetrics(enrichedRows);

    let totalAdded = 0;
    let totalRemoved = 0;
    let totalUpdated = 0;

    for (const category of OPPORTUNITY_CATEGORIES) {
      const candidates = buildCategoryCandidates(
        category,
        fullRescan[category],
        metricsBySymbol,
        quoteMap
      );
      const { added, removed, updated } = mergeCategoryResults(category, candidates);
      totalAdded += added;
      totalRemoved += removed;
      totalUpdated += updated;
    }

    const durationMs = Date.now() - start;
    const nextScanAt = isMarketOpen()
      ? new Date(Date.now() + SCAN_INTERVAL_MS).toISOString()
      : null;

    finalizeScan(nextScanAt, {
      durationMs,
      symbolsScanned,
      added: totalAdded,
      removed: totalRemoved,
      updated: totalUpdated,
    });

    if (!isMarketOpen() && getMarketStatus() === "post_close") {
      const report = generatePostMarketReport(getOpportunityEngineState(), getISTDateKey());
      freezeScan(report);
    }

    return {
      state: getOpportunityEngineState(),
      added: totalAdded,
      removed: totalRemoved,
      updated: totalUpdated,
      durationMs,
      symbolsScanned,
    };
  } catch (error) {
    clearScanningOnError();
    throw error;
  }
}

export async function runOpportunityScan(force = false): Promise<ScanResult> {
  if (scanInFlight && !force) {
    return scanInFlight;
  }

  const promise = executeScan(force).finally(() => {
    scanInFlight = null;
  });

  scanInFlight = promise;
  return promise;
}

export function getOpportunityState() {
  return getOpportunityEngineState();
}

export function getCategoryOpportunities(category: OpportunityCategory): OpportunityCandidate[] {
  return getOpportunityEngineState().categories[category] ?? [];
}

