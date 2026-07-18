/**
 * ORB Trade utilities — Sprint 11B.3B.2.
 * Entry, targets, RR, and trade quality. Pure functions only.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { averageSectorScore } from "./ORBUtils";
import type { ORBCandle, ORBDetection } from "./ORBTypes";
import {
  calculateRiskAmount,
  isValidStop,
} from "./ORBRisk";
import {
  DEFAULT_ORB_TRADE_CONFIG,
  type ORBEntryMode,
  type ORBQualityGrade,
  type ORBTradeConfig,
  type ORBTradeSetup,
} from "./ORBTradeTypes";

export function calculateORBEntry(input: {
  detection: ORBDetection;
  mode?: ORBEntryMode;
  retestPrice?: number | null;
  config?: ORBTradeConfig;
}): number | null {
  const config = input.config ?? DEFAULT_ORB_TRADE_CONFIG;
  const mode = input.mode ?? config.entryMode;
  const { detection } = input;

  if (!detection.detected || detection.direction === "NONE") {
    return null;
  }

  if (mode === "breakout_close") {
    return Number.isFinite(detection.breakoutPrice) && detection.breakoutPrice > 0
      ? round(detection.breakoutPrice, 4)
      : null;
  }

  // Retest of breakout / breakdown level
  if (detection.direction === "BUY") {
    const level =
      input.retestPrice ??
      detection.openingHigh;
    return Number.isFinite(level) && level > 0 ? round(level, 4) : null;
  }
  if (detection.direction === "SELL") {
    const level = input.retestPrice ?? detection.openingLow;
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
  const reward = Math.abs(target - entry);
  return round(reward / risk, 2);
}

export interface ORBTargetLadder {
  target1: number;
  target2: number;
  finalTarget: number;
  method: string;
  finalRr: number;
}

function projectFromRisk(
  direction: ORBDetection["direction"],
  entry: number,
  risk: number,
  multiples: { target1: number; target2: number; finalTarget: number }
): ORBTargetLadder {
  const sign = direction === "SELL" ? -1 : 1;
  const target1 = round(entry + sign * risk * multiples.target1, 4);
  const target2 = round(entry + sign * risk * multiples.target2, 4);
  const finalTarget = round(entry + sign * risk * multiples.finalTarget, 4);
  return {
    target1,
    target2,
    finalTarget,
    method: "risk_reward",
    finalRr: multiples.finalTarget,
  };
}

function projectFromAtr(
  direction: ORBDetection["direction"],
  entry: number,
  atr: number,
  multiples: { target1: number; target2: number; finalTarget: number },
  risk: number
): ORBTargetLadder {
  const sign = direction === "SELL" ? -1 : 1;
  const target1 = round(entry + sign * atr * multiples.target1, 4);
  const target2 = round(entry + sign * atr * multiples.target2, 4);
  const finalTarget = round(entry + sign * atr * multiples.finalTarget, 4);
  return {
    target1,
    target2,
    finalTarget,
    method: "atr_extension",
    finalRr: risk > 0 ? Math.abs(finalTarget - entry) / risk : 0,
  };
}

function previousSwingTarget(
  direction: ORBDetection["direction"],
  entry: number,
  candles: readonly ORBCandle[],
  risk: number
): ORBTargetLadder | null {
  if (candles.length < 3) return null;
  const sorted = [...candles].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );
  if (direction === "BUY") {
    const swingHigh = Math.max(...sorted.map((c) => c.high));
    if (swingHigh <= entry) return null;
    const reward = swingHigh - entry;
    const t1 = round(entry + reward * 0.5, 4);
    const t2 = round(entry + reward * 0.75, 4);
    return {
      target1: t1,
      target2: t2,
      finalTarget: round(swingHigh, 4),
      method: "previous_swing",
      finalRr: risk > 0 ? reward / risk : 0,
    };
  }
  const swingLow = Math.min(...sorted.map((c) => c.low));
  if (swingLow >= entry) return null;
  const reward = entry - swingLow;
  return {
    target1: round(entry - reward * 0.5, 4),
    target2: round(entry - reward * 0.75, 4),
    finalTarget: round(swingLow, 4),
    method: "previous_swing",
    finalRr: risk > 0 ? reward / risk : 0,
  };
}

function resistanceProjection(
  direction: ORBDetection["direction"],
  entry: number,
  vwap: number | null,
  detection: ORBDetection,
  risk: number
): ORBTargetLadder | null {
  if (direction === "BUY") {
    const resistance =
      vwap !== null && vwap > entry
        ? vwap
        : entry + (detection.openingHigh - detection.openingLow);
    if (resistance <= entry) return null;
    const reward = resistance - entry;
    return {
      target1: round(entry + reward * 0.5, 4),
      target2: round(entry + reward * 0.75, 4),
      finalTarget: round(resistance, 4),
      method: "resistance",
      finalRr: risk > 0 ? reward / risk : 0,
    };
  }
  const support =
    vwap !== null && vwap < entry
      ? vwap
      : entry - (detection.openingHigh - detection.openingLow);
  if (support >= entry) return null;
  const reward = entry - support;
  return {
    target1: round(entry - reward * 0.5, 4),
    target2: round(entry - reward * 0.75, 4),
    finalTarget: round(support, 4),
    method: "resistance",
    finalRr: risk > 0 ? reward / risk : 0,
  };
}

/**
 * Generate target ladders and automatically select the best method.
 * Prefer RR ladder meeting minimum RR; otherwise highest final RR among valid.
 */
