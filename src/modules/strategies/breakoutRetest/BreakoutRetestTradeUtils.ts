/**
 * Breakout Retest Trade utilities — Sprint 11B.3I.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { createEmptyBreakoutRetestExplainability } from "./BreakoutRetestExplainability";
import {
  calculateRiskAmount,
  isValidStop,
} from "./BreakoutRetestRisk";
import { averageSectorScore } from "./BreakoutRetestUtils";
import type {
  BreakoutRetestCandle,
  BreakoutRetestDetection,
  BreakoutRetestDirection,
} from "./BreakoutRetestTypes";
import {
  DEFAULT_BREAKOUT_RETEST_TRADE_CONFIG,
  type BreakoutRetestEntryMode,
  type BreakoutRetestQualityGrade,
  type BreakoutRetestTradeConfig,
  type BreakoutRetestTradeSetup,
} from "./BreakoutRetestTradeTypes";

export function calculateBreakoutRetestEntry(input: {
  detection: BreakoutRetestDetection;
  candles: readonly BreakoutRetestCandle[];
  vwap: number;
  mode?: BreakoutRetestEntryMode;
  config?: BreakoutRetestTradeConfig;
}): number | null {
  const config = input.config ?? DEFAULT_BREAKOUT_RETEST_TRADE_CONFIG;
  const mode = input.mode ?? config.entryMode;
  const { detection } = input;
  if (!detection.detected || detection.direction === "NONE") return null;

  const last = input.candles[input.candles.length - 1];
  if (!last) return null;

  if (mode === "confirmation") {
    return Number.isFinite(last.close) && last.close > 0
      ? round(last.close, 4)
      : null;
  }

  if (mode === "aggressive_retest") {
    if (detection.direction === "BUY" && detection.breakoutLevel > 0) {
      return round(detection.breakoutLevel, 4);
    }
    if (detection.direction === "SELL" && detection.breakoutLevel > 0) {
      return round(detection.breakoutLevel, 4);
    }
    return null;
  }

  if (mode === "breakout_continuation") {
    const window = input.candles.slice(-3, -1);
    if (window.length < 1) {
      return Number.isFinite(last.close) && last.close > 0
        ? round(last.close, 4)
        : null;
    }
    if (detection.direction === "BUY") {
      const pullback = Math.min(...window.map((c) => c.low));
      return Number.isFinite(pullback) && pullback > 0
        ? round(pullback, 4)
        : null;
    }
    const pullback = Math.max(...window.map((c) => c.high));
    return Number.isFinite(pullback) && pullback > 0
      ? round(pullback, 4)
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

export interface BreakoutRetestTargetLadder {
  target1: number;
  target2: number;
  finalTarget: number;
  method: string;
  finalRr: number;
}

function rMultipleTarget(
  direction: BreakoutRetestDirection,
  entry: number,
  risk: number,
  multiples: { target1: number; target2: number; finalTarget: number }
): BreakoutRetestTargetLadder | null {
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
  direction: BreakoutRetestDirection,
  entry: number,
  atr: number,
  risk: number,
  multiples: { target1: number; target2: number; finalTarget: number }
): BreakoutRetestTargetLadder | null {
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

function measuredMoveTarget(
  direction: BreakoutRetestDirection,
  entry: number,
  detection: BreakoutRetestDetection,
  risk: number,
  fraction: number
): BreakoutRetestTargetLadder | null {
  const span = Math.abs(detection.breakoutExtreme - detection.breakoutLevel);
  if (span <= 0) return null;
  const move = span * fraction;
  const sign = direction === "BUY" ? 1 : -1;
  const finalTarget = round(entry + sign * move, 4);
  return {
    target1: round(entry + sign * move * 0.5, 4),
    target2: round(entry + sign * move * 0.75, 4),
    finalTarget,
    method: "measured_move",
    finalRr: risk > 0 ? Math.abs(finalTarget - entry) / risk : 0,
  };
}

function previousExtremeTarget(
  direction: BreakoutRetestDirection,
  entry: number,
  candles: readonly BreakoutRetestCandle[],
  risk: number
): BreakoutRetestTargetLadder | null {
  if (direction === "BUY") {
    const resistance = Math.max(...candles.map((c) => c.high));
    if (resistance <= entry) return null;
    const span = resistance - entry;
    return {
      target1: round(entry + span * 0.5, 4),
      target2: round(entry + span * 0.75, 4),
      finalTarget: round(resistance, 4),
      method: "previous_resistance",
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
    method: "previous_support",
    finalRr: risk > 0 ? span / risk : 0,
  };
}

function dynamicProjectionTarget(
  direction: BreakoutRetestDirection,
  entry: number,
  candles: readonly BreakoutRetestCandle[],
  bars: number,
  risk: number
): BreakoutRetestTargetLadder | null {
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

export function generateBreakoutRetestTargets(input: {
  detection: BreakoutRetestDetection;
  entry: number;
  stopLoss: number;
  atr: number | null;
  candles: readonly BreakoutRetestCandle[];
  config?: BreakoutRetestTradeConfig;
}): {
  targets: BreakoutRetestTargetLadder | null;
  warnings: string[];
} {
  const config = input.config ?? DEFAULT_BREAKOUT_RETEST_TRADE_CONFIG;
  const warnings: string[] = [];
  const risk = calculateRiskAmount(input.entry, input.stopLoss);
  const candidates: BreakoutRetestTargetLadder[] = [];

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

  const measured = measuredMoveTarget(
    input.detection.direction,
    input.entry,
    input.detection,
    risk,
    config.measuredMoveFraction
  );
  if (measured) candidates.push(measured);

  const previous = previousExtremeTarget(
    input.detection.direction,
    input.entry,
    input.candles,
    risk
  );
  if (previous) candidates.push(previous);

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

export function classifyBreakoutRetestQualityGrade(
  score: number,
  config: BreakoutRetestTradeConfig = DEFAULT_BREAKOUT_RETEST_TRADE_CONFIG
): BreakoutRetestQualityGrade {
  const t = config.gradeThresholds;
  if (score >= t.exceptionalMin) return "Exceptional";
  if (score >= t.highMin) return "High";
  if (score >= t.goodMin) return "Good";
  if (score >= t.averageMin) return "Average";
  return "Poor";
}

function normalizeQualityWeights(
  weights: BreakoutRetestTradeConfig["qualityWeights"]
): BreakoutRetestTradeConfig["qualityWeights"] {
  const total =
    weights.breakoutQuality +
    weights.retestQuality +
    weights.volume +
    weights.trendStructure +
    weights.breadth +
    weights.sectorStrength +
    weights.marketRegime +
    weights.riskReward;
  if (Math.abs(total - 1) < 0.0001 || total <= 0) return weights;
  return {
    breakoutQuality: weights.breakoutQuality / total,
    retestQuality: weights.retestQuality / total,
    volume: weights.volume / total,
    trendStructure: weights.trendStructure / total,
    breadth: weights.breadth / total,
    sectorStrength: weights.sectorStrength / total,
    marketRegime: weights.marketRegime / total,
    riskReward: weights.riskReward / total,
  };
}

export function calculateBreakoutRetestTradeQuality(input: {
  detection: BreakoutRetestDetection;
  marketContext: InstitutionalMarketContext;
  riskReward: number;
  relativeVolume: number | null;
  config?: BreakoutRetestTradeConfig;
}): { score: number; grade: BreakoutRetestQualityGrade } {
  const config = input.config ?? DEFAULT_BREAKOUT_RETEST_TRADE_CONFIG;
  const w = normalizeQualityWeights(config.qualityWeights);
  const d = input.detection;

  const breakoutQuality = d.detected
    ? clamp(d.breakoutQuality, 0, 100)
    : 25;
  const retestQuality = d.retestHeld
    ? clamp(d.retestQuality, 0, 100)
    : 25;
  const trendStructure = d.continuationConfirmed
    ? clamp(d.confidence, 0, 100)
    : 25;
  const volumeQuality = d.volumeConfirmed ? clamp(d.confidence * 0.85, 0, 100) : 30;
  const sectorStrength = d.sectorConfirmed
    ? clamp(averageSectorScore(input.marketContext), 0, 100)
    : 25;
  const breadth = d.breadthConfirmed
    ? clamp(input.marketContext.marketBreadth.score, 0, 100)
    : 25;
  const marketRegime = d.marketConfirmed
    ? clamp(input.marketContext.confidence, 0, 100)
    : 25;
  const riskRewardScore = clamp(
    (input.riskReward / Math.max(config.minimumRiskReward, 0.1)) * 70,
    0,
    100
  );

  const score = clamp(
    round(
      breakoutQuality * w.breakoutQuality +
        retestQuality * w.retestQuality +
        volumeQuality * w.volume +
        trendStructure * w.trendStructure +
        sectorStrength * w.sectorStrength +
        breadth * w.breadth +
        marketRegime * w.marketRegime +
        riskRewardScore * w.riskReward,
      1
    ),
    config.scoreFloor,
    config.scoreCeiling
  );

  return {
    score,
    grade: classifyBreakoutRetestQualityGrade(score, config),
  };
}

export function createRejectedBreakoutRetestTradeSetup(
  detection: BreakoutRetestDetection,
  warnings: string[]
): BreakoutRetestTradeSetup {
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
    holdingPeriod: DEFAULT_BREAKOUT_RETEST_TRADE_CONFIG.defaultHoldingPeriod,
    positionType: DEFAULT_BREAKOUT_RETEST_TRADE_CONFIG.defaultPositionType,
    warnings,
    explainability: createEmptyBreakoutRetestExplainability(warnings),
    institutionalScore: {
      conviction: 0,
      grade: "Weak",
      signalGrade: "F",
      confidence: detection.confidence || 0,
    },
  };
}

export function validateBreakoutRetestTradeSetup(
  setup: BreakoutRetestTradeSetup,
  config: BreakoutRetestTradeConfig = DEFAULT_BREAKOUT_RETEST_TRADE_CONFIG
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
