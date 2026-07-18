/**
 * VWAP Continuation Trade utilities — Sprint 11B.3C.2.
 * Entry, targets, RR, and trade quality. Pure functions only.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { averageSectorScore } from "./VWAPContinuationUtils";
import type {
  VWAPCandle,
  VWAPContinuationDetection,
  VWAPContinuationDirection,
} from "./VWAPContinuationTypes";
import {
  calculateRiskAmount,
  isValidStop,
} from "./VWAPContinuationRisk";
import {
  DEFAULT_VWAP_CONTINUATION_TRADE_CONFIG,
  type VWAPContinuationEntryMode,
  type VWAPContinuationQualityGrade,
  type VWAPContinuationTradeConfig,
  type VWAPContinuationTradeSetup,
} from "./VWAPContinuationTradeTypes";

export function calculateVWAPContinuationEntry(input: {
  detection: VWAPContinuationDetection;
  candles: readonly VWAPCandle[];
  vwap: number;
  mode?: VWAPContinuationEntryMode;
  config?: VWAPContinuationTradeConfig;
}): number | null {
  const config = input.config ?? DEFAULT_VWAP_CONTINUATION_TRADE_CONFIG;
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

  if (mode === "vwap_retest") {
    const level =
      Number.isFinite(input.vwap) && input.vwap > 0
        ? input.vwap
        : detection.vwap;
    return Number.isFinite(level) && level > 0 ? round(level, 4) : null;
  }

  // aggressive_intrabar — continue with candle extreme in trade direction
  if (detection.direction === "BUY") {
    return Number.isFinite(last.high) && last.high > 0
      ? round(last.high, 4)
      : null;
  }
  if (detection.direction === "SELL") {
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
  const reward = Math.abs(target - entry);
  return round(reward / risk, 2);
}

export interface VWAPContinuationTargetLadder {
  target1: number;
  target2: number;
  finalTarget: number;
  method: string;
  finalRr: number;
}

function projectFromRisk(
  direction: VWAPContinuationDirection,
  entry: number,
  risk: number,
  multiples: { target1: number; target2: number; finalTarget: number }
): VWAPContinuationTargetLadder {
  const sign = direction === "SELL" ? -1 : 1;
  return {
    target1: round(entry + sign * risk * multiples.target1, 4),
    target2: round(entry + sign * risk * multiples.target2, 4),
    finalTarget: round(entry + sign * risk * multiples.finalTarget, 4),
    method: "risk_reward",
    finalRr: multiples.finalTarget,
  };
}

function projectFromAtr(
  direction: VWAPContinuationDirection,
  entry: number,
  atr: number,
  multiples: { target1: number; target2: number; finalTarget: number },
  risk: number
): VWAPContinuationTargetLadder {
  const sign = direction === "SELL" ? -1 : 1;
  const finalTarget = round(entry + sign * atr * multiples.finalTarget, 4);
  return {
    target1: round(entry + sign * atr * multiples.target1, 4),
    target2: round(entry + sign * atr * multiples.target2, 4),
    finalTarget,
    method: "atr_projection",
    finalRr: risk > 0 ? Math.abs(finalTarget - entry) / risk : 0,
  };
}

function previousStructureTarget(
  direction: VWAPContinuationDirection,
  entry: number,
  candles: readonly VWAPCandle[],
  risk: number,
  recentSwingHigh?: number | null,
  recentSwingLow?: number | null
): VWAPContinuationTargetLadder | null {
  if (candles.length < 3 && recentSwingHigh == null && recentSwingLow == null) {
    return null;
  }
  if (direction === "BUY") {
    const resistance =
      recentSwingHigh !== undefined &&
      recentSwingHigh !== null &&
      Number.isFinite(recentSwingHigh)
        ? recentSwingHigh
        : Math.max(...candles.map((c) => c.high));
    if (resistance <= entry) return null;
    const reward = resistance - entry;
    return {
      target1: round(entry + reward * 0.5, 4),
      target2: round(entry + reward * 0.75, 4),
      finalTarget: round(resistance, 4),
      method: "previous_resistance",
      finalRr: risk > 0 ? reward / risk : 0,
    };
  }
  const support =
    recentSwingLow !== undefined &&
    recentSwingLow !== null &&
    Number.isFinite(recentSwingLow)
      ? recentSwingLow
      : Math.min(...candles.map((c) => c.low));
  if (support >= entry) return null;
  const reward = entry - support;
  return {
    target1: round(entry - reward * 0.5, 4),
    target2: round(entry - reward * 0.75, 4),
    finalTarget: round(support, 4),
    method: "previous_support",
    finalRr: risk > 0 ? reward / risk : 0,
  };
}

function measuredMoveTarget(
  direction: VWAPContinuationDirection,
  entry: number,
  candles: readonly VWAPCandle[],
  risk: number,
  fraction: number
): VWAPContinuationTargetLadder | null {
  if (candles.length < 4) return null;
  const recent = candles.slice(-6);
  const impulse =
    direction === "BUY"
      ? Math.max(...recent.map((c) => c.high)) - Math.min(...recent.map((c) => c.low))
      : Math.max(...recent.map((c) => c.high)) - Math.min(...recent.map((c) => c.low));
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

function trendProjectionTarget(
  direction: VWAPContinuationDirection,
  entry: number,
  candles: readonly VWAPCandle[],
  risk: number,
  bars: number
): VWAPContinuationTargetLadder | null {
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
    method: "trend_projection",
    finalRr: risk > 0 ? projection / risk : 0,
  };
}

/**
 * Generate target ladders and automatically select the highest-quality method.
 */