export function generateORBTargets(input: {
  detection: ORBDetection;
  entry: number;
  stopLoss: number;
  atr: number | null;
  vwap: number | null;
  candles: readonly ORBCandle[];
  config?: ORBTradeConfig;
}): { targets: ORBTargetLadder | null; warnings: string[] } {
  const config = input.config ?? DEFAULT_ORB_TRADE_CONFIG;
  const warnings: string[] = [];
  const risk = calculateRiskAmount(input.entry, input.stopLoss);
  if (risk < config.priceEpsilon) {
    return { targets: null, warnings: ["Cannot generate targets — risk is zero."] };
  }

  const candidates: ORBTargetLadder[] = [];

  const rrLadder = projectFromRisk(
    input.detection.direction,
    input.entry,
    risk,
    config.targetRMultiples
  );
  candidates.push(rrLadder);

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
    warnings.push("ATR unavailable — ATR target method skipped.");
  }

  const swing = previousSwingTarget(
    input.detection.direction,
    input.entry,
    input.candles,
    risk
  );
  if (swing) candidates.push(swing);
  else warnings.push("Previous swing projection unavailable.");

  const resistance = resistanceProjection(
    input.detection.direction,
    input.entry,
    input.vwap,
    input.detection,
    risk
  );
  if (resistance) candidates.push(resistance);

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

  // Prefer classic RR ladder when it meets minimum; else highest final RR.
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
  direction: ORBDetection["direction"],
  entry: number,
  targets: Pick<ORBTargetLadder, "target1" | "target2" | "finalTarget">,
  config: ORBTradeConfig = DEFAULT_ORB_TRADE_CONFIG
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

export function classifyORBQualityGrade(
  score: number,
  config: ORBTradeConfig = DEFAULT_ORB_TRADE_CONFIG
): ORBQualityGrade {
  if (score >= config.gradeThresholds.exceptionalMin) return "Exceptional";
  if (score >= config.gradeThresholds.highMin) return "High";
  if (score >= config.gradeThresholds.goodMin) return "Good";
  if (score >= config.gradeThresholds.averageMin) return "Average";
  return "Poor";
}

export function calculateORBTradeQuality(input: {
  detection: ORBDetection;
  marketContext: InstitutionalMarketContext;
  riskReward: number;
  config?: ORBTradeConfig;
}): { score: number; grade: ORBQualityGrade } {
  const config = input.config ?? DEFAULT_ORB_TRADE_CONFIG;
  const w = config.qualityWeights;
  const d = input.detection;

  const breakoutQuality = d.detected ? clamp(d.confidence, 0, 100) : 20;
  const volumeQuality = d.volumeConfirmed ? 85 : 35;
  const marketSupport = d.marketConfirmed
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
      breakoutQuality * w.breakoutQuality +
        volumeQuality * w.volumeQuality +
        marketSupport * w.marketSupport +
        breadth * w.breadth +
        sector * w.sectorStrength +
        rrScore * w.riskReward,
      1
    ),
    config.scoreFloor,
    config.scoreCeiling
  );

  return { score, grade: classifyORBQualityGrade(score, config) };
}

export function validateORBTradeSetup(
  setup: Omit<ORBTradeSetup, "qualityScore" | "qualityGrade" | "holdingPeriod" | "positionType" | "warnings"> & {
    warnings?: string[];
  },
  config: ORBTradeConfig = DEFAULT_ORB_TRADE_CONFIG
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

export function createRejectedTradeSetup(
  detection: ORBDetection,
  warnings: string[]
): ORBTradeSetup {
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
    holdingPeriod: DEFAULT_ORB_TRADE_CONFIG.defaultHoldingPeriod,
    positionType: DEFAULT_ORB_TRADE_CONFIG.defaultPositionType,
    warnings,
  };
}
