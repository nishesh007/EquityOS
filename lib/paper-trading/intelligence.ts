/**
 * Sprint 11E.3 — AI Recommendation Intelligence engine.
 * Analyzes historical paper trades only. Never modifies engines or scoring.
 */

import { lookupCompanyRegistry } from "@/lib/fundamentals/company-registry";
import { isTradeClosed } from "@/lib/paper-trading/kpis";
import { computeMaximumDrawdown } from "@/lib/paper-trading/analytics";
import type { PaperStrategy, PaperTrade } from "@/lib/paper-trading/types";
import { PAPER_EXIT_REASON_LABELS } from "@/lib/paper-trading/format";
import type {
  AiInsight,
  AiIntelligenceModel,
  AiQualityScores,
  AiRecommendationHealth,
  ConfidenceAccuracyRow,
  ConfidenceBucketId,
  FailureReasonId,
  FailureReasonRow,
  MarketRegimeBucket,
  MarketRegimeRow,
  SectorPerformanceRow,
  StrategyIntelligenceRow,
  TopRecommendationRow,
  WeakRecommendationRow,
} from "@/lib/paper-trading/intelligence-types";

const STRATEGIES: PaperStrategy[] = ["intraday", "scalping", "swing"];

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function percentOf(count: number, total: number): number {
  if (total === 0) return 0;
  return round1((count / total) * 100);
}

function closed(trades: readonly PaperTrade[]): PaperTrade[] {
  return trades.filter(isTradeClosed);
}

function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = average(values);
  const variance =
    values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

function resolveSector(symbol: string): string {
  return lookupCompanyRegistry(symbol)?.sector?.trim() || "Unclassified";
}

function confidenceBucket(confidence: number): ConfidenceBucketId | null {
  if (confidence < 70) return null;
  if (confidence < 80) return "70-80";
  if (confidence < 85) return "80-85";
  if (confidence < 90) return "85-90";
  if (confidence < 95) return "90-95";
  return "95-100";
}

const CONFIDENCE_BUCKETS: Array<{ id: ConfidenceBucketId; label: string }> = [
  { id: "70-80", label: "70–80%" },
  { id: "80-85", label: "80–85%" },
  { id: "85-90", label: "85–90%" },
  { id: "90-95", label: "90–95%" },
  { id: "95-100", label: "95–100%" },
];

function normalizeRegimeText(trade: PaperTrade): string {
  return `${trade.recommendation.marketRegime} ${trade.recommendation.marketContext}`.toLowerCase();
}

function classifyRegimes(trade: PaperTrade): MarketRegimeBucket[] {
  const text = normalizeRegimeText(trade);
  const regimes: MarketRegimeBucket[] = [];

  if (/\bbull|\bbullish|risk[- ]?on|uptrend/.test(text)) regimes.push("bull");
  if (/\bbear|\bbearish|risk[- ]?off|downtrend/.test(text)) regimes.push("bear");
  if (/\bsideways|range[- ]?bound|neutral|chop/.test(text)) {
    regimes.push("sideways");
  }
  if (/high\s*vol|volatile|elevated volatility/.test(text)) {
    regimes.push("high_volatility");
  }
  if (/low\s*vol|calm|compressed volatility/.test(text)) {
    regimes.push("low_volatility");
  }

  if (regimes.length === 0) {
    // Fallback from holding / return path when regime labels are sparse
    if (trade.holdingMs < 2 * 60 * 60 * 1000 && Math.abs(trade.returnPercent) > 3) {
      regimes.push("high_volatility");
    } else {
      regimes.push("sideways");
    }
  }

  return regimes;
}

const FAILURE_LABELS: Record<FailureReasonId, string> = {
  stop_loss_hit: "Stop Loss Hit",
  weak_momentum: "Weak Momentum",
  poor_risk_reward: "Poor Risk Reward",
  low_volume: "Low Volume",
  event_risk: "Event Risk",
  gap_down: "Gap Down",
  market_reversal: "Market Reversal",
  recommendation_expired: "Recommendation Expired",
};

