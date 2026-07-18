/**
 * 52-Week High Trade utilities — Sprint 11B.3S.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { createEmptyFiftyTwoWeekHighExplainability } from "./FiftyTwoWeekHighExplainability";
import { calculateRiskAmount, isValidStop } from "./FiftyTwoWeekHighRisk";
import type {
  FiftyTwoWeekHighCandle,
  FiftyTwoWeekHighDetection,
  FiftyTwoWeekHighDirection,
} from "./FiftyTwoWeekHighTypes";
import {
  DEFAULT_FIFTY_TWO_WEEK_HIGH_TRADE_CONFIG,
  type FiftyTwoWeekHighEntryMode,
  type FiftyTwoWeekHighQualityGrade,
  type FiftyTwoWeekHighTradeConfig,
  type FiftyTwoWeekHighTradeSetup,
} from "./FiftyTwoWeekHighTradeTypes";
import { averageSectorScore } from "./FiftyTwoWeekHighUtils";

export function calculateFiftyTwoWeekHighEntry(input: {
  detection: FiftyTwoWeekHighDetection;
  candles: readonly FiftyTwoWeekHighCandle[];
  mode?: FiftyTwoWeekHighEntryMode;
  config?: FiftyTwoWeekHighTradeConfig;
}): number | null {
  const config = input.config ?? DEFAULT_FIFTY_TWO_WEEK_HIGH_TRADE_CONFIG;
  const mode = input.mode ?? config.entryMode;
  const { detection } = input;
  if (!detection.detected || detection.direction === "NONE") return null;
  const last = input.candles[input.candles.length - 1];
  if (!last) return null;

  if (mode === "fresh_breakout") {
    return Number.isFinite(last.close) && last.close > 0
      ? round(last.close, 4)
      : null;
  }
  if (mode === "first_pullback") {
    return Number.isFinite(detection.currentBreakoutLevel) &&
      detection.currentBreakoutLevel > 0
      ? round(detection.currentBreakoutLevel, 4)
      : null;
  }
  if (mode === "vwap_retest") {
    return Number.isFinite(detection.vwap) && detection.vwap > 0
      ? round(detection.vwap, 4)
      : null;
  }
  if (mode === "continuation_entry") {
    return Number.isFinite(detection.currentBreakoutLevel) &&
      detection.currentBreakoutLevel > 0
      ? round(detection.currentBreakoutLevel * 1.002, 4)
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

export interface FiftyTwoWeekHighTargetLadder {
  target1: number;
  target2: number;
  finalTarget: number;
  method: string;
  finalRr: number;
}

function rMultipleTarget(
  direction: FiftyTwoWeekHighDirection,
  entry: number,
  risk: number,
  multiples: { target1: number; target2: number; finalTarget: number }
): FiftyTwoWeekHighTargetLadder | null {
  if (risk <= 0 || direction !== "BUY") return null;
  return {
    target1: round(entry + risk * multiples.target1, 4),
    target2: round(entry + risk * multiples.target2, 4),
    finalTarget: round(entry + risk * multiples.finalTarget, 4),
    method: "r_multiple",
    finalRr: multiples.finalTarget,
  };
}

function atrProjectionTarget(
  entry: number,
  atr: number,
  risk: number,
  multiples: { target1: number; target2: number; finalTarget: number }
): FiftyTwoWeekHighTargetLadder | null {
  if (atr <= 0) return null;
  const finalTarget = round(entry + atr * multiples.finalTarget, 4);
  return {
    target1: round(entry + atr * multiples.target1, 4),
    target2: round(entry + atr * multiples.target2, 4),
    finalTarget,
    method: "atr_projection",
    finalRr: risk > 0 ? Math.abs(finalTarget - entry) / risk : 0,
  };
}

function measuredMoveTarget(
  entry: number,
  candles: readonly FiftyTwoWeekHighCandle[],
  risk: number,
  fraction: number
): FiftyTwoWeekHighTargetLadder | null {
  const window = candles.slice(-40);
  if (window.length < 4) return null;
  const high = Math.max(...window.map((c) => c.high));
  const low = Math.min(...window.map((c) => c.low));
  const span = (high - low) * fraction;
  if (span <= 0) return null;
  const finalTarget = round(entry + span, 4);
  return {
    target1: round(entry + span * 0.4, 4),
    target2: round(entry + span * 0.7, 4),
    finalTarget,
    method: "measured_move",
    finalRr: risk > 0 ? span / risk : 0,
  };
}

function trendProjectionTarget(
  entry: number,
  detection: FiftyTwoWeekHighDetection,
  risk: number
): FiftyTwoWeekHighTargetLadder | null {
  const span = Math.max(detection.distanceFromBreakout * 3, detection.atr * 3);
  if (span <= 0) return null;
  const finalTarget = round(entry + span, 4);
  return {
    target1: round(entry + span * 0.4, 4),
    target2: round(entry + span * 0.7, 4),
    finalTarget,
    method: "trend_projection",
    finalRr: risk > 0 ? span / risk : 0,
  };
}

function dynamicProjectionTarget(
  entry: number,
  candles: readonly FiftyTwoWeekHighCandle[],
  bars: number,
  risk: number
): FiftyTwoWeekHighTargetLadder | null {
  const window = candles.slice(-Math.max(bars, 2));
  if (window.length < 2) return null;
  const avgRange =
    window.reduce((s, c) => s + (c.high - c.low), 0) / window.length;
  if (avgRange <= 0) return null;
  const finalTarget = round(entry + avgRange * bars, 4);
  const span = finalTarget - entry;
  return {
    target1: round(entry + span * 0.4, 4),
    target2: round(entry + span * 0.7, 4),
    finalTarget,
    method: "dynamic_projection",
    finalRr: risk > 0 ? span / risk : 0,
  };
}

/** Trailing stop reference distance used as final target floor helper. */
function trailingStopProjection(
  entry: number,
  atr: number,
  risk: number,
  multiple: number
): FiftyTwoWeekHighTargetLadder | null {
  if (atr <= 0) return null;
  const trail = atr * multiple;
  const finalTarget = round(entry + trail * 2.5, 4);
  const span = finalTarget - entry;
  return {
    target1: round(entry + trail, 4),
    target2: round(entry + trail * 1.75, 4),
    finalTarget,
    method: "trailing_stop_projection",
    finalRr: risk > 0 ? span / risk : 0,
  };
}

