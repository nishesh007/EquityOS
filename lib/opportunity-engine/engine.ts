import { getCompanyMasterRecords } from "@/lib/company-master";
import { marketDataService } from "@/lib/market-data";
import {
  getMarketStatus,
  getTradingDateKey,
  isMarketOpen,
  isTradingDay,
} from "@/lib/market/session";
import { nextOpportunityScanAt } from "@/lib/opportunity-engine/scan-schedule";
import { buildTradeLevels } from "@/lib/opportunity-engine/levels";
import {
  constructDynamicTrade,
  projectLevelsOntoCandidate,
} from "@/lib/opportunity-engine/dynamic-trade-construction";
import {
  buildConfidenceReasonContributions,
  buildConfidenceReasons,
  formatConfidenceReasons,
} from "@/lib/opportunity-engine/reasons";
import { computeLiveAiConvictionResult } from "@/lib/opportunity-engine/conviction";
import { generatePostMarketReport } from "@/lib/opportunity-engine/post-market";
import {
  buildPipelineScanSummary,
  enrichCandidatesWithPipeline,
} from "@/lib/opportunity-engine/pipeline-enrichment";
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
  ensureTradingDayLifecycle,
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
import { OPPORTUNITY_CATEGORIES } from "@/lib/opportunity-engine/types";
import type { CategoryScanCandidate } from "@/lib/opportunity-engine/types";
import {
  buildQuoteOnlyMetrics,
  enrichMetricsWithFundamentals,
  enrichMetricsWithTechnicals,
  type LiveMetricsRecord,
  type LiveSymbolContext,
} from "@/lib/opportunity-engine/live-metrics";
import { getOhlcCandles } from "@/lib/market/ohlc-engine";
import { executeOpportunityStrategies } from "@/lib/opportunity-engine/strategy-execution";
import type { OhlcBar } from "@/lib/providers/types";
import { getTradingPipelineResult } from "@/services/marketIntelligence";
import type { TradingPipelineResult } from "@/src/modules/tradingPipeline";
import {
  countCategoryCandidates,
  emptyPipelineStageCounts,
  logPipelineStages,
} from "@/lib/opportunity-engine/pipeline-telemetry";
import { peekMemoryPersistedData } from "@/lib/opportunity-engine/persistence";

const QUOTE_BATCH_SIZE = 50;
/** Concurrent OHLC technical enrichment across the ~2500 NSE universe. */
const METRICS_CONCURRENCY = 16;

let scanInFlight: Promise<ScanResult> | null = null;

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

/**
 * Build universe metrics with technical enrichment BEFORE scoring.
 * Quote fields first, then concurrent OHLC → enrichMetricsWithTechnicals
 * so scorers see volume_ratio / has_live_technicals / RSI / EMA / ATR / etc.
 */
async function buildQuoteMetricsRows(
  contexts: LiveSymbolContext[],
  quoteMap: Map<string, Awaited<ReturnType<typeof marketDataService.getEnrichedQuote>>>
): Promise<{
  rows: LiveMetricsRecord[];
  candlesBySymbol: Map<string, OhlcBar[]>;
  quoteOnlyCount: number;
  enrichedCount: number;
}> {
  const baseRows: LiveMetricsRecord[] = [];

  for (const ctx of contexts) {
    const quote = quoteMap.get(ctx.symbol);
    if (!quote) continue;
    const metrics = buildQuoteOnlyMetrics(ctx, quote);
    if (metrics) baseRows.push(metrics);
  }

  const candlesBySymbol = new Map<string, OhlcBar[]>();
  const rows = await mapWithConcurrency(
    baseRows,
    METRICS_CONCURRENCY,
    async (row) => {
      const symbol = String(row.symbol ?? "").toUpperCase();
      const ohlc = await getOhlcCandles(symbol, "3M");
      candlesBySymbol.set(symbol, ohlc.data);
      return enrichMetricsWithTechnicals(row, ohlc.data);
    }
  );

  let enrichedCount = 0;
  for (const row of rows) {
    if (row.has_live_technicals === 1) enrichedCount += 1;
  }

  return {
    rows,
    candlesBySymbol,
    quoteOnlyCount: rows.length - enrichedCount,
    enrichedCount,
  };
}

