/**
 * VWAP Mean Reversion Trade utilities — Sprint 11B.3D.2.
 * Entry, targets, RR, and trade quality. Pure functions only.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { averageSectorScore } from "./VWAPMeanReversionUtils";
import type {
  VWAPMeanReversionCandle,
  VWAPMeanReversionDetection,
  VWAPMeanReversionDirection,
} from "./VWAPMeanReversionTypes";
import {
  calculateRiskAmount,
  isValidStop,
} from "./VWAPMeanReversionRisk";
import {
  DEFAULT_VWAP_MEAN_REVERSION_TRADE_CONFIG,
  type VWAPMeanReversionEntryMode,
  type VWAPMeanReversionQualityGrade,
  type VWAPMeanReversionTradeConfig,
  type VWAPMeanReversionTradeSetup,
} from "./VWAPMeanReversionTradeTypes";

export function calculateVWAPMeanReversionEntry(input: {
  detection: VWAPMeanReversionDetection;
  candles: readonly VWAPMeanReversionCandle[];
  vwap: number;
  mode?: VWAPMeanReversionEntryMode;
  config?: VWAPMeanReversionTradeConfig;
}): number | null {
  const config = input.config ?? DEFAULT_VWAP_MEAN_REVERSION_TRADE_CONFIG;
  const mode = input.mode ?? config.entryMode;
  const { detection } = input;

  if (!detection.detected || detection.direction === "NONE") {
    return null;
  }

  const last = input.candles[input.candles.length - 1];
  if (!last) return null;

  if (mode === "confirmation_close") {
    return Number.isFinite(last.close) && last.close > 0
      ? round(last.close, 4)
      : null;
  }

  if (mode === "retest_after_reversal") {
    // Retest of reversal midpoint / prior extreme
    if (detection.direction === "BUY") {
      const level = (last.low + last.close) / 2;
      return Number.isFinite(level) && level > 0 ? round(level, 4) : null;
    }
    const level = (last.high + last.close) / 2;
    return Number.isFinite(level) && level > 0 ? round(level, 4) : null;
  }

  // aggressive_immediate — enter at reversal candle extreme in trade direction
  if (detection.direction === "BUY") {
    return Number.isFinite(last.low) && last.low > 0
      ? round(last.low, 4)
      : null;
  }
  if (detection.direction === "SELL") {
    return Number.isFinite(last.high) && last.high > 0
      ? round(last.high, 4)
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

export interface VWAPMeanReversionTargetLadder {
  target1: number;
  target2: number;
  finalTarget: number;
  method: string;
  finalRr: number;
}

function ladderToward(
  direction: VWAPMeanReversionDirection,
  entry: number,
  finalTarget: number,
  fractions: { target1: number; target2: number; finalTarget: number },
  risk: number,
  method: string
): VWAPMeanReversionTargetLadder | null {
  if (direction === "BUY" && finalTarget <= entry) return null;
  if (direction === "SELL" && finalTarget >= entry) return null;
  const span = finalTarget - entry;
  const t1 = round(entry + span * fractions.target1, 4);
  const t2 = round(entry + span * fractions.target2, 4);
  const final = round(entry + span * fractions.finalTarget, 4);
  return {
    target1: t1,
    target2: t2,
    finalTarget: final,
    method,
    finalRr: risk > 0 ? Math.abs(final - entry) / risk : 0,
  };
}

function vwapMeanReversionTarget(
  direction: VWAPMeanReversionDirection,
  entry: number,
  vwap: number,
  risk: number,
  fractions: { target1: number; target2: number; finalTarget: number }
): VWAPMeanReversionTargetLadder | null {
  return ladderToward(
    direction,
    entry,
    vwap,
    fractions,
    risk,
    "vwap_mean_reversion"
  );
}

function vwapPlusAtrTarget(
  direction: VWAPMeanReversionDirection,
  entry: number,
  vwap: number,
  atr: number,
  risk: number,
  multiples: { target1: number; target2: number; finalTarget: number }
): VWAPMeanReversionTargetLadder | null {
  const sign = direction === "BUY" ? 1 : -1;
  // Beyond VWAP by ATR for completion + extension
  const finalTarget = round(vwap + sign * atr * multiples.finalTarget, 4);
  if (direction === "BUY" && finalTarget <= entry) return null;
  if (direction === "SELL" && finalTarget >= entry) return null;
  return {
    target1: round(vwap + sign * atr * multiples.target1, 4),
    target2: round(vwap + sign * atr * multiples.target2, 4),
    finalTarget,
    method: "vwap_plus_atr",
    finalRr: risk > 0 ? Math.abs(finalTarget - entry) / risk : 0,
  };
}

function previousSwingTarget(
  direction: VWAPMeanReversionDirection,
  entry: number,
  candles: readonly VWAPMeanReversionCandle[],
  risk: number,
  recentSwingHigh?: number | null,
  recentSwingLow?: number | null
): VWAPMeanReversionTargetLadder | null {
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
      "previous_resistance"
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
    "previous_support"
  );
}

function measuredMoveTarget(
  direction: VWAPMeanReversionDirection,
  entry: number,
  candles: readonly VWAPMeanReversionCandle[],
  risk: number,
  fraction: number
): VWAPMeanReversionTargetLadder | null {
  if (candles.length < 4) return null;
  const recent = candles.slice(-6);
  const impulse =
    Math.max(...recent.map((c) => c.high)) -
    Math.min(...recent.map((c) => c.low));
  if (!Number.isFinite(impulse) || impulse <= 0) return null;
  const move = impulse * fraction;
  const sign = direction === "SELL" ? -1 : 1;
  const finalTarget = round(entry + sign * move, 4);
  return {
    target1: round(entry + sign * move * 0.5, 4),
    target2: round(entry + sign * move * 0.75, 4),
    finalTarget,
    method: "measured_move",
    finalRr: risk > 0 ? move / risk : 0,
  };
}

function dynamicProjectionTarget(
  direction: VWAPMeanReversionDirection,
  entry: number,
  candles: readonly VWAPMeanReversionCandle[],
  risk: number,
  bars: number
): VWAPMeanReversionTargetLadder | null {
  if (candles.length < 3) return null;
  const window = candles.slice(-Math.max(bars, 2));
  const avgRange =
    window.reduce((sum, c) => sum + Math.max(c.high - c.low, 0), 0) /
    window.length;
  if (!Number.isFinite(avgRange) || avgRange <= 0) return null;
  const projection = avgRange * bars;
  const sign = direction === "SELL" ? -1 : 1;
  const finalTarget = round(entry + sign * projection, 4);
  return {
    target1: round(entry + sign * projection * 0.5, 4),
    target2: round(entry + sign * projection * 0.75, 4),
    finalTarget,
    method: "dynamic_projection",
    finalRr: risk > 0 ? projection / risk : 0,
  };
}

/**
 * Generate target ladders and select the highest-quality method.
 */
