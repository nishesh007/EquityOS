/**
 * Recommendation Calibration Engine v1.
 * Reads Paper Trading closed outcomes + current Quality Gate thresholds.
 * Produces suggested threshold changes — never auto-applies.
 */

import "server-only";

import { lookupCompanyRegistry } from "@/lib/fundamentals/company-registry";
import { isTradeClosed } from "@/lib/paper-trading/kpis";
import {
  computeTradeExcursions,
  emptyExitReasonDistribution,
  mapPaperExitReason,
} from "@/lib/paper-trading/outcomes/lifecycle";
import { loadPaperTradingState } from "@/lib/paper-trading/persistence";
import type { PaperTrade } from "@/lib/paper-trading/types";
import {
  QUALITY_GATE_THRESHOLDS,
} from "@/lib/recommendations/quality-gate";
import type {
  CalibrationBucket,
  CalibrationBucketMetrics,
  CalibrationDimension,
  CalibrationReport,
  ThresholdKey,
  ThresholdSuggestion,
} from "@/lib/recommendations/calibration/types";

const MIN_BUCKET_TRADES = 3;
const MIN_SUGGESTION_TRADES = 5;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function resolveSector(symbol: string): string {
  return lookupCompanyRegistry(symbol)?.sector?.trim() || "Unclassified";
}

function classifyRegime(trade: PaperTrade): string {
  const text =
    `${trade.recommendation.marketRegime} ${trade.recommendation.marketContext}`.toLowerCase();
  if (/\bbear|\bbearish|risk[- ]?off|weak\s*bear|downtrend/.test(text)) {
    return "bear";
  }
  if (/\bbull|\bbullish|risk[- ]?on|strong\s*bull|uptrend/.test(text)) {
    return "bull";
  }
  return "neutral";
}

function convictionBucket(conviction: number): string {
  if (conviction < 55) return "lt-55";
  if (conviction < 60) return "55-60";
  if (conviction < 65) return "60-65";
  if (conviction < 70) return "65-70";
  if (conviction < 75) return "70-75";
  if (conviction < 80) return "75-80";
  if (conviction < 90) return "80-90";
  return "90-100";
}

function convictionBucketLabel(key: string): string {
  const map: Record<string, string> = {
    "lt-55": "<55",
    "55-60": "55–60",
    "60-65": "60–65",
    "65-70": "65–70",
    "70-75": "70–75",
    "75-80": "75–80",
    "80-90": "80–90",
    "90-100": "90–100",
  };
  return map[key] ?? key;
}

function convictionBucketFloor(key: string): number | null {
  const map: Record<string, number> = {
    "lt-55": 0,
    "55-60": 55,
    "60-65": 60,
    "65-70": 65,
    "70-75": 70,
    "75-80": 75,
    "80-90": 80,
    "90-100": 90,
  };
  return map[key] ?? null;
}

function riskRewardBucket(rr: number): string {
  if (rr < 1.5) return "lt-1.5";
  if (rr < 2) return "1.5-2";
  if (rr < 2.5) return "2-2.5";
  if (rr < 3) return "2.5-3";
  return "gte-3";
}

function riskRewardBucketLabel(key: string): string {
  const map: Record<string, string> = {
    "lt-1.5": "<1.5",
    "1.5-2": "1.5–2",
    "2-2.5": "2–2.5",
    "2.5-3": "2.5–3",
    "gte-3": "≥3",
  };
  return map[key] ?? key;
}

function riskRewardBucketFloor(key: string): number | null {
  const map: Record<string, number> = {
    "lt-1.5": 0,
    "1.5-2": 1.5,
    "2-2.5": 2,
    "2.5-3": 2.5,
    "gte-3": 3,
  };
  return map[key] ?? null;
}

/**
 * Prefer persisted Trade Outcome Engine excursions; fall back to timeline.
 */
export function estimateExcursions(trade: PaperTrade): {
  mfe: number;
  mae: number;
  maxDrawdown: number;
} {
  return computeTradeExcursions(trade);
}

function liquidityBucket(trade: PaperTrade): string {
  // Paper trades do not persist volume_ratio — use holding/microstructure proxy.
  const evidence = `${trade.recommendation.evidence.join(" ")} ${trade.recommendation.reasons.join(" ")}`.toLowerCase();
  if (/low\s*liquidity|illiquid|thin\s*book/.test(evidence)) return "low";
  if (/high\s*liquidity|liquid\s*name|volume\s*surge|rvol/.test(evidence)) {
    return "high";
  }
  if (trade.strategy === "scalping" || trade.strategy === "intraday") return "session";
  return "unknown";
}

