/**
 * Stage Analysis Trade utilities — Sprint 11B.3M.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { createEmptyStageAnalysisExplainability } from "./StageAnalysisExplainability";
import { calculateRiskAmount, isValidStop } from "./StageAnalysisRisk";
import type {
  StageAnalysisCandle,
  StageAnalysisDetection,
  StageAnalysisDirection,
} from "./StageAnalysisTypes";
import {
  DEFAULT_STAGE_ANALYSIS_TRADE_CONFIG,
  type StageAnalysisEntryMode,
  type StageAnalysisQualityGrade,
  type StageAnalysisTradeConfig,
  type StageAnalysisTradeSetup,
} from "./StageAnalysisTradeTypes";

export function calculateStageAnalysisEntry(input: {
  detection: StageAnalysisDetection;
  candles: readonly StageAnalysisCandle[];
  vwap: number;
  mode?: StageAnalysisEntryMode;
  config?: StageAnalysisTradeConfig;
}): number | null {
  const config = input.config ?? DEFAULT_STAGE_ANALYSIS_TRADE_CONFIG;
  const mode = input.mode ?? config.entryMode;
  const { detection } = input;
  if (!detection.detected || detection.direction === "NONE") return null;

  const last = input.candles[input.candles.length - 1];
  if (!last) return null;

  if (mode === "base_breakout") {
    return Number.isFinite(last.close) && last.close > 0
      ? round(last.close, 4)
      : null;
  }

  if (mode === "pullback_30w") {
    return Number.isFinite(detection.ma30Week) && detection.ma30Week > 0
      ? round(detection.ma30Week, 4)
      : null;
  }

  if (mode === "vwap_retest") {
    const level =
      Number.isFinite(input.vwap) && input.vwap > 0
        ? input.vwap
        : detection.vwap;
    return Number.isFinite(level) && level > 0 ? round(level, 4) : null;
  }

  if (mode === "continuation") {
    if (detection.direction === "BUY") {
      return Number.isFinite(last.high) && last.high > 0
        ? round(last.high, 4)
        : null;
    }
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

export interface StageAnalysisTargetLadder {
  target1: number;
  target2: number;
  finalTarget: number;
  method: string;
  finalRr: number;
}

function rMultipleTarget(
  direction: StageAnalysisDirection,
  entry: number,
  risk: number,
  multiples: { target1: number; target2: number; finalTarget: number }
): StageAnalysisTargetLadder | null {
  if (risk <= 0 || direction === "NONE") return null;
  const sign = direction === "BUY" ? 1 : -1;
  return {
    target1: round(entry + sign * risk * multiples.target1, 4),
    target2: round(entry + sign * risk * multiples.target2, 4),
    finalTarget: round(entry + sign * risk * multiples.finalTarget, 4),
    method: "r_multiple",
    finalRr: multiples.finalTarget,
  };
}

function atrProjectionTarget(
  direction: StageAnalysisDirection,
  entry: number,
  atr: number,
  risk: number,
  multiples: { target1: number; target2: number; finalTarget: number }
): StageAnalysisTargetLadder | null {
  if (atr <= 0 || direction === "NONE") return null;
  const sign = direction === "BUY" ? 1 : -1;
  const finalTarget = round(entry + sign * atr * multiples.finalTarget, 4);
  return {
    target1: round(entry + sign * atr * multiples.target1, 4),
    target2: round(entry + sign * atr * multiples.target2, 4),
    finalTarget,
    method: "atr_projection",
    finalRr: risk > 0 ? Math.abs(finalTarget - entry) / risk : 0,
  };
}

function measuredMoveTarget(
  direction: StageAnalysisDirection,
  entry: number,
  candles: readonly StageAnalysisCandle[],
  risk: number,
  fraction: number
): StageAnalysisTargetLadder | null {
  if (direction === "NONE") return null;
  const window = candles.slice(-16);
  if (window.length < 4) return null;
  const high = Math.max(...window.map((c) => c.high));
  const low = Math.min(...window.map((c) => c.low));
  const span = (high - low) * fraction;
  if (span <= 0) return null;
  const sign = direction === "BUY" ? 1 : -1;
  const finalTarget = round(entry + sign * span, 4);
  return {
    target1: round(entry + sign * span * 0.5, 4),
    target2: round(entry + sign * span * 0.75, 4),
    finalTarget,
    method: "measured_move",
    finalRr: risk > 0 ? Math.abs(finalTarget - entry) / risk : 0,
  };
}

function previousHighTarget(
  direction: StageAnalysisDirection,
  entry: number,
  candles: readonly StageAnalysisCandle[],
  risk: number
): StageAnalysisTargetLadder | null {
  if (direction !== "BUY") return null;
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

function trendProjectionTarget(
  direction: StageAnalysisDirection,
  entry: number,
  detection: StageAnalysisDetection,
  risk: number
): StageAnalysisTargetLadder | null {
  if (direction === "NONE") return null;
  const factor = detection.stageQuality / 100;
  const span = entry * factor * 0.04;
  if (span <= 0) return null;
  const sign = direction === "BUY" ? 1 : -1;
  const finalTarget = round(entry + sign * span, 4);
  return {
    target1: round(entry + sign * span * 0.5, 4),
    target2: round(entry + sign * span * 0.75, 4),
    finalTarget,
    method: "trend_projection",
    finalRr: risk > 0 ? Math.abs(finalTarget - entry) / risk : 0,
  };
}

function dynamicProjectionTarget(
  direction: StageAnalysisDirection,
  entry: number,
  candles: readonly StageAnalysisCandle[],
  bars: number,
  risk: number
): StageAnalysisTargetLadder | null {
  if (direction === "NONE") return null;
  const window = candles.slice(-Math.max(bars, 2));
  if (window.length < 2) return null;
  const avgRange =
    window.reduce((s, c) => s + (c.high - c.low), 0) / window.length;
  if (avgRange <= 0) return null;
  const sign = direction === "BUY" ? 1 : -1;
  const finalTarget = round(entry + sign * avgRange * bars, 4);
  const span = Math.abs(finalTarget - entry);
  return {
    target1: round(entry + sign * span * 0.5, 4),
    target2: round(entry + sign * span * 0.75, 4),
    finalTarget,
    method: "dynamic_projection",
    finalRr: risk > 0 ? span / risk : 0,
  };
}

export function generateStageAnalysisTargets(input: {
  detection: StageAnalysisDetection;
  entry: number;
  stopLoss: number;
  atr: number | null;
  candles: readonly StageAnalysisCandle[];
  config?: StageAnalysisTradeConfig;
}): {
  targets: StageAnalysisTargetLadder | null;
  warnings: string[];
} {
  const config = input.config ?? DEFAULT_STAGE_ANALYSIS_TRADE_CONFIG;
  const warnings: string[] = [];
  const risk = calculateRiskAmount(input.entry, input.stopLoss);
  const candidates: StageAnalysisTargetLadder[] = [];

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
    input.candles,
    risk,
    config.measuredMoveFraction
  );
  if (measured) candidates.push(measured);

  const prevHigh = previousHighTarget(
    input.detection.direction,
    input.entry,
    input.candles,
    risk
  );
  if (prevHigh) candidates.push(prevHigh);

  const trend = trendProjectionTarget(
    input.detection.direction,
    input.entry,
    input.detection,
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

export function classifyStageAnalysisQualityGrade(
  score: number,
  config: StageAnalysisTradeConfig = DEFAULT_STAGE_ANALYSIS_TRADE_CONFIG
): StageAnalysisQualityGrade {
  const t = config.gradeThresholds;
  if (score >= t.exceptionalMin) return "Exceptional";
  if (score >= t.highMin) return "High";
  if (score >= t.goodMin) return "Good";
  if (score >= t.averageMin) return "Average";
  return "Poor";
}

export function calculateStageAnalysisTradeQuality(input: {
  detection: StageAnalysisDetection;
  marketContext: InstitutionalMarketContext;
  riskReward: number;
  config?: StageAnalysisTradeConfig;
}): { score: number; grade: StageAnalysisQualityGrade } {
  const config = input.config ?? DEFAULT_STAGE_ANALYSIS_TRADE_CONFIG;
  const w = config.qualityWeights;
  const d = input.detection;

  const stageQuality = d.detected ? clamp(d.stageQuality, 0, 100) : 25;
  const trendStructure = clamp(d.trendStructure, 0, 100);
  const relativeStrength = clamp(d.relativeStrengthScore, 0, 100);
  const volumeQuality = clamp(d.volumeQuality, 0, 100);
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
    w.stageQuality +
    w.trendStructure +
    w.relativeStrength +
    w.volumeQuality +
    w.sectorStrength +
    w.marketRegime +
    w.riskReward;

  const score = clamp(
    round(
      (stageQuality * w.stageQuality +
        trendStructure * w.trendStructure +
        relativeStrength * w.relativeStrength +
        volumeQuality * w.volumeQuality +
        sectorStrength * w.sectorStrength +
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
    grade: classifyStageAnalysisQualityGrade(score, config),
  };
}

export function createRejectedStageAnalysisTradeSetup(
  detection: StageAnalysisDetection,
  warnings: string[]
): StageAnalysisTradeSetup {
  return {
    detection,
    stage: detection.stage,
    previousStage: detection.previousStage,
    transition: detection.transition,
    transitionConfidence: detection.transitionConfidence,
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
    holdingPeriod: DEFAULT_STAGE_ANALYSIS_TRADE_CONFIG.defaultHoldingPeriod,
    positionType: DEFAULT_STAGE_ANALYSIS_TRADE_CONFIG.defaultPositionType,
    warnings,
    positiveReasons: [],
    negativeReasons: [],
    neutralReasons: [],
    institutionalSummary: [],
    explainability: createEmptyStageAnalysisExplainability(warnings),
    institutionalScore: {
      conviction: 0,
      grade: "Weak",
      signalGrade: "F",
      confidence: detection.confidence || 0,
    },
  };
}

export function validateStageAnalysisTradeSetup(
  setup: StageAnalysisTradeSetup,
  config: StageAnalysisTradeConfig = DEFAULT_STAGE_ANALYSIS_TRADE_CONFIG
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