export function generateVWAPContinuationTargets(input: {
  detection: VWAPContinuationDetection;
  entry: number;
  stopLoss: number;
  atr: number | null;
  candles: readonly VWAPCandle[];
  recentSwingHigh?: number | null;
  recentSwingLow?: number | null;
  config?: VWAPContinuationTradeConfig;
}): { targets: VWAPContinuationTargetLadder | null; warnings: string[] } {
  const config = input.config ?? DEFAULT_VWAP_CONTINUATION_TRADE_CONFIG;
  const warnings: string[] = [];
  const risk = calculateRiskAmount(input.entry, input.stopLoss);
  if (risk < config.priceEpsilon) {
    return {
      targets: null,
      warnings: ["Cannot generate targets — risk is zero."],
    };
  }

  const candidates: VWAPContinuationTargetLadder[] = [];

  // 2R / 3R style ladder via configured R multiples
  candidates.push(
    projectFromRisk(
      input.detection.direction,
      input.entry,
      risk,
      config.targetRMultiples
    )
  );

  if (input.atr !== null && Number.isFinite(input.atr) && input.atr > 0) {
    candidates.push(
      projectFromAtr(
        input.detection.direction,
        input.entry,
        input.atr,
        config.atrTargetMultiples,
        risk
      )
    );
  } else {
    warnings.push("ATR unavailable — ATR projection skipped.");
  }

  const structure = previousStructureTarget(
    input.detection.direction,
    input.entry,
    input.candles,
    risk,
    input.recentSwingHigh,
    input.recentSwingLow
  );
  if (structure) candidates.push(structure);
  else warnings.push("Previous resistance/support projection unavailable.");

  const measured = measuredMoveTarget(
    input.detection.direction,
    input.entry,
    input.candles,
    risk,
    config.measuredMoveFraction
  );
  if (measured) candidates.push(measured);
  else warnings.push("Measured move projection unavailable.");

  const trend = trendProjectionTarget(
    input.detection.direction,
    input.entry,
    input.candles,
    risk,
    config.trendProjectionBars
  );
  if (trend) candidates.push(trend);
  else warnings.push("Trend projection unavailable.");

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

  const rrPreferred = pool.find((c) => c.method === "risk_reward");
  if (
    rrPreferred &&
    rrPreferred.finalRr + config.priceEpsilon >= config.minimumRiskReward
  ) {
    return { targets: rrPreferred, warnings };
  }

  if (config.preferHigherFinalRr) {
    const best = pool.reduce((a, b) => (b.finalRr > a.finalRr ? b : a));
    return { targets: best, warnings };
  }

  return { targets: pool[0]!, warnings };
}