export function computeBucketMetrics(
  trades: PaperTrade[]
): CalibrationBucketMetrics {
  if (trades.length === 0) {
    return {
      trades: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      averageReturn: 0,
      averageHoldingMs: 0,
      averageHoldingHours: 0,
      averageMfe: 0,
      averageMae: 0,
      averageDrawdown: 0,
      expectancy: 0,
      profitFactor: 0,
      exitReasonDistribution: emptyExitReasonDistribution(),
    };
  }

  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl <= 0);
  const winReturns = wins.map((t) => t.returnPercent);
  const lossReturns = losses.map((t) => t.returnPercent);
  const excursions = trades.map(estimateExcursions);
  const grossProfit = wins.reduce((s, t) => s + Math.max(0, t.pnl), 0);
  const grossLoss = Math.abs(
    losses.reduce((s, t) => s + Math.min(0, t.pnl), 0)
  );
  const winRate = wins.length / trades.length;
  const avgWin = average(winReturns);
  const avgLossAbs = Math.abs(average(lossReturns));
  const expectancy = round2(winRate * avgWin - (1 - winRate) * avgLossAbs);
  const holdingMs = average(trades.map((t) => t.holdingMs));
  const exitReasonDistribution = emptyExitReasonDistribution();
  for (const trade of trades) {
    const reason = mapPaperExitReason(trade.exitReason);
    if (reason) exitReasonDistribution[reason] += 1;
  }

  return {
    trades: trades.length,
    wins: wins.length,
    losses: losses.length,
    winRate: round2(winRate * 100),
    averageReturn: round2(average(trades.map((t) => t.returnPercent))),
    averageHoldingMs: Math.round(holdingMs),
    averageHoldingHours: round2(holdingMs / 3_600_000),
    averageMfe: round2(average(excursions.map((e) => e.mfe))),
    averageMae: round2(average(excursions.map((e) => e.mae))),
    averageDrawdown: round2(average(excursions.map((e) => e.maxDrawdown))),
    expectancy,
    profitFactor:
      grossLoss > 0
        ? round2(grossProfit / grossLoss)
        : grossProfit > 0
          ? 99
          : 0,
    exitReasonDistribution,
  };
}

function groupTrades(
  trades: PaperTrade[],
  dimension: CalibrationDimension,
  keyFn: (trade: PaperTrade) => string,
  labelFn: (key: string) => string
): CalibrationBucket[] {
  const map = new Map<string, PaperTrade[]>();
  for (const trade of trades) {
    const key = keyFn(trade);
    const list = map.get(key) ?? [];
    list.push(trade);
    map.set(key, list);
  }

  return [...map.entries()]
    .map(([key, list]) => ({
      dimension,
      key,
      label: labelFn(key),
      ...computeBucketMetrics(list),
    }))
    .filter((bucket) => bucket.trades > 0)
    .sort((a, b) => b.expectancy - a.expectancy || b.trades - a.trades);
}

function scoreBucket(bucket: CalibrationBucket): number {
  // Prefer expectancy, then profit factor; penalize deep adverse/drawdown.
  return (
    bucket.expectancy * 10 +
    Math.min(bucket.profitFactor, 5) +
    Math.min(bucket.trades, 20) * 0.05 -
    Math.abs(bucket.averageMae) * 0.15 -
    bucket.averageDrawdown * 0.1
  );
}

