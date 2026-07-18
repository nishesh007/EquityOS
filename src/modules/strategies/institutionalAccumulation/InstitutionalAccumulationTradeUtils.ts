/**
 * Institutional Accumulation Trade utilities — Sprint 11B.3H.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { createEmptyInstitutionalAccumulationExplainability } from "./InstitutionalAccumulationExplainability";
import {
  calculateRiskAmount,
  isValidStop,
} from "./InstitutionalAccumulationRisk";
import { averageSectorScore } from "./InstitutionalAccumulationUtils";
import type {
  InstitutionalAccumulationCandle,
  InstitutionalAccumulationDetection,
  InstitutionalAccumulationDirection,
} from "./InstitutionalAccumulationTypes";
import {
  DEFAULT_INSTITUTIONAL_ACCUMULATION_TRADE_CONFIG,
  type InstitutionalAccumulationEntryMode,
  type InstitutionalAccumulationQualityGrade,
  type InstitutionalAccumulationTradeConfig,
  type InstitutionalAccumulationTradeSetup,
} from "./InstitutionalAccumulationTradeTypes";

export function calculateInstitutionalAccumulationEntry(input: {
  detection: InstitutionalAccumulationDetection;
  candles: readonly InstitutionalAccumulationCandle[];
  vwap: number;
  mode?: InstitutionalAccumulationEntryMode;
  config?: InstitutionalAccumulationTradeConfig;
}): number | null {
  const config = input.config ?? DEFAULT_INSTITUTIONAL_ACCUMULATION_TRADE_CONFIG;
  const mode = input.mode ?? config.entryMode;
  const { detection } = input;
  if (!detection.detected || detection.direction === "NONE") return null;

  const last = input.candles[input.candles.length - 1];
  if (!last) return null;

  if (mode === "breakout") {
    return Number.isFinite(last.close) && last.close > 0
      ? round(last.close, 4)
      : null;
  }

  if (mode === "demand_zone_retest") {
    if (detection.direction === "BUY" && detection.demandZoneHigh > 0) {
      const level = (detection.demandZoneLow + detection.demandZoneHigh) / 2;
      return Number.isFinite(level) && level > 0 ? round(level, 4) : null;
    }
    if (detection.direction === "SELL" && detection.demandZoneHigh > 0) {
      const level = (detection.demandZoneLow + detection.demandZoneHigh) / 2;
      return Number.isFinite(level) && level > 0 ? round(level, 4) : null;
    }
    return null;
  }

  if (mode === "vwap_retest") {
    const level =
      Number.isFinite(input.vwap) && input.vwap > 0
        ? input.vwap
        : detection.vwap;
    return Number.isFinite(level) && level > 0 ? round(level, 4) : null;
  }

  if (mode === "continuation") {
    const window = input.candles.slice(-3, -1);
    if (window.length < 1) {
      return Number.isFinite(last.close) && last.close > 0
        ? round(last.close, 4)
        : null;
    }
    if (detection.direction === "BUY") {
      const pullback = Math.min(...window.map((c) => c.low));
      return Number.isFinite(pullback) && pullback > 0
        ? round(pullback, 4)
        : null;
    }
    const pullback = Math.max(...window.map((c) => c.high));
    return Number.isFinite(pullback) && pullback > 0
      ? round(pullback, 4)
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

export interface InstitutionalAccumulationTargetLadder {
  target1: number;
  target2: number;
  finalTarget: number;
  method: string;
  finalRr: number;
}

function rMultipleTarget(
  direction: InstitutionalAccumulationDirection,
  entry: number,
  risk: number,
  multiples: { target1: number; target2: number; finalTarget: number }
): InstitutionalAccumulationTargetLadder | null {
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
  direction: InstitutionalAccumulationDirection,
  entry: number,
  atr: number,
  risk: number,
  multiples: { target1: number; target2: number; finalTarget: number }
): InstitutionalAccumulationTargetLadder | null {
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
  direction: InstitutionalAccumulationDirection,
  entry: number,
  detection: InstitutionalAccumulationDetection,
  risk: number,
  fraction: number
): InstitutionalAccumulationTargetLadder | null {
  const span =
    detection.demandZoneHigh > detection.demandZoneLow
      ? detection.demandZoneHigh - detection.demandZoneLow
      : 0;
  if (span <= 0) return null;
  const move = span * fraction;
  const sign = direction === "BUY" ? 1 : -1;
  const finalTarget = round(entry + sign * move, 4);
  return {
    target1: round(entry + sign * move * 0.5, 4),
    target2: round(entry + sign * move * 0.75, 4),
    finalTarget,
    method: "measured_move",
    finalRr: risk > 0 ? Math.abs(finalTarget - entry) / risk : 0,
  };
}

function previousExtremeTarget(
  direction: InstitutionalAccumulationDirection,
  entry: number,
  candles: readonly InstitutionalAccumulationCandle[],
  risk: number
): InstitutionalAccumulationTargetLadder | null {
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

function dynamicProjectionTarget(
  direction: InstitutionalAccumulationDirection,
  entry: number,
  candles: readonly InstitutionalAccumulationCandle[],
  bars: number,
  risk: number
): InstitutionalAccumulationTargetLadder | null {
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

export function generateInstitutionalAccumulationTargets(input: {
  detection: InstitutionalAccumulationDetection;
  entry: number;
  stopLoss: number;
  atr: number | null;
  candles: readonly InstitutionalAccumulationCandle[];
  config?: InstitutionalAccumulationTradeConfig;
}): {
  targets: InstitutionalAccumulationTargetLadder | null;
  warnings: string[];
} {
  const config = input.config ?? DEFAULT_INSTITUTIONAL_ACCUMULATION_TRADE_CONFIG;
  const warnings: string[] = [];
  const risk = calculateRiskAmount(input.entry, input.stopLoss);
  const candidates: InstitutionalAccumulationTargetLadder[] = [];

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
    input.detection,
    risk,
    config.measuredMoveFraction
  );
  if (measured) candidates.push(measured);

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

export function classifyInstitutionalAccumulationQualityGrade(
  score: number,
  config: InstitutionalAccumulationTradeConfig = DEFAULT_INSTITUTIONAL_ACCUMULATION_TRADE_CONFIG
): InstitutionalAccumulationQualityGrade {
  const t = config.gradeThresholds;
  if (score >= t.exceptionalMin) return "Exceptional";
  if (score >= t.highMin) return "High";
  if (score >= t.goodMin) return "Good";
  if (score >= t.averageMin) return "Average";
  return "Poor";
}

export function calculateInstitutionalAccumulationTradeQuality(input: {
  detection: InstitutionalAccumulationDetection;
  marketContext: InstitutionalMarketContext;
  riskReward: number;
  relativeVolume: number | null;
  config?: InstitutionalAccumulationTradeConfig;
}): { score: number; grade: InstitutionalAccumulationQualityGrade } {
  const config = input.config ?? DEFAULT_INSTITUTIONAL_ACCUMULATION_TRADE_CONFIG;
  const w = config.qualityWeights;
  const d = input.detection;

  const accumulationQuality =
    d.detected && d.pattern !== "none"
      ? clamp(d.accumulationScore, 0, 100)
      : 25;
  const trendStructure = d.higherLows ? clamp(d.confidence, 0, 100) : 25;
  const volumeQuality = d.volumeConfirmed ? clamp(d.volumeQuality, 0, 100) : 30;
  const sectorStrength = d.sectorConfirmed
    ? clamp(averageSectorScore(input.marketContext), 0, 100)
    : 25;
  const breadth = d.breadthConfirmed
    ? clamp(input.marketContext.marketBreadth.score, 0, 100)
    : 25;
  const marketRegime = d.marketConfirmed
    ? clamp(input.marketContext.confidence, 0, 100)
    : 25;
  const riskRewardScore = clamp(
    (input.riskReward / Math.max(config.minimumRiskReward, 0.1)) * 70,
    0,
    100
  );

  const weightTotal =
    w.accumulationQuality +
    w.trendStructure +
    w.volumeQuality +
    w.sectorStrength +
    w.breadth +
    w.marketRegime +
    w.riskReward;

  const score = clamp(
    round(
      (accumulationQuality * w.accumulationQuality +
        trendStructure * w.trendStructure +
        volumeQuality * w.volumeQuality +
        sectorStrength * w.sectorStrength +
        breadth * w.breadth +
        marketRegime * w.marketRegime +
        riskRewardScore * w.riskReward) /
        Math.max(weightTotal, 0.0001),
      1
    ),
    config.scoreFloor,
    config.scoreCeiling
  );

  return {
    score,
    grade: classifyInstitutionalAccumulationQualityGrade(score, config),
  };
}

export function createRejectedInstitutionalAccumulationTradeSetup(
  detection: InstitutionalAccumulationDetection,
  warnings: string[]
): InstitutionalAccumulationTradeSetup {
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
      DEFAULT_INSTITUTIONAL_ACCUMULATION_TRADE_CONFIG.defaultHoldingPeriod,
    positionType:
      DEFAULT_INSTITUTIONAL_ACCUMULATION_TRADE_CONFIG.defaultPositionType,
    warnings,
    explainability: createEmptyInstitutionalAccumulationExplainability(warnings),
    institutionalScore: {
      conviction: 0,
      grade: "Weak",
      signalGrade: "F",
      confidence: detection.confidence || 0,
    },
  };
}

export function validateInstitutionalAccumulationTradeSetup(
  setup: InstitutionalAccumulationTradeSetup,
  config: InstitutionalAccumulationTradeConfig = DEFAULT_INSTITUTIONAL_ACCUMULATION_TRADE_CONFIG
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
