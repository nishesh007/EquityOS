/**
 * Stage Analysis utilities — Sprint 11B.3M.
 * Pure Stan Weinstein stage detection helpers.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { isStrategyEligible } from "../StrategyUtils";
import {
  DEFAULT_STAGE_ANALYSIS_CONFIG,
  STAGE_ANALYSIS_STRATEGY_ID,
  resolveStageAnalysisConfig,
  type StageAnalysisConfig,
} from "./StageAnalysisConstants";
import type {
  StageAnalysisCandle,
  StageAnalysisDetection,
  StageAnalysisDetectionContext,
  StageAnalysisDirection,
  StageTransition,
  WeinsteinStage,
} from "./StageAnalysisTypes";

export { resolveStageAnalysisConfig };

export function parseSessionMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((part) => Number(part));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h! * 60 + m!;
}

export function sessionMinutesOf(
  date: Date,
  utcOffsetMinutes: number
): number {
  const shifted = new Date(date.getTime() + utcOffsetMinutes * 60_000);
  return shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
}

export function isValidMarketHours(
  date: Date,
  config: StageAnalysisConfig = DEFAULT_STAGE_ANALYSIS_CONFIG
): boolean {
  const minutes = sessionMinutesOf(date, config.sessionUtcOffsetMinutes);
  const open = parseSessionMinutes(config.marketOpen);
  const close = parseSessionMinutes(config.marketClose);
  return minutes >= open && minutes < close;
}

export function averageSectorScore(
  context: InstitutionalMarketContext
): number {
  if (context.sectorStrength.length === 0) return 50;
  const sum = context.sectorStrength.reduce((total, s) => total + s.score, 0);
  return clamp(round(sum / context.sectorStrength.length, 1), 0, 100);
}

export function createEmptyStageAnalysisDetection(
  warnings: string[] = [],
  reasons: string[] = []
): StageAnalysisDetection {
  return {
    detected: false,
    direction: "NONE",
    stage: 0,
    previousStage: 0,
    transition: "none",
    transitionConfidence: 0,
    stageQuality: 0,
    trendStructure: 0,
    relativeStrengthScore: 0,
    volumeQuality: 0,
    earlyStage2: false,
    lateStage2: false,
    ma30Week: 0,
    maRising: false,
    maFalling: false,
    maFlat: false,
    priceAboveMa: false,
    priceBelowMa: false,
    higherHighs: false,
    higherLows: false,
    lowerHighs: false,
    lowerLows: false,
    institutionalAccumulation: false,
    distribution: false,
    ema20: 0,
    ema50: 0,
    vwap: 0,
    atr: 0,
    breadthConfirmed: false,
    sectorConfirmed: false,
    marketConfirmed: false,
    rsConfirmed: false,
    volumeConfirmed: false,
    confidence: 0,
    reasons,
    warnings,
  };
}

function averageVolume(candles: readonly StageAnalysisCandle[]): number {
  if (candles.length === 0) return 0;
  return candles.reduce((s, c) => s + c.volume, 0) / candles.length;
}

export function resolveMa30Week(
  ma: number | null,
  weekly: readonly StageAnalysisCandle[]
): number | null {
  if (ma !== null && Number.isFinite(ma) && ma > 0) return ma;
  if (weekly.length < 30) return null;
  const window = weekly.slice(-30);
  const sum = window.reduce((s, c) => s + c.close, 0);
  return sum / window.length;
}

export function resolveMaHistory(
  history: readonly number[] | undefined,
  current: number,
  weekly: readonly StageAnalysisCandle[],
  lookback: number
): number[] {
  if (history && history.length >= lookback) {
    return [...history.slice(-lookback)];
  }
  const out: number[] = [];
  for (let i = lookback; i >= 1; i--) {
    if (weekly.length < 30 + i) continue;
    const window = weekly.slice(-(30 + i), weekly.length - i);
    if (window.length < 30) continue;
    out.push(window.reduce((s, c) => s + c.close, 0) / window.length);
  }
  if (out.length === 0) out.push(current);
  out.push(current);
  return out;
}

export function classifyMaSlope(
  history: readonly number[],
  price: number,
  config: StageAnalysisConfig
): { rising: boolean; falling: boolean; flat: boolean; slopePct: number } {
  if (history.length < 2 || price <= 0) {
    return { rising: false, falling: false, flat: true, slopePct: 0 };
  }
  const first = history[0]!;
  const last = history[history.length - 1]!;
  const slopePct = (last - first) / price;
  const rising = slopePct >= config.trendingMaSlopePct;
  const falling = slopePct <= -config.trendingMaSlopePct;
  const flat = Math.abs(slopePct) <= config.flatMaSlopePct;
  return { rising, falling, flat: flat && !rising && !falling, slopePct };
}

export function analyzeStructure(
  weekly: readonly StageAnalysisCandle[],
  lookback: number
): {
  higherHighs: boolean;
  higherLows: boolean;
  lowerHighs: boolean;
  lowerLows: boolean;
  score: number;
} {
  const window = weekly.slice(-Math.max(lookback, 4));
  if (window.length < 4) {
    return {
      higherHighs: false,
      higherLows: false,
      lowerHighs: false,
      lowerLows: false,
      score: 40,
    };
  }
  const mid = Math.floor(window.length / 2);
  const early = window.slice(0, mid);
  const late = window.slice(mid);
  const earlyHigh = Math.max(...early.map((c) => c.high));
  const lateHigh = Math.max(...late.map((c) => c.high));
  const earlyLow = Math.min(...early.map((c) => c.low));
  const lateLow = Math.min(...late.map((c) => c.low));

  const higherHighs = lateHigh > earlyHigh;
  const higherLows = lateLow > earlyLow;
  const lowerHighs = lateHigh < earlyHigh;
  const lowerLows = lateLow < earlyLow;

  let score = 50;
  if (higherHighs && higherLows) score = 88;
  else if (lowerHighs && lowerLows) score = 25;
  else if (higherHighs || higherLows) score = 65;
  else if (lowerHighs || lowerLows) score = 40;

  return { higherHighs, higherLows, lowerHighs, lowerLows, score };
}

export function classifyWeinsteinStage(input: {
  close: number;
  ma: number;
  maRising: boolean;
  maFalling: boolean;
  maFlat: boolean;
  higherHighs: boolean;
  higherLows: boolean;
  lowerHighs: boolean;
  lowerLows: boolean;
  relativeStrength: number | null;
  relativeVolume: number | null;
  volatilityScore: number;
  distribution: boolean;
  accumulation: boolean;
  weekly: readonly StageAnalysisCandle[];
  config: StageAnalysisConfig;
}): { stage: WeinsteinStage; quality: number } {
  const {
    close,
    ma,
    maRising,
    maFalling,
    maFlat,
    higherHighs,
    higherLows,
    lowerHighs,
    lowerLows,
    relativeStrength,
    relativeVolume,
    volatilityScore,
    distribution,
    accumulation,
    weekly,
    config,
  } = input;

  const above = close >= ma * (1 + config.priceAboveMaPct);
  const below = close <= ma * (1 - config.priceBelowMaPct);
  const rs = relativeStrength ?? 50;
  const rvol = relativeVolume ?? 1;

  const baseWindow = weekly.slice(-12);
  const baseHigh = Math.max(...baseWindow.map((c) => c.high));
  const baseLow = Math.min(...baseWindow.map((c) => c.low));
  const mid = (baseHigh + baseLow) / 2 || close;
  const sideways =
    mid > 0 && (baseHigh - baseLow) / mid <= config.sidewaysRangePct;

  // Stage 4 — declining
  if (
    maFalling &&
    below &&
    (lowerHighs || lowerLows) &&
    (rs < config.minRelativeStrength || distribution)
  ) {
    return {
      stage: 4,
      quality: clamp(
        70 + (distribution ? 15 : 0) + (rvol >= 1.2 ? 10 : 0),
        0,
        100
      ),
    };
  }

  // Stage 2 — advancing
  if (
    maRising &&
    above &&
    (higherHighs || higherLows) &&
    rs >= config.minRelativeStrength
  ) {
    const late =
      ma > 0 && (close - ma) / ma >= config.lateStage2ExtensionPct;
    return {
      stage: 2,
      quality: clamp(
        60 +
          (higherHighs && higherLows ? 20 : 8) +
          (rs >= config.strongRelativeStrength ? 12 : 0) +
          (accumulation ? 10 : 0) -
          (late ? 15 : 0),
        0,
        100
      ),
    };
  }

  // Stage 3 — distribution / topping
  if (
    (maFlat || (!maRising && above)) &&
    (distribution || lowerHighs || rs < config.minRelativeStrength) &&
    !below
  ) {
    return {
      stage: 3,
      quality: clamp(
        55 + (distribution ? 20 : 5) + (maFlat ? 10 : 0),
        0,
        100
      ),
    };
  }

  // Stage 1 — accumulation / base
  if (
    (maFlat || sideways) &&
    volatilityScore <= config.stage1MaxVolatilityScore + 15 &&
    !maFalling
  ) {
    return {
      stage: 1,
      quality: clamp(
        55 +
          (sideways ? 15 : 0) +
          (accumulation ? 20 : 0) +
          (rvol >= 1 ? 5 : 0),
        0,
        100
      ),
    };
  }

  // Fallbacks by price vs MA
  if (below && maFalling) return { stage: 4, quality: 50 };
  if (above && maRising) return { stage: 2, quality: 50 };
  if (above) return { stage: 3, quality: 45 };
  return { stage: 1, quality: 45 };
}

export function detectStageTransition(
  previous: WeinsteinStage | 0,
  current: WeinsteinStage,
  hints: {
    maRising: boolean;
    maFalling: boolean;
    accumulation: boolean;
    distribution: boolean;
    earlyStage2: boolean;
  }
): { transition: StageTransition; confidence: number } {
  if (previous === 0 || previous === current) {
    return { transition: "none", confidence: 0 };
  }

  let transition: StageTransition = "none";
  if (previous === 1 && current === 2) transition = "1_to_2";
  else if (previous === 2 && current === 3) transition = "2_to_3";
  else if (previous === 3 && current === 4) transition = "3_to_4";
  else if (previous === 4 && current === 1) transition = "4_to_1";
  else return { transition: "none", confidence: 30 };

  let confidence = 55;
  if (transition === "1_to_2" && hints.maRising && hints.earlyStage2) {
    confidence = 85;
  } else if (transition === "1_to_2" && hints.accumulation) {
    confidence = 75;
  } else if (transition === "2_to_3" && hints.distribution) {
    confidence = 80;
  } else if (transition === "3_to_4" && hints.maFalling) {
    confidence = 85;
  } else if (transition === "4_to_1" && hints.accumulation) {
    confidence = 70;
  }

  return { transition, confidence: clamp(confidence, 0, 100) };
}

export function validateSector(
  context: InstitutionalMarketContext,
  config: StageAnalysisConfig = DEFAULT_STAGE_ANALYSIS_CONFIG
): boolean {
  return averageSectorScore(context) >= config.bullishSectorMin;
}

export function validateBreadth(
  context: InstitutionalMarketContext,
  config: StageAnalysisConfig = DEFAULT_STAGE_ANALYSIS_CONFIG
): boolean {
  return context.marketBreadth.score >= config.bullishBreadthMin;
}

export function calculateConfidence(input: {
  stageQuality: number;
  trendStructure: number;
  relativeStrengthScore: number;
  volumeQuality: number;
  sectorScore: number;
  marketScore: number;
  vwapScore: number;
  config: StageAnalysisConfig;
}): number {
  const w = input.config.confidenceWeights;
  const total =
    w.stageQuality +
    w.trendStructure +
    w.relativeStrength +
    w.volumeQuality +
    w.sector +
    w.market +
    w.vwap;
  const composite =
    (input.stageQuality * w.stageQuality +
      input.trendStructure * w.trendStructure +
      input.relativeStrengthScore * w.relativeStrength +
      input.volumeQuality * w.volumeQuality +
      input.sectorScore * w.sector +
      input.marketScore * w.market +
      input.vwapScore * w.vwap) /
    Math.max(total, 0.0001);
  return clamp(
    round(composite, 1),
    input.config.scoreFloor,
    input.config.scoreCeiling
  );
}

export function detectStageAnalysis(
  context: StageAnalysisDetectionContext
): StageAnalysisDetection {
  const config = resolveStageAnalysisConfig(context.config);
  const warnings: string[] = [];
  const reasons: string[] = [];
  const data = context.input.stageAnalysis;
  const weekly = data.candlesWeekly;
  const daily = data.candlesDaily;

  if (weekly.length < config.minimumWeeklyCandles) {
    return createEmptyStageAnalysisDetection(
      ["Insufficient weekly OHLC for Stage Analysis."],
      ["Enough Candles missing."]
    );
  }
  if (daily.length < config.minimumDailyCandles) {
    warnings.push("Daily sample short — stage confidence may be reduced.");
  }

  const eligible = isStrategyEligible(
    STAGE_ANALYSIS_STRATEGY_ID,
    context.eligibleStrategies ?? []
  );
  if (!eligible) {
    return createEmptyStageAnalysisDetection(
      ["Eligible Strategy gate failed for Stage Analysis."],
      ["Eligible Strategy gate failed for Stage Analysis."]
    );
  }

  const lastWeekly = weekly[weekly.length - 1]!;
  const lastDaily = daily[daily.length - 1] ?? lastWeekly;
  const close = lastDaily.close;
  const ma = resolveMa30Week(data.ma30Week, weekly);
  if (ma === null || ma <= 0) {
    return createEmptyStageAnalysisDetection(
      ["30-week moving average unavailable."],
      ["30W MA missing."]
    );
  }

  const maHistory = resolveMaHistory(
    data.ma30WeekHistory,
    ma,
    weekly,
    config.maSlopeLookback
  );
  const slope = classifyMaSlope(maHistory, close, config);
  const structure = analyzeStructure(weekly, config.structureLookback);

  const earlyVol = averageVolume(weekly.slice(-16, -8));
  const lateVol = averageVolume(weekly.slice(-8));
  const avgVol =
    data.averageVolume20Week &&
    Number.isFinite(data.averageVolume20Week) &&
    data.averageVolume20Week > 0
      ? data.averageVolume20Week
      : averageVolume(weekly.slice(-20));

  const institutionalAccumulation =
    lateVol > earlyVol * 1.05 &&
    close >= ma &&
    (data.relativeVolume === null ||
      data.relativeVolume >= config.minRelativeVolume);

  const distribution =
    lateVol > earlyVol * 1.1 &&
    lastWeekly.close < lastWeekly.open &&
    (close < ma || structure.lowerHighs);

  const classified = classifyWeinsteinStage({
    close,
    ma,
    maRising: slope.rising,
    maFalling: slope.falling,
    maFlat: slope.flat,
    higherHighs: structure.higherHighs,
    higherLows: structure.higherLows,
    lowerHighs: structure.lowerHighs,
    lowerLows: structure.lowerLows,
    relativeStrength: data.relativeStrength,
    relativeVolume: data.relativeVolume,
    volatilityScore: context.marketContext.volatility.score,
    distribution,
    accumulation: institutionalAccumulation,
    weekly,
    config,
  });

  const stage = classified.stage;
  const previousStage: WeinsteinStage | 0 =
    data.previousStage ??
    (stage === 2 ? 1 : stage === 3 ? 2 : stage === 4 ? 3 : stage === 1 ? 4 : 0);

  const priceAboveMa = close >= ma * (1 + config.priceAboveMaPct);
  const priceBelowMa = close <= ma * (1 - config.priceBelowMaPct);
  const extensionPct = ma > 0 ? (close - ma) / ma : 0;
  const lateStage2 =
    stage === 2 && extensionPct >= config.lateStage2ExtensionPct;
  const earlyStage2 = stage === 2 && !lateStage2 && extensionPct < 0.12;

  const transitionResult = detectStageTransition(previousStage, stage, {
    maRising: slope.rising,
    maFalling: slope.falling,
    accumulation: institutionalAccumulation,
    distribution,
    earlyStage2,
  });

  const rs = data.relativeStrength ?? 50;
  const rsConfirmed = rs >= config.minRelativeStrength;
  const volumeConfirmed =
    data.relativeVolume === null ||
    !Number.isFinite(data.relativeVolume) ||
    data.relativeVolume >= config.minRelativeVolume ||
    (avgVol > 0 && lastWeekly.volume >= avgVol * 1.05);

  const volumeQuality = clamp(
    round(
      (volumeConfirmed ? 70 : 35) +
        (institutionalAccumulation ? 20 : 0) -
        (distribution && stage === 2 ? 25 : 0),
      1
    ),
    0,
    100
  );

  const relativeStrengthScore = clamp(rs, 0, 100);
  const sectorConfirmed = validateSector(context.marketContext, config);
  const breadthConfirmed = validateBreadth(context.marketContext, config);
  const riskOff = config.blockedRiskModes.includes(
    context.marketContext.riskMode
  );

  let direction: StageAnalysisDirection = "NONE";
  const buyOk =
    stage === 2 &&
    earlyStage2 &&
    slope.rising &&
    priceAboveMa &&
    rsConfirmed &&
    Number.isFinite(data.vwap) &&
    close >= data.vwap &&
    breadthConfirmed &&
    sectorConfirmed &&
    volumeConfirmed &&
    institutionalAccumulation &&
    !riskOff &&
    !config.blockedRegimesBuy.includes(context.regime.regime) &&
    context.confidence.score >= config.minRegimeConfidence &&
    context.marketContext.volatility.score <= config.maxVolatilityScore;

  const isSellSetup =
    stage === 4 ||
    transitionResult.transition === "3_to_4" ||
    (stage === 3 && distribution);

  if (buyOk) {
    direction = "BUY";
    reasons.push("Stock has transitioned from Stage 1 into Stage 2.");
    reasons.push("30-week moving average has turned upward.");
    reasons.push("Institutional accumulation detected.");
    reasons.push("Relative Strength confirms market leadership.");
    reasons.push("Breakout supported by increasing volume.");
  } else if (isSellSetup) {
    direction = "SELL";
    if (stage === 4) reasons.push("Confirmed Stage 4 decline.");
    if (transitionResult.transition === "3_to_4") {
      reasons.push("Stage 3 → Stage 4 transition confirmed.");
    }
    if (distribution) reasons.push("Distribution pressure detected.");
    if (stage === 3) reasons.push("Late Stage 3 / failed Stage 2 structure.");
  }

  if (direction === "NONE") {
    if (lateStage2) {
      return createEmptyStageAnalysisDetection(
        ["Late Stage 2 — entry rejected."],
        ["Late Stage 2 — trend too extended."]
      );
    }
    if (stage === 2 && !rsConfirmed) {
      return createEmptyStageAnalysisDetection(
        ["Weak relative strength."],
        ["Weak RS — leadership missing."]
      );
    }
    if (stage === 2 && !volumeConfirmed) {
      return createEmptyStageAnalysisDetection(
        ["Weak volume on Stage 2."],
        ["Weak volume — institutional participation missing."]
      );
    }
    if (stage === 2 && !sectorConfirmed) {
      return createEmptyStageAnalysisDetection(
        ["Weak sector for Stage 2 buy."],
        ["Weak sector — leadership missing."]
      );
    }
    if (stage === 2 && !breadthConfirmed) {
      return createEmptyStageAnalysisDetection(
        ["Weak breadth for Stage 2 buy."],
        ["Weak breadth — market participation missing."]
      );
    }
    if (stage === 2 && riskOff) {
      return createEmptyStageAnalysisDetection(
        ["Risk Off blocks Stage 2 buys."],
        ["Risk Off — Stage Analysis buys blocked."]
      );
    }
    return createEmptyStageAnalysisDetection(
      [
        `Stage ${stage} classified — no actionable BUY/SELL setup.`,
        ...warnings,
      ],
      [`Stage ${stage} — no trade signal.`]
    );
  }

  const marketConfirmed =
    direction === "BUY"
      ? config.compatibleRegimes.includes(context.regime.regime) &&
        !riskOff
      : true;

  if (direction === "BUY" && !marketConfirmed) {
    return createEmptyStageAnalysisDetection(
      ["Market regime incompatible with Stage 2 buy."],
      ["Market regime incompatible with Stage Analysis buy."]
    );
  }

  let vwapScore = 50;
  if (Number.isFinite(data.vwap) && data.vwap > 0) {
    if (direction === "BUY" && close >= data.vwap) vwapScore = 85;
    else if (direction === "SELL" && close <= data.vwap) vwapScore = 85;
    else vwapScore = 35;
  }

  const confidence = Math.max(
    config.confidenceFloor,
    calculateConfidence({
      stageQuality: classified.quality,
      trendStructure: structure.score,
      relativeStrengthScore,
      volumeQuality,
      sectorScore: averageSectorScore(context.marketContext),
      marketScore: clamp(context.marketContext.confidence, 0, 100),
      vwapScore,
      config,
    })
  );

  if (transitionResult.transition !== "none") {
    reasons.push(
      `Stage transition ${transitionResult.transition} (confidence ${transitionResult.confidence}).`
    );
  }

  return {
    detected: true,
    direction,
    stage,
    previousStage,
    transition: transitionResult.transition,
    transitionConfidence: transitionResult.confidence,
    stageQuality: classified.quality,
    trendStructure: structure.score,
    relativeStrengthScore,
    volumeQuality,
    earlyStage2,
    lateStage2,
    ma30Week: round(ma, 4),
    maRising: slope.rising,
    maFalling: slope.falling,
    maFlat: slope.flat,
    priceAboveMa,
    priceBelowMa,
    higherHighs: structure.higherHighs,
    higherLows: structure.higherLows,
    lowerHighs: structure.lowerHighs,
    lowerLows: structure.lowerLows,
    institutionalAccumulation,
    distribution,
    ema20: data.ema20 ?? 0,
    ema50: data.ema50 ?? 0,
    vwap: data.vwap,
    atr: data.atr ?? 0,
    breadthConfirmed,
    sectorConfirmed,
    marketConfirmed,
    rsConfirmed,
    volumeConfirmed,
    confidence,
    reasons: dedupe(reasons),
    warnings: dedupe(warnings),
  };
}

/** Pure stage classifier for tests (no trade gates). */
export function detectStageOnly(
  context: StageAnalysisDetectionContext
): Pick<
  StageAnalysisDetection,
  | "stage"
  | "previousStage"
  | "transition"
  | "transitionConfidence"
  | "maRising"
  | "maFalling"
  | "maFlat"
  | "stageQuality"
  | "reasons"
