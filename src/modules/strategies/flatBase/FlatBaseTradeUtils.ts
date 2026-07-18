/**
 * Flat Base Trade utilities — Sprint 11B.3R.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { createEmptyFlatBaseExplainability } from "./FlatBaseExplainability";
import { calculateRiskAmount, isValidStop } from "./FlatBaseRisk";
import type {
  FlatBaseCandle,
  FlatBaseDetection,
  FlatBaseDirection,
} from "./FlatBaseTypes";
import {
  DEFAULT_FLAT_BASE_TRADE_CONFIG,
  type FlatBaseEntryMode,
  type FlatBaseQualityGrade,
  type FlatBaseTradeConfig,
  type FlatBaseTradeSetup,
} from "./FlatBaseTradeTypes";
import { averageSectorScore } from "./FlatBaseUtils";

export function calculateFlatBaseEntry(input: {
  detection: FlatBaseDetection;
  candles: readonly FlatBaseCandle[];
  mode?: FlatBaseEntryMode;
  config?: FlatBaseTradeConfig;
}): number | null {
  const config = input.config ?? DEFAULT_FLAT_BASE_TRADE_CONFIG;
  const mode = input.mode ?? config.entryMode;
  const { detection } = input;
  if (!detection.detected || detection.direction === "NONE") return null;
  const last = input.candles[input.candles.length - 1];
  if (!last) return null;

  if (mode === "pivot_breakout") {
    return Number.isFinite(last.close) && last.close > 0
      ? round(last.close, 4)
      : null;
  }
  if (mode === "retest_entry") {
    return Number.isFinite(detection.pivotPrice) && detection.pivotPrice > 0
      ? round(detection.pivotPrice, 4)
      : null;
  }
  if (mode === "aggressive_entry") {
    return Number.isFinite(detection.pivotPrice) && detection.pivotPrice > 0
      ? round(detection.pivotPrice * 1.001, 4)
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

export interface FlatBaseTargetLadder {
  target1: number;
  target2: number;
  finalTarget: number;
  method: string;
  finalRr: number;
}

function rMultipleTarget(
  direction: FlatBaseDirection,
  entry: number,
  risk: number,
  multiples: { target1: number; target2: number; finalTarget: number }
): FlatBaseTargetLadder | null {
  if (risk <= 0 || direction !== "BUY") return null;
  return {
    target1: round(entry + risk * multiples.target1, 4),
    target2: round(entry + risk * multiples.target2, 4),
    finalTarget: round(entry + risk * multiples.finalTarget, 4),
    method: "r_multiple",
    finalRr: multiples.finalTarget,
  };
}

function measuredMoveTarget(
  entry: number,
  detection: FlatBaseDetection,
  risk: number,
  fraction: number
): FlatBaseTargetLadder | null {
  const span = detection.baseDepth * fraction;
  if (span <= 0) return null;
  const finalTarget = round(entry + span, 4);
  return {
    target1: round(entry + span * 0.5, 4),
    target2: round(entry + span * 0.75, 4),
    finalTarget,
    method: "measured_move",
    finalRr: risk > 0 ? span / risk : 0,
  };
}

function atrProjectionTarget(
  entry: number,
  atr: number,
  risk: number,
  multiples: { target1: number; target2: number; finalTarget: number }
): FlatBaseTargetLadder | null {
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

function previousHighTarget(
  entry: number,
  candles: readonly FlatBaseCandle[],
  risk: number
): FlatBaseTargetLadder | null {
  if (candles.length < 10) return null;
  const priorHigh = Math.max(...candles.slice(0, -1).map((c) => c.high));
  if (!(priorHigh > entry)) return null;
  const span = priorHigh - entry;
  return {
    target1: round(entry + span * 0.5, 4),
    target2: round(entry + span * 0.75, 4),
    finalTarget: round(priorHigh, 4),
    method: "previous_high",
    finalRr: risk > 0 ? span / risk : 0,
  };
}

function dynamicProjectionTarget(
  entry: number,
  candles: readonly FlatBaseCandle[],
  bars: number,
  risk: number
): FlatBaseTargetLadder | null {
  const window = candles.slice(-Math.max(bars, 2));
  if (window.length < 2) return null;
  const avgRange =
    window.reduce((s, c) => s + (c.high - c.low), 0) / window.length;
  if (avgRange <= 0) return null;
  const finalTarget = round(entry + avgRange * bars, 4);
  const span = finalTarget - entry;
  return {
    target1: round(entry + span * 0.5, 4),
    target2: round(entry + span * 0.75, 4),
    finalTarget,
    method: "dynamic_projection",
    finalRr: risk > 0 ? span / risk : 0,
  };
}

export function generateFlatBaseTargets(input: {
  detection: FlatBaseDetection;
  entry: number;
  stopLoss: number;
  atr: number | null;
  candles: readonly FlatBaseCandle[];
  config?: FlatBaseTradeConfig;
}): { targets: FlatBaseTargetLadder | null; warnings: string[] } {
  const config = input.config ?? DEFAULT_FLAT_BASE_TRADE_CONFIG;
  const warnings: string[] = [];
  const risk = calculateRiskAmount(input.entry, input.stopLoss);
  const candidates: FlatBaseTargetLadder[] = [];

  const r = rMultipleTarget(
    input.detection.direction,
    input.entry,
    risk,
    config.targetRMultiples
  );
  if (r) candidates.push(r);

  const measured = measuredMoveTarget(
    input.entry,
    input.detection,
    risk,
    config.measuredMoveFraction
  );
  if (measured) candidates.push(measured);

  if (input.atr !== null && Number.isFinite(input.atr) && input.atr > 0) {
    const a = atrProjectionTarget(
      input.entry,
      input.atr,
      risk,
      config.atrTargetMultiples
    );
    if (a) candidates.push(a);
  }

  const prevHigh = previousHighTarget(input.entry, input.candles, risk);
  if (prevHigh) candidates.push(prevHigh);

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

export function classifyFlatBaseQualityGrade(
  score: number,
  config: FlatBaseTradeConfig = DEFAULT_FLAT_BASE_TRADE_CONFIG
): FlatBaseQualityGrade {
  const t = config.gradeThresholds;
  if (score >= t.exceptionalMin) return "Exceptional";
  if (score >= t.highMin) return "High";
  if (score >= t.goodMin) return "Good";
  if (score >= t.averageMin) return "Average";
  return "Poor";
}

export function calculateFlatBaseTradeQuality(input: {
  detection: FlatBaseDetection;
  marketContext: InstitutionalMarketContext;
  riskReward: number;
  relativeStrength: number | null;
  config?: FlatBaseTradeConfig;
}): { score: number; grade: FlatBaseQualityGrade } {
  const config = input.config ?? DEFAULT_FLAT_BASE_TRADE_CONFIG;
  const w = config.qualityWeights;
  const d = input.detection;

  const baseQuality = d.detected ? clamp(d.baseQuality, 0, 100) : 25;
  const breakoutQuality = d.breakoutConfirmed
    ? clamp(d.breakoutQuality, 0, 100)
    : 25;
  const trendQuality = d.detected ? clamp(d.trendQuality, 0, 100) : 25;
  const volumeConfirmation = d.volumeConfirmed
    ? clamp(d.volumeConfirmation, 0, 100)
    : 25;
  const relativeStrength = d.rsConfirmed
    ? clamp(input.relativeStrength ?? 60, 0, 100)
    : 25;
  const sectorStrength = d.sectorConfirmed
    ? clamp(averageSectorScore(input.marketContext), 0, 100)
    : 25;
  const riskReward = clamp(
    (input.riskReward / Math.max(config.minimumRiskReward, 0.1)) * 70,
    0,
    100
  );

  const weightTotal =
    w.baseQuality +
    w.breakoutQuality +
    w.trendQuality +
    w.volumeConfirmation +
    w.relativeStrength +
    w.sectorStrength +
    w.riskReward;

  const score = clamp(
    round(
      (baseQuality * w.baseQuality +
        breakoutQuality * w.breakoutQuality +
        trendQuality * w.trendQuality +
        volumeConfirmation * w.volumeConfirmation +
        relativeStrength * w.relativeStrength +
        sectorStrength * w.sectorStrength +
        riskReward * w.riskReward) /
        Math.max(weightTotal, 0.0001),
      1
    ),
    config.scoreFloor,
    config.scoreCeiling
  );

  return { score, grade: classifyFlatBaseQualityGrade(score, config) };
}

export function createRejectedFlatBaseTradeSetup(
  detection: FlatBaseDetection,
  warnings: string[]
): FlatBaseTradeSetup {
  return {
    detection,
    pivotPrice: detection.pivotPrice,
    baseDepth: detection.baseDepth,
    baseDuration: detection.baseDuration,
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
    holdingPeriod: DEFAULT_FLAT_BASE_TRADE_CONFIG.defaultHoldingPeriod,
    positionType: DEFAULT_FLAT_BASE_TRADE_CONFIG.defaultPositionType,
    warnings,
    positiveReasons: [],
    negativeReasons: [],
    neutralReasons: [],
    institutionalSummary: [],
    explainability: createEmptyFlatBaseExplainability(warnings),
    institutionalScore: {
      conviction: 0,
      grade: "Weak",
      signalGrade: "F",
      confidence: detection.confidence || 0,
    },
  };
}

export function validateFlatBaseTradeSetup(
  setup: FlatBaseTradeSetup,
  config: FlatBaseTradeConfig = DEFAULT_FLAT_BASE_TRADE_CONFIG
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
