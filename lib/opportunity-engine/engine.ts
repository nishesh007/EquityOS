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

const QUOTE_BATCH_SIZE = 50;
const METRICS_CONCURRENCY = 8;

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
): Promise<{
  rows: LiveMetricsRecord[];
  candlesBySymbol: Map<string, OhlcBar[]>;
}> {
  const fundamentalsSymbols = options?.fundamentalsSymbols ?? new Set<string>();
  const candlesBySymbol = new Map<string, OhlcBar[]>();
  const enrichedRows = await mapWithConcurrency(rows, METRICS_CONCURRENCY, async (row) => {
    const symbol = String(row.symbol ?? "").toUpperCase();
    const ohlc = await getOhlcCandles(symbol, "3M");
    candlesBySymbol.set(symbol, ohlc.data);
    let enriched = await enrichMetricsWithTechnicals(row, ohlc.data);
    if (fundamentalsSymbols.has(symbol)) {
      enriched = await enrichMetricsWithFundamentals(enriched, symbol);
    }
    return enriched;
  });
  return { rows: enrichedRows, candlesBySymbol };
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
    return {
      state: current,
      added: 0,
      removed: 0,
      updated: 0,
      durationMs: Date.now() - start,
      symbolsScanned: 0,
    };
  }

  // Do not mutate opportunity lists on weekends/holidays (non-session days).
  // Post-close freeze still runs on trading days after 15:30.
  if (!isTradingDay() && getMarketStatus() !== "post_close") {
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

    const enrichment = await enrichMetricsRows(shortlistRows, {
      fundamentalsSymbols,
    });
    const enrichedRows = enrichment.rows;

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
      const rawCandidates = buildCategoryCandidates(
        category,
        fullRescan[category],
        metricsBySymbol,
        quoteMap,
        regimeScore
      );
      // Rank + gate through Trading Pipeline eligibility (no bypass).
      const pipelineCandidates = enrichCandidatesWithPipeline(rawCandidates, pipeline);
      const sessionCandlesBySymbol = SCALP_SESSION_CATEGORIES.has(category)
        ? await prefetchSessionCandles(
            pipelineCandidates.map((candidate) => candidate.symbol)
          )
        : new Map<string, OhlcBar[]>();
      const candidates = pipelineCandidates.flatMap((candidate) => {
          const dailyCandles =
            enrichment.candlesBySymbol.get(candidate.symbol) ?? [];
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

