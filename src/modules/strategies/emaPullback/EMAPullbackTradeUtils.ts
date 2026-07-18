/**
 * EMA Pullback Trade utilities — Sprint 11B.3P.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { createEmptyEMAPullbackExplainability } from "./EMAPullbackExplainability";
import { calculateRiskAmount, isValidStop } from "./EMAPullbackRisk";
import type {
  EMAPullbackCandle,
  EMAPullbackDetection,
  EMAPullbackDirection,
} from "./EMAPullbackTypes";
import {
  DEFAULT_EMA_PULLBACK_TRADE_CONFIG,
  type EMAPullbackEntryMode,
  type EMAPullbackQualityGrade,
  type EMAPullbackTradeConfig,
  type EMAPullbackTradeSetup,
} from "./EMAPullbackTradeTypes";
import { averageSectorScore } from "./EMAPullbackUtils";

export function calculateEMAPullbackEntry(input: {
  detection: EMAPullbackDetection;
  candles: readonly EMAPullbackCandle[];
  mode?: EMAPullbackEntryMode;
  config?: EMAPullbackTradeConfig;
}): number | null {
  const config = input.config ?? DEFAULT_EMA_PULLBACK_TRADE_CONFIG;
  const mode = input.mode ?? config.entryMode;
  const { detection } = input;
  if (!detection.detected || detection.direction === "NONE") return null;
  const last = input.candles[input.candles.length - 1];
  if (!last) return null;

  if (mode === "ema20_bounce") {
    return Number.isFinite(detection.ema20) && detection.ema20 > 0
      ? round(detection.ema20, 4)
      : null;
  }
  if (mode === "ema50_bounce") {
    return Number.isFinite(detection.ema50) && detection.ema50 > 0
      ? round(detection.ema50, 4)
      : null;
  }
  if (mode === "vwap_bounce") {
    return Number.isFinite(detection.vwap) && detection.vwap > 0
      ? round(detection.vwap, 4)
      : null;
  }
  if (mode === "aggressive_pullback_entry") {
    if (detection.direction === "BUY") {
      return Number.isFinite(detection.pullbackLow) && detection.pullbackLow > 0
        ? round(detection.pullbackLow, 4)
        : round(last.close, 4);
    }
    return Number.isFinite(detection.pullbackHigh) && detection.pullbackHigh > 0
      ? round(detection.pullbackHigh, 4)
      : round(last.close, 4);
  }
  // bullish_confirmation_candle (default) — also used for bear confirmation close
  return Number.isFinite(last.close) && last.close > 0
    ? round(last.close, 4)
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

export interface EMAPullbackTargetLadder {
  target1: number;
  target2: number;
  finalTarget: number;
  method: string;
  finalRr: number;
}

function project(
  direction: EMAPullbackDirection,
  entry: number,
  span: number
): number {
  return direction === "SELL" ? entry - span : entry + span;
}

function rMultipleTarget(
  direction: EMAPullbackDirection,
  entry: number,
  risk: number,
  multiples: { target1: number; target2: number; finalTarget: number }
): EMAPullbackTargetLadder | null {
  if (risk <= 0 || (direction !== "BUY" && direction !== "SELL")) return null;
  return {
    target1: round(project(direction, entry, risk * multiples.target1), 4),
    target2: round(project(direction, entry, risk * multiples.target2), 4),
    finalTarget: round(
      project(direction, entry, risk * multiples.finalTarget),
      4
    ),
    method: "r_multiple",
    finalRr: multiples.finalTarget,
  };
}

function atrProjectionTarget(
  direction: EMAPullbackDirection,
  entry: number,
  atr: number,
  risk: number,
  multiples: { target1: number; target2: number; finalTarget: number }
): EMAPullbackTargetLadder | null {
  if (atr <= 0) return null;
  const finalTarget = round(
    project(direction, entry, atr * multiples.finalTarget),
    4
  );
  return {
    target1: round(project(direction, entry, atr * multiples.target1), 4),
    target2: round(project(direction, entry, atr * multiples.target2), 4),
    finalTarget,
    method: "atr_projection",
    finalRr: risk > 0 ? Math.abs(finalTarget - entry) / risk : 0,
  };
}

function measuredMoveTarget(
  direction: EMAPullbackDirection,
  entry: number,
  candles: readonly EMAPullbackCandle[],
  risk: number,
  fraction: number
): EMAPullbackTargetLadder | null {
  const window = candles.slice(-16);
  if (window.length < 4) return null;
  const high = Math.max(...window.map((c) => c.high));
  const low = Math.min(...window.map((c) => c.low));
  const span = (high - low) * fraction;
  if (span <= 0) return null;
  const finalTarget = round(project(direction, entry, span), 4);
  return {
    target1: round(project(direction, entry, span * 0.5), 4),
    target2: round(project(direction, entry, span * 0.75), 4),
    finalTarget,
    method: "measured_move",
    finalRr: risk > 0 ? span / risk : 0,
  };
}

function trendProjectionTarget(
  direction: EMAPullbackDirection,
  entry: number,
  detection: EMAPullbackDetection,
  risk: number
): EMAPullbackTargetLadder | null {
  if (detection.ema20 <= 0 || detection.ema50 <= 0) return null;
  const slope = Math.abs(detection.ema20 - detection.ema50);
  if (slope <= 0) return null;
  const span = slope * 8;
  const finalTarget = round(project(direction, entry, span), 4);
  return {
    target1: round(project(direction, entry, span * 0.5), 4),
    target2: round(project(direction, entry, span * 0.75), 4),
    finalTarget,
    method: "trend_projection",
    finalRr: risk > 0 ? span / risk : 0,
  };
}

function previousExtremeTarget(
  direction: EMAPullbackDirection,
  entry: number,
  candles: readonly EMAPullbackCandle[],
  risk: number
): EMAPullbackTargetLadder | null {
  const window = candles.slice(0, -1);
  if (window.length === 0) return null;
  if (direction === "BUY") {
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
  const prevLow = Math.min(...window.map((c) => c.low));
  if (prevLow >= entry) return null;
  const span = entry - prevLow;
  return {
    target1: round(entry - span * 0.5, 4),
    target2: round(entry - span * 0.85, 4),
    finalTarget: round(prevLow, 4),
    method: "previous_low",
    finalRr: risk > 0 ? span / risk : 0,
  };
}

function dynamicProjectionTarget(
  direction: EMAPullbackDirection,
  entry: number,
  candles: readonly EMAPullbackCandle[],
  bars: number,
  risk: number
): EMAPullbackTargetLadder | null {
  const window = candles.slice(-Math.max(bars, 2));
  if (window.length < 2) return null;
  const avgRange =
    window.reduce((s, c) => s + (c.high - c.low), 0) / window.length;
  if (avgRange <= 0) return null;
  const span = avgRange * bars;
  const finalTarget = round(project(direction, entry, span), 4);
  return {
    target1: round(project(direction, entry, span * 0.5), 4),
    target2: round(project(direction, entry, span * 0.75), 4),
    finalTarget,
    method: "dynamic_projection",
    finalRr: risk > 0 ? span / risk : 0,
  };
}

export function generateEMAPullbackTargets(input: {
  detection: EMAPullbackDetection;
  entry: number;
  stopLoss: number;
  atr: number | null;
  candles: readonly EMAPullbackCandle[];
  config?: EMAPullbackTradeConfig;
}): { targets: EMAPullbackTargetLadder | null; warnings: string[] } {
  const config = input.config ?? DEFAULT_EMA_PULLBACK_TRADE_CONFIG;
  const warnings: string[] = [];
  const risk = calculateRiskAmount(input.entry, input.stopLoss);
  const candidates: EMAPullbackTargetLadder[] = [];
  const dir = input.detection.direction;

  const r = rMultipleTarget(dir, input.entry, risk, config.targetRMultiples);
  if (r) candidates.push(r);

  if (input.atr !== null && Number.isFinite(input.atr) && input.atr > 0) {
    const a = atrProjectionTarget(
      dir,
      input.entry,
      input.atr,
      risk,
      config.atrTargetMultiples
    );
    if (a) candidates.push(a);
  }

  const measured = measuredMoveTarget(
    dir,
    input.entry,
    input.candles,
    risk,
    config.measuredMoveFraction
  );
  if (measured) candidates.push(measured);

  const trend = trendProjectionTarget(dir, input.entry, input.detection, risk);
  if (trend) candidates.push(trend);

  const prev = previousExtremeTarget(dir, input.entry, input.candles, risk);
  if (prev) candidates.push(prev);

  const dynamic = dynamicProjectionTarget(
    dir,
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

export function classifyEMAPullbackQualityGrade(
  score: number,
  config: EMAPullbackTradeConfig = DEFAULT_EMA_PULLBACK_TRADE_CONFIG
): EMAPullbackQualityGrade {
  const t = config.gradeThresholds;
  if (score >= t.exceptionalMin) return "Exceptional";
  if (score >= t.highMin) return "High";
  if (score >= t.goodMin) return "Good";
  if (score >= t.averageMin) return "Average";
  return "Poor";
}

export function calculateEMAPullbackTradeQuality(input: {
  detection: EMAPullbackDetection;
  marketContext: InstitutionalMarketContext;
  riskReward: number;
  config?: EMAPullbackTradeConfig;
}): { score: number; grade: EMAPullbackQualityGrade } {
  const config = input.config ?? DEFAULT_EMA_PULLBACK_TRADE_CONFIG;
  const w = config.qualityWeights;
  const d = input.detection;

  const trendQuality = d.detected ? clamp(d.trendQuality, 0, 100) : 25;
  const pullbackQuality = d.controlledPullback
    ? clamp(d.pullbackQuality, 0, 100)
    : 25;
  const emaAlignment = clamp(d.emaAlignment, 0, 100);
  const volumeQuality = d.volumeConfirmed
    ? clamp(d.volumeQuality, 0, 100)
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
    w.trendQuality +
    w.pullbackQuality +
    w.emaAlignment +
    w.volumeQuality +
    w.sectorStrength +
    w.marketRegime +
    w.riskReward;

  const score = clamp(
    round(
      (trendQuality * w.trendQuality +
        pullbackQuality * w.pullbackQuality +
        emaAlignment * w.emaAlignment +
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

  return { score, grade: classifyEMAPullbackQualityGrade(score, config) };
}

export function createRejectedEMAPullbackTradeSetup(
  detection: EMAPullbackDetection,
  warnings: string[]
): EMAPullbackTradeSetup {
  return {
    detection,
    trendDirection: detection.trendDirection,
    pullbackType: detection.pullbackType,
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
    holdingPeriod: DEFAULT_EMA_PULLBACK_TRADE_CONFIG.defaultHoldingPeriod,
    positionType: DEFAULT_EMA_PULLBACK_TRADE_CONFIG.defaultPositionType,
    warnings,
    positiveReasons: [],
    negativeReasons: [],
    neutralReasons: [],
    institutionalSummary: [],
    explainability: createEmptyEMAPullbackExplainability(warnings),
    institutionalScore: {
      conviction: 0,
      grade: "Weak",
      signalGrade: "F",
      confidence: detection.confidence || 0,
    },
  };
}

export function validateEMAPullbackTradeSetup(
  setup: EMAPullbackTradeSetup,
  config: EMAPullbackTradeConfig = DEFAULT_EMA_PULLBACK_TRADE_CONFIG
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
