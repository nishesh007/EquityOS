/**
 * Relative Strength Intraday Trade utilities — Sprint 11B.3G.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { createEmptyRelativeStrengthIntradayExplainability } from "./RelativeStrengthIntradayExplainability";
import {
  calculateRiskAmount,
  isValidStop,
} from "./RelativeStrengthIntradayRisk";
import { averageSectorScore } from "./RelativeStrengthIntradayUtils";
import type {
  RelativeStrengthIntradayCandle,
  RelativeStrengthIntradayDetection,
  RelativeStrengthIntradayDirection,
} from "./RelativeStrengthIntradayTypes";
import {
  DEFAULT_RELATIVE_STRENGTH_INTRADAY_TRADE_CONFIG,
  type RelativeStrengthIntradayEntryMode,
  type RelativeStrengthIntradayQualityGrade,
  type RelativeStrengthIntradayTradeConfig,
  type RelativeStrengthIntradayTradeSetup,
} from "./RelativeStrengthIntradayTradeTypes";

export function calculateRelativeStrengthIntradayEntry(input: {
  detection: RelativeStrengthIntradayDetection;
  candles: readonly RelativeStrengthIntradayCandle[];
  vwap: number;
  openingRangeHigh?: number | null;
  openingRangeLow?: number | null;
  mode?: RelativeStrengthIntradayEntryMode;
  config?: RelativeStrengthIntradayTradeConfig;
}): number | null {
  const config = input.config ?? DEFAULT_RELATIVE_STRENGTH_INTRADAY_TRADE_CONFIG;
  const mode = input.mode ?? config.entryMode;
  const { detection } = input;
  if (!detection.detected || detection.direction === "NONE") return null;

  const last = input.candles[input.candles.length - 1];
  if (!last) return null;

  if (mode === "momentum_breakout") {
    return Number.isFinite(last.close) && last.close > 0
      ? round(last.close, 4)
      : null;
  }

  if (mode === "intraday_pullback") {
    const window = input.candles.slice(-4, -1);
    if (window.length < 2) {
      return Number.isFinite(last.close) && last.close > 0
        ? round(last.close, 4)
        : null;
    }
    const high = Math.max(...window.map((c) => c.high));
    const low = Math.min(...window.map((c) => c.low));
    const mid = (high + low) / 2;
    return Number.isFinite(mid) && mid > 0 ? round(mid, 4) : null;
  }

  if (mode === "vwap_retest") {
    const level =
      Number.isFinite(input.vwap) && input.vwap > 0
        ? input.vwap
        : detection.vwap;
    return Number.isFinite(level) && level > 0 ? round(level, 4) : null;
  }

  if (mode === "opening_range_continuation") {
    if (detection.direction === "BUY") {
      const orHigh = input.openingRangeHigh;
      if (Number.isFinite(orHigh) && orHigh! > 0) return round(orHigh!, 4);
      return Number.isFinite(last.high) && last.high > 0
        ? round(last.high, 4)
        : null;
    }
    const orLow = input.openingRangeLow;
    if (Number.isFinite(orLow) && orLow! > 0) return round(orLow!, 4);
    return Number.isFinite(last.low) && last.low > 0
      ? round(last.low, 4)
      : null;
  }

  return null;
}

export function calculateRiskReward(
  entry: number,
  stopLoss: number,
  target: number
): number {
  const risk = Math.abs(entry - stopLoss);
  if (risk <= 0) return 0;
  return round(Math.abs(target - entry) / risk, 2);
}

export interface RelativeStrengthIntradayTargetLadder {
  target1: number;
  target2: number;
  finalTarget: number;
  method: string;
  finalRr: number;
}

function rMultipleTarget(
  direction: RelativeStrengthIntradayDirection,
  entry: number,
  risk: number,
  multiples: { target1: number; target2: number; finalTarget: number }
): RelativeStrengthIntradayTargetLadder | null {
  if (risk <= 0) return null;
  const sign = direction === "BUY" ? 1 : -1;
  const finalTarget = round(entry + sign * risk * multiples.finalTarget, 4);
  return {
    target1: round(entry + sign * risk * multiples.target1, 4),
    target2: round(entry + sign * risk * multiples.target2, 4),
    finalTarget,
    method: "r_multiple",
    finalRr: multiples.finalTarget,
  };
}

function atrProjectionTarget(
  direction: RelativeStrengthIntradayDirection,
  entry: number,
  atr: number,
  risk: number,
  multiples: { target1: number; target2: number; finalTarget: number }
): RelativeStrengthIntradayTargetLadder | null {
  const sign = direction === "BUY" ? 1 : -1;
  const finalTarget = round(entry + sign * atr * multiples.finalTarget, 4);
  if (direction === "BUY" && finalTarget <= entry) return null;
  if (direction === "SELL" && finalTarget >= entry) return null;
  return {
    target1: round(entry + sign * atr * multiples.target1, 4),
    target2: round(entry + sign * atr * multiples.target2, 4),
    finalTarget,
    method: "atr_projection",
    finalRr: risk > 0 ? Math.abs(finalTarget - entry) / risk : 0,
  };
}

function previousExtremeTarget(
  direction: RelativeStrengthIntradayDirection,
  entry: number,
  candles: readonly RelativeStrengthIntradayCandle[],
  risk: number
): RelativeStrengthIntradayTargetLadder | null {
  if (direction === "BUY") {
    const resistance = Math.max(...candles.map((c) => c.high));
    if (resistance <= entry) return null;
    const span = resistance - entry;
    return {
      target1: round(entry + span * 0.5, 4),
      target2: round(entry + span * 0.75, 4),
      finalTarget: round(resistance, 4),
      method: "previous_high",
      finalRr: risk > 0 ? span / risk : 0,
    };
  }
  const support = Math.min(...candles.map((c) => c.low));
  if (support >= entry) return null;
  const span = entry - support;
  return {
    target1: round(entry - span * 0.5, 4),
    target2: round(entry - span * 0.75, 4),
    finalTarget: round(support, 4),
    method: "previous_low",
    finalRr: risk > 0 ? span / risk : 0,
  };
}

function trendProjectionTarget(
  direction: RelativeStrengthIntradayDirection,
  entry: number,
  candles: readonly RelativeStrengthIntradayCandle[],
  risk: number
): RelativeStrengthIntradayTargetLadder | null {
  const window = candles.slice(-6);
  if (window.length < 3) return null;
  const first = window[0]!.close;
  const last = window[window.length - 1]!.close;
  const drift = last - first;
  if (direction === "BUY" && drift <= 0) return null;
  if (direction === "SELL" && drift >= 0) return null;
  const finalTarget = round(entry + drift, 4);
  const span = finalTarget - entry;
  return {
    target1: round(entry + span * 0.5, 4),
    target2: round(entry + span * 0.75, 4),
    finalTarget,
    method: "trend_projection",
    finalRr: risk > 0 ? Math.abs(span) / risk : 0,
  };
}

function dynamicProjectionTarget(
  direction: RelativeStrengthIntradayDirection,
  entry: number,
  candles: readonly RelativeStrengthIntradayCandle[],
  bars: number,
  risk: number
): RelativeStrengthIntradayTargetLadder | null {
  const window = candles.slice(-Math.max(bars, 2));
  if (window.length < 2) return null;
  const avgRange =
    window.reduce((s, c) => s + (c.high - c.low), 0) / window.length;
  if (avgRange <= 0) return null;
  const sign = direction === "BUY" ? 1 : -1;
  const finalTarget = round(entry + sign * avgRange * bars, 4);
  const span = finalTarget - entry;
  return {
    target1: round(entry + span * 0.5, 4),
    target2: round(entry + span * 0.75, 4),
    finalTarget,
    method: "dynamic_projection",
    finalRr: risk > 0 ? Math.abs(span) / risk : 0,
  };
}

export function generateRelativeStrengthIntradayTargets(input: {
  detection: RelativeStrengthIntradayDetection;
  entry: number;
  stopLoss: number;
  atr: number | null;
  candles: readonly RelativeStrengthIntradayCandle[];
  config?: RelativeStrengthIntradayTradeConfig;
}): {
  targets: RelativeStrengthIntradayTargetLadder | null;
  warnings: string[];
} {
  const config = input.config ?? DEFAULT_RELATIVE_STRENGTH_INTRADAY_TRADE_CONFIG;
  const warnings: string[] = [];
  const risk = calculateRiskAmount(input.entry, input.stopLoss);
  const candidates: RelativeStrengthIntradayTargetLadder[] = [];

  const r = rMultipleTarget(
    input.detection.direction,
    input.entry,
    risk,
    config.targetRMultiples
  );
  if (r) candidates.push(r);

  if (input.atr !== null && Number.isFinite(input.atr) && input.atr > 0) {
    const a = atrProjectionTarget(
      input.detection.direction,
      input.entry,
      input.atr,
      risk,
      config.atrTargetMultiples
    );
    if (a) candidates.push(a);
  }

  const previous = previousExtremeTarget(
    input.detection.direction,
    input.entry,
    input.candles,
    risk
  );
  if (previous) candidates.push(previous);

  const trend = trendProjectionTarget(
    input.detection.direction,
    input.entry,
    input.candles,
    risk
  );
  if (trend) candidates.push(trend);

  const dynamic = dynamicProjectionTarget(
    input.detection.direction,
    input.entry,
    input.candles,
    config.dynamicProjectionBars,
    risk
  );
  if (dynamic) candidates.push(dynamic);

  const valid = candidates.filter((c) => c.finalRr + config.priceEpsilon >= 1);
  if (valid.length === 0) {
    return { targets: null, warnings: [...warnings, "Invalid targets."] };
  }

  valid.sort((a, b) =>
    config.preferHigherFinalRr ? b.finalRr - a.finalRr : a.finalRr - b.finalRr
  );
  return { targets: valid[0]!, warnings };
}

export function classifyRelativeStrengthIntradayQualityGrade(
  score: number,
  config: RelativeStrengthIntradayTradeConfig = DEFAULT_RELATIVE_STRENGTH_INTRADAY_TRADE_CONFIG
): RelativeStrengthIntradayQualityGrade {
  const t = config.gradeThresholds;
  if (score >= t.exceptionalMin) return "Exceptional";
  if (score >= t.highMin) return "High";
  if (score >= t.goodMin) return "Good";
  if (score >= t.averageMin) return "Average";
  return "Poor";
}

export function calculateRelativeStrengthIntradayTradeQuality(input: {
  detection: RelativeStrengthIntradayDetection;
  marketContext: InstitutionalMarketContext;
  riskReward: number;
  relativeVolume: number | null;
  config?: RelativeStrengthIntradayTradeConfig;
}): { score: number; grade: RelativeStrengthIntradayQualityGrade } {
  const config = input.config ?? DEFAULT_RELATIVE_STRENGTH_INTRADAY_TRADE_CONFIG;
  const w = config.qualityWeights;
  const d = input.detection;

  const relativeStrength =
    d.detected && d.outperformsBenchmark && d.outperformsSector
      ? clamp(d.relativeStrengthScore, 0, 100)
      : 25;
  const trendQuality = d.strongTrend ? clamp(d.confidence, 0, 100) : 25;
  const volumeConfirmation = d.volumeConfirmed ? 85 : 30;
  const sectorStrength = d.sectorConfirmed
    ? clamp(averageSectorScore(input.marketContext), 0, 100)
    : 25;
  const breadth = d.breadthConfirmed
    ? clamp(input.marketContext.marketBreadth.score, 0, 100)
    : 25;
  const marketRegime = d.marketConfirmed
    ? clamp(input.marketContext.confidence, 0, 100)
    : 25;
  const riskReward = clamp(
    (input.riskReward / Math.max(config.minimumRiskReward, 0.1)) * 70,
    0,
    100
  );
  const liquidity =
    input.relativeVolume === null ||
    !Number.isFinite(input.relativeVolume) ||
    input.relativeVolume >= 1
      ? 80
      : 35;
  const dataQuality = 85;

  const weightTotal =
    w.relativeStrength +
    w.trendQuality +
    w.volume +
    w.sectorStrength +
    w.breadth +
    w.marketRegime +
    w.riskReward +
    w.liquidity +
    w.dataQuality;

  const score = clamp(
    round(
      (relativeStrength * w.relativeStrength +
        trendQuality * w.trendQuality +
        volumeConfirmation * w.volume +
        sectorStrength * w.sectorStrength +
        breadth * w.breadth +
        marketRegime * w.marketRegime +
        riskReward * w.riskReward +
        liquidity * w.liquidity +
        dataQuality * w.dataQuality) /
        Math.max(weightTotal, 0.0001),
      1
    ),
    config.scoreFloor,
    config.scoreCeiling
  );

  return {
    score,
    grade: classifyRelativeStrengthIntradayQualityGrade(score, config),
  };
}

export function createRejectedRelativeStrengthIntradayTradeSetup(
  detection: RelativeStrengthIntradayDetection,
  warnings: string[]
): RelativeStrengthIntradayTradeSetup {
  return {
    detection,
    entry: 0,
    stopLoss: 0,
    target1: 0,
    target2: 0,
    finalTarget: 0,
    risk: 0,
    reward: 0,
    riskReward: 0,
    qualityScore: 0,
    qualityGrade: "Poor",
    holdingPeriod:
      DEFAULT_RELATIVE_STRENGTH_INTRADAY_TRADE_CONFIG.defaultHoldingPeriod,
    positionType:
      DEFAULT_RELATIVE_STRENGTH_INTRADAY_TRADE_CONFIG.defaultPositionType,
    warnings,
    explainability: createEmptyRelativeStrengthIntradayExplainability(warnings),
    institutionalScore: {
      conviction: 0,
      grade: "Weak",
      signalGrade: "F",
      confidence: detection.confidence || 0,
    },
  };
}

export function validateRelativeStrengthIntradayTradeSetup(
  setup: RelativeStrengthIntradayTradeSetup,
  config: RelativeStrengthIntradayTradeConfig = DEFAULT_RELATIVE_STRENGTH_INTRADAY_TRADE_CONFIG
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (setup.entry <= 0) errors.push("Invalid entry.");
  if (
    !isValidStop(
      setup.detection.direction,
      setup.entry,
      setup.stopLoss,
      config
    )
  ) {
    errors.push("Invalid stop.");
  }
  if (setup.finalTarget <= 0) errors.push("Invalid targets.");
  if (setup.riskReward + config.priceEpsilon < config.minimumRiskReward) {
    errors.push("RR below threshold.");
  }
  return { valid: errors.length === 0, errors };
}
