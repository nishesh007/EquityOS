import { getCompanyMasterRecords } from "@/lib/company-master";
import { marketDataService } from "@/lib/market-data/server";
import type { EnrichedQuote } from "@/lib/market-data/enriched-quote";
import {
  acquireQuotes,
  getQuoteMaxAgeMs,
  printQuoteFreshnessStats,
  type QuoteFreshnessStats,
} from "@/lib/market-data/quote-acquisition";
import { toEnrichedQuote } from "@/lib/market-data/enriched-quote";
import type { QuoteResult } from "@/lib/market-data/quote-result";
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
import { PipelineAuditLedger } from "@/lib/opportunity-engine/pipeline-audit";
import {
  countCategoryCandidates,
  emptyPipelineStageCounts,
  logPipelineStages,
} from "@/lib/opportunity-engine/pipeline-telemetry";
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
import { OE_OHLC_USAGE } from "@/lib/market/ohlc-timeframes";
import { executeOpportunityStrategies } from "@/lib/opportunity-engine/strategy-execution";
import type { OhlcBar } from "@/lib/providers/types";
import { getTradingPipelineResult } from "@/services/marketIntelligence";
import type { TradingPipelineResult } from "@/src/modules/tradingPipeline";
import { peekMemoryPersistedData } from "@/lib/opportunity-engine/persistence";

/**
 * Concurrent OHLC technical enrichment across the ~2500 NSE universe.
 * Kept moderate to avoid Yahoo/Finnhub rate limits that collapse enrichment.
 */
const METRICS_CONCURRENCY = 6;
/** Minimum daily bars required before scorers see has_live_technicals. */
const TECH_MIN_BARS = 30;

let scanInFlight: Promise<ScanResult> | null = null;
let lastQuoteFreshnessStats: QuoteFreshnessStats | null = null;

function acquiredToEnrichedQuote(
  symbol: string,
  acquired: Awaited<ReturnType<typeof acquireQuotes>>["quotes"] extends Map<
    string,
    infer V
  >
    ? V
    : never
): EnrichedQuote {
  if (acquired.price == null || acquired.price <= 0) {
    return toEnrichedQuote(symbol, null);
  }
  const result: QuoteResult = {
    data: {
      symbol: acquired.symbol,
      ltp: acquired.price,
      open: acquired.open ?? acquired.price,
      high: acquired.high ?? acquired.price,
      low: acquired.low ?? acquired.price,
      previousClose: acquired.previousClose ?? acquired.price,
      change: acquired.change ?? 0,
      changePercent: acquired.changePercent ?? 0,
      volume: acquired.volume,
      provider: acquired.provider,
      source: acquired.source === "live" ? "live" : "cached",
      fetchedAt: acquired.timestamp,
    },
    provider: acquired.provider,
    source: acquired.source === "live" ? "live" : "cached",
    attempted: acquired.attempted,
    stale: acquired.stale,
    quoteAge: acquired.quoteAge,
  };
  return toEnrichedQuote(symbol, result);
}

