/**
 * VCP Trade utilities — Sprint 11B.3L.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { createEmptyVCPExplainability } from "./VCPExplainability";
import { calculateRiskAmount, isValidStop } from "./VCPRisk";
import type {
  VCPCandle,
  VCPDetection,
  VCPDirection,
} from "./VCPTypes";
import {
  DEFAULT_VCP_TRADE_CONFIG,
  type VCPEntryMode,
  type VCPQualityGrade,
  type VCPTradeConfig,
  type VCPTradeSetup,
} from "./VCPTradeTypes";

export function calculateVCPEntry(input: {
  detection: VCPDetection;
  candles: readonly VCPCandle[];
  mode?: VCPEntryMode;
  config?: VCPTradeConfig;
}): number | null {
  const config = input.config ?? DEFAULT_VCP_TRADE_CONFIG;
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

  if (mode === "early_pivot") {
    return Number.isFinite(detection.pivotPrice) && detection.pivotPrice > 0
      ? round(detection.pivotPrice, 4)
      : null;
  }

  if (mode === "retest") {
    const level =
      (detection.pivotPrice + detection.lastContractionLow) / 2;
    return Number.isFinite(level) && level > 0 ? round(level, 4) : null;
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

export interface VCPTargetLadder {
  target1: number;
  target2: number;
  finalTarget: number;
  method: string;
  finalRr: number;
}

function rMultipleTarget(
  direction: VCPDirection,
  entry: number,
  risk: number,
  multiples: { target1: number; target2: number; finalTarget: number }
): VCPTargetLadder | null {
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
): VCPTargetLadder | null {
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
  detection: VCPDetection,
  risk: number,
  fraction: number
): VCPTargetLadder | null {
  if (detection.contractions.length === 0) return null;
  const first = detection.contractions[0]!;
  const span = first.range * fraction;
  if (span <= 0) return null;
  const finalTarget = round(entry + span, 4);
  return {
    target1: round(entry + span * 0.5, 4),
    target2: round(entry + span * 0.75, 4),
    finalTarget,
    method: "measured_move",
    finalRr: risk > 0 ? Math.abs(finalTarget - entry) / risk : 0,
  };
}

function previousHighTarget(
  entry: number,
  candles: readonly VCPCandle[],
  risk: number
): VCPTargetLadder | null {
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
  candles: readonly VCPCandle[],
  bars: number,
  risk: number
): VCPTargetLadder | null {
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
    finalRr: risk > 0 ? Math.abs(span) / risk : 0,
  };
}

export function generateVCPTargets(input: {
  detection: VCPDetection;
  entry: number;
  stopLoss: number;
  atr: number | null;
  candles: readonly VCPCandle[];
  config?: VCPTradeConfig;
}): {
  targets: VCPTargetLadder | null;
  warnings: string[];
} {
  const config = input.config ?? DEFAULT_VCP_TRADE_CONFIG;
  const warnings: string[] = [];
  const risk = calculateRiskAmount(input.entry, input.stopLoss);
  const candidates: VCPTargetLadder[] = [];

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
    input.detection,
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

export function classifyVCPQualityGrade(
  score: number,
  config: VCPTradeConfig = DEFAULT_VCP_TRADE_CONFIG
): VCPQualityGrade {
  const t = config.gradeThresholds;
  if (score >= t.exceptionalMin) return "Exceptional";
  if (score >= t.highMin) return "High";
  if (score >= t.goodMin) return "Good";
  if (score >= t.averageMin) return "Average";
  return "Poor";
}

export function calculateVCPTradeQuality(input: {
  detection: VCPDetection;
  marketContext: InstitutionalMarketContext;
  riskReward: number;
  config?: VCPTradeConfig;
}): { score: number; grade: VCPQualityGrade } {
  const config = input.config ?? DEFAULT_VCP_TRADE_CONFIG;
  const w = config.qualityWeights;
  const d = input.detection;

  const patternQuality = d.detected ? clamp(d.patternQuality, 0, 100) : 25;
  const contractionQuality = clamp(d.contractionQuality, 0, 100);
  const volumeDryUp = d.volumeDryUp ? clamp(d.volumeDryUpScore, 0, 100) : 25;
  const breakoutQuality = d.breakoutConfirmed
    ? clamp(d.breakoutQuality, 0, 100)
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
    w.patternQuality +
    w.contractionQuality +
    w.volumeDryUp +
    w.breakoutQuality +
    w.sectorStrength +
    w.marketRegime +
    w.riskReward;

  const score = clamp(
    round(
      (patternQuality * w.patternQuality +
        contractionQuality * w.contractionQuality +
        volumeDryUp * w.volumeDryUp +
        breakoutQuality * w.breakoutQuality +
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
    grade: classifyVCPQualityGrade(score, config),
  };
}

export function createRejectedVCPTradeSetup(
  detection: VCPDetection,
  warnings: string[]
): VCPTradeSetup {
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
    conviction: 0,
    signalGrade: "F",
    confidence: detection.confidence || 0,
    pivotPrice: detection.pivotPrice,
    contractionCount: detection.contractionCount,
    holdingPeriod: DEFAULT_VCP_TRADE_CONFIG.defaultHoldingPeriod,
    positionType: DEFAULT_VCP_TRADE_CONFIG.defaultPositionType,
    warnings,
    positiveReasons: [],
    negativeReasons: [],
    neutralReasons: [],
    institutionalSummary: [],
    explainability: createEmptyVCPExplainability(warnings),
    institutionalScore: {
      conviction: 0,
      grade: "Weak",
      signalGrade: "F",
      confidence: detection.confidence || 0,
    },
  };
}

export function validateVCPTradeSetup(
  setup: VCPTradeSetup,
  config: VCPTradeConfig = DEFAULT_VCP_TRADE_CONFIG
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
