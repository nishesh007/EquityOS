/**
 * Cup & Handle Trade utilities — Sprint 11B.3Q.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { createEmptyCupHandleExplainability } from "./CupHandleExplainability";
import { calculateRiskAmount, isValidStop } from "./CupHandleRisk";
import type {
  CupHandleCandle,
  CupHandleDetection,
  CupHandleDirection,
} from "./CupHandleTypes";
import {
  DEFAULT_CUP_HANDLE_TRADE_CONFIG,
  type CupHandleEntryMode,
  type CupHandleQualityGrade,
  type CupHandleTradeConfig,
  type CupHandleTradeSetup,
} from "./CupHandleTradeTypes";
import { averageSectorScore } from "./CupHandleUtils";

export function calculateCupHandleEntry(input: {
  detection: CupHandleDetection;
  candles: readonly CupHandleCandle[];
  mode?: CupHandleEntryMode;
  config?: CupHandleTradeConfig;
}): number | null {
  const config = input.config ?? DEFAULT_CUP_HANDLE_TRADE_CONFIG;
  const mode = input.mode ?? config.entryMode;
  const { detection } = input;
  if (!detection.detected || detection.direction === "NONE") return null;
  const last = input.candles[input.candles.length - 1];
  if (!last) return null;

  if (mode === "handle_breakout") {
    return Number.isFinite(last.close) && last.close > 0
      ? round(last.close, 4)
      : null;
  }
  if (mode === "retest_entry") {
    return Number.isFinite(detection.pivotPrice) && detection.pivotPrice > 0
      ? round(detection.pivotPrice, 4)
      : null;
  }
  if (mode === "early_breakout") {
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

export interface CupHandleTargetLadder {
  target1: number;
  target2: number;
  finalTarget: number;
  method: string;
  finalRr: number;
}

function rMultipleTarget(
  direction: CupHandleDirection,
  entry: number,
  risk: number,
  multiples: { target1: number; target2: number; finalTarget: number }
): CupHandleTargetLadder | null {
  if (risk <= 0 || direction !== "BUY") return null;
  return {
    target1: round(entry + risk * multiples.target1, 4),
    target2: round(entry + risk * multiples.target2, 4),
    finalTarget: round(entry + risk * multiples.finalTarget, 4),
    method: "r_multiple",
    finalRr: multiples.finalTarget,
  };
}

function cupHeightProjection(
  entry: number,
  detection: CupHandleDetection,
  risk: number,
  multiple: number
): CupHandleTargetLadder | null {
  const span = detection.cupDepth * multiple;
  if (span <= 0) return null;
  const finalTarget = round(entry + span, 4);
  return {
    target1: round(entry + span * 0.5, 4),
    target2: round(entry + span * 0.75, 4),
    finalTarget,
    method: "cup_height_projection",
    finalRr: risk > 0 ? span / risk : 0,
  };
}

function atrProjectionTarget(
  entry: number,
  atr: number,
  risk: number,
  multiples: { target1: number; target2: number; finalTarget: number }
): CupHandleTargetLadder | null {
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
  candles: readonly CupHandleCandle[],
  risk: number,
  fraction: number
): CupHandleTargetLadder | null {
  const window = candles.slice(-20);
  if (window.length < 4) return null;
  const high = Math.max(...window.map((c) => c.high));
  const low = Math.min(...window.map((c) => c.low));
  const span = (high - low) * fraction;
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

function dynamicProjectionTarget(
  entry: number,
  candles: readonly CupHandleCandle[],
  bars: number,
  risk: number
): CupHandleTargetLadder | null {
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

export function generateCupHandleTargets(input: {
  detection: CupHandleDetection;
  entry: number;
  stopLoss: number;
  atr: number | null;
  candles: readonly CupHandleCandle[];
  config?: CupHandleTradeConfig;
}): { targets: CupHandleTargetLadder | null; warnings: string[] } {
  const config = input.config ?? DEFAULT_CUP_HANDLE_TRADE_CONFIG;
  const warnings: string[] = [];
  const risk = calculateRiskAmount(input.entry, input.stopLoss);
  const candidates: CupHandleTargetLadder[] = [];

  const r = rMultipleTarget(
    input.detection.direction,
    input.entry,
    risk,
    config.targetRMultiples
  );
  if (r) candidates.push(r);

  const cupProj = cupHeightProjection(
    input.entry,
    input.detection,
    risk,
    config.cupHeightProjectionMultiple
  );
  if (cupProj) candidates.push(cupProj);

  if (input.atr !== null && Number.isFinite(input.atr) && input.atr > 0) {
    const a = atrProjectionTarget(
      input.entry,
      input.atr,
      risk,
      config.atrTargetMultiples
    );
    if (a) candidates.push(a);
  }

  const measured = measuredMoveTarget(
    input.entry,
    input.candles,
    risk,
    config.measuredMoveFraction
  );
  if (measured) candidates.push(measured);

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

export function classifyCupHandleQualityGrade(
  score: number,
  config: CupHandleTradeConfig = DEFAULT_CUP_HANDLE_TRADE_CONFIG
): CupHandleQualityGrade {
  const t = config.gradeThresholds;
  if (score >= t.exceptionalMin) return "Exceptional";
  if (score >= t.highMin) return "High";
  if (score >= t.goodMin) return "Good";
  if (score >= t.averageMin) return "Average";
  return "Poor";
}

export function calculateCupHandleTradeQuality(input: {
  detection: CupHandleDetection;
  marketContext: InstitutionalMarketContext;
  riskReward: number;
  relativeStrength: number | null;
  config?: CupHandleTradeConfig;
}): { score: number; grade: CupHandleQualityGrade } {
  const config = input.config ?? DEFAULT_CUP_HANDLE_TRADE_CONFIG;
  const w = config.qualityWeights;
  const d = input.detection;

  const cupQuality = d.detected ? clamp(d.cupQuality, 0, 100) : 25;
  const handleQuality = d.handleValid ? clamp(d.handleQuality, 0, 100) : 25;
  const breakoutQuality = d.breakoutConfirmed
    ? clamp(d.breakoutQuality, 0, 100)
    : 25;
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
    w.cupQuality +
    w.handleQuality +
    w.breakoutQuality +
    w.volumeConfirmation +
    w.relativeStrength +
    w.sectorStrength +
    w.riskReward;

  const score = clamp(
    round(
      (cupQuality * w.cupQuality +
        handleQuality * w.handleQuality +
        breakoutQuality * w.breakoutQuality +
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

  return { score, grade: classifyCupHandleQualityGrade(score, config) };
}

export function createRejectedCupHandleTradeSetup(
  detection: CupHandleDetection,
  warnings: string[]
): CupHandleTradeSetup {
  return {
    detection,
    cupDepth: detection.cupDepth,
    cupDuration: detection.cupDuration,
    handleDepth: detection.handleDepth,
    handleDuration: detection.handleDuration,
    pivotPrice: detection.pivotPrice,
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
    holdingPeriod: DEFAULT_CUP_HANDLE_TRADE_CONFIG.defaultHoldingPeriod,
    positionType: DEFAULT_CUP_HANDLE_TRADE_CONFIG.defaultPositionType,
    warnings,
    positiveReasons: [],
    negativeReasons: [],
    neutralReasons: [],
    institutionalSummary: [],
    explainability: createEmptyCupHandleExplainability(warnings),
    institutionalScore: {
      conviction: 0,
      grade: "Weak",
      signalGrade: "F",
      confidence: detection.confidence || 0,
    },
  };
}

export function validateCupHandleTradeSetup(
  setup: CupHandleTradeSetup,
  config: CupHandleTradeConfig = DEFAULT_CUP_HANDLE_TRADE_CONFIG
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
