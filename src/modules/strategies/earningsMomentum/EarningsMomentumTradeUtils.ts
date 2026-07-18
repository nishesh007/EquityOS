/**
 * Earnings Momentum Trade utilities — Sprint 11B.3T.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { createEmptyEarningsMomentumExplainability } from "./EarningsMomentumExplainability";
import { calculateRiskAmount, isValidStop } from "./EarningsMomentumRisk";
import type {
  EarningsMomentumCandle,
  EarningsMomentumDetection,
  EarningsMomentumDirection,
} from "./EarningsMomentumTypes";
import {
  DEFAULT_EARNINGS_MOMENTUM_TRADE_CONFIG,
  type EarningsMomentumEntryMode,
  type EarningsMomentumQualityGrade,
  type EarningsMomentumTradeConfig,
  type EarningsMomentumTradeSetup,
} from "./EarningsMomentumTradeTypes";
import { averageSectorScore } from "./EarningsMomentumUtils";

export function calculateEarningsMomentumEntry(input: {
  detection: EarningsMomentumDetection;
  candles: readonly EarningsMomentumCandle[];
  mode?: EarningsMomentumEntryMode;
  config?: EarningsMomentumTradeConfig;
}): number | null {
  const config = input.config ?? DEFAULT_EARNINGS_MOMENTUM_TRADE_CONFIG;
  const mode = input.mode ?? config.entryMode;
  const { detection } = input;
  if (!detection.detected || detection.direction === "NONE") return null;
  const last = input.candles[input.candles.length - 1];
  if (!last) return null;

  if (mode === "confirmation_candle" || mode === "gap_continuation") {
    return Number.isFinite(last.close) && last.close > 0
      ? round(last.close, 4)
      : null;
  }
  if (mode === "vwap_retest") {
    return Number.isFinite(detection.vwap) && detection.vwap > 0
      ? round(detection.vwap, 4)
      : null;
  }
  if (mode === "opening_pullback") {
    return Number.isFinite(last.open) && last.open > 0
      ? round(last.open, 4)
      : null;
  }
  if (mode === "continuation_breakout") {
    const level =
      detection.direction === "BUY" ? last.high : last.low;
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

export interface EarningsMomentumTargetLadder {
  target1: number;
  target2: number;
  finalTarget: number;
  method: string;
  finalRr: number;
}

function project(
  direction: EarningsMomentumDirection,
  entry: number,
  span: number
): { t1: number; t2: number; final: number } | null {
  if (span <= 0 || direction === "NONE") return null;
  if (direction === "BUY") {
    return {
      t1: round(entry + span * 0.4, 4),
      t2: round(entry + span * 0.7, 4),
      final: round(entry + span, 4),
    };
  }
  return {
    t1: round(entry - span * 0.4, 4),
    t2: round(entry - span * 0.7, 4),
    final: round(entry - span, 4),
  };
}

function rMultipleTarget(
  direction: EarningsMomentumDirection,
  entry: number,
  risk: number,
  multiples: { target1: number; target2: number; finalTarget: number }
): EarningsMomentumTargetLadder | null {
  if (risk <= 0 || direction === "NONE") return null;
  if (direction === "BUY") {
    return {
      target1: round(entry + risk * multiples.target1, 4),
      target2: round(entry + risk * multiples.target2, 4),
      finalTarget: round(entry + risk * multiples.finalTarget, 4),
      method: "r_multiple",
      finalRr: multiples.finalTarget,
    };
  }
  return {
    target1: round(entry - risk * multiples.target1, 4),
    target2: round(entry - risk * multiples.target2, 4),
    finalTarget: round(entry - risk * multiples.finalTarget, 4),
    method: "r_multiple",
    finalRr: multiples.finalTarget,
  };
}

export function generateEarningsMomentumTargets(input: {
  detection: EarningsMomentumDetection;
  entry: number;
  stopLoss: number;
  atr: number | null;
  candles: readonly EarningsMomentumCandle[];
  config?: EarningsMomentumTradeConfig;
}): { targets: EarningsMomentumTargetLadder | null; warnings: string[] } {
  const config = input.config ?? DEFAULT_EARNINGS_MOMENTUM_TRADE_CONFIG;
  const warnings: string[] = [];
  const risk = calculateRiskAmount(input.entry, input.stopLoss);
  const candidates: EarningsMomentumTargetLadder[] = [];
  const dir = input.detection.direction;

  const r = rMultipleTarget(dir, input.entry, risk, config.targetRMultiples);
  if (r) candidates.push(r);

  if (input.atr !== null && Number.isFinite(input.atr) && input.atr > 0) {
    const atrSpan = input.atr * config.atrTargetMultiples.finalTarget;
    const atrProj = project(dir, input.entry, atrSpan);
    if (atrProj) {
      candidates.push({
        target1: atrProj.t1,
        target2: atrProj.t2,
        finalTarget: atrProj.final,
        method: "atr_projection",
        finalRr: risk > 0 ? atrSpan / risk : 0,
      });
    }
    const trailSpan = input.atr * config.trailingStopAtrMultiple * 2.5;
    const trail = project(dir, input.entry, trailSpan);
    if (trail) {
      candidates.push({
        target1: trail.t1,
        target2: trail.t2,
        finalTarget: trail.final,
        method: "trailing_stop_projection",
        finalRr: risk > 0 ? trailSpan / risk : 0,
      });
    }
  }

  const window = input.candles.slice(-40);
  if (window.length >= 4) {
    const high = Math.max(...window.map((c) => c.high));
    const low = Math.min(...window.map((c) => c.low));
    const span = (high - low) * config.measuredMoveFraction;
    const measured = project(dir, input.entry, span);
    if (measured) {
      candidates.push({
        target1: measured.t1,
        target2: measured.t2,
        finalTarget: measured.final,
        method: "measured_move",
        finalRr: risk > 0 ? span / risk : 0,
      });
    }
  }

  const trendSpan = Math.max(input.detection.atr * 3, risk * 3);
  const trend = project(dir, input.entry, trendSpan);
  if (trend) {
    candidates.push({
      target1: trend.t1,
      target2: trend.t2,
      finalTarget: trend.final,
      method: "trend_projection",
      finalRr: risk > 0 ? trendSpan / risk : 0,
    });
  }

  const dynWindow = input.candles.slice(
    -Math.max(config.dynamicProjectionBars, 2)
  );
  if (dynWindow.length >= 2) {
    const avgRange =
      dynWindow.reduce((s, c) => s + (c.high - c.low), 0) / dynWindow.length;
    const dynSpan = avgRange * config.dynamicProjectionBars;
    const dyn = project(dir, input.entry, dynSpan);
    if (dyn) {
      candidates.push({
        target1: dyn.t1,
        target2: dyn.t2,
        finalTarget: dyn.final,
        method: "dynamic_projection",
        finalRr: risk > 0 ? dynSpan / risk : 0,
      });
    }
  }

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

export function classifyEarningsMomentumQualityGrade(
  score: number,
  config: EarningsMomentumTradeConfig = DEFAULT_EARNINGS_MOMENTUM_TRADE_CONFIG
): EarningsMomentumQualityGrade {
  const t = config.gradeThresholds;
  if (score >= t.exceptionalMin) return "Exceptional";
  if (score >= t.highMin) return "High";
  if (score >= t.goodMin) return "Good";
  if (score >= t.averageMin) return "Average";
  return "Poor";
}

export function calculateEarningsMomentumTradeQuality(input: {
  detection: EarningsMomentumDetection;
  marketContext: InstitutionalMarketContext;
  riskReward: number;
  relativeStrength: number | null;
  config?: EarningsMomentumTradeConfig;
}): { score: number; grade: EarningsMomentumQualityGrade } {
  const config = input.config ?? DEFAULT_EARNINGS_MOMENTUM_TRADE_CONFIG;
  const w = config.qualityWeights;
  const d = input.detection;

  const earningsQuality = d.detected ? clamp(d.earningsQuality, 0, 100) : 25;
  const guidanceQuality = d.detected ? clamp(d.guidanceQuality, 0, 100) : 25;
  const priceConfirmation = d.priceConfirmed
    ? clamp(d.priceConfirmation, 0, 100)
    : 25;
  const volumeConfirmation = d.volumeConfirmed
    ? clamp(d.volumeConfirmation, 0, 100)
    : 25;
  const relativeStrength = d.rsConfirmed
    ? clamp(input.relativeStrength ?? 55, 0, 100)
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
    w.earningsQuality +
    w.guidanceQuality +
    w.priceConfirmation +
    w.volumeConfirmation +
    w.relativeStrength +
    w.sectorStrength +
    w.riskReward;

  const score = clamp(
    round(
      (earningsQuality * w.earningsQuality +
        guidanceQuality * w.guidanceQuality +
        priceConfirmation * w.priceConfirmation +
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

  return {
    score,
    grade: classifyEarningsMomentumQualityGrade(score, config),
  };
}

export function createRejectedEarningsMomentumTradeSetup(
  detection: EarningsMomentumDetection,
  warnings: string[]
): EarningsMomentumTradeSetup {
  return {
    detection,
    epsActual: detection.epsActual,
    epsEstimate: detection.epsEstimate,
    epsSurprise: detection.epsSurprise,
    revenueActual: detection.revenueActual,
    revenueEstimate: detection.revenueEstimate,
    revenueSurprise: detection.revenueSurprise,
    guidance: detection.guidance,
    marginExpansion: detection.marginExpansion,
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
      DEFAULT_EARNINGS_MOMENTUM_TRADE_CONFIG.defaultHoldingPeriod,
    positionType:
      DEFAULT_EARNINGS_MOMENTUM_TRADE_CONFIG.defaultPositionType,
    warnings,
    positiveReasons: [],
    negativeReasons: [],
    neutralReasons: [],
    institutionalSummary: [],
    explainability: createEmptyEarningsMomentumExplainability(warnings),
    institutionalScore: {
      conviction: 0,
      grade: "Weak",
      signalGrade: "F",
      confidence: detection.confidence || 0,
    },
  };
}

export function validateEarningsMomentumTradeSetup(
  setup: EarningsMomentumTradeSetup,
  config: EarningsMomentumTradeConfig = DEFAULT_EARNINGS_MOMENTUM_TRADE_CONFIG
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