function textBlob(trade: PaperTrade): string {
  return [
    ...trade.recommendation.reasons,
    ...trade.recommendation.evidence,
    trade.recommendation.aiExplanation,
    trade.recommendation.marketContext,
    trade.recommendation.marketRegime,
  ]
    .join(" ")
    .toLowerCase();
}

/** Primary failure classification for a losing / unsuccessful closed trade. */
export function classifyFailureReason(trade: PaperTrade): FailureReasonId {
  if (
    trade.exitReason === "recommendation_expired" ||
    trade.status === "expired"
  ) {
    return "recommendation_expired";
  }
  if (trade.exitReason === "stop_loss" || trade.status === "stop_loss_hit") {
    return "stop_loss_hit";
  }

  const blob = textBlob(trade);
  if (/gap\s*down|opened\s*lower|overnight\s*gap/.test(blob)) return "gap_down";
  if (/event|earnings|news|catalyst|result/.test(blob)) return "event_risk";
  if (/volume|liquidity|thin/.test(blob)) return "low_volume";
  if (/reversal|turn|failed\s*breakout|breakdown/.test(blob)) {
    return "market_reversal";
  }
  if (trade.riskReward > 0 && trade.riskReward < 1.25) return "poor_risk_reward";
  if (/momentum|trend\s*weak|loss\s*of\s*strength/.test(blob)) {
    return "weak_momentum";
  }
  if (trade.returnPercent <= -2 && trade.holdingMs < 4 * 60 * 60 * 1000) {
    return "gap_down";
  }
  if (/\bbear|\breversal/.test(normalizeRegimeText(trade))) {
    return "market_reversal";
  }
  return "weak_momentum";
}

function profitFactor(closedTrades: readonly PaperTrade[]): number {
  const gains = closedTrades.filter((t) => t.pnl > 0).map((t) => t.pnl);
  const losses = closedTrades
    .filter((t) => t.pnl < 0)
    .map((t) => Math.abs(t.pnl));
  const gp = gains.reduce((s, v) => s + v, 0);
  const gl = losses.reduce((s, v) => s + v, 0);
  if (gl === 0) return gp > 0 ? 99.99 : 0;
  return round2(gp / gl);
}

function targetHitPercent(closedTrades: readonly PaperTrade[]): number {
  const hits = closedTrades.filter(
    (t) =>
      t.exitReason === "target_1" ||
      t.exitReason === "target_2" ||
      t.exitReason === "target_3" ||
      t.status === "target_1_hit" ||
      t.status === "target_2_hit" ||
      t.status === "target_3_hit"
  ).length;
  return percentOf(hits, closedTrades.length);
}

function stopLossPercent(closedTrades: readonly PaperTrade[]): number {
  const stops = closedTrades.filter(
    (t) => t.exitReason === "stop_loss" || t.status === "stop_loss_hit"
  ).length;
  return percentOf(stops, closedTrades.length);
}

export function computeAiRecommendationHealth(
  trades: readonly PaperTrade[],
  testedRecommendationIds: readonly string[]
): AiRecommendationHealth {
  const closedTrades = closed(trades);
  const wins = closedTrades.filter((t) => t.pnl > 0);
  const executedIds = new Set(
    trades.map((t) => t.recommendation.recommendationId)
  );
  const generated = Math.max(testedRecommendationIds.length, executedIds.size);
  const executed = executedIds.size;
  const ages = trades.map((t) => {
    const recTs = Date.parse(t.recommendation.timestamp);
    const entryTs = Date.parse(t.entryAt);
    if (Number.isNaN(recTs) || Number.isNaN(entryTs)) return 0;
    return Math.max(0, entryTs - recTs);
  });

  return {
    recommendationsGenerated: generated,
    recommendationsExecuted: executed,
    executionRate: percentOf(executed, Math.max(generated, 1)),
    recommendationWinRate: percentOf(wins.length, closedTrades.length),
    averageReturn:
      closedTrades.length === 0
        ? 0
        : round2(average(closedTrades.map((t) => t.returnPercent))),
    averageHoldingMs:
      closedTrades.length === 0
        ? 0
        : Math.round(average(closedTrades.map((t) => t.holdingMs))),
    averageConviction:
      trades.length === 0
        ? 0
        : round2(average(trades.map((t) => t.conviction))),
    averageRiskReward:
      trades.length === 0
        ? 0
        : round2(average(trades.map((t) => t.riskReward))),
    averageRecommendationAgeMs:
      ages.length === 0 ? 0 : Math.round(average(ages)),
  };
}

