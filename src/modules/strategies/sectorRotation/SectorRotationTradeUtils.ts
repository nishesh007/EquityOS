/**
 * Sector Rotation Trade utilities — Sprint 11B.3J.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { createEmptySectorRotationExplainability } from "./SectorRotationExplainability";
import {
  calculateRiskAmount,
  isValidStop,
} from "./SectorRotationRisk";
import type {
  SectorRotationCandle,
  SectorRotationDetection,
  SectorRotationDirection,
} from "./SectorRotationTypes";
import {
  DEFAULT_SECTOR_ROTATION_TRADE_CONFIG,
  type SectorRotationEntryMode,
  type SectorRotationQualityGrade,
  type SectorRotationTradeConfig,
  type SectorRotationTradeSetup,
} from "./SectorRotationTradeTypes";

export function calculateSectorRotationEntry(input: {
  detection: SectorRotationDetection;
  candles: readonly SectorRotationCandle[];
  vwap: number;
  mode?: SectorRotationEntryMode;
  config?: SectorRotationTradeConfig;
}): number | null {
  const config = input.config ?? DEFAULT_SECTOR_ROTATION_TRADE_CONFIG;
  const mode = input.mode ?? config.entryMode;
  const { detection } = input;
  if (!detection.detected || detection.direction === "NONE") return null;

  const last = input.candles[input.candles.length - 1];
  if (!last) return null;

  if (mode === "momentum_breakout") {
    return Number.isFinite(last.close) && last.close > 0
      ? round(last.close, 4)
      : null;
  }

  if (mode === "sector_pullback") {
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

  if (mode === "relative_strength_breakout") {
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

export interface SectorRotationTargetLadder {
  target1: number;
  target2: number;
  finalTarget: number;
  method: string;
  finalRr: number;
}

function rMultipleTarget(
  direction: SectorRotationDirection,
  entry: number,
  risk: number,
  multiples: { target1: number; target2: number; finalTarget: number }
): SectorRotationTargetLadder | null {
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
  direction: SectorRotationDirection,
  entry: number,
  atr: number,
  risk: number,
  multiples: { target1: number; target2: number; finalTarget: number }
): SectorRotationTargetLadder | null {
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
  direction: SectorRotationDirection,
  entry: number,
  candles: readonly SectorRotationCandle[],
  risk: number,
  fraction: number
): SectorRotationTargetLadder | null {
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

function sectorProjectionTarget(
  direction: SectorRotationDirection,
  entry: number,
  detection: SectorRotationDetection,
  risk: number,
  multiple: number
): SectorRotationTargetLadder | null {
  const momentumFactor = Math.abs(detection.sectorMomentum) / 100;
  const span = entry * momentumFactor * multiple;
  if (span <= 0) return null;
  const sign = direction === "BUY" ? 1 : -1;
  const finalTarget = round(entry + sign * span, 4);
  if (direction === "BUY" && finalTarget <= entry) return null;
  if (direction === "SELL" && finalTarget >= entry) return null;
  return {
    target1: round(entry + sign * span * 0.5, 4),
    target2: round(entry + sign * span * 0.75, 4),
    finalTarget,
    method: "sector_projection",
    finalRr: risk > 0 ? Math.abs(finalTarget - entry) / risk : 0,
  };
}

function previousExtremeTarget(
  direction: SectorRotationDirection,
  entry: number,
  candles: readonly SectorRotationCandle[],
  risk: number
): SectorRotationTargetLadder | null {
  if (direction === "BUY") {
    const resistance = Math.max(...candles.map((c) => c.high));
    if (resistance <= entry) return null;
    const span = resistance - entry;
    return {
      target1: round(entry + span * 0.5, 4),
      target2: round(entry + span * 0.75, 4),
      finalTarget: round(resistance, 4),
      method: "previous_high",
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
    method: "previous_low",
    finalRr: risk > 0 ? span / risk : 0,
  };
}

function dynamicProjectionTarget(
  direction: SectorRotationDirection,
  entry: number,
  candles: readonly SectorRotationCandle[],
  bars: number,
  risk: number
): SectorRotationTargetLadder | null {
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

export function generateSectorRotationTargets(input: {
  detection: SectorRotationDetection;
  entry: number;
  stopLoss: number;
  atr: number | null;
  candles: readonly SectorRotationCandle[];
  config?: SectorRotationTradeConfig;
}): {
  targets: SectorRotationTargetLadder | null;
  warnings: string[];
} {
  const config = input.config ?? DEFAULT_SECTOR_ROTATION_TRADE_CONFIG;
  const warnings: string[] = [];
  const risk = calculateRiskAmount(input.entry, input.stopLoss);
  const candidates: SectorRotationTargetLadder[] = [];

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

  const sectorProj = sectorProjectionTarget(
    input.detection.direction,
    input.entry,
    input.detection,
    risk,
    config.sectorProjectionMultiple
  );
  if (sectorProj) candidates.push(sectorProj);

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

export function classifySectorRotationQualityGrade(
  score: number,
  config: SectorRotationTradeConfig = DEFAULT_SECTOR_ROTATION_TRADE_CONFIG
): SectorRotationQualityGrade {
  const t = config.gradeThresholds;
  if (score >= t.exceptionalMin) return "Exceptional";
  if (score >= t.highMin) return "High";
  if (score >= t.goodMin) return "Good";
  if (score >= t.averageMin) return "Average";
  return "Poor";
}

export function calculateSectorRotationTradeQuality(input: {
  detection: SectorRotationDetection;
  marketContext: InstitutionalMarketContext;
  riskReward: number;
  relativeVolume: number | null;
  config?: SectorRotationTradeConfig;
}): { score: number; grade: SectorRotationQualityGrade } {
  const config = input.config ?? DEFAULT_SECTOR_ROTATION_TRADE_CONFIG;
  const w = config.qualityWeights;
  const d = input.detection;

  const sectorStrength = d.sectorConfirmed
    ? clamp(d.sectorRelativeStrength, 0, 100)
    : 25;
  const relativeStrength =
    d.detected && d.stockOutperformsSector
      ? clamp(d.stockRelativeStrength, 0, 100)
      : 25;
  const trendQuality =
    d.detected && d.direction !== "NONE" ? clamp(d.confidence, 0, 100) : 25;
  const volumeConfirmation = d.volumeConfirmed ? 85 : 30;
  const breadth = d.breadthConfirmed
    ? clamp(d.sectorBreadth, 0, 100)
    : clamp(input.marketContext.marketBreadth.score, 0, 100);
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
    w.sectorStrength +
    w.relativeStrength +
    w.trendStructure +
    w.volume +
    w.sectorBreadth +
    w.marketRegime +
    w.riskReward;

  const score = clamp(
    round(
      (sectorStrength * w.sectorStrength +
        relativeStrength * w.relativeStrength +
        trendQuality * w.trendStructure +
        volumeConfirmation * w.volume +
        breadth * w.sectorBreadth +
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
    grade: classifySectorRotationQualityGrade(score, config),
  };
}

export function createRejectedSectorRotationTradeSetup(
  detection: SectorRotationDetection,
  warnings: string[]
): SectorRotationTradeSetup {
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
    holdingPeriod: DEFAULT_SECTOR_ROTATION_TRADE_CONFIG.defaultHoldingPeriod,
    positionType: DEFAULT_SECTOR_ROTATION_TRADE_CONFIG.defaultPositionType,
    warnings,
    explainability: createEmptySectorRotationExplainability(warnings),
    institutionalScore: {
      conviction: 0,
      grade: "Weak",
      signalGrade: "F",
      confidence: detection.confidence || 0,
    },
  };
}

export function validateSectorRotationTradeSetup(
  setup: SectorRotationTradeSetup,
  config: SectorRotationTradeConfig = DEFAULT_SECTOR_ROTATION_TRADE_CONFIG
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
