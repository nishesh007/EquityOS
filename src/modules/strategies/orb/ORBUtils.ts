/**
 * ORB Detection utilities — Sprint 11B.3B.1.
 * Pure functions for opening range, breakout, and confirmation checks.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import type { MarketRegimeLabel } from "@/src/modules/marketRegime";
import {
  DEFAULT_ORB_CONFIG,
  type ORBConfig,
} from "./ORBConstants";
import type {
  ORBBreakoutCandidate,
  ORBCandle,
  ORBDetection,
  ORBDetectionContext,
  ORBDirection,
  OpeningRange,
} from "./ORBTypes";

export function resolveORBConfig(
  partial?: Partial<ORBConfig>
): ORBConfig {
  return {
    ...DEFAULT_ORB_CONFIG,
    ...partial,
    confidenceWeights: {
      ...DEFAULT_ORB_CONFIG.confidenceWeights,
      ...partial?.confidenceWeights,
    },
    compatibleBullRegimes:
      partial?.compatibleBullRegimes ?? DEFAULT_ORB_CONFIG.compatibleBullRegimes,
    compatibleBearRegimes:
      partial?.compatibleBearRegimes ?? DEFAULT_ORB_CONFIG.compatibleBearRegimes,
    blockedRiskModes:
      partial?.blockedRiskModes ?? DEFAULT_ORB_CONFIG.blockedRiskModes,
  };
}

/** Parse "HH:mm" into minutes from midnight. */
export function parseSessionMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((part) => Number(part));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h! * 60 + m!;
}

/** Session clock minutes (IST by default) for a UTC timestamp. */
export function sessionMinutesOf(
  date: Date,
  utcOffsetMinutes: number
): number {
  const shifted = new Date(date.getTime() + utcOffsetMinutes * 60_000);
  return shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
}

export function isWithinSessionWindow(
  date: Date,
  startHHmm: string,
  endHHmm: string,
  utcOffsetMinutes: number
): boolean {
  const minutes = sessionMinutesOf(date, utcOffsetMinutes);
  const start = parseSessionMinutes(startHHmm);
  const end = parseSessionMinutes(endHHmm);
  return minutes >= start && minutes < end;
}