export function computeConfidenceAccuracy(
  trades: readonly PaperTrade[]
): ConfidenceAccuracyRow[] {
  const closedTrades = closed(trades);
  return CONFIDENCE_BUCKETS.map((bucket) => {
    const inBucket = closedTrades.filter(
      (t) => confidenceBucket(t.confidence) === bucket.id
    );
    const wins = inBucket.filter((t) => t.pnl > 0);
    const gains = wins.map((t) => t.pnl);
    const losses = inBucket.filter((t) => t.pnl < 0).map((t) => t.pnl);
    return {
      bucket: bucket.id,
      label: bucket.label,
      trades: inBucket.length,
      winRate: percentOf(wins.length, inBucket.length),
      averageReturn:
        inBucket.length === 0
          ? 0
          : round2(average(inBucket.map((t) => t.returnPercent))),
      averageHoldingMs:
        inBucket.length === 0
          ? 0
          : Math.round(average(inBucket.map((t) => t.holdingMs))),
      averageRiskReward:
        inBucket.length === 0
          ? 0
          : round2(average(inBucket.map((t) => t.riskReward))),
      largestWinner: gains.length === 0 ? 0 : round2(Math.max(...gains)),
      largestLoser: losses.length === 0 ? 0 : round2(Math.min(...losses)),
    };
  });
}

export function computeSectorPerformance(
  trades: readonly PaperTrade[]
): SectorPerformanceRow[] {
  const closedTrades = closed(trades);
  const bySector = new Map<string, PaperTrade[]>();

  for (const trade of closedTrades) {
    const sector = resolveSector(trade.symbol);
    const list = bySector.get(sector) ?? [];
    list.push(trade);
    bySector.set(sector, list);
  }

  return Array.from(bySector.entries())
    .map(([sector, list]) => {
      const wins = list.filter((t) => t.pnl > 0);
      const byCompany = new Map<string, number>();
      for (const t of list) {
        const key = t.symbol;
        byCompany.set(key, (byCompany.get(key) ?? 0) + t.returnPercent);
      }
      const ranked = Array.from(byCompany.entries()).sort((a, b) => b[1] - a[1]);
      return {
        sector,
        trades: list.length,
        winRate: percentOf(wins.length, list.length),
        averageReturn: round2(average(list.map((t) => t.returnPercent))),
        totalPnl: round2(list.reduce((s, t) => s + t.pnl, 0)),
        bestCompany: ranked[0]?.[0] ?? "—",
        worstCompany: ranked[ranked.length - 1]?.[0] ?? "—",
      };
    })
    .sort((a, b) => b.averageReturn - a.averageReturn);
}

const REGIME_META: Array<{ id: MarketRegimeBucket; label: string }> = [
  { id: "bull", label: "Bull Market" },
  { id: "bear", label: "Bear Market" },
  { id: "sideways", label: "Sideways Market" },
  { id: "high_volatility", label: "High Volatility" },
  { id: "low_volatility", label: "Low Volatility" },
];

export function computeMarketRegimeAnalysis(
  trades: readonly PaperTrade[]
): MarketRegimeRow[] {
  const closedTrades = closed(trades);

  return REGIME_META.map((meta) => {
    const inRegime = closedTrades.filter((t) =>
      classifyRegimes(t).includes(meta.id)
    );
    const wins = inRegime.filter((t) => t.pnl > 0);
    const sorted = inRegime
      .slice()
      .sort(
        (a, b) =>
          Date.parse(a.exitAt ?? a.updatedAt) -
          Date.parse(b.exitAt ?? b.updatedAt)
      );
    return {
      regime: meta.id,
      label: meta.label,
      trades: inRegime.length,
      winRate: percentOf(wins.length, inRegime.length),
      averageReturn:
        inRegime.length === 0
          ? 0
          : round2(average(inRegime.map((t) => t.returnPercent))),
      averageDrawdown: computeMaximumDrawdown(sorted),
    };
  });
}

