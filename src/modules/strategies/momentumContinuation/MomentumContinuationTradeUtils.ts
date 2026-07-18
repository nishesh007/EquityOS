/**
 * Momentum Continuation Trade utilities — Sprint 11B.3F.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { createEmptyMomentumContinuationExplainability } from "./MomentumContinuationExplainability";
import {
  calculateRiskAmount,
  isValidStop,
} from "./MomentumContinuationRisk";
import { averageSectorScore } from "./MomentumContinuationUtils";
import type {
  MomentumContinuationCandle,
  MomentumContinuationDetection,
  MomentumContinuationDirection,
} from "./MomentumContinuationTypes";
import {
  DEFAULT_MOMENTUM_CONTINUATION_TRADE_CONFIG,
  type MomentumContinuationEntryMode,
  type MomentumContinuationQualityGrade,
  type MomentumContinuationTradeConfig,
  type MomentumContinuationTradeSetup,
} from "./MomentumContinuationTradeTypes";

export function calculateMomentumContinuationEntry(input: {
  detection: MomentumContinuationDetection;
  candles: readonly MomentumContinuationCandle[];
  mode?: MomentumContinuationEntryMode;
  config?: MomentumContinuationTradeConfig;
}): number | null {
  const config = input.config ?? DEFAULT_MOMENTUM_CONTINUATION_TRADE_CONFIG;
  const mode = input.mode ?? config.entryMode;
  const { detection } = input;
  if (!detection.detected || detection.direction === "NONE") return null;

  const last = input.candles[input.candles.length - 1];
  if (!last) return null;

  if (mode === "confirmation" || mode === "breakout_close") {
    return Number.isFinite(last.close) && last.close > 0
      ? round(last.close, 4)
      : null;
  }

  // retest — pullback high (BUY) / pullback low (SELL)
  if (detection.direction === "BUY") {
    return Number.isFinite(detection.pullbackHigh) && detection.pullbackHigh > 0
      ? round(detection.pullbackHigh, 4)
      : null;
  }
  return Number.isFinite(detection.pullbackLow) && detection.pullbackLow > 0
    ? round(detection.pullbackLow, 4)
    : null;
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

export interface MomentumContinuationTargetLadder {
  target1: number;
  target2: number;
  finalTarget: number;
  method: string;
  finalRr: number;
}

function rMultipleTarget(
  direction: MomentumContinuationDirection,
  entry: number,
  risk: number,
  multiples: { target1: number; target2: number; finalTarget: number }
): MomentumContinuationTargetLadder | null {
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
  direction: MomentumContinuationDirection,
  entry: number,
  atr: number,
  risk: number,
  multiples: { target1: number; target2: number; finalTarget: number }
): MomentumContinuationTargetLadder | null {
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

function previousResistanceTarget(
  direction: MomentumContinuationDirection,
  entry: number,
  candles: readonly MomentumContinuationCandle[],
  risk: number
): MomentumContinuationTargetLadder | null {
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

function measuredMoveTarget(
  direction: MomentumContinuationDirection,
  entry: number,
  detection: MomentumContinuationDetection,
  risk: number,
  fraction: number
): MomentumContinuationTargetLadder | null {
  const impulse =
    Math.abs(detection.pullbackHigh - detection.pullbackLow) * fraction;
  if (impulse <= 0) return null;
  const sign = direction === "BUY" ? 1 : -1;
  const finalTarget = round(entry + sign * impulse * 2, 4);
  const span = finalTarget - entry;
  return {
    target1: round(entry + span * 0.5, 4),
    target2: round(entry + span * 0.75, 4),
    finalTarget,
    method: "measured_move",
    finalRr: risk > 0 ? Math.abs(span) / risk : 0,
  };
}

function trendProjectionTarget(
  direction: MomentumContinuationDirection,
  entry: number,
  candles: readonly MomentumContinuationCandle[],
  risk: number
): MomentumContinuationTargetLadder | null {
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
  direction: MomentumContinuationDirection,
  entry: number,
  candles: readonly MomentumContinuationCandle[],
  bars: number,
  risk: number
): MomentumContinuationTargetLadder | null {
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

export function generateMomentumContinuationTargets(input: {
  detection: MomentumContinuationDetection;
  entry: number;
  stopLoss: number;
  atr: number | null;
  candles: readonly MomentumContinuationCandle[];
  config?: MomentumContinuationTradeConfig;
}): {
  targets: MomentumContinuationTargetLadder | null;
  warnings: string[];
} {
  const config = input.config ?? DEFAULT_MOMENTUM_CONTINUATION_TRADE_CONFIG;
  const warnings: string[] = [];
  const risk = calculateRiskAmount(input.entry, input.stopLoss);
  const candidates: MomentumContinuationTargetLadder[] = [];

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

  const resistance = previousResistanceTarget(
    input.detection.direction,
    input.entry,
    input.candles,
    risk
  );
  if (resistance) candidates.push(resistance);

  const measured = measuredMoveTarget(
    input.detection.direction,
    input.entry,
    input.detection,
    risk,
    config.measuredMoveFraction
  );
  if (measured) candidates.push(measured);

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

export function classifyMomentumContinuationQualityGrade(
  score: number,
  config: MomentumContinuationTradeConfig = DEFAULT_MOMENTUM_CONTINUATION_TRADE_CONFIG
): MomentumContinuationQualityGrade {
  const t = config.gradeThresholds;
  if (score >= t.exceptionalMin) return "Exceptional";
  if (score >= t.highMin) return "High";
  if (score >= t.goodMin) return "Good";
  if (score >= t.averageMin) return "Average";
  return "Poor";
}

export function calculateMomentumContinuationTradeQuality(input: {
  detection: MomentumContinuationDetection;
  marketContext: InstitutionalMarketContext;
  riskReward: number;
  relativeVolume: number | null;
  config?: MomentumContinuationTradeConfig;
}): { score: number; grade: MomentumContinuationQualityGrade } {
  const config = input.config ?? DEFAULT_MOMENTUM_CONTINUATION_TRADE_CONFIG;
  const w = config.qualityWeights;
  const d = input.detection;

  const trendStrength = d.strongTrend ? clamp(d.trendStrength, 0, 100) : 25;
  const pullbackQuality = d.healthyPullback
    ? clamp(90 - d.pullbackDepth * 80, 40, 95)
    : 25;
  const volumeConfirmation = d.volumeConfirmed ? 85 : 30;
  const adxStrength = d.adx > 0 ? clamp(50 + (d.adx - 20) * 2, 0, 100) : 30;
  const breadth = d.breadthConfirmed
    ? clamp(input.marketContext.marketBreadth.score, 0, 100)
    : 25;
  const sectorStrength = d.sectorConfirmed
    ? clamp(averageSectorScore(input.marketContext), 0, 100)
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

  const score = clamp(
    round(
      trendStrength * w.trendStrength +
        pullbackQuality * w.pullbackQuality +
        volumeConfirmation * w.volumeConfirmation +
        adxStrength * w.adxStrength +
        breadth * w.breadth +
        sectorStrength * w.sectorStrength +
        marketRegime * w.marketRegime +
        riskReward * w.riskReward +
        liquidity * w.liquidity,
      1
    ),
    config.scoreFloor,
    config.scoreCeiling
  );

  return {
    score,
    grade: classifyMomentumContinuationQualityGrade(score, config),
  };
}

export function createRejectedMomentumContinuationTradeSetup(
  detection: MomentumContinuationDetection,
  warnings: string[]
): MomentumContinuationTradeSetup {
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
      DEFAULT_MOMENTUM_CONTINUATION_TRADE_CONFIG.defaultHoldingPeriod,
    positionType:
      DEFAULT_MOMENTUM_CONTINUATION_TRADE_CONFIG.defaultPositionType,
    warnings,
    explainability: createEmptyMomentumContinuationExplainability(warnings),
    institutionalScore: {
      conviction: 0,
      grade: "Weak",
      signalGrade: "F",
      confidence: detection.confidence || 0,
    },
  };
}

export function validateMomentumContinuationTradeSetup(
  setup: MomentumContinuationTradeSetup,
  config: MomentumContinuationTradeConfig = DEFAULT_MOMENTUM_CONTINUATION_TRADE_CONFIG
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
