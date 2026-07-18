/**
 * News Momentum Trade utilities — Sprint 11B.3K.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { createEmptyNewsMomentumExplainability } from "./NewsMomentumExplainability";
import {
  calculateRiskAmount,
  isValidStop,
} from "./NewsMomentumRisk";
import type {
  NewsMomentumCandle,
  NewsMomentumDetection,
  NewsMomentumDirection,
} from "./NewsMomentumTypes";
import {
  DEFAULT_NEWS_MOMENTUM_TRADE_CONFIG,
  type NewsMomentumEntryMode,
  type NewsMomentumQualityGrade,
  type NewsMomentumTradeConfig,
  type NewsMomentumTradeSetup,
} from "./NewsMomentumTradeTypes";

export function calculateNewsMomentumEntry(input: {
  detection: NewsMomentumDetection;
  candles: readonly NewsMomentumCandle[];
  vwap: number;
  mode?: NewsMomentumEntryMode;
  config?: NewsMomentumTradeConfig;
}): number | null {
  const config = input.config ?? DEFAULT_NEWS_MOMENTUM_TRADE_CONFIG;
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

  if (mode === "opening_breakout") {
    return Number.isFinite(last.high) && last.high > 0
      ? round(last.high, 4)
      : null;
  }

  if (mode === "pullback") {
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

  if (mode === "momentum_continuation") {
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

export interface NewsMomentumTargetLadder {
  target1: number;
  target2: number;
  finalTarget: number;
  method: string;
  finalRr: number;
}

function rMultipleTarget(
  direction: NewsMomentumDirection,
  entry: number,
  risk: number,
  multiples: { target1: number; target2: number; finalTarget: number }
): NewsMomentumTargetLadder | null {
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
  direction: NewsMomentumDirection,
  entry: number,
  atr: number,
  risk: number,
  multiples: { target1: number; target2: number; finalTarget: number }
): NewsMomentumTargetLadder | null {
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
  direction: NewsMomentumDirection,
  entry: number,
  candles: readonly NewsMomentumCandle[],
  risk: number,
  fraction: number
): NewsMomentumTargetLadder | null {
  const window = candles.slice(-8);
  if (window.length < 3) return null;
  const baseHigh = Math.max(...window.slice(0, -2).map((c) => c.high));
  const baseLow = Math.min(...window.slice(0, -2).map((c) => c.low));
  const span = baseHigh - baseLow;
  if (span <= 0) return null;
  const sign = direction === "BUY" ? 1 : -1;
  const move = span * fraction;
  const finalTarget = round(entry + sign * move, 4);
  if (direction === "BUY" && finalTarget <= entry) return null;
  if (direction === "SELL" && finalTarget >= entry) return null;
  return {
    target1: round(entry + sign * move * 0.5, 4),
    target2: round(entry + sign * move * 0.75, 4),
    finalTarget,
    method: "measured_move",
    finalRr: risk > 0 ? Math.abs(finalTarget - entry) / risk : 0,
  };
}

function gapProjectionTarget(
  direction: NewsMomentumDirection,
  entry: number,
  gapPercent: number | null | undefined,
  risk: number,
  multiple: number
): NewsMomentumTargetLadder | null {
  if (gapPercent === null || gapPercent === undefined || !Number.isFinite(gapPercent)) {
    return null;
  }
  const span = Math.abs(entry * (gapPercent / 100) * multiple);
  if (span <= 0) return null;
  const sign = direction === "BUY" ? 1 : -1;
  const finalTarget = round(entry + sign * span, 4);
  if (direction === "BUY" && finalTarget <= entry) return null;
  if (direction === "SELL" && finalTarget >= entry) return null;
  return {
    target1: round(entry + sign * span * 0.5, 4),
    target2: round(entry + sign * span * 0.75, 4),
    finalTarget,
    method: "gap_projection",
    finalRr: risk > 0 ? Math.abs(finalTarget - entry) / risk : 0,
  };
}

function trendProjectionTarget(
  direction: NewsMomentumDirection,
  entry: number,
  detection: NewsMomentumDetection,
  risk: number
): NewsMomentumTargetLadder | null {
  const momentumFactor = detection.catalystStrength / 100;
  const span = entry * momentumFactor * 0.02;
  if (span <= 0) return null;
  const sign = direction === "BUY" ? 1 : -1;
  const finalTarget = round(entry + sign * span, 4);
  if (direction === "BUY" && finalTarget <= entry) return null;
  if (direction === "SELL" && finalTarget >= entry) return null;
  return {
    target1: round(entry + sign * span * 0.5, 4),
    target2: round(entry + sign * span * 0.75, 4),
    finalTarget,
    method: "trend_projection",
    finalRr: risk > 0 ? Math.abs(finalTarget - entry) / risk : 0,
  };
}

function dynamicProjectionTarget(
  direction: NewsMomentumDirection,
  entry: number,
  candles: readonly NewsMomentumCandle[],
  bars: number,
  risk: number
): NewsMomentumTargetLadder | null {
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

export function generateNewsMomentumTargets(input: {
  detection: NewsMomentumDetection;
  entry: number;
  stopLoss: number;
  atr: number | null;
  candles: readonly NewsMomentumCandle[];
  gapPercent?: number | null;
  config?: NewsMomentumTradeConfig;
}): {
  targets: NewsMomentumTargetLadder | null;
  warnings: string[];
} {
  const config = input.config ?? DEFAULT_NEWS_MOMENTUM_TRADE_CONFIG;
  const warnings: string[] = [];
  const risk = calculateRiskAmount(input.entry, input.stopLoss);
  const candidates: NewsMomentumTargetLadder[] = [];

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

  const gap = gapProjectionTarget(
    input.detection.direction,
    input.entry,
    input.gapPercent,
    risk,
    config.gapProjectionMultiple
  );
  if (gap) candidates.push(gap);

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

  const valid = candidates.filter((c) => c.finalRr + config.priceEpsilon >= 1);
  if (valid.length === 0) {
    return { targets: null, warnings: [...warnings, "Invalid targets."] };
  }

  valid.sort((a, b) =>
    config.preferHigherFinalRr ? b.finalRr - a.finalRr : a.finalRr - b.finalRr
  );
  return { targets: valid[0]!, warnings };
}

export function classifyNewsMomentumQualityGrade(
  score: number,
  config: NewsMomentumTradeConfig = DEFAULT_NEWS_MOMENTUM_TRADE_CONFIG
): NewsMomentumQualityGrade {
  const t = config.gradeThresholds;
  if (score >= t.exceptionalMin) return "Exceptional";
  if (score >= t.highMin) return "High";
  if (score >= t.goodMin) return "Good";
  if (score >= t.averageMin) return "Average";
  return "Poor";
}

export function calculateNewsMomentumTradeQuality(input: {
  detection: NewsMomentumDetection;
  marketContext: InstitutionalMarketContext;
  riskReward: number;
  relativeVolume: number | null;
  config?: NewsMomentumTradeConfig;
}): { score: number; grade: NewsMomentumQualityGrade } {
  const config = input.config ?? DEFAULT_NEWS_MOMENTUM_TRADE_CONFIG;
  const w = config.qualityWeights;
  const d = input.detection;

  const newsQuality = d.detected
    ? clamp(d.catalystStrength, 0, 100)
    : 25;
  const priceConfirmation = d.priceConfirmed ? 85 : 30;
  const volumeConfirmation = d.volumeConfirmed ? 85 : 30;
  const sectorStrength = d.sectorConfirmed
    ? clamp(input.marketContext.marketStrength, 0, 100)
    : 25;
  const breadth = d.breadthConfirmed
    ? clamp(input.marketContext.marketBreadth.score, 0, 100)
    : clamp(input.marketContext.marketBreadth?.score ?? 25, 0, 100);
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

  const weightTotal =
    w.newsQuality +
    w.priceConfirmation +
    w.volumeConfirmation +
    w.sectorStrength +
    w.breadth +
    w.marketRegime +
    w.riskReward;

  const score = clamp(
    round(
      (newsQuality * w.newsQuality +
        priceConfirmation * w.priceConfirmation +
        volumeConfirmation * w.volumeConfirmation +
        sectorStrength * w.sectorStrength +
        breadth * w.breadth +
        marketRegime * w.marketRegime +
        riskReward * w.riskReward +
        liquidity * 0.05) /
        Math.max(weightTotal + 0.05, 0.0001),
      1
    ),
    config.scoreFloor,
    config.scoreCeiling
  );

  return {
    score,
    grade: classifyNewsMomentumQualityGrade(score, config),
  };
}

export function createRejectedNewsMomentumTradeSetup(
  detection: NewsMomentumDetection,
  warnings: string[]
): NewsMomentumTradeSetup {
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
    catalystType: detection.catalystType,
    catalystStrength: detection.catalystStrength,
    holdingPeriod: DEFAULT_NEWS_MOMENTUM_TRADE_CONFIG.defaultHoldingPeriod,
    positionType: DEFAULT_NEWS_MOMENTUM_TRADE_CONFIG.defaultPositionType,
    warnings,
    explainability: createEmptyNewsMomentumExplainability(warnings),
    institutionalScore: {
      conviction: 0,
      grade: "Weak",
      signalGrade: "F",
      confidence: detection.confidence || 0,
    },
  };
}

export function validateNewsMomentumTradeSetup(
  setup: NewsMomentumTradeSetup,
  config: NewsMomentumTradeConfig = DEFAULT_NEWS_MOMENTUM_TRADE_CONFIG
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