export function computeStrategyIntelligence(
  trades: readonly PaperTrade[]
): StrategyIntelligenceRow[] {
  return STRATEGIES.map((strategy) => {
    const scoped = trades.filter((t) => t.strategy === strategy);
    const closedScoped = closed(scoped);
    const wins = closedScoped.filter((t) => t.pnl > 0);
    const recIds = new Set(
      scoped.map((t) => t.recommendation.recommendationId)
    );
    return {
      strategy,
      recommendations: recIds.size,
      trades: scoped.length,
      winRate: percentOf(wins.length, closedScoped.length),
      averageReturn:
        closedScoped.length === 0
          ? 0
          : round2(average(closedScoped.map((t) => t.returnPercent))),
      profitFactor: profitFactor(closedScoped),
      drawdown: computeMaximumDrawdown(
        closedScoped
          .slice()
          .sort(
            (a, b) =>
              Date.parse(a.exitAt ?? a.updatedAt) -
              Date.parse(b.exitAt ?? b.updatedAt)
          )
      ),
      averageHoldingMs:
        closedScoped.length === 0
          ? 0
          : Math.round(average(closedScoped.map((t) => t.holdingMs))),
      targetHitPercent: targetHitPercent(closedScoped),
      stopLossPercent: stopLossPercent(closedScoped),
    };
  });
}

export function computeFailureAnalysis(
  trades: readonly PaperTrade[]
): FailureReasonRow[] {
  const failed = closed(trades).filter(
    (t) =>
      t.pnl < 0 ||
      t.exitReason === "stop_loss" ||
      t.exitReason === "recommendation_expired" ||
      t.status === "stop_loss_hit" ||
      t.status === "expired"
  );

  const counts = new Map<FailureReasonId, number>();
  for (const id of Object.keys(FAILURE_LABELS) as FailureReasonId[]) {
    counts.set(id, 0);
  }
  for (const trade of failed) {
    const reason = classifyFailureReason(trade);
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }

  const total = failed.length;
  return (Object.keys(FAILURE_LABELS) as FailureReasonId[])
    .map((reason) => ({
      reason,
      label: FAILURE_LABELS[reason],
      count: counts.get(reason) ?? 0,
      percent: percentOf(counts.get(reason) ?? 0, total),
    }))
    .sort((a, b) => b.count - a.count);
}

export function selectTopRecommendations(
  trades: readonly PaperTrade[],
  limit = 8
): TopRecommendationRow[] {
  return closed(trades)
    .filter((t) => t.pnl > 0)
    .slice()
    .sort((a, b) => b.returnPercent - a.returnPercent)
    .slice(0, limit)
    .map((trade) => ({
      tradeId: trade.id,
      company: trade.company,
      symbol: trade.symbol,
      strategy: trade.strategy,
      confidence: trade.confidence,
      returnPercent: trade.returnPercent,
      holdingMs: trade.holdingMs,
      recommendationDate: trade.recommendation.timestamp,
      exitReason: trade.exitReason
        ? PAPER_EXIT_REASON_LABELS[trade.exitReason]
        : "—",
      trade,
    }));
}

export function selectWeakRecommendations(
  trades: readonly PaperTrade[],
  limit = 8
): WeakRecommendationRow[] {
  return closed(trades)
    .filter((t) => t.pnl < 0)
    .slice()
    .sort((a, b) => a.returnPercent - b.returnPercent)
    .slice(0, limit)
    .map((trade) => {
      const reason = classifyFailureReason(trade);
      const adverse = Math.min(0, trade.returnPercent);
      return {
        tradeId: trade.id,
        company: trade.company,
        symbol: trade.symbol,
        strategy: trade.strategy,
        confidence: trade.confidence,
        returnPercent: trade.returnPercent,
        holdingMs: trade.holdingMs,
        failureReason: FAILURE_LABELS[reason],
        maximumDrawdown: round2(Math.abs(adverse)),
        trade,
      };
    });
}