function buildSuggestions(
  buckets: CalibrationBucket[],
  overall: CalibrationBucketMetrics
): ThresholdSuggestion[] {
  const suggestions: ThresholdSuggestion[] = [];
  const current = QUALITY_GATE_THRESHOLDS;

  const convictionBuckets = buckets
    .filter((b) => b.dimension === "conviction" && b.trades >= MIN_BUCKET_TRADES)
    .sort((a, b) => (convictionBucketFloor(a.key) ?? 0) - (convictionBucketFloor(b.key) ?? 0));

  if (convictionBuckets.length >= 2) {
    const weak = convictionBuckets.filter(
      (b) => b.expectancy < Math.min(0, overall.expectancy)
    );
    const strong = convictionBuckets.filter(
      (b) => b.expectancy > Math.max(0, overall.expectancy)
    );
    if (weak.length > 0 && strong.length > 0) {
      const firstStrong = strong.sort(
        (a, b) => (convictionBucketFloor(a.key) ?? 0) - (convictionBucketFloor(b.key) ?? 0)
      )[0];
      const floor = convictionBucketFloor(firstStrong.key);
      if (floor != null && floor > current.minConviction) {
        const suggested = floor;
        suggestions.push({
          key: "minConviction",
          current: current.minConviction,
          suggested,
          direction: "raise",
          rationale: `Conviction bucket ${firstStrong.label} is the first cohort with positive/above-average expectancy (${firstStrong.expectancy}%). Lower buckets underperform.`,
          supportingBucket: `conviction:${firstStrong.key}`,
          expectedImpact: `Raise minConviction ${current.minConviction} → ${suggested} to exclude weaker expectancy cohorts (${weak.map((w) => w.label).join(", ")}).`,
          confidence: confidenceFromSample(
            firstStrong.trades + weak.reduce((s, w) => s + w.trades, 0)
          ),
        });
      }
    }
  }

  const rrBuckets = buckets
    .filter((b) => b.dimension === "risk_reward" && b.trades >= MIN_BUCKET_TRADES)
    .sort((a, b) => (riskRewardBucketFloor(a.key) ?? 0) - (riskRewardBucketFloor(b.key) ?? 0));

  if (rrBuckets.length >= 2) {
    const weak = rrBuckets.filter((b) => b.expectancy < Math.min(0, overall.expectancy));
    const strong = rrBuckets.filter((b) => b.expectancy > Math.max(0, overall.expectancy));
    if (weak.length > 0 && strong.length > 0) {
      const firstStrong = strong.sort(
        (a, b) => (riskRewardBucketFloor(a.key) ?? 0) - (riskRewardBucketFloor(b.key) ?? 0)
      )[0];
      const floor = riskRewardBucketFloor(firstStrong.key);
      if (floor != null && floor > current.minRiskReward) {
        suggestions.push({
          key: "minRiskReward",
          current: current.minRiskReward,
          suggested: floor,
          direction: "raise",
          rationale: `Risk/Reward bucket ${firstStrong.label} shows expectancy ${firstStrong.expectancy}% vs weaker lower-RR cohorts.`,
          supportingBucket: `risk_reward:${firstStrong.key}`,
          expectedImpact: `Raise minRiskReward ${current.minRiskReward} → ${floor} to filter low-expectancy RR setups.`,
          confidence: confidenceFromSample(
            firstStrong.trades + weak.reduce((s, w) => s + w.trades, 0)
          ),
        });
      }
    }
  }

  const bear = buckets.find(
    (b) => b.dimension === "regime" && b.key === "bear" && b.trades >= MIN_BUCKET_TRADES
  );
  const bull = buckets.find(
    (b) => b.dimension === "regime" && b.key === "bull" && b.trades >= MIN_BUCKET_TRADES
  );
  if (bear && bull && bear.expectancy < bull.expectancy - 0.5) {
    // Suggest slightly higher conviction in weak regimes via breadth/breakout proxy.
    const suggested = Math.min(80, current.minConviction + 5);
    if (suggested > current.minConviction) {
      suggestions.push({
        key: "minConviction",
        current: current.minConviction,
        suggested,
        direction: "raise",
        rationale: `Bear-regime expectancy (${bear.expectancy}%) trails bull (${bull.expectancy}%). Higher conviction hurdle recommended in weak regimes.`,
        supportingBucket: `regime:bear`,
        expectedImpact: `Optional raise minConviction → ${suggested} (human may also keep REGIME_MISMATCH gate for aggressive longs).`,
        confidence: confidenceFromSample(bear.trades + bull.trades) * 0.85,
      });
    }
  }

  const lowLiq = buckets.find(
    (b) => b.dimension === "liquidity" && b.key === "low" && b.trades >= MIN_BUCKET_TRADES
  );
  const highLiq = buckets.find(
    (b) => b.dimension === "liquidity" && b.key === "high" && b.trades >= MIN_BUCKET_TRADES
  );
  if (lowLiq && highLiq && lowLiq.expectancy < highLiq.expectancy) {
    const suggested = round2(Math.min(1.5, current.minVolumeRatio + 0.15));
    if (suggested > current.minVolumeRatio) {
      suggestions.push({
        key: "minVolumeRatio",
        current: current.minVolumeRatio,
        suggested,
        direction: "raise",
        rationale: `Low-liquidity proxy bucket underperforms high-liquidity (${lowLiq.expectancy}% vs ${highLiq.expectancy}%).`,
        supportingBucket: `liquidity:low`,
        expectedImpact: `Raise minVolumeRatio ${current.minVolumeRatio} → ${suggested} to reduce thin-name expectancy drag.`,
        confidence: confidenceFromSample(lowLiq.trades + highLiq.trades) * 0.7,
      });
    }
  }

  // Outcome-aware: high STOP_LOSS share + deep MAE → raise conviction hurdle.
  if (
    overall.trades >= MIN_SUGGESTION_TRADES &&
    overall.exitReasonDistribution.STOP_LOSS / overall.trades >= 0.45 &&
    overall.averageMae <= -2
  ) {
    const suggested = Math.min(80, current.minConviction + 7);
    if (suggested > current.minConviction) {
      suggestions.push({
        key: "minConviction",
        current: current.minConviction,
        suggested,
        direction: "raise",
        rationale: `Outcome Engine: STOP_LOSS exits are ${(
          (overall.exitReasonDistribution.STOP_LOSS / overall.trades) *
          100
        ).toFixed(0)}% with average MAE ${overall.averageMae}% and drawdown ${overall.averageDrawdown}%.`,
        supportingBucket: `exit:STOP_LOSS`,
        expectedImpact: `Raise minConviction ${current.minConviction} → ${suggested} to reduce stop-out rate / adverse excursion.`,
        confidence: confidenceFromSample(overall.trades) * 0.9,
      });
    }
  }

  // Deduplicate by key — keep highest confidence suggestion per threshold.
  const byKey = new Map<ThresholdKey, ThresholdSuggestion>();
  for (const suggestion of suggestions) {
    const existing = byKey.get(suggestion.key);
    if (!existing || suggestion.confidence > existing.confidence) {
      byKey.set(suggestion.key, suggestion);
    }
  }
  return [...byKey.values()].sort((a, b) => b.confidence - a.confidence);
}