/** Fundamentals only — technicals already applied on the full universe. */
async function enrichFundamentalsOnRows(
  rows: LiveMetricsRecord[],
  fundamentalsSymbols: Set<string>
): Promise<LiveMetricsRecord[]> {
  if (fundamentalsSymbols.size === 0) return rows;

  const bySymbol = new Map(
    rows.map((row) => [String(row.symbol ?? "").toUpperCase(), row] as const)
  );
  const targets = [...fundamentalsSymbols].filter((symbol) => bySymbol.has(symbol));

  await mapWithConcurrency(targets, METRICS_CONCURRENCY, async (symbol) => {
    const row = bySymbol.get(symbol);
    if (!row) return;
    bySymbol.set(symbol, await enrichMetricsWithFundamentals(row, symbol));
  });

  return rows.map(
    (row) => bySymbol.get(String(row.symbol ?? "").toUpperCase()) ?? row
  );
}

/** Session (1D) bars only for scalp strategy categories — avoids doubling OHLC cost for the full shortlist. */
async function prefetchSessionCandles(
  symbols: readonly string[]
): Promise<Map<string, OhlcBar[]>> {
  const unique = [...new Set(symbols.map((symbol) => symbol.toUpperCase()).filter(Boolean))];
  const sessionCandlesBySymbol = new Map<string, OhlcBar[]>();
  await mapWithConcurrency(unique, METRICS_CONCURRENCY, async (symbol) => {
    const session = await getOhlcCandles(symbol, "1D");
    sessionCandlesBySymbol.set(symbol, session.data);
  });
  return sessionCandlesBySymbol;
}

const SCALP_SESSION_CATEGORIES = new Set<OpportunityCategory>([
  "intraday",
  "mean_reversion",
  "relative_volume",
]);

function toOpportunityCandidate(
  candidate: CategoryScanCandidate,
  rank: number,
  price: number,
  quote?: Awaited<ReturnType<typeof marketDataService.getEnrichedQuote>>,
  atr?: number | null,
  fullMetrics?: LiveMetricsRecord,
  marketRegimeScore?: number | null
): OpportunityCandidate {
  const metrics = fullMetrics ?? candidate.metrics;
  const levels = buildTradeLevels(price, candidate.side, candidate.category, atr ?? null, {
    metrics,
    conviction: candidate.aiConvictionScore,
    confidence: candidate.confidencePercent,
  });
  const now = new Date().toISOString();
  const conviction = computeLiveAiConvictionResult(
    metrics,
    candidate.category,
    candidate.side,
    levels.riskReward,
    marketRegimeScore
  );
  const aiConvictionScore = conviction.finalScore;
  const confidenceReasons = buildConfidenceReasons(
    metrics,
    candidate.category,
    candidate.side,
    levels.riskReward
  );
  const confidenceReasonContributions = buildConfidenceReasonContributions(
    metrics,
    candidate.category,
    candidate.side,
    levels.riskReward
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
    target3: levels.target3,
    riskReward: levels.riskReward,
    confidencePercent: candidate.confidencePercent,
    reason,
    confidenceReasons,
    confidenceReasonContributions,
    convictionComponents: conviction.components,
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
  quoteMap: Map<string, Awaited<ReturnType<typeof marketDataService.getEnrichedQuote>>>,
  marketRegimeScore?: number | null
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
    return toOpportunityCandidate(
      candidate,
      index + 1,
      price,
      quote,
      atr,
      metrics,
      marketRegimeScore
    );
  });
}

