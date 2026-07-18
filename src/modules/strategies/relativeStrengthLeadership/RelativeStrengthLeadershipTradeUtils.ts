/**
 * Relative Strength Leadership Trade utilities — Sprint 11B.3O.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { createEmptyRelativeStrengthLeadershipExplainability } from "./RelativeStrengthLeadershipExplainability";
import { calculateRiskAmount, isValidStop } from "./RelativeStrengthLeadershipRisk";
import type {
  RelativeStrengthLeadershipCandle,
  RelativeStrengthLeadershipDetection,
  RelativeStrengthLeadershipDirection,
} from "./RelativeStrengthLeadershipTypes";
import {
  DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_TRADE_CONFIG,
  type RelativeStrengthLeadershipEntryMode,
  type RelativeStrengthLeadershipQualityGrade,
  type RelativeStrengthLeadershipTradeConfig,
  type RelativeStrengthLeadershipTradeSetup,
} from "./RelativeStrengthLeadershipTradeTypes";
import { averageSectorScore } from "./RelativeStrengthLeadershipUtils";

export function calculateRelativeStrengthLeadershipEntry(input: {
  detection: RelativeStrengthLeadershipDetection;
  candles: readonly RelativeStrengthLeadershipCandle[];
  fiftyTwoWeekHigh?: number | null;
  mode?: RelativeStrengthLeadershipEntryMode;
  config?: RelativeStrengthLeadershipTradeConfig;
}): number | null {
  const config =
    input.config ?? DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_TRADE_CONFIG;
  const mode = input.mode ?? config.entryMode;
  const { detection } = input;
  if (!detection.detected || detection.direction === "NONE") return null;
  const last = input.candles[input.candles.length - 1];
  if (!last) return null;

  if (mode === "momentum_breakout" || mode === "continuation") {
    return Number.isFinite(last.close) && last.close > 0
      ? round(last.close, 4)
      : null;
  }
  if (mode === "pullback_ema20") {
    return Number.isFinite(detection.ema20) && detection.ema20 > 0
      ? round(Math.max(detection.ema20, last.close * 0.995), 4)
      : null;
  }
  if (mode === "vwap_retest") {
    return Number.isFinite(detection.vwap) && detection.vwap > 0
      ? round(Math.max(detection.vwap, last.close * 0.995), 4)
      : null;
  }
  if (mode === "fifty_two_week_high_breakout") {
    const high =
      input.fiftyTwoWeekHigh !== null &&
      input.fiftyTwoWeekHigh !== undefined &&
      Number.isFinite(input.fiftyTwoWeekHigh) &&
      input.fiftyTwoWeekHigh! > 0
        ? input.fiftyTwoWeekHigh!
        : Math.max(...input.candles.map((c) => c.high));
    return round(Math.max(high, last.close), 4);
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

export interface RelativeStrengthLeadershipTargetLadder {
  target1: number;
  target2: number;
  finalTarget: number;
  method: string;
  finalRr: number;
}

function rMultipleTarget(
  direction: RelativeStrengthLeadershipDirection,
  entry: number,
  risk: number,
  multiples: { target1: number; target2: number; finalTarget: number }
): RelativeStrengthLeadershipTargetLadder | null {
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
): RelativeStrengthLeadershipTargetLadder | null {
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
  candles: readonly RelativeStrengthLeadershipCandle[],
  risk: number,
  fraction: number
): RelativeStrengthLeadershipTargetLadder | null {
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

function trendProjectionTarget(
  entry: number,
  detection: RelativeStrengthLeadershipDetection,
  risk: number
): RelativeStrengthLeadershipTargetLadder | null {
  if (detection.ema20 <= 0 || detection.ema50 <= 0) return null;
  const slope = detection.ema20 - detection.ema50;
  if (slope <= 0) return null;
  const span = slope * 8;
  const finalTarget = round(entry + span, 4);
  return {
    target1: round(entry + span * 0.5, 4),
    target2: round(entry + span * 0.75, 4),
    finalTarget,
    method: "trend_projection",
    finalRr: risk > 0 ? span / risk : 0,
  };
}

function dynamicProjectionTarget(
  entry: number,
  candles: readonly RelativeStrengthLeadershipCandle[],
  bars: number,
  risk: number
): RelativeStrengthLeadershipTargetLadder | null {
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

export function generateRelativeStrengthLeadershipTargets(input: {
  detection: RelativeStrengthLeadershipDetection;
  entry: number;
  stopLoss: number;
  atr: number | null;
  candles: readonly RelativeStrengthLeadershipCandle[];
  config?: RelativeStrengthLeadershipTradeConfig;
}): {
  targets: RelativeStrengthLeadershipTargetLadder | null;
  warnings: string[];
} {
  const config =
    input.config ?? DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_TRADE_CONFIG;
  const warnings: string[] = [];
  const risk = calculateRiskAmount(input.entry, input.stopLoss);
  const candidates: RelativeStrengthLeadershipTargetLadder[] = [];

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

export function classifyRelativeStrengthLeadershipQualityGrade(
  score: number,
  config: RelativeStrengthLeadershipTradeConfig = DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_TRADE_CONFIG
): RelativeStrengthLeadershipQualityGrade {
  const t = config.gradeThresholds;
  if (score >= t.exceptionalMin) return "Exceptional";
  if (score >= t.highMin) return "High";
  if (score >= t.goodMin) return "Good";
  if (score >= t.averageMin) return "Average";
  return "Poor";
}

export function calculateRelativeStrengthLeadershipTradeQuality(input: {
  detection: RelativeStrengthLeadershipDetection;
  marketContext: InstitutionalMarketContext;
  riskReward: number;
  config?: RelativeStrengthLeadershipTradeConfig;
}): { score: number; grade: RelativeStrengthLeadershipQualityGrade } {
  const config =
    input.config ?? DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_TRADE_CONFIG;
  const w = config.qualityWeights;
  const d = input.detection;

  const relativeStrength = d.detected
    ? clamp(d.relativeStrengthScore, 0, 100)
    : 25;
  const leadershipRank = d.detected
    ? clamp(d.leadershipPercentile, 0, 100)
    : 25;
  const trendQuality = clamp(d.trendQuality, 0, 100);
  const volumeConfirmation = d.volumeConfirmed
    ? clamp(d.volumeConfirmation, 0, 100)
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

  const weightTotal =
    w.relativeStrength +
    w.leadershipRank +
    w.trendQuality +
    w.volumeConfirmation +
    w.sectorStrength +
    w.marketRegime +
    w.riskReward;

  const score = clamp(
    round(
      (relativeStrength * w.relativeStrength +
        leadershipRank * w.leadershipRank +
        trendQuality * w.trendQuality +
        volumeConfirmation * w.volumeConfirmation +
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
    grade: classifyRelativeStrengthLeadershipQualityGrade(score, config),
  };
}

export function createRejectedRelativeStrengthLeadershipTradeSetup(
  detection: RelativeStrengthLeadershipDetection,
  warnings: string[]
): RelativeStrengthLeadershipTradeSetup {
  return {
    detection,
    relativeStrengthScore: detection.relativeStrengthScore,
    relativeStrengthRank: detection.relativeStrengthRank,
    sectorRank: detection.sectorRank,
    industryRank: detection.industryRank,
    leadershipPercentile: detection.leadershipPercentile,
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
      DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_TRADE_CONFIG.defaultHoldingPeriod,
    positionType:
      DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_TRADE_CONFIG.defaultPositionType,
    warnings,
    positiveReasons: [],
    negativeReasons: [],
    neutralReasons: [],
    institutionalSummary: [],
    explainability:
      createEmptyRelativeStrengthLeadershipExplainability(warnings),
    institutionalScore: {
      conviction: 0,
      grade: "Weak",
      signalGrade: "F",
      confidence: detection.confidence || 0,
    },
  };
}

export function validateRelativeStrengthLeadershipTradeSetup(
  setup: RelativeStrengthLeadershipTradeSetup,
  config: RelativeStrengthLeadershipTradeConfig = DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_TRADE_CONFIG
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
