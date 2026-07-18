/**
 * Liquidity Sweep Trade utilities — Sprint 11B.3E.
 * Entry, targets, RR, and trade quality. Pure functions only.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { createEmptyLiquiditySweepExplainability } from "./LiquiditySweepExplainability";
import {
  calculateRiskAmount,
  isValidStop,
} from "./LiquiditySweepRisk";
import { averageSectorScore } from "./LiquiditySweepUtils";
import type {
  LiquiditySweepCandle,
  LiquiditySweepDetection,
  LiquiditySweepDirection,
} from "./LiquiditySweepTypes";
import {
  DEFAULT_LIQUIDITY_SWEEP_TRADE_CONFIG,
  type LiquiditySweepEntryMode,
  type LiquiditySweepQualityGrade,
  type LiquiditySweepTradeConfig,
  type LiquiditySweepTradeSetup,
} from "./LiquiditySweepTradeTypes";

export function calculateLiquiditySweepEntry(input: {
  detection: LiquiditySweepDetection;
  candles: readonly LiquiditySweepCandle[];
  mode?: LiquiditySweepEntryMode;
  config?: LiquiditySweepTradeConfig;
}): number | null {
  const config = input.config ?? DEFAULT_LIQUIDITY_SWEEP_TRADE_CONFIG;
  const mode = input.mode ?? config.entryMode;
  const { detection } = input;

  if (!detection.detected || detection.direction === "NONE") {
    return null;
  }

  const last = input.candles[input.candles.length - 1];
  if (!last) return null;

  if (mode === "confirmation") {
    return Number.isFinite(last.close) && last.close > 0
      ? round(last.close, 4)
      : null;
  }

  if (mode === "retest") {
    const level = detection.liquidityLevel;
    if (!Number.isFinite(level) || level <= 0) return null;
    return round(level, 4);
  }

  // aggressive — reversal candle close
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

export interface LiquiditySweepTargetLadder {
  target1: number;
  target2: number;
  finalTarget: number;
  method: string;
  finalRr: number;
}

function ladderToward(
  direction: LiquiditySweepDirection,
  entry: number,
  finalTarget: number,
  fractions: { target1: number; target2: number; finalTarget: number },
  risk: number,
  method: string
): LiquiditySweepTargetLadder | null {
  if (direction === "BUY" && finalTarget <= entry) return null;
  if (direction === "SELL" && finalTarget >= entry) return null;
  const span = finalTarget - entry;
  return {
    target1: round(entry + span * fractions.target1, 4),
    target2: round(entry + span * fractions.target2, 4),
    finalTarget: round(entry + span * fractions.finalTarget, 4),
    method,
    finalRr: risk > 0 ? Math.abs(finalTarget - entry) / risk : 0,
  };
}

function vwapTarget(
  direction: LiquiditySweepDirection,
  entry: number,
  vwap: number,
  risk: number,
  fractions: { target1: number; target2: number; finalTarget: number }
): LiquiditySweepTargetLadder | null {
  return ladderToward(direction, entry, vwap, fractions, risk, "vwap");
}

function atrProjectionTarget(
  direction: LiquiditySweepDirection,
  entry: number,
  atr: number,
  risk: number,
  multiples: { target1: number; target2: number; finalTarget: number }
): LiquiditySweepTargetLadder | null {
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

function previousSwingTarget(
  direction: LiquiditySweepDirection,
  entry: number,
  candles: readonly LiquiditySweepCandle[],
  risk: number,
  recentSwingHigh?: number | null,
  recentSwingLow?: number | null
): LiquiditySweepTargetLadder | null {
  if (direction === "BUY") {
    const resistance =
      recentSwingHigh !== undefined &&
      recentSwingHigh !== null &&
      Number.isFinite(recentSwingHigh)
        ? recentSwingHigh
        : Math.max(...candles.map((c) => c.high));
    return ladderToward(
      direction,
      entry,
      resistance,
      { target1: 0.5, target2: 0.75, finalTarget: 1 },
      risk,
      "previous_swing"
    );
  }
  const support =
    recentSwingLow !== undefined &&
    recentSwingLow !== null &&
    Number.isFinite(recentSwingLow)
      ? recentSwingLow
      : Math.min(...candles.map((c) => c.low));
  return ladderToward(
    direction,
    entry,
    support,
    { target1: 0.5, target2: 0.75, finalTarget: 1 },
    risk,
    "previous_swing"
  );
}

function measuredMoveTarget(
  direction: LiquiditySweepDirection,
  entry: number,
  detection: LiquiditySweepDetection,
  risk: number,
  fraction: number
): LiquiditySweepTargetLadder | null {
  const move = Math.abs(detection.sweepDistance) * fraction;
  if (move <= 0) return null;
  const sign = direction === "BUY" ? 1 : -1;
  const finalTarget = round(entry + sign * move, 4);
  return ladderToward(
    direction,
    entry,
    finalTarget,
    { target1: 0.5, target2: 0.75, finalTarget: 1 },
    risk,
    "measured_move"
  );
}

function liquidityZoneTarget(
  direction: LiquiditySweepDirection,
  entry: number,
  detection: LiquiditySweepDetection,
  risk: number
): LiquiditySweepTargetLadder | null {
  // Opposite side of structure: for BUY, target toward prior high relative to reclaim
  const span = Math.abs(detection.liquidityLevel - detection.sweepExtreme) * 2;
  if (span <= 0) return null;
  const sign = direction === "BUY" ? 1 : -1;
  const finalTarget = round(entry + sign * span, 4);
  return ladderToward(
    direction,
    entry,
    finalTarget,
    { target1: 0.5, target2: 0.75, finalTarget: 1 },
    risk,
    "liquidity_zone"
  );
}

function dynamicProjectionTarget(
  direction: LiquiditySweepDirection,
  entry: number,
  candles: readonly LiquiditySweepCandle[],
  bars: number,
  risk: number
): LiquiditySweepTargetLadder | null {
  const window = candles.slice(-Math.max(bars, 2));
  if (window.length < 2) return null;
  const avgRange =
    window.reduce((s, c) => s + (c.high - c.low), 0) / window.length;
  if (avgRange <= 0) return null;
  const sign = direction === "BUY" ? 1 : -1;
  const finalTarget = round(entry + sign * avgRange * bars, 4);
  return ladderToward(
    direction,
    entry,
    finalTarget,
    { target1: 0.5, target2: 0.75, finalTarget: 1 },
    risk,
    "dynamic_projection"
  );
}

export function generateLiquiditySweepTargets(input: {
  detection: LiquiditySweepDetection;
  entry: number;
  stopLoss: number;
  vwap: number;
  atr: number | null;
  candles: readonly LiquiditySweepCandle[];
  recentSwingHigh?: number | null;
  recentSwingLow?: number | null;
  config?: LiquiditySweepTradeConfig;
}): {
  targets: LiquiditySweepTargetLadder | null;
  warnings: string[];
} {
  const config = input.config ?? DEFAULT_LIQUIDITY_SWEEP_TRADE_CONFIG;
  const warnings: string[] = [];
  const risk = calculateRiskAmount(input.entry, input.stopLoss);
  const candidates: LiquiditySweepTargetLadder[] = [];

  if (Number.isFinite(input.vwap) && input.vwap > 0) {
    const v = vwapTarget(
      input.detection.direction,
      input.entry,
      input.vwap,
      risk,
      config.targetFractions
    );
    if (v) candidates.push(v);
  } else {
    warnings.push("VWAP unavailable for targets.");
  }

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

  const swing = previousSwingTarget(
    input.detection.direction,
    input.entry,
    input.candles,
    risk,
    input.recentSwingHigh,
    input.recentSwingLow
  );
  if (swing) candidates.push(swing);

  const measured = measuredMoveTarget(
    input.detection.direction,
    input.entry,
    input.detection,
    risk,
    config.measuredMoveFraction
  );
  if (measured) candidates.push(measured);

  const zone = liquidityZoneTarget(
    input.detection.direction,
    input.entry,
    input.detection,
    risk
  );
  if (zone) candidates.push(zone);

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

export function classifyLiquiditySweepQualityGrade(
  score: number,
  config: LiquiditySweepTradeConfig = DEFAULT_LIQUIDITY_SWEEP_TRADE_CONFIG
): LiquiditySweepQualityGrade {
  const t = config.gradeThresholds;
  if (score >= t.exceptionalMin) return "Exceptional";
  if (score >= t.highMin) return "High";
  if (score >= t.goodMin) return "Good";
  if (score >= t.averageMin) return "Average";
  return "Poor";
}

export function calculateLiquiditySweepTradeQuality(input: {
  detection: LiquiditySweepDetection;
  marketContext: InstitutionalMarketContext;
  riskReward: number;
  config?: LiquiditySweepTradeConfig;
}): { score: number; grade: LiquiditySweepQualityGrade } {
  const config = input.config ?? DEFAULT_LIQUIDITY_SWEEP_TRADE_CONFIG;
  const w = config.qualityWeights;
  const d = input.detection;

  const sweepQuality = d.detected
    ? clamp(d.confidence, 40, 100)
    : 20;
  const reversalQuality = d.reversalConfirmed ? 85 : 30;
  const volume = d.volumeSpike ? 90 : d.relativeVolumeConfirmed ? 65 : 35;
  const breadth = d.breadthConfirmed
    ? clamp(input.marketContext.marketBreadth.score, 0, 100)
    : 25;
  const sector = d.sectorConfirmed
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

  const score = clamp(
    round(
      sweepQuality * w.sweepQuality +
        reversalQuality * w.reversalQuality +
        volume * w.volume +
        breadth * w.breadth +
        sector * w.sector +
        marketRegime * w.marketRegime +
        riskReward * w.riskReward,
      1
    ),
    config.scoreFloor,
    config.scoreCeiling
  );

  return { score, grade: classifyLiquiditySweepQualityGrade(score, config) };
}

export function createRejectedLiquiditySweepTradeSetup(
  detection: LiquiditySweepDetection,
  warnings: string[]
): LiquiditySweepTradeSetup {
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
    holdingPeriod: DEFAULT_LIQUIDITY_SWEEP_TRADE_CONFIG.defaultHoldingPeriod,
    positionType: DEFAULT_LIQUIDITY_SWEEP_TRADE_CONFIG.defaultPositionType,
    warnings,
    explainability: createEmptyLiquiditySweepExplainability(warnings),
    institutionalScore: {
      conviction: 0,
      grade: "Weak",
      signalGrade: "F",
      confidence: detection.confidence || 0,
    },
  };
}

export function validateLiquiditySweepTradeSetup(
  setup: LiquiditySweepTradeSetup,
  config: LiquiditySweepTradeConfig = DEFAULT_LIQUIDITY_SWEEP_TRADE_CONFIG
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