> {
  const config = resolveStageAnalysisConfig(context.config);
  const data = context.input.stageAnalysis;
  const weekly = data.candlesWeekly;
  const ma = resolveMa30Week(data.ma30Week, weekly);
  if (ma === null) {
    return {
      stage: 0,
      previousStage: 0,
      transition: "none",
      transitionConfidence: 0,
      maRising: false,
      maFalling: false,
      maFlat: false,
      stageQuality: 0,
      reasons: ["30W MA missing."],
    };
  }
  const close = (data.candlesDaily[data.candlesDaily.length - 1] ?? weekly[weekly.length - 1]!).close;
  const maHistory = resolveMaHistory(
    data.ma30WeekHistory,
    ma,
    weekly,
    config.maSlopeLookback
  );
  const slope = classifyMaSlope(maHistory, close, config);
  const structure = analyzeStructure(weekly, config.structureLookback);
  const earlyVol = averageVolume(weekly.slice(-16, -8));
  const lateVol = averageVolume(weekly.slice(-8));
  const institutionalAccumulation =
    lateVol > earlyVol * 1.05 && close >= ma;
  const distribution =
    lateVol > earlyVol * 1.1 &&
    weekly[weekly.length - 1]!.close < weekly[weekly.length - 1]!.open;

  const classified = classifyWeinsteinStage({
    close,
    ma,
    maRising: slope.rising,
    maFalling: slope.falling,
    maFlat: slope.flat,
    higherHighs: structure.higherHighs,
    higherLows: structure.higherLows,
    lowerHighs: structure.lowerHighs,
    lowerLows: structure.lowerLows,
    relativeStrength: data.relativeStrength,
    relativeVolume: data.relativeVolume,
    volatilityScore: context.marketContext.volatility.score,
    distribution,
    accumulation: institutionalAccumulation,
    weekly,
    config,
  });
  const previousStage = data.previousStage ?? 0;
  const transition = detectStageTransition(previousStage, classified.stage, {
    maRising: slope.rising,
    maFalling: slope.falling,
    accumulation: institutionalAccumulation,
    distribution,
    earlyStage2: classified.stage === 2,
  });
  return {
    stage: classified.stage,
    previousStage,
    transition: transition.transition,
    transitionConfidence: transition.confidence,
    maRising: slope.rising,
    maFalling: slope.falling,
    maFlat: slope.flat,
    stageQuality: classified.quality,
    reasons: [`Classified Stage ${classified.stage}.`],
  };
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = value.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}