export function generateFiftyTwoWeekHighTargets(input: {
  detection: FiftyTwoWeekHighDetection;
  entry: number;
  stopLoss: number;
  atr: number | null;
  candles: readonly FiftyTwoWeekHighCandle[];
  config?: FiftyTwoWeekHighTradeConfig;
}): { targets: FiftyTwoWeekHighTargetLadder | null; warnings: string[] } {
  const config = input.config ?? DEFAULT_FIFTY_TWO_WEEK_HIGH_TRADE_CONFIG;
  const warnings: string[] = [];
  const risk = calculateRiskAmount(input.entry, input.stopLoss);
  const candidates: FiftyTwoWeekHighTargetLadder[] = [];

  const r = rMultipleTarget(
    input.detection.direction,
    input.entry,
    risk,
    config.targetRMultiples
  );
  if (r) candidates.push(r);

  if (input.atr !== null && Number.isFinite(input.atr) && input.atr > 0) {
    const a = atrProjectionTarget(
      input.entry,
      input.atr,
      risk,
      config.atrTargetMultiples
    );
    if (a) candidates.push(a);
    const trail = trailingStopProjection(
      input.entry,
      input.atr,
      risk,
      config.trailingStopAtrMultiple
    );
    if (trail) candidates.push(trail);
  }

  const measured = measuredMoveTarget(
    input.entry,
    input.candles,
    risk,
    config.measuredMoveFraction
  );
  if (measured) candidates.push(measured);

  const trend = trendProjectionTarget(input.entry, input.detection, risk);
  if (trend) candidates.push(trend);

  const dynamic = dynamicProjectionTarget(
    input.entry,
    input.candles,
    config.dynamicProjectionBars,
    risk
  );
  if (dynamic) candidates.push(dynamic);

  const valid = candidates.filter(
    (c) => c.finalRr + config.priceEpsilon >= config.minimumRiskReward
  );
  if (valid.length === 0) {
    return { targets: null, warnings: [...warnings, "Invalid targets."] };
  }
  valid.sort((a, b) =>
    config.preferHigherFinalRr ? b.finalRr - a.finalRr : a.finalRr - b.finalRr
  );
  return { targets: valid[0]!, warnings };
}