function confidenceFromSample(n: number): number {
  if (n < MIN_SUGGESTION_TRADES) return round2(0.35 + n * 0.05);
  if (n < 15) return round2(0.55 + (n - MIN_SUGGESTION_TRADES) * 0.03);
  if (n < 40) return round2(0.75 + (n - 15) * 0.005);
  return 0.9;
}

export function buildCalibrationReport(
  trades: PaperTrade[] = loadPaperTradingState().trades
): CalibrationReport {
  const closed = trades.filter(isTradeClosed);
  const overall = computeBucketMetrics(closed);

  const buckets: CalibrationBucket[] = [
    ...groupTrades(
      closed,
      "strategy",
      (t) => t.strategy,
      (k) => k
    ),
    ...groupTrades(
      closed,
      "horizon",
      (t) => t.recommendation.primaryStrategyId || t.strategy,
      (k) => k
    ),
    ...groupTrades(closed, "regime", classifyRegime, (k) => k),
    ...groupTrades(
      closed,
      "conviction",
      (t) => convictionBucket(Math.max(t.conviction, t.confidence)),
      convictionBucketLabel
    ),
    ...groupTrades(
      closed,
      "risk_reward",
      (t) => riskRewardBucket(t.riskReward),
      riskRewardBucketLabel
    ),
    ...groupTrades(closed, "sector", (t) => resolveSector(t.symbol), (k) => k),
    ...groupTrades(closed, "liquidity", liquidityBucket, (k) => k),
  ];

  const ranked = buckets
    .filter((b) => b.trades >= MIN_BUCKET_TRADES)
    .sort((a, b) => scoreBucket(b) - scoreBucket(a));

  const bestBucket = ranked[0] ?? null;
  const worstBucket = ranked.length > 0 ? ranked[ranked.length - 1] : null;
  const suggestions = buildSuggestions(buckets, overall);

  const suggestedThresholds: Partial<Record<ThresholdKey, number>> = {};
  for (const suggestion of suggestions) {
    suggestedThresholds[suggestion.key] = suggestion.suggested;
  }

  const notes: string[] = [
    "Threshold suggestions are advisory only — Quality Gate is not auto-updated.",
    "MFE/MAE/drawdown and exit reasons come from the Trade Outcome Engine (persisted when available).",
    "Liquidity buckets are proxies (evidence text / strategy) — volume_ratio is not stored on paper trades.",
  ];
  if (closed.length < MIN_SUGGESTION_TRADES) {
    notes.push(
      `Sample size ${closed.length} is below ${MIN_SUGGESTION_TRADES} — treat suggestions as low confidence.`
    );
  }

  const confidence = round2(
    suggestions.length > 0
      ? average(suggestions.map((s) => s.confidence))
      : confidenceFromSample(closed.length) * 0.5
  );

  return {
    generatedAt: new Date().toISOString(),
    sampleSize: trades.length,
    closedTrades: closed.length,
    currentThresholds: { ...QUALITY_GATE_THRESHOLDS },
    suggestedThresholds,
    suggestions,
    buckets,
    bestBucket,
    worstBucket,
    overall,
    confidence,
    notes,
  };
}

export function runRecommendationCalibration(): CalibrationReport {
  return buildCalibrationReport(loadPaperTradingState().trades);
}