export function computeAiQualityScores(
  trades: readonly PaperTrade[]
): AiQualityScores {
  const closedTrades = closed(trades);
  const wins = closedTrades.filter((t) => t.pnl > 0);
  const winRate = percentOf(wins.length, closedTrades.length);
  const returns = closedTrades.map((t) => t.returnPercent);
  const variability = stdev(returns);
  const stability = clamp(100 - variability * 4);
  const pf = profitFactor(closedTrades);
  const riskManagement = clamp((Math.min(pf, 3) / 3) * 100);
  const targetAcc = targetHitPercent(closedTrades);
  const losers = closedTrades.filter((t) => t.pnl < 0);
  const disciplinedStops = losers.filter(
    (t) => t.exitReason === "stop_loss" || t.status === "stop_loss_hit"
  ).length;
  const stopLossAccuracy =
    losers.length === 0 ? 100 : percentOf(disciplinedStops, losers.length);

  const overall = round1(
    winRate * 0.3 +
      stability * 0.15 +
      riskManagement * 0.2 +
      targetAcc * 0.2 +
      stopLossAccuracy * 0.15
  );

  return {
    recommendationAccuracy: winRate,
    recommendationStability: round1(stability),
    riskManagement: round1(riskManagement),
    targetAccuracy: targetAcc,
    stopLossAccuracy,
    overallAiQualityScore: overall,
    explanations: {
      recommendationAccuracy:
        "Share of closed paper trades that finished with positive virtual P&L.",
      recommendationStability:
        "Consistency of returns across closed trades (lower variance scores higher).",
      riskManagement:
        "Derived from profit factor — rewards setups that keep gross gains ahead of gross losses.",
      targetAccuracy:
        "Percentage of closed trades that exited via Target 1, 2, or 3.",
      stopLossAccuracy:
        "Among losing trades, share that exited via a defined stop loss (disciplined risk exit).",
      overallAiQualityScore:
        "Weighted blend of accuracy, stability, risk management, target hits, and stop discipline.",
    },
  };
}