export function classifyFiftyTwoWeekHighQualityGrade(
  score: number,
  config: FiftyTwoWeekHighTradeConfig = DEFAULT_FIFTY_TWO_WEEK_HIGH_TRADE_CONFIG
): FiftyTwoWeekHighQualityGrade {
  const t = config.gradeThresholds;
  if (score >= t.exceptionalMin) return "Exceptional";
  if (score >= t.highMin) return "High";
  if (score >= t.goodMin) return "Good";
  if (score >= t.averageMin) return "Average";
  return "Poor";
}

export function calculateFiftyTwoWeekHighTradeQuality(input: {
  detection: FiftyTwoWeekHighDetection;
  marketContext: InstitutionalMarketContext;
  riskReward: number;
  relativeStrength: number | null;
  config?: FiftyTwoWeekHighTradeConfig;
}): { score: number; grade: FiftyTwoWeekHighQualityGrade } {
  const config = input.config ?? DEFAULT_FIFTY_TWO_WEEK_HIGH_TRADE_CONFIG;
  const w = config.qualityWeights;
  const d = input.detection;

  const breakoutQuality = d.breakoutConfirmed
    ? clamp(d.breakoutQuality, 0, 100)
    : 25;
  const trendQuality = d.detected ? clamp(d.trendQuality, 0, 100) : 25;
  const relativeStrength = d.rsConfirmed
    ? clamp(input.relativeStrength ?? 65, 0, 100)
    : 25;
  const volumeConfirmation = d.volumeConfirmed
    ? clamp(d.volumeConfirmation, 0, 100)
    : 25;
  const sectorLeadership = d.sectorConfirmed
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

  const weightTotal =
    w.breakoutQuality +
    w.trendQuality +
    w.relativeStrength +
    w.volumeConfirmation +
    w.sectorLeadership +
    w.marketRegime +
    w.riskReward;

  const score = clamp(
    round(
      (breakoutQuality * w.breakoutQuality +
        trendQuality * w.trendQuality +
        relativeStrength * w.relativeStrength +
        volumeConfirmation * w.volumeConfirmation +
        sectorLeadership * w.sectorLeadership +
        marketRegime * w.marketRegime +
        riskReward * w.riskReward) /
        Math.max(weightTotal, 0.0001),
      1
    ),
    config.scoreFloor,
    config.scoreCeiling
  );

  return {
    score,
    grade: classifyFiftyTwoWeekHighQualityGrade(score, config),
  };
}

export function createRejectedFiftyTwoWeekHighTradeSetup(
  detection: FiftyTwoWeekHighDetection,
  warnings: string[]
): FiftyTwoWeekHighTradeSetup {
  return {
    detection,
    previous52WeekHigh: detection.previous52WeekHigh,
    currentBreakoutLevel: detection.currentBreakoutLevel,
    breakoutAge: detection.breakoutAge,
    distanceFromBreakout: detection.distanceFromBreakout,
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
    conviction: 0,
    signalGrade: "F",
    confidence: detection.confidence || 0,
    holdingPeriod:
      DEFAULT_FIFTY_TWO_WEEK_HIGH_TRADE_CONFIG.defaultHoldingPeriod,
    positionType:
      DEFAULT_FIFTY_TWO_WEEK_HIGH_TRADE_CONFIG.defaultPositionType,
    warnings,
    positiveReasons: [],
    negativeReasons: [],
    neutralReasons: [],
    institutionalSummary: [],
    explainability: createEmptyFiftyTwoWeekHighExplainability(warnings),
    institutionalScore: {
      conviction: 0,
      grade: "Weak",
      signalGrade: "F",
      confidence: detection.confidence || 0,
    },
  };
}

export function validateFiftyTwoWeekHighTradeSetup(
  setup: FiftyTwoWeekHighTradeSetup,
  config: FiftyTwoWeekHighTradeConfig = DEFAULT_FIFTY_TWO_WEEK_HIGH_TRADE_CONFIG
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