export function isValidMarketHours(
  date: Date,
  config: ORBConfig = DEFAULT_ORB_CONFIG
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

/**
 * Build opening range high/low from 5m candles inside the configured window.
 */
export function calculateOpeningRange(
  candles: readonly ORBCandle[],
  config: ORBConfig = DEFAULT_ORB_CONFIG
): OpeningRange | null {
  const rangeCandles = candles
    .filter((candle) =>
      isWithinSessionWindow(
        candle.timestamp,
        config.rangeStart,
        config.rangeEnd,
        config.sessionUtcOffsetMinutes
      )
    )
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  if (rangeCandles.length < config.minimumRangeCandles) {
    return null;
  }

  const high = Math.max(...rangeCandles.map((c) => c.high));
  const low = Math.min(...rangeCandles.map((c) => c.low));
  if (!Number.isFinite(high) || !Number.isFinite(low) || high <= low) {
    return null;
  }

  return {
    high,
    low,
    start: rangeCandles[0]!.timestamp,
    end: rangeCandles[rangeCandles.length - 1]!.timestamp,
    candles: rangeCandles,
    rangeWidth: round(high - low, 4),
  };
}

function candleRange(candle: ORBCandle): number {
  return Math.max(candle.high - candle.low, 0);
}

function upperWickRatio(candle: ORBCandle): number {
  const range = candleRange(candle);
  if (range <= 0) return 0;
  return (candle.high - Math.max(candle.open, candle.close)) / range;
}

function lowerWickRatio(candle: ORBCandle): number {
  const range = candleRange(candle);
  if (range <= 0) return 0;
  return (Math.min(candle.open, candle.close) - candle.low) / range;
}

/**
 * Detect first valid close beyond opening range after the range window.
 * Pierce-then-close-inside bars are returned as false breakouts.
 */
export function detectBreakout(
  candles: readonly ORBCandle[],
  openingRange: OpeningRange,
  config: ORBConfig = DEFAULT_ORB_CONFIG
): ORBBreakoutCandidate | null {
  const postRange = candles
    .filter(
      (candle) =>
        candle.timestamp.getTime() > openingRange.end.getTime() &&
        isValidMarketHours(candle.timestamp, config)
    )
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  for (const candle of postRange) {
    const piercedHigh = candle.high > openingRange.high;
    const piercedLow = candle.low < openingRange.low;
    const closedAbove = candle.close > openingRange.high;
    const closedBelow = candle.close < openingRange.low;

    if (!piercedHigh && !piercedLow && !closedAbove && !closedBelow) {
      continue;
    }

    // Close back inside after piercing the range → false breakout
    if (
      (piercedHigh || piercedLow) &&
      candle.close <= openingRange.high &&
      candle.close >= openingRange.low
    ) {
      return {
        direction: piercedHigh ? "BUY" : "SELL",
        candle,
        openingHigh: openingRange.high,
        openingLow: openingRange.low,
        falseBreakout: true,
        falseBreakoutReasons: ["Breakout candle closes back inside range."],
      };
    }

    if (!closedAbove && !closedBelow) continue;

    const direction: Exclude<ORBDirection, "NONE"> = closedAbove
      ? "BUY"
      : "SELL";
    const falseBreakoutReasons: string[] = [];

    if (direction === "BUY" && upperWickRatio(candle) > config.maxWickRatio) {
      falseBreakoutReasons.push("Large upper wick on bullish breakout.");
    }
    if (direction === "SELL" && lowerWickRatio(candle) > config.maxWickRatio) {
      falseBreakoutReasons.push("Large lower wick on bearish breakout.");
    }

    return {
      direction,
      candle,
      openingHigh: openingRange.high,
      openingLow: openingRange.low,
      falseBreakout: falseBreakoutReasons.length > 0,
      falseBreakoutReasons,
    };
  }

  return null;
}

export function validateVolume(
  breakout: ORBBreakoutCandidate,
  openingRange: OpeningRange,
  relativeVolume: number | null,
  averageVolume: number | null | undefined,
  config: ORBConfig = DEFAULT_ORB_CONFIG
): { confirmed: boolean; score: number; reasons: string[]; warnings: string[] } {
  const reasons: string[] = [];
  const warnings: string[] = [];
  let score = 50;

  if (!Number.isFinite(breakout.candle.volume) || breakout.candle.volume <= 0) {
    return {
      confirmed: false,
      score: config.scoreFloor,
      reasons: [],
      warnings: ["Missing volume on breakout candle."],
    };
  }

  const rangeAvg =
    averageVolume && averageVolume > 0
      ? averageVolume
      : openingRange.candles.reduce((sum, c) => sum + c.volume, 0) /
        Math.max(openingRange.candles.length, 1);

  const multiple = rangeAvg > 0 ? breakout.candle.volume / rangeAvg : 0;
  if (multiple >= config.minVolumeMultiple) {
    score += 25;
    reasons.push(
      `Breakout volume ${round(multiple, 2)}x opening-range average.`
    );
  } else {
    warnings.push("Low volume relative to opening range.");
    score -= 25;
  }

  if (
    relativeVolume !== null &&
    Number.isFinite(relativeVolume) &&
    relativeVolume >= config.minRelativeVolume
  ) {
    score += 25;
    reasons.push(`Relative volume ${round(relativeVolume, 2)} confirmed.`);
  } else if (relativeVolume === null || !Number.isFinite(relativeVolume)) {
    warnings.push("Relative volume unavailable.");
    score -= 10;
  } else {
    warnings.push("Relative volume below confirmation threshold.");
    score -= 20;
  }

  const confirmed =
    multiple >= config.minVolumeMultiple &&
    relativeVolume !== null &&
    Number.isFinite(relativeVolume) &&
    relativeVolume >= config.minRelativeVolume;

  return {
    confirmed,
    score: clamp(score, config.scoreFloor, config.scoreCeiling),
    reasons,
    warnings,
  };
}

export function validateBreadth(
  direction: Exclude<ORBDirection, "NONE">,
  context: InstitutionalMarketContext,
  config: ORBConfig = DEFAULT_ORB_CONFIG
): { confirmed: boolean; score: number; reasons: string[]; warnings: string[] } {
  const score = context.marketBreadth?.score;
  if (!Number.isFinite(score)) {
    return {
      confirmed: false,
      score: 30,
      reasons: [],
      warnings: ["Breadth data missing."],
    };
  }

  if (direction === "BUY") {
    if (score! >= config.bullishBreadthMin) {
      return {
        confirmed: true,
        score: clamp(score!, 0, 100),
        reasons: [`Breadth supportive at ${round(score!, 0)}.`],
        warnings: [],
      };
    }
    return {
      confirmed: false,
      score: clamp(score!, 0, 100),
      reasons: [],
      warnings: ["Low breadth — bullish ORB rejected."],
    };
  }

  if (score! <= config.bearishBreadthMax) {
    return {
      confirmed: true,
      score: clamp(100 - score!, 0, 100),
      reasons: [`Breadth negative at ${round(score!, 0)}.`],
      warnings: [],
    };
  }
  return {
    confirmed: false,
    score: clamp(score!, 0, 100),
    reasons: [],
    warnings: ["Breadth not weak enough for bearish ORB."],
  };
}

export function validateSector(
  direction: Exclude<ORBDirection, "NONE">,
  context: InstitutionalMarketContext,
  config: ORBConfig = DEFAULT_ORB_CONFIG
): { confirmed: boolean; score: number; reasons: string[]; warnings: string[] } {
  if (context.sectorStrength.length === 0) {
    return {
      confirmed: false,
      score: 30,
      reasons: [],
      warnings: ["Sector strength missing."],
    };
  }
  const avg = averageSectorScore(context);
  if (direction === "BUY") {
    if (avg >= config.bullishSectorMin) {
      return {
        confirmed: true,
        score: avg,
        reasons: [`Sector strength supportive at ${round(avg, 0)}.`],
        warnings: [],
      };
    }
    return {
      confirmed: false,
      score: avg,
      reasons: [],
      warnings: ["Weak sector participation for bullish ORB."],
    };
  }
  if (avg <= config.bearishSectorMax) {
    return {
      confirmed: true,
      score: clamp(100 - avg, 0, 100),
      reasons: [`Sector strength weak at ${round(avg, 0)}.`],
      warnings: [],
    };
  }
  return {
    confirmed: false,
    score: avg,
    reasons: [],
    warnings: ["Sectors not weak enough for bearish ORB."],
  };
}

export function validateLiquidity(
  openingRange: OpeningRange,
  breakout: ORBBreakoutCandidate,
  atr: number | null,
  config: ORBConfig = DEFAULT_ORB_CONFIG
): { confirmed: boolean; score: number; reasons: string[]; warnings: string[] } {
  const reasons: string[] = [];
  const warnings: string[] = [];
  let score = 50;

  if (breakout.candle.volume < config.minBreakoutVolume) {
    return {
      confirmed: false,
      score: 20,
      reasons: [],
      warnings: ["Breakout liquidity unacceptable — volume too low."],
    };
  }

  score += 20;
  reasons.push("Breakout candle volume present.");

  if (atr !== null && Number.isFinite(atr) && atr > 0) {
    const ratio = openingRange.rangeWidth / atr;
    if (ratio >= config.minRangeAtrRatio && ratio <= config.maxRangeAtrRatio) {
      score += 30;
      reasons.push(`Opening range / ATR ratio ${round(ratio, 2)} acceptable.`);
    } else {
      warnings.push("Opening range width vs ATR outside liquidity band.");
      score -= 20;
    }
  } else {
    warnings.push("ATR unavailable for liquidity check.");
    score -= 5;
  }

  const confirmed = warnings.every((w) => !/unacceptable/i.test(w)) &&
    breakout.candle.volume >= config.minBreakoutVolume &&
    (atr === null ||
      !Number.isFinite(atr) ||
      (() => {
        const ratio = openingRange.rangeWidth / (atr as number);
        return (
          ratio >= config.minRangeAtrRatio && ratio <= config.maxRangeAtrRatio
        );
      })());

  // If ATR missing, still confirm on volume alone
  const softConfirmed =
    breakout.candle.volume >= config.minBreakoutVolume &&
    (atr === null ||
      !Number.isFinite(atr) ||
      confirmed);

  return {
    confirmed: softConfirmed,
    score: clamp(score, config.scoreFloor, config.scoreCeiling),
    reasons,
    warnings,
  };
}

export function validateMarket(
  direction: Exclude<ORBDirection, "NONE">,
  regime: MarketRegimeLabel,
  riskMode: InstitutionalMarketContext["riskMode"],
  regimeConfidence: number,
  config: ORBConfig = DEFAULT_ORB_CONFIG
): { confirmed: boolean; score: number; reasons: string[]; warnings: string[] } {
  const reasons: string[] = [];
  const warnings: string[] = [];
  let score = 50;

  if (config.blockedRiskModes.includes(riskMode)) {
    return {
      confirmed: false,
      score: 15,
      reasons: [],
      warnings: [`Risk Mode = ${riskMode}.`],
    };
  }

  const compatible =
    direction === "BUY"
      ? config.compatibleBullRegimes.includes(regime)
      : config.compatibleBearRegimes.includes(regime);

  if (!compatible) {
    return {
      confirmed: false,
      score: 25,
      reasons: [],
      warnings: [`Market regime ${regime} incompatible with ${direction} ORB.`],
    };
  }
  reasons.push(`Market regime ${regime} compatible.`);
  score += 25;

  if (regimeConfidence >= config.minRegimeConfidence) {
    reasons.push(`Regime confidence ${round(regimeConfidence, 0)} adequate.`);
    score += 25;
  } else {
    warnings.push("Low confidence — ORB market confirmation failed.");
    score -= 25;
  }

  return {
    confirmed:
      compatible &&
      !config.blockedRiskModes.includes(riskMode) &&
      regimeConfidence >= config.minRegimeConfidence,
    score: clamp(score, config.scoreFloor, config.scoreCeiling),
    reasons,
    warnings,
  };
}

export function calculateORBConfidence(input: {
  breakoutQuality: number;
  volumeScore: number;
  breadthScore: number;
  sectorScore: number;
  marketScore: number;
  liquidityScore: number;
  config?: ORBConfig;
}): number {
  const config = input.config ?? DEFAULT_ORB_CONFIG;
  const w = config.confidenceWeights;
  const composite =
    input.breakoutQuality * w.breakoutQuality +
    input.volumeScore * w.volume +
    input.breadthScore * w.breadth +
    input.sectorScore * w.sector +
    input.marketScore * w.market +
    input.liquidityScore * w.liquidity;
  return clamp(
    round(composite, 1),
    config.confidenceFloor,
    config.scoreCeiling
  );
}

export function createEmptyORBDetection(
  warnings: string[],
  reasons: string[] = []
): ORBDetection {
  return {
    detected: false,
    direction: "NONE",
    openingHigh: 0,
    openingLow: 0,
    breakoutPrice: 0,
    breakoutTime: new Date(0),
    volumeConfirmed: false,
    breadthConfirmed: false,
    sectorConfirmed: false,
    marketConfirmed: false,
    liquidityConfirmed: false,
    confidence: 0,
    reasons,
    warnings,
  };
}

/**
 * Full ORB detection from a prepared detection context.
 */
export function detectORB(context: ORBDetectionContext): ORBDetection {
  const config = resolveORBConfig(context.config);
  const candles = context.input.orb.candles5m;
  const warnings: string[] = [];
  const reasons: string[] = [];

  const openingRange = calculateOpeningRange(candles, config);
  if (!openingRange) {
    return createEmptyORBDetection(
      ["No opening range — insufficient candles in configured window."],
      []
    );
  }

  reasons.push(
    `Opening range ${round(openingRange.low, 2)}–${round(openingRange.high, 2)}.`
  );

  const breakout = detectBreakout(candles, openingRange, config);
  if (!breakout) {
    return {
      ...createEmptyORBDetection(
        ["No breakout close beyond opening range."],
        reasons
      ),
      openingHigh: openingRange.high,
      openingLow: openingRange.low,
    };
  }

  if (breakout.falseBreakout) {
    return {
      ...createEmptyORBDetection(
        [...breakout.falseBreakoutReasons, "False breakout filter rejected setup."],
        reasons
      ),
      openingHigh: openingRange.high,
      openingLow: openingRange.low,
      breakoutPrice: breakout.candle.close,
      breakoutTime: breakout.candle.timestamp,
      direction: "NONE",
      detected: false,
    };
  }

  const volume = validateVolume(
    breakout,
    openingRange,
    context.input.orb.relativeVolume,
    context.input.orb.averageVolume,
    config
  );
  const breadth = validateBreadth(
    breakout.direction,
    context.marketContext,
    config
  );
  const sector = validateSector(
    breakout.direction,
    context.marketContext,
    config
  );
  const liquidity = validateLiquidity(
    openingRange,
    breakout,
    context.input.orb.atr ?? context.input.atr ?? null,
    config
  );
  const market = validateMarket(
    breakout.direction,
    context.regime.regime,
    context.marketContext.riskMode,
    context.confidence.score,
    config
  );

  warnings.push(
    ...volume.warnings,
    ...breadth.warnings,
    ...sector.warnings,
    ...liquidity.warnings,
    ...market.warnings
  );
  reasons.push(
    ...volume.reasons,
    ...breadth.reasons,
    ...sector.reasons,
    ...liquidity.reasons,
    ...market.reasons
  );

  const breakoutQuality = breakout.falseBreakout ? 20 : 90;
  const confidence = calculateORBConfidence({
    breakoutQuality,
    volumeScore: volume.score,
    breadthScore: breadth.score,
    sectorScore: sector.score,
    marketScore: market.score,
    liquidityScore: liquidity.score,
    config,
  });

  const allConfirmed =
    volume.confirmed &&
    breadth.confirmed &&
    sector.confirmed &&
    liquidity.confirmed &&
    market.confirmed;

  if (!allConfirmed) {
    warnings.push("ORB setup incomplete — one or more confirmations failed.");
  }

  if (confidence < config.minRegimeConfidence) {
    warnings.push("ORB detection confidence below institutional threshold.");
  }

  const detected =
    allConfirmed && confidence >= config.minRegimeConfidence;

  if (detected) {
    reasons.push(`ORB ${breakout.direction} detected.`);
  }

  return {
    detected,
    direction: detected ? breakout.direction : "NONE",
    openingHigh: openingRange.high,
    openingLow: openingRange.low,
    breakoutPrice: breakout.candle.close,
    breakoutTime: breakout.candle.timestamp,
    volumeConfirmed: volume.confirmed,
    breadthConfirmed: breadth.confirmed,
    sectorConfirmed: sector.confirmed,
    marketConfirmed: market.confirmed,
    liquidityConfirmed: liquidity.confirmed,
    confidence: detected ? confidence : clamp(confidence, 0, config.minRegimeConfidence - 1),
    reasons,
    warnings: dedupe(warnings),
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