export function generateAiInsights(model: {
  health: AiRecommendationHealth;
  confidenceAccuracy: ConfidenceAccuracyRow[];
  sectorPerformance: SectorPerformanceRow[];
  marketRegimes: MarketRegimeRow[];
  strategyIntelligence: StrategyIntelligenceRow[];
  failureAnalysis: FailureReasonRow[];
  quality: AiQualityScores;
}): AiInsight[] {
  const insights: AiInsight[] = [];
  let seq = 0;
  const push = (
    text: string,
    severity: AiInsight["severity"] = "neutral"
  ) => {
    insights.push({ id: `insight_${++seq}`, text, severity });
  };

  const bestConfidence = [...model.confidenceAccuracy]
    .filter((b) => b.trades >= 1)
    .sort((a, b) => b.winRate - a.winRate || b.averageReturn - a.averageReturn)[0];
  if (bestConfidence) {
    push(
      `Recommendations in the ${bestConfidence.label} confidence band achieved a ${bestConfidence.winRate.toFixed(1)}% win rate across ${bestConfidence.trades} closed trades.`,
      bestConfidence.winRate >= 55 ? "positive" : "caution"
    );
  }

  const highConf = model.confidenceAccuracy.find((b) => b.bucket === "90-95");
  const elite = model.confidenceAccuracy.find((b) => b.bucket === "95-100");
  const eliteOrHigh = [elite, highConf].find((b) => b && b.trades > 0);
  if (eliteOrHigh && eliteOrHigh.trades > 0) {
    push(
      `Recommendations above ${eliteOrHigh.label.split("–")[0].replace("%", "")}% confidence averaged ${eliteOrHigh.averageReturn.toFixed(2)}% return with a ${eliteOrHigh.winRate.toFixed(1)}% win rate.`,
      eliteOrHigh.averageReturn >= 0 ? "positive" : "caution"
    );
  }

  const rankedStrategies = [...model.strategyIntelligence]
    .filter((s) => s.trades > 0)
    .sort((a, b) => b.averageReturn - a.averageReturn);
  if (rankedStrategies.length >= 2) {
    const [best, second] = rankedStrategies;
    const delta = round2(best.averageReturn - second.averageReturn);
    const labels: Record<PaperStrategy, string> = {
      intraday: "Intraday",
      scalping: "Scalping",
      swing: "Swing",
    };
    push(
      `${labels[best.strategy]} recommendations outperform ${labels[second.strategy]} by ${Math.abs(delta).toFixed(1)}% average return.`,
      delta >= 0 ? "positive" : "caution"
    );
  } else if (rankedStrategies.length === 1) {
    const only = rankedStrategies[0];
    push(
      `${only.strategy === "swing" ? "Swing" : only.strategy === "intraday" ? "Intraday" : "Scalping"} is the only strategy with closed paper-trade history so far (${only.trades} trades, ${only.winRate.toFixed(1)}% win rate).`,
      "neutral"
    );
  }

  const topSector = model.sectorPerformance[0];
  if (topSector && topSector.trades > 0) {
    push(
      `${topSector.sector} sector generated the highest average return (${topSector.averageReturn.toFixed(2)}%) across ${topSector.trades} closed trades.`,
      topSector.averageReturn >= 0 ? "positive" : "caution"
    );
  }

  const highVol = model.marketRegimes.find((r) => r.regime === "high_volatility");
  const lowVol = model.marketRegimes.find((r) => r.regime === "low_volatility");
  if (highVol && lowVol && highVol.trades > 0 && lowVol.trades > 0) {
    const drop = round1(lowVol.winRate - highVol.winRate);
    push(
      `High volatility ${drop >= 0 ? "reduced" : "increased"} win rate by ${Math.abs(drop).toFixed(1)}% versus low-volatility regimes.`,
      drop >= 0 ? "caution" : "positive"
    );
  }

  const bull = model.marketRegimes.find((r) => r.regime === "bull");
  const bear = model.marketRegimes.find((r) => r.regime === "bear");
  if (bull && bear && bull.trades > 0 && bear.trades > 0) {
    push(
      `Bull-market recommendations averaged ${bull.averageReturn.toFixed(2)}% return vs ${bear.averageReturn.toFixed(2)}% in bear regimes.`,
      bull.averageReturn >= bear.averageReturn ? "positive" : "caution"
    );
  }

  const topFailure = model.failureAnalysis.find((f) => f.count > 0);
  if (topFailure) {
    push(
      `Most frequent failure mode is ${topFailure.label} (${topFailure.percent.toFixed(1)}% of failed trades).`,
      "caution"
    );
  }

  if (model.health.recommendationsGenerated > 0) {
    push(
      `Execution rate stands at ${model.health.executionRate.toFixed(1)}% with average conviction ${model.health.averageConviction.toFixed(1)} and R:R ${model.health.averageRiskReward.toFixed(2)}.`,
      "neutral"
    );
  }

  push(
    `Overall AI Quality Score is ${model.quality.overallAiQualityScore.toFixed(1)} / 100 (accuracy ${model.quality.recommendationAccuracy.toFixed(1)}%, target hit ${model.quality.targetAccuracy.toFixed(1)}%).`,
    model.quality.overallAiQualityScore >= 60 ? "positive" : "caution"
  );

  return insights.slice(0, 10);
}

export function buildAiIntelligenceModel(
  trades: readonly PaperTrade[],
  testedRecommendationIds: readonly string[]
): AiIntelligenceModel {
  const health = computeAiRecommendationHealth(
    trades,
    testedRecommendationIds
  );
  const confidenceAccuracy = computeConfidenceAccuracy(trades);
  const sectorPerformance = computeSectorPerformance(trades);
  const marketRegimes = computeMarketRegimeAnalysis(trades);
  const strategyIntelligence = computeStrategyIntelligence(trades);
  const failureAnalysis = computeFailureAnalysis(trades);
  const topRecommendations = selectTopRecommendations(trades);
  const weakRecommendations = selectWeakRecommendations(trades);
  const quality = computeAiQualityScores(trades);
  const insights = generateAiInsights({
    health,
    confidenceAccuracy,
    sectorPerformance,
    marketRegimes,
    strategyIntelligence,
    failureAnalysis,
    quality,
  });

  return {
    health,
    confidenceAccuracy,
    sectorPerformance,
    marketRegimes,
    strategyIntelligence,
    failureAnalysis,
    topRecommendations,
    weakRecommendations,
    quality,
    insights,
  };
}