async function fetchQuotesInBatches(symbols: string[]) {
  const { quotes, stats } = await acquireQuotes(symbols);
  lastQuoteFreshnessStats = stats;
  printQuoteFreshnessStats(stats);

  const quoteMap = new Map<string, EnrichedQuote>();
  for (const symbol of symbols) {
    const key = symbol.toUpperCase();
    const acquired = quotes.get(key);
    if (!acquired) {
      quoteMap.set(key, toEnrichedQuote(key, null));
      continue;
    }
    quoteMap.set(key, acquiredToEnrichedQuote(key, acquired));
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

function quoteLiquidityScore(row: LiveMetricsRecord): number {
  const volume = typeof row.volume === "number" ? row.volume : 0;
  const changePercent =
    typeof row.change_percent === "number" ? Math.abs(row.change_percent) : 0;
  return changePercent * 10 + Math.log10(volume + 1) * 5;
}

async function fetchTechnicalsCandles(symbol: string): Promise<OhlcBar[]> {
  // Canonical: Trend analysis uses 1Y daily only. No cross-TF fallback.
  const primary = await getOhlcCandles(symbol, OE_OHLC_USAGE.trend, {
    minBars: TECH_MIN_BARS,
  });
  return primary.data;
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
  const maxAgeMs = getQuoteMaxAgeMs();

  for (const ctx of contexts) {
    const quote = quoteMap.get(ctx.symbol);
    if (!quote) continue;
    const metrics = buildQuoteOnlyMetrics(ctx, quote, maxAgeMs);
    if (metrics) baseRows.push(metrics);
  }

  // Enrich liquid movers first so rate-limited provider budgets hit scorer-relevant names.
  baseRows.sort((a, b) => quoteLiquidityScore(b) - quoteLiquidityScore(a));

  const candlesBySymbol = new Map<string, OhlcBar[]>();
  const rows = await mapWithConcurrency(
    baseRows,
    METRICS_CONCURRENCY,
    async (row) => {
      const symbol = String(row.symbol ?? "").toUpperCase();
      const candles = await fetchTechnicalsCandles(symbol);
      candlesBySymbol.set(symbol, candles);
      return enrichMetricsWithTechnicals(row, candles);
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
    const session = await getOhlcCandles(symbol, OE_OHLC_USAGE.session);
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
    const audit = new PipelineAuditLedger();
    const priorCandidateCount = countCategoryCandidates(current.categories);

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
    audit.setStage("stage1_input_stocks", contexts.length);

    const symbols = contexts.map((ctx) => ctx.symbol);
    const quoteMap = await fetchQuotesInBatches(symbols);
    const built = await buildQuoteMetricsRows(contexts, quoteMap);
    const candlesBySymbol = built.candlesBySymbol;
    let metricsRows = built.rows;
    const symbolsScanned = metricsRows.length;

    audit.setStage("stage2_after_enrichment", metricsRows.length);
    audit.setStage("stage3_after_technicals", built.enrichedCount);

    // Quote missing / null price rejections
    for (const ctx of contexts) {
      const quote = quoteMap.get(ctx.symbol);
      if (!quote) {
        audit.reject(ctx.symbol, "Price unavailable", "stage2_after_enrichment");
        continue;
      }
      if (quote.price === null || quote.price <= 0) {
        audit.reject(ctx.symbol, "Price unavailable", "stage2_after_enrichment");
      }
    }
    for (const row of metricsRows) {
      const symbol = String(row.symbol ?? "");
      if (!symbol) continue;
      if (row.has_live_technicals !== 1) {
        audit.reject(symbol, "Missing technicals", "stage3_after_technicals");
      } else if (row.volume_ratio == null) {
        audit.reject(symbol, "Volume ratio null", "stage3_after_technicals");
      }
    }

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
    const fundamentalsEnriched = metricsRows.filter(
      (row) => row.has_live_fundamentals === 1
    ).length;
    audit.setStage(
      "stage4_after_fundamentals",
      fundamentalsSymbols.size > 0 ? fundamentalsEnriched : metricsRows.length
    );

    const metricsBySymbol = new Map<string, LiveMetricsRecord>();
    for (const row of metricsRows) {
      const symbol = String(row.symbol ?? "").toUpperCase();
      if (symbol) metricsBySymbol.set(symbol, row);
    }

    const fullRescan = scanLiveMetrics(metricsRows);
    const scoredCount = OPPORTUNITY_CATEGORIES.reduce(
      (n, category) => n + fullRescan[category].length,
      0
    );
    audit.setStage("stage5_after_scoring", scoredCount);

    let totalAdded = 0;
    let totalRemoved = 0;
    let totalUpdated = 0;
    let totalRawCandidates = 0;
    let totalPipelinePassed = 0;
    let totalStoredCandidates = 0;
    const pendingMerges: Array<{
      category: OpportunityCategory;
      candidates: OpportunityCandidate[];
    }> = [];

    for (const category of OPPORTUNITY_CATEGORIES) {
      const rawCandidates = buildCategoryCandidates(
        category,
        fullRescan[category],
        metricsBySymbol,
        quoteMap,
        regimeScore
      );
      totalRawCandidates += rawCandidates.length;
      // Keep Trading Pipeline gate on normal scans. Forced seed/refresh retains
      // OE scanner output when the pipeline has zero eligible strategies
      // (weekend / degraded MI) so enrichment-before-score can persist.
      const hasEligibleStrategies = pipeline.eligibleStrategies.some(
        (strategy) => strategy.eligible
      );
      const dropRejected = !(force && !hasEligibleStrategies);
      const enrichedAll = enrichCandidatesWithPipeline(rawCandidates, pipeline, {
        dropRejected: false,
      });
      for (const candidate of enrichedAll) {
        if (candidate.pipelineEligible === false) {
          const reason = candidate.rejectedReasons?.[0] ?? "Risk filter failed";
          audit.reject(
            candidate.symbol,
            reason.includes("trend") || reason.includes("Trend")
              ? "Trend filter failed"
              : reason.includes("liquidity") || reason.includes("Liquidity")
                ? "Risk filter failed"
                : reason.includes("confidence") || reason.includes("Confidence")
                  ? "Confidence < Threshold"
                  : reason.includes("RR") || reason.includes("risk") || reason.includes("Risk")
                    ? "Risk filter failed"
                    : reason,
            "stage6_after_confidence"
          );
        }
      }
      const pipelineCandidates = dropRejected
        ? enrichedAll.filter((c) => c.pipelineEligible !== false)
        : enrichedAll;
      totalPipelinePassed += pipelineCandidates.length;
      const sessionCandlesBySymbol = SCALP_SESSION_CATEGORIES.has(category)
        ? await prefetchSessionCandles(
            pipelineCandidates.map((candidate) => candidate.symbol)
          )
        : new Map<string, OhlcBar[]>();
      const retainWithoutPrimary =
        Boolean(force && !hasEligibleStrategies);
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
            // Forced scans with empty eligibility also retain OE setups.
            if (candidate.pipelineEligible || retainWithoutPrimary) {
              return [
                {
                  ...candidate,
                  rejectedReasons: [
                    ...(candidate.rejectedReasons ?? []),
                    ...execution.rejectedReasons,
                    retainWithoutPrimary && !candidate.pipelineEligible
                      ? "Forced scan retained Opportunity Engine candidate despite empty pipeline eligibility."
                      : "Strategy Engine returned no actionable signal — retained for Opportunity Engine fallback.",
                  ],
                },
              ];
            }
            audit.reject(
              candidate.symbol,
              execution.rejectedReasons[0] ?? "Strategy Engine returned no actionable signal",
              "stage6_after_confidence"
            );
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
      totalStoredCandidates += candidates.length;
      pendingMerges.push({ category, candidates });
    }

    audit.setStage("stage6_after_confidence", totalPipelinePassed);

    // Empty live scan must not wipe carry-forward / prior good recommendations.
    const retainPrior =
      totalStoredCandidates === 0 && priorCandidateCount > 0;
    if (retainPrior) {
      console.warn(
        `[OpportunityEngine] Empty scan produced 0 candidates while ${priorCandidateCount} ` +
          `prior candidates exist — retaining prior recommendations (root-cause guard).`
      );
      audit.reject(
        "*",
        "Empty live scan retained prior recommendations",
        "stage6_after_confidence"
      );
    } else {
      for (const { category, candidates } of pendingMerges) {
        const { added, removed, updated } = mergeCategoryResults(
          category,
          candidates
        );
        totalAdded += added;
        totalRemoved += removed;
        totalUpdated += updated;
      }
    }

    const durationMs = Date.now() - start;
    const nextScanAt = nextOpportunityScanAt();

    if (!retainPrior) {
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
    } else {
      // Still clear isScanning without advancing scanCount / wiping lastScannedAt.
      setScanning(false);
    }

    if (!retainPrior && !isMarketOpen() && getMarketStatus() === "post_close") {
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
    const finalStored = countCategoryCandidates(finalState.categories);
    audit.setStage("stage7_ui_formatting", finalStored);
    audit.logSummary("scan-complete", {
      retainedPrior: retainPrior,
      durationMs,
      force,
    });

    stageCounts.rawCandidates = totalRawCandidates;
    stageCounts.pipelinePassed = totalPipelinePassed;
    stageCounts.scoredStored = retainPrior ? priorCandidateCount : totalStoredCandidates;
    stageCounts.recommendationsStored =
      finalState.recommendations?.length ?? finalStored;
    logPipelineStages("after-scan-store", stageCounts, {
      memoryPopulated: Boolean(peekMemoryPersistedData()?.state),
      added: totalAdded,
      removed: totalRemoved,
      updated: totalUpdated,
      durationMs,
      retainedPrior: retainPrior,
      auditFirstZero: audit.snapshot().firstZeroStage,
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
      rawCandidates: totalRawCandidates,
      pipelinePassed: totalPipelinePassed,
      quoteFreshness: lastQuoteFreshnessStats
        ? {
            quotesFetched: lastQuoteFreshnessStats.quotesFetched,
            fresh: lastQuoteFreshnessStats.fresh,
            stale: lastQuoteFreshnessStats.stale,
            providerFailures: lastQuoteFreshnessStats.providerFailures,
            cacheHitRatio: lastQuoteFreshnessStats.cacheHitRatio,
          }
        : undefined,
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