async function executeScan(force = false): Promise<ScanResult> {
  const start = Date.now();
  const tradingDate = getTradingDateKey();

  // Trading-day boundary: archive prior day and clear active registry first.
  ensureTradingDayLifecycle(tradingDate);
  unfreezeIfMarketOpen();

  const current = getOpportunityEngineState();
  if (current.isFrozen && !force) {
    logPipelineStages("scan-skipped-frozen", emptyPipelineStageCounts(), {
      reason: "frozen",
      stored: countCategoryCandidates(current.categories),
    });
    return {
      state: current,
      added: 0,
      removed: 0,
      updated: 0,
      durationMs: Date.now() - start,
      symbolsScanned: 0,
    };
  }

  // Do not mutate opportunity lists on weekends/holidays (non-session days),
  // unless force=true (one-time institutional seed / manual refresh).
  // Post-close freeze still runs on trading days after 15:30.
  if (!force && !isTradingDay() && getMarketStatus() !== "post_close") {
    logPipelineStages("scan-skipped-non-trading-day", emptyPipelineStageCounts(), {
      reason: "non_trading_day",
      stored: countCategoryCandidates(current.categories),
      memoryPopulated: Boolean(peekMemoryPersistedData()?.state),
    });
    return {
      state: current,
      added: 0,
      removed: 0,
      updated: 0,
      durationMs: Date.now() - start,
      symbolsScanned: 0,
    };
  }

  if (force && !isTradingDay()) {
    console.info(
      "[OpportunityEngine] Forced scan on non-trading day (seed / manual refresh)"
    );
  }

  setScanning(true);

  try {
    // Trading Pipeline first — shared Context → Regime → Eligibility SSOT.
    let pipeline: TradingPipelineResult;
    try {
      pipeline = await getTradingPipelineResult({ forceRefresh: force });
    } catch {
      pipeline = await getTradingPipelineResult({ forceRefresh: true });
    }
    const regimeScore = pipeline.confidence.score;
    const pipelineSummary = buildPipelineScanSummary(pipeline);

    const contexts = buildSymbolContexts();
    setUniverseSize(contexts.length);

    const symbols = contexts.map((ctx) => ctx.symbol);
    const quoteMap = await fetchQuotesInBatches(symbols);
    const built = await buildQuoteMetricsRows(contexts, quoteMap);
    const candlesBySymbol = built.candlesBySymbol;
    let metricsRows = built.rows;
    const symbolsScanned = metricsRows.length;

    const stageCounts = emptyPipelineStageCounts();
    stageCounts.universeReceived = contexts.length;
    stageCounts.quotesReceived = quoteMap.size;
    stageCounts.metricsScanned = symbolsScanned;

    // Score only after technical enrichment (no quote-only shortlist gate).
    const categoryShortlists = scanLiveMetrics(metricsRows);
    const swingPrefetchSymbols = selectSwingPrefetchSymbols(metricsRows);
    const shortlistSymbols = [
      ...new Set([
        ...collectShortlistSymbols(categoryShortlists),
        ...swingPrefetchSymbols,
      ]),
    ];
    stageCounts.shortlisted = shortlistSymbols.length;

    logPipelineStages("after-market-data", stageCounts, {
      quoteMapSize: quoteMap.size,
      metricsRows: metricsRows.length,
      quoteOnlyCount: built.quoteOnlyCount,
      enrichedCount: built.enrichedCount,
    });

    const fundamentalsSymbols = new Set<string>([
      ...swingPrefetchSymbols,
      ...categoryShortlists.swing.map((candidate) => candidate.symbol.toUpperCase()),
      ...categoryShortlists.ai_high_conviction.map((candidate) =>
        candidate.symbol.toUpperCase()
      ),
    ]);

    metricsRows = await enrichFundamentalsOnRows(metricsRows, fundamentalsSymbols);

    const metricsBySymbol = new Map<string, LiveMetricsRecord>();
    for (const row of metricsRows) {
      const symbol = String(row.symbol ?? "").toUpperCase();
      if (symbol) metricsBySymbol.set(symbol, row);
    }

    const fullRescan = scanLiveMetrics(metricsRows);

    let totalAdded = 0;
    let totalRemoved = 0;
    let totalUpdated = 0;
    let totalRawCandidates = 0;
    let totalPipelinePassed = 0;
    let totalStoredCandidates = 0;

    for (const category of OPPORTUNITY_CATEGORIES) {
      const rawCandidates = buildCategoryCandidates(
        category,
        fullRescan[category],
        metricsBySymbol,
        quoteMap,
        regimeScore
      );
      totalRawCandidates += rawCandidates.length;
      // Rank + gate through Trading Pipeline eligibility (no bypass).
      const pipelineCandidates = enrichCandidatesWithPipeline(rawCandidates, pipeline);
      totalPipelinePassed += pipelineCandidates.length;
      const sessionCandlesBySymbol = SCALP_SESSION_CATEGORIES.has(category)
        ? await prefetchSessionCandles(
            pipelineCandidates.map((candidate) => candidate.symbol)
          )
        : new Map<string, OhlcBar[]>();
      const candidates = pipelineCandidates.flatMap((candidate) => {
          const dailyCandles =
            candlesBySymbol.get(candidate.symbol) ?? [];
          const sessionCandles =
            sessionCandlesBySymbol.get(candidate.symbol) ?? dailyCandles;
          const execution = executeOpportunityStrategies(
            candidate,
            pipeline,
            dailyCandles,
            sessionCandles
          );
          if (!execution.primary) {
            // Restore designed OE fallback path: keep pipeline-eligible
            // scanner setups when Strategy Engine returns IGNORE / no primary.
            // Does not invent trade levels — candidate already passed OE + pipeline gates.
            if (candidate.pipelineEligible) {
              return [
                {
                  ...candidate,
                  rejectedReasons: [
                    ...(candidate.rejectedReasons ?? []),
                    ...execution.rejectedReasons,
                    "Strategy Engine returned no actionable signal — retained for Opportunity Engine fallback.",
                  ],
                },
              ];
            }
            return [];
          }
          const frameworkBoost = execution.longTermRanking?.frameworkScore;
          const consensusBoost = execution.consensus?.combinedScore;
          // Sprint 9F.1 — re-project candidate trade levels from Strategy Engine
          // signal (or dynamic ATR/structure) so OE fields are never category templates.
          const dynamicLevels = constructDynamicTrade({
            price:
              candidate.quote?.price ??
              (typeof candidate.scanMetrics?.cmp === "number"
                ? Number(candidate.scanMetrics.cmp)
                : (candidate.entryZone.low + candidate.entryZone.high) / 2),
            side: candidate.side,
            category: candidate.category,
            metrics: candidate.scanMetrics,
            strategyId: execution.primary.strategyId,
            strategyName: execution.primary.strategy,
            strategySignal: execution.primary,
            supportingStrategyNames:
              execution.consensus?.supportingStrategies ?? [],
            conviction:
              execution.consensus?.conviction ?? execution.primary.conviction,
            confidence:
              execution.consensus?.finalConfidence ??
              execution.primary.confidence,
          });
          const projected = projectLevelsOntoCandidate(dynamicLevels);
          const executedCandidate: OpportunityCandidate = {
            ...candidate,
            ...projected,
            strategyId: execution.primary.strategyId,
            strategyName: execution.primary.strategy,
            strategySignal: {
              ...execution.primary,
              // Keep signal levels authoritative; holding estimated dynamically.
              holdingPeriod: dynamicLevels.holdingPeriod,
            },
            strategySignals: execution.signals.map((signal) =>
              signal.strategyId === execution.primary!.strategyId
                ? { ...signal, holdingPeriod: dynamicLevels.holdingPeriod }
                : signal
            ),
            executedStrategyIds: execution.executedStrategyIds,
            strategyConsensus: execution.consensus ?? undefined,
            longTermRanking: execution.longTermRanking ?? undefined,
            frameworkScore: frameworkBoost,
            opportunityScore:
              typeof frameworkBoost === "number" &&
              typeof consensusBoost === "number"
                ? Math.round(frameworkBoost * 0.65 + consensusBoost * 0.35)
                : candidate.opportunityScore,
            confidencePercent:
              execution.consensus?.finalConfidence ??
              candidate.confidencePercent,
            eligibleReasons: execution.primary.reasons,
            rejectedReasons: execution.rejectedReasons,
          };
          return [executedCandidate];
        });
      const { added, removed, updated } = mergeCategoryResults(category, candidates);
      totalAdded += added;
      totalRemoved += removed;
      totalUpdated += updated;
      totalStoredCandidates += candidates.length;
    }

    const durationMs = Date.now() - start;
    const nextScanAt = nextOpportunityScanAt();

    finalizeScan(
      nextScanAt,
      {
        durationMs,
        symbolsScanned,
        added: totalAdded,
        removed: totalRemoved,
        updated: totalUpdated,
      },
      pipelineSummary
    );

    if (!isMarketOpen() && getMarketStatus() === "post_close") {
      const sessionDate = getTradingDateKey();
      const liveState = getOpportunityEngineState();
      // Regenerate post-market only for the current trading day.
      if (
        liveState.tradingDate === sessionDate &&
        liveState.postMarket?.sessionDate !== sessionDate
      ) {
        const report = generatePostMarketReport(liveState, sessionDate);
        freezeScan(report);
      }
    }

    const finalState = getOpportunityEngineState();
    stageCounts.rawCandidates = totalRawCandidates;
    stageCounts.pipelinePassed = totalPipelinePassed;
    stageCounts.scoredStored = totalStoredCandidates;
    stageCounts.recommendationsStored =
      finalState.recommendations?.length ??
      countCategoryCandidates(finalState.categories);
    logPipelineStages("after-scan-store", stageCounts, {
      memoryPopulated: Boolean(peekMemoryPersistedData()?.state),
      added: totalAdded,
      removed: totalRemoved,
      updated: totalUpdated,
      durationMs,
    });

    return {
      state: finalState,
      added: totalAdded,
      removed: totalRemoved,
      updated: totalUpdated,
      durationMs,
      symbolsScanned,
      quoteOnlyCount: built.quoteOnlyCount,
      enrichedCount: built.enrichedCount,
    };
  } catch (error) {
    clearScanningOnError();
    throw error;
  }
}

export async function runOpportunityScan(force = false): Promise<ScanResult> {
  // Always coalesce — force must not fork a second full-universe scan while one runs.
  if (scanInFlight) {
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