export function areValidTargets(
  direction: VWAPContinuationDirection,
  entry: number,
  targets: Pick<
    VWAPContinuationTargetLadder,
    "target1" | "target2" | "finalTarget"
  >,
  config: VWAPContinuationTradeConfig = DEFAULT_VWAP_CONTINUATION_TRADE_CONFIG
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

export function classifyVWAPContinuationQualityGrade(
  score: number,
  config: VWAPContinuationTradeConfig = DEFAULT_VWAP_CONTINUATION_TRADE_CONFIG
): VWAPContinuationQualityGrade {
  if (score >= config.gradeThresholds.exceptionalMin) return "Exceptional";
  if (score >= config.gradeThresholds.highMin) return "High";
  if (score >= config.gradeThresholds.goodMin) return "Good";
  if (score >= config.gradeThresholds.averageMin) return "Average";
  return "Poor";
}

export function calculateVWAPContinuationTradeQuality(input: {
  detection: VWAPContinuationDetection;
  marketContext: InstitutionalMarketContext;
  riskReward: number;
  config?: VWAPContinuationTradeConfig;
}): { score: number; grade: VWAPContinuationQualityGrade } {
  const config = input.config ?? DEFAULT_VWAP_CONTINUATION_TRADE_CONFIG;
  const w = config.qualityWeights;
  const d = input.detection;

  const vwapQuality = d.detected
    ? clamp(
        d.confidence *
          (d.pullbackDetected && d.bounceConfirmed ? 1 : 0.7),
        0,
        100
      )
    : 20;
  const trendStrength = d.detected
    ? clamp(d.confidence * (d.marketConfirmed ? 1 : 0.65), 0, 100)
    : 25;
  const volume = d.volumeConfirmed ? 85 : 35;
  const breadth = d.breadthConfirmed
    ? clamp(input.marketContext.marketBreadth.score, 0, 100)
    : 30;
  const sector = d.sectorConfirmed
    ? clamp(averageSectorScore(input.marketContext), 0, 100)
    : 30;
  const marketRegime = d.marketConfirmed
    ? clamp(input.marketContext.marketStrength, 0, 100)
    : 30;
  const rrScore = clamp(
    (input.riskReward / Math.max(config.minimumRiskReward, 0.1)) * 70,
    0,
    100
  );

  const score = clamp(
    round(
      vwapQuality * w.vwapQuality +
        trendStrength * w.trendStrength +
        volume * w.volume +
        breadth * w.breadth +
        sector * w.sectorStrength +
        marketRegime * w.marketRegime +
        rrScore * w.riskReward,
      1
    ),
    config.scoreFloor,
    config.scoreCeiling
  );

  return {
    score,
    grade: classifyVWAPContinuationQualityGrade(score, config),
  };
}

export function validateVWAPContinuationTradeSetup(
  setup: Omit<
    VWAPContinuationTradeSetup,
    "qualityScore" | "qualityGrade" | "holdingPeriod" | "positionType" | "warnings"
  > & { warnings?: string[] },
  config: VWAPContinuationTradeConfig = DEFAULT_VWAP_CONTINUATION_TRADE_CONFIG
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

export function createRejectedVWAPContinuationTradeSetup(
  detection: VWAPContinuationDetection,
  warnings: string[]
): VWAPContinuationTradeSetup {
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
    holdingPeriod: DEFAULT_VWAP_CONTINUATION_TRADE_CONFIG.defaultHoldingPeriod,
    positionType: DEFAULT_VWAP_CONTINUATION_TRADE_CONFIG.defaultPositionType,
    warnings,
  };
}