export function generateVWAPMeanReversionTargets(input: {
  detection: VWAPMeanReversionDetection;
  entry: number;
  stopLoss: number;
  vwap: number;
  atr: number | null;
  candles: readonly VWAPMeanReversionCandle[];
  recentSwingHigh?: number | null;
  recentSwingLow?: number | null;
  config?: VWAPMeanReversionTradeConfig;
}): { targets: VWAPMeanReversionTargetLadder | null; warnings: string[] } {
  const config = input.config ?? DEFAULT_VWAP_MEAN_REVERSION_TRADE_CONFIG;
  const warnings: string[] = [];
  const risk = calculateRiskAmount(input.entry, input.stopLoss);
  if (risk < config.priceEpsilon) {
    return {
      targets: null,
      warnings: ["Cannot generate targets — risk is zero."],
    };
  }

  const candidates: VWAPMeanReversionTargetLadder[] = [];

  const vwapTarget = vwapMeanReversionTarget(
    input.detection.direction,
    input.entry,
    input.vwap,
    risk,
    config.vwapTargetFractions
  );
  if (vwapTarget) candidates.push(vwapTarget);
  else warnings.push("VWAP mean-reversion target unavailable.");

  if (input.atr !== null && Number.isFinite(input.atr) && input.atr > 0) {
    const plusAtr = vwapPlusAtrTarget(
      input.detection.direction,
      input.entry,
      input.vwap,
      input.atr,
      risk,
      config.atrTargetMultiples
    );
    if (plusAtr) candidates.push(plusAtr);
  } else {
    warnings.push("ATR unavailable — VWAP+ATR target skipped.");
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
  else warnings.push("Previous swing target unavailable.");

  const measured = measuredMoveTarget(
    input.detection.direction,
    input.entry,
    input.candles,
    risk,
    config.measuredMoveFraction
  );
  if (measured) candidates.push(measured);
  else warnings.push("Measured move unavailable.");

  const dynamic = dynamicProjectionTarget(
    input.detection.direction,
    input.entry,
    input.candles,
    risk,
    config.dynamicProjectionBars
  );
  if (dynamic) candidates.push(dynamic);
  else warnings.push("Dynamic projection unavailable.");

  // Explicit mean-reversion completion alias (same as VWAP when valid)
  if (vwapTarget) {
    candidates.push({ ...vwapTarget, method: "mean_reversion_completion" });
  }

  const valid = candidates.filter((c) =>
    areValidTargets(input.detection.direction, input.entry, c, config)
  );
  if (valid.length === 0) {
    return { targets: null, warnings: [...warnings, "Invalid targets."] };
  }

  const meetingMin = valid.filter(
    (c) => c.finalRr + config.priceEpsilon >= config.minimumRiskReward
  );
  const pool = meetingMin.length > 0 ? meetingMin : valid;

  // Prefer classic VWAP mean-reversion completion when it meets RR
  const preferred = pool.find(
    (c) =>
      (c.method === "vwap_mean_reversion" ||
        c.method === "mean_reversion_completion") &&
      c.finalRr + config.priceEpsilon >= config.minimumRiskReward
  );
  if (preferred) return { targets: preferred, warnings };

  if (config.preferHigherFinalRr) {
    const best = pool.reduce((a, b) => (b.finalRr > a.finalRr ? b : a));
    return { targets: best, warnings };
  }

  return { targets: pool[0]!, warnings };
}

export function areValidTargets(
  direction: VWAPMeanReversionDirection,
  entry: number,
  targets: Pick<
    VWAPMeanReversionTargetLadder,
    "target1" | "target2" | "finalTarget"
  >,
  config: VWAPMeanReversionTradeConfig = DEFAULT_VWAP_MEAN_REVERSION_TRADE_CONFIG
): boolean {
  const { target1, target2, finalTarget } = targets;
  if (
    !Number.isFinite(target1) ||
    !Number.isFinite(target2) ||
    !Number.isFinite(finalTarget)
  ) {
    return false;
  }
  if (direction === "BUY") {
    return (
      target1 > entry + config.priceEpsilon &&
      target2 >= target1 - config.priceEpsilon &&
      finalTarget >= target2 - config.priceEpsilon
    );
  }
  if (direction === "SELL") {
    return (
      target1 < entry - config.priceEpsilon &&
      target2 <= target1 + config.priceEpsilon &&
      finalTarget <= target2 + config.priceEpsilon
    );
  }
  return false;
}

export function classifyVWAPMeanReversionQualityGrade(
  score: number,
  config: VWAPMeanReversionTradeConfig = DEFAULT_VWAP_MEAN_REVERSION_TRADE_CONFIG
): VWAPMeanReversionQualityGrade {
  if (score >= config.gradeThresholds.exceptionalMin) return "Exceptional";
  if (score >= config.gradeThresholds.highMin) return "High";
  if (score >= config.gradeThresholds.goodMin) return "Good";
  if (score >= config.gradeThresholds.averageMin) return "Average";
  return "Poor";
}

export function calculateVWAPMeanReversionTradeQuality(input: {
  detection: VWAPMeanReversionDetection;
  marketContext: InstitutionalMarketContext;
  riskReward: number;
  config?: VWAPMeanReversionTradeConfig;
}): { score: number; grade: VWAPMeanReversionQualityGrade } {
  const config = input.config ?? DEFAULT_VWAP_MEAN_REVERSION_TRADE_CONFIG;
  const w = config.qualityWeights;
  const d = input.detection;

  const absDev = Math.abs(d.deviation);
  const vwapDeviation = d.detected
    ? clamp(((absDev - 1.5) / 1) * 50 + 50, 40, 100)
    : 20;
  const reversalQuality = d.reversalConfirmed
    ? clamp(d.confidence, 0, 100)
    : 30;
  const volumeStability = d.volumeStable ? 85 : 35;
  const marketContextScore = d.marketConfirmed
    ? clamp(input.marketContext.marketStrength, 0, 100)
    : 30;
  const breadth = d.breadthConfirmed
    ? clamp(input.marketContext.marketBreadth.score, 0, 100)
    : 30;
  const sector = d.sectorConfirmed
    ? clamp(averageSectorScore(input.marketContext), 0, 100)
    : 30;
  const rrScore = clamp(
    (input.riskReward / Math.max(config.minimumRiskReward, 0.1)) * 70,
    0,
    100
  );

  const score = clamp(
    round(
      vwapDeviation * w.vwapDeviation +
        reversalQuality * w.reversalQuality +
        volumeStability * w.volumeStability +
        marketContextScore * w.marketContext +
        breadth * w.breadth +
        sector * w.sectorStrength +
        rrScore * w.riskReward,
      1
    ),
    config.scoreFloor,
    config.scoreCeiling
  );

  return {
    score,
    grade: classifyVWAPMeanReversionQualityGrade(score, config),
  };
}

export function validateVWAPMeanReversionTradeSetup(
  setup: Omit<
    VWAPMeanReversionTradeSetup,
    "qualityScore" | "qualityGrade" | "holdingPeriod" | "positionType" | "warnings"
  > & { warnings?: string[] },
  config: VWAPMeanReversionTradeConfig = DEFAULT_VWAP_MEAN_REVERSION_TRADE_CONFIG
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!Number.isFinite(setup.entry) || setup.entry <= 0) {
    errors.push("Invalid entry.");
  }
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
  if (setup.reward <= 0) {
    errors.push("Negative reward.");
  }
  if (
    !areValidTargets(
      setup.detection.direction,
      setup.entry,
      {
        target1: setup.target1,
        target2: setup.target2,
        finalTarget: setup.finalTarget,
      },
      config
    )
  ) {
    errors.push("Invalid targets.");
  }
  if (setup.riskReward + config.priceEpsilon < config.minimumRiskReward) {
    errors.push("RR below threshold.");
  }

  return { valid: errors.length === 0, errors };
}

export function createRejectedVWAPMeanReversionTradeSetup(
  detection: VWAPMeanReversionDetection,
  warnings: string[]
): VWAPMeanReversionTradeSetup {
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
    holdingPeriod: DEFAULT_VWAP_MEAN_REVERSION_TRADE_CONFIG.defaultHoldingPeriod,
    positionType: DEFAULT_VWAP_MEAN_REVERSION_TRADE_CONFIG.defaultPositionType,
    warnings,
  };
}
