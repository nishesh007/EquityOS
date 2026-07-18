/**
 * Darvas Box Trade utilities — Sprint 11B.3N.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { createEmptyDarvasBoxExplainability } from "./DarvasBoxExplainability";
import { calculateRiskAmount, isValidStop } from "./DarvasBoxRisk";
import type {
  DarvasBoxCandle,
  DarvasBoxDetection,
  DarvasBoxDirection,
} from "./DarvasBoxTypes";
import {
  DEFAULT_DARVAS_BOX_TRADE_CONFIG,
  type DarvasBoxEntryMode,
  type DarvasBoxQualityGrade,
  type DarvasBoxTradeConfig,
  type DarvasBoxTradeSetup,
} from "./DarvasBoxTradeTypes";

export function calculateDarvasBoxEntry(input: {
  detection: DarvasBoxDetection;
  candles: readonly DarvasBoxCandle[];
  mode?: DarvasBoxEntryMode;
  config?: DarvasBoxTradeConfig;
}): number | null {
  const config = input.config ?? DEFAULT_DARVAS_BOX_TRADE_CONFIG;
  const mode = input.mode ?? config.entryMode;
  const { detection } = input;
  if (!detection.detected || detection.direction === "NONE") return null;
  const last = input.candles[input.candles.length - 1];
  if (!last) return null;

  if (mode === "box_breakout") {
    return Number.isFinite(last.close) && last.close > 0
      ? round(last.close, 4)
      : null;
  }
  if (mode === "retest_box_high") {
    return Number.isFinite(detection.boxHigh) && detection.boxHigh > 0
      ? round(detection.boxHigh, 4)
      : null;
  }
  if (mode === "early_breakout") {
    return Number.isFinite(detection.boxHigh) && detection.boxHigh > 0
      ? round(detection.boxHigh * 1.001, 4)
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

export interface DarvasBoxTargetLadder {
  target1: number;
  target2: number;
  finalTarget: number;
  method: string;
  finalRr: number;
}

function rMultipleTarget(
  direction: DarvasBoxDirection,
  entry: number,
  risk: number,
  multiples: { target1: number; target2: number; finalTarget: number }
): DarvasBoxTargetLadder | null {
  if (risk <= 0 || direction !== "BUY") return null;
  return {
    target1: round(entry + risk * multiples.target1, 4),
    target2: round(entry + risk * multiples.target2, 4),
    finalTarget: round(entry + risk * multiples.finalTarget, 4),
    method: "r_multiple",
    finalRr: multiples.finalTarget,
  };
}

function boxHeightProjection(
  entry: number,
  detection: DarvasBoxDetection,
  risk: number,
  multiple: number
): DarvasBoxTargetLadder | null {
  const span = detection.boxHeight * multiple;
  if (span <= 0) return null;
  const finalTarget = round(entry + span, 4);
  return {
    target1: round(entry + span * 0.5, 4),
    target2: round(entry + span * 0.75, 4),
    finalTarget,
    method: "box_height_projection",
    finalRr: risk > 0 ? span / risk : 0,
  };
}

function atrProjectionTarget(
  entry: number,
  atr: number,
  risk: number,
  multiples: { target1: number; target2: number; finalTarget: number }
): DarvasBoxTargetLadder | null {
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
  candles: readonly DarvasBoxCandle[],
  risk: number,
  fraction: number
): DarvasBoxTargetLadder | null {
  const window = candles.slice(-16);
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

function previousHighTarget(
  entry: number,
  candles: readonly DarvasBoxCandle[],
  risk: number
): DarvasBoxTargetLadder | null {
  const window = candles.slice(0, -1);
  if (window.length === 0) return null;
  const prevHigh = Math.max(...window.map((c) => c.high));
  if (prevHigh <= entry) return null;
  const span = prevHigh - entry;
  return {
    target1: round(entry + span * 0.5, 4),
    target2: round(entry + span * 0.85, 4),
    finalTarget: round(prevHigh, 4),
    method: "previous_high",
    finalRr: risk > 0 ? span / risk : 0,
  };
}

function dynamicProjectionTarget(
  entry: number,
  candles: readonly DarvasBoxCandle[],
  bars: number,
  risk: number
): DarvasBoxTargetLadder | null {
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

export function generateDarvasBoxTargets(input: {
  detection: DarvasBoxDetection;
  entry: number;
  stopLoss: number;
  atr: number | null;
  candles: readonly DarvasBoxCandle[];
  config?: DarvasBoxTradeConfig;
}): { targets: DarvasBoxTargetLadder | null; warnings: string[] } {
  const config = input.config ?? DEFAULT_DARVAS_BOX_TRADE_CONFIG;
  const warnings: string[] = [];
  const risk = calculateRiskAmount(input.entry, input.stopLoss);
  const candidates: DarvasBoxTargetLadder[] = [];

  const r = rMultipleTarget(
    input.detection.direction,
    input.entry,
    risk,
    config.targetRMultiples
  );
  if (r) candidates.push(r);

  const boxProj = boxHeightProjection(
    input.entry,
    input.detection,
    risk,
    config.boxHeightProjectionMultiple
  );
  if (boxProj) candidates.push(boxProj);

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

export function classifyDarvasBoxQualityGrade(
  score: number,
  config: DarvasBoxTradeConfig = DEFAULT_DARVAS_BOX_TRADE_CONFIG
): DarvasBoxQualityGrade {
  const t = config.gradeThresholds;
  if (score >= t.exceptionalMin) return "Exceptional";
  if (score >= t.highMin) return "High";
  if (score >= t.goodMin) return "Good";
  if (score >= t.averageMin) return "Average";
  return "Poor";
}

export function calculateDarvasBoxTradeQuality(input: {
  detection: DarvasBoxDetection;
  marketContext: InstitutionalMarketContext;
  riskReward: number;
  relativeStrength: number | null;
  config?: DarvasBoxTradeConfig;
}): { score: number; grade: DarvasBoxQualityGrade } {
  const config = input.config ?? DEFAULT_DARVAS_BOX_TRADE_CONFIG;
  const w = config.qualityWeights;
  const d = input.detection;

  const boxQuality = d.detected ? clamp(d.boxQuality, 0, 100) : 25;
  const breakoutQuality = d.breakoutConfirmed
    ? clamp(d.breakoutQuality, 0, 100)
    : 25;
  const volumeConfirmation = d.volumeConfirmed
    ? clamp(d.volumeConfirmation, 0, 100)
    : 25;
  const trendStructure = clamp(d.trendStructure, 0, 100);
  const relativeStrength = d.rsConfirmed
    ? clamp(input.relativeStrength ?? 60, 0, 100)
    : 25;
  const sectorStrength = d.sectorConfirmed
    ? clamp(input.marketContext.marketStrength, 0, 100)
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
    w.boxQuality +
    w.breakoutQuality +
    w.volumeConfirmation +
    w.trendStructure +
    w.relativeStrength +
    w.sectorStrength +
    w.marketRegime +
    w.riskReward;

  const score = clamp(
    round(
      (boxQuality * w.boxQuality +
        breakoutQuality * w.breakoutQuality +
        volumeConfirmation * w.volumeConfirmation +
        trendStructure * w.trendStructure +
        relativeStrength * w.relativeStrength +
        sectorStrength * w.sectorStrength +
        marketRegime * w.marketRegime +
        riskReward * w.riskReward) /
        Math.max(weightTotal, 0.0001),
      1
    ),
    config.scoreFloor,
    config.scoreCeiling
  );

  return { score, grade: classifyDarvasBoxQualityGrade(score, config) };
}

export function createRejectedDarvasBoxTradeSetup(
  detection: DarvasBoxDetection,
  warnings: string[]
): DarvasBoxTradeSetup {
  return {
    detection,
    boxHigh: detection.boxHigh,
    boxLow: detection.boxLow,
    boxHeight: detection.boxHeight,
    boxDuration: detection.boxDuration,
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
    holdingPeriod: DEFAULT_DARVAS_BOX_TRADE_CONFIG.defaultHoldingPeriod,
    positionType: DEFAULT_DARVAS_BOX_TRADE_CONFIG.defaultPositionType,
    warnings,
    positiveReasons: [],
    negativeReasons: [],
    neutralReasons: [],
    institutionalSummary: [],
    explainability: createEmptyDarvasBoxExplainability(warnings),
    institutionalScore: {
      conviction: 0,
      grade: "Weak",
      signalGrade: "F",
      confidence: detection.confidence || 0,
    },
  };
}

export function validateDarvasBoxTradeSetup(
  setup: DarvasBoxTradeSetup,
  config: DarvasBoxTradeConfig = DEFAULT_DARVAS_BOX_TRADE_CONFIG
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
