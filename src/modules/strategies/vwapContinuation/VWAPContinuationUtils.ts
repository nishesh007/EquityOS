/**
 * VWAP Continuation utilities — Sprint 11B.3C.1.
 * Pure detection helpers. No trade level calculation.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import type { MarketRegimeLabel } from "@/src/modules/marketRegime";
import {
  DEFAULT_VWAP_CONTINUATION_CONFIG,
  resolveVWAPContinuationConfig,
  type VWAPContinuationConfig,
} from "./VWAPContinuationConstants";
import type {
  VWAPCandle,
  VWAPContinuationDetection,
  VWAPContinuationDetectionContext,
  VWAPContinuationDirection,
} from "./VWAPContinuationTypes";

export { resolveVWAPContinuationConfig };

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
  config: VWAPContinuationConfig = DEFAULT_VWAP_CONTINUATION_CONFIG
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
 * VWAP slope as fractional change over lookback (positive = rising).
 */
export function calculateVWAPSlope(
  series: readonly number[],
  lookback: number = DEFAULT_VWAP_CONTINUATION_CONFIG.slopeLookbackBars
): number {
  if (series.length < 2) return 0;
  const window = series.slice(-Math.max(lookback, 2));
  const first = window[0]!;
  const last = window[window.length - 1]!;
  if (!Number.isFinite(first) || !Number.isFinite(last) || first === 0) return 0;
  return round((last - first) / Math.abs(first), 6);
}

/**
 * Signed distance of price from VWAP as fraction of VWAP.
 */
export function measureVWAPDistance(price: number, vwap: number): number {
  if (!Number.isFinite(price) || !Number.isFinite(vwap) || vwap === 0) return 0;
  return round((price - vwap) / vwap, 6);
}

export function validateTrend(
  candles: readonly VWAPCandle[],
  direction: Exclude<VWAPContinuationDirection, "NONE">
): { valid: boolean; score: number; reasons: string[]; warnings: string[] } {
  if (candles.length < 4) {
    return {
      valid: false,
      score: 25,
      reasons: [],
      warnings: ["Insufficient candles for trend structure."],
    };
  }
  const recent = candles.slice(-6);
  const highs = recent.map((c) => c.high);
  const lows = recent.map((c) => c.low);

  if (direction === "BUY") {
    const higherHighs = highs[highs.length - 1]! >= highs[0]!;
    const higherLows = lows[lows.length - 1]! >= lows[0]!;
    if (higherHighs && higherLows) {
      return {
        valid: true,
        score: 85,
        reasons: ["Higher highs and higher lows confirm bullish structure."],
        warnings: [],
      };
    }
    return {
      valid: false,
      score: 35,
      reasons: [],
      warnings: ["Bullish HH/HL structure not confirmed."],
    };
  }

  const lowerHighs = highs[highs.length - 1]! <= highs[0]!;
  const lowerLows = lows[lows.length - 1]! <= lows[0]!;
  if (lowerHighs && lowerLows) {
    return {
      valid: true,
      score: 85,
      reasons: ["Lower highs and lower lows confirm bearish structure."],
      warnings: [],
    };
  }
  return {
    valid: false,
    score: 35,
    reasons: [],
    warnings: ["Bearish LH/LL structure not confirmed."],
  };
}

/**
 * Detect pullback toward VWAP in the continuation direction.
 */
export function detectPullback(
  candles: readonly VWAPCandle[],
  vwap: number,
  direction: Exclude<VWAPContinuationDirection, "NONE">,
  config: VWAPContinuationConfig = DEFAULT_VWAP_CONTINUATION_CONFIG
): { detected: boolean; score: number; reasons: string[]; warnings: string[] } {
  if (candles.length < 3 || !Number.isFinite(vwap) || vwap <= 0) {
    return {
      detected: false,
      score: 20,
      reasons: [],
      warnings: ["Cannot evaluate pullback."],
    };
  }

  const lookback = candles.slice(-5);
  let touched = false;
  for (const bar of lookback) {
    if (direction === "BUY") {
      // Price above VWAP overall; low tags near VWAP
      const proximity = Math.abs(bar.low - vwap) / vwap;
      if (bar.close >= vwap && proximity <= config.pullbackProximityPct) {
        touched = true;
        break;
      }
    } else {
      const proximity = Math.abs(bar.high - vwap) / vwap;
      if (bar.close <= vwap && proximity <= config.pullbackProximityPct) {
        touched = true;
        break;
      }
    }
  }

  if (touched) {
    return {
      detected: true,
      score: 80,
      reasons: [
        direction === "BUY"
          ? "Price pulled back toward VWAP from above."
          : "Price pulled back toward VWAP from below.",
      ],
      warnings: [],
    };
  }
  return {
    detected: false,
    score: 30,
    reasons: [],
    warnings: ["No Pullback toward VWAP detected."],
  };
}

/**
 * Confirm bounce / rejection away from VWAP after pullback.
 */
export function detectBounce(
  candles: readonly VWAPCandle[],
  vwap: number,
  direction: Exclude<VWAPContinuationDirection, "NONE">,
  config: VWAPContinuationConfig = DEFAULT_VWAP_CONTINUATION_CONFIG
): { confirmed: boolean; score: number; reasons: string[]; warnings: string[] } {
  if (candles.length < 2 || !Number.isFinite(vwap) || vwap <= 0) {
    return {
      confirmed: false,
      score: 20,
      reasons: [],
      warnings: ["Cannot evaluate bounce."],
    };
  }

  const last = candles[candles.length - 1]!;
  const distance = Math.abs(last.close - vwap) / vwap;

  if (direction === "BUY") {
    const bounced =
      last.close > vwap &&
      last.close > last.open &&
      distance >= config.bounceMinDistancePct;
    if (bounced) {
      return {
        confirmed: true,
        score: 85,
        reasons: ["Bounce confirmed — close reclaimed above VWAP with strength."],
        warnings: [],
      };
    }
    return {
      confirmed: false,
      score: 30,
      reasons: [],
      warnings: ["No Bounce confirmation above VWAP."],
    };
  }

  const rejected =
    last.close < vwap &&
    last.close < last.open &&
    distance >= config.bounceMinDistancePct;
  if (rejected) {
    return {
      confirmed: true,
      score: 85,
      reasons: ["Rejection confirmed — close held below VWAP with strength."],
      warnings: [],
    };
  }
  return {
    confirmed: false,
    score: 30,
    reasons: [],
    warnings: ["No Bounce / rejection confirmation below VWAP."],
  };
}

export function validateVolume(
  candles: readonly VWAPCandle[],
  relativeVolume: number | null,
  averageVolume: number | null | undefined,
  config: VWAPContinuationConfig = DEFAULT_VWAP_CONTINUATION_CONFIG
): { confirmed: boolean; score: number; reasons: string[]; warnings: string[] } {
  const reasons: string[] = [];
  const warnings: string[] = [];
  let score = 50;
  const last = candles[candles.length - 1];

  if (!last || !Number.isFinite(last.volume) || last.volume <= 0) {
    return {
      confirmed: false,
      score: config.scoreFloor,
      reasons: [],
      warnings: ["Missing volume on confirmation candle."],
    };
  }

  const avg =
    averageVolume && averageVolume > 0
      ? averageVolume
      : candles.slice(-6).reduce((sum, c) => sum + c.volume, 0) /
        Math.max(Math.min(candles.length, 6), 1);

  const multiple = avg > 0 ? last.volume / avg : 0;
  if (multiple >= config.minVolumeMultiple) {
    score += 25;
    reasons.push(`Volume expansion ${round(multiple, 2)}x recent average.`);
  } else {
    warnings.push("Weak Volume relative to recent average.");
    score -= 20;
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
    warnings.push("Weak Volume — relative volume below threshold.");
    score -= 25;
  }

  const confirmed =
    multiple >= config.minVolumeMultiple &&
    relativeVolume !== null &&
    Number.isFinite(relativeVolume) &&
    relativeVolume >= config.minRelativeVolume &&
    last.volume >= config.minBreakoutVolume;

  return {
    confirmed,
    score: clamp(score, config.scoreFloor, config.scoreCeiling),
    reasons,
    warnings,
  };
}

export function validateBreadth(
  direction: Exclude<VWAPContinuationDirection, "NONE">,
  context: InstitutionalMarketContext,
  config: VWAPContinuationConfig = DEFAULT_VWAP_CONTINUATION_CONFIG
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
      warnings: ["Weak Breadth — bullish VWAP continuation rejected."],
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
    warnings: ["Weak Breadth for bearish VWAP continuation."],
  };
}

export function validateSector(
  direction: Exclude<VWAPContinuationDirection, "NONE">,
  context: InstitutionalMarketContext,
  config: VWAPContinuationConfig = DEFAULT_VWAP_CONTINUATION_CONFIG
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
        reasons: [`Sector supportive at ${round(avg, 0)}.`],
        warnings: [],
      };
    }
    return {
      confirmed: false,
      score: avg,
      reasons: [],
      warnings: ["Weak Sector participation for bullish continuation."],
    };
  }
  if (avg <= config.bearishSectorMax) {
    return {
      confirmed: true,
      score: clamp(100 - avg, 0, 100),
      reasons: [`Sector weak at ${round(avg, 0)}.`],
      warnings: [],
    };
  }
  return {
    confirmed: false,
    score: avg,
    reasons: [],
    warnings: ["Weak Sector for bearish continuation."],
  };
}

export function validateMarket(
  direction: Exclude<VWAPContinuationDirection, "NONE">,
  regime: MarketRegimeLabel,
  riskMode: InstitutionalMarketContext["riskMode"],
  regimeConfidence: number,
  volatilityScore: number,
  config: VWAPContinuationConfig = DEFAULT_VWAP_CONTINUATION_CONFIG
): { confirmed: boolean; score: number; reasons: string[]; warnings: string[] } {
  const reasons: string[] = [];
  const warnings: string[] = [];
  let score = 50;

  if (config.blockedRiskModes.includes(riskMode)) {
    return {
      confirmed: false,
      score: 15,
      reasons: [],
      warnings: [`Risk Off — Risk Mode = ${riskMode}.`],
    };
  }

  if (config.blockedRegimes.includes(regime)) {
    return {
      confirmed: false,
      score: 20,
      reasons: [],
      warnings: [`Market regime ${regime} incompatible with VWAP continuation.`],
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
      warnings: [`Regime ${regime} not compatible with ${direction} continuation.`],
    };
  }
  reasons.push(`Market regime ${regime} compatible.`);
  score += 20;

  if (regimeConfidence >= config.minRegimeConfidence) {
    reasons.push(`Regime confidence ${round(regimeConfidence, 0)} adequate.`);
    score += 20;
  } else {
    warnings.push("High uncertainty — regime confidence below threshold.");
    score -= 25;
  }

  if (volatilityScore > config.maxVolatilityScore) {
    warnings.push("Poor liquidity / elevated volatility vs continuation profile.");
    score -= 15;
  } else {
    score += 10;
  }

  return {
    confirmed:
      compatible &&
      !config.blockedRiskModes.includes(riskMode) &&
      !config.blockedRegimes.includes(regime) &&
      regimeConfidence >= config.minRegimeConfidence &&
      volatilityScore <= config.maxVolatilityScore,
    score: clamp(score, config.scoreFloor, config.scoreCeiling),
    reasons,
    warnings,
  };
}

function isOscillatingAroundVWAP(
  candles: readonly VWAPCandle[],
  vwap: number,
  config: VWAPContinuationConfig
): boolean {
  const recent = candles.slice(-8);
  if (recent.length < 4 || vwap <= 0) return false;
  let flips = 0;
  for (let i = 1; i < recent.length; i += 1) {
    const prevAbove = recent[i - 1]!.close >= vwap;
    const currAbove = recent[i]!.close >= vwap;
    if (prevAbove !== currAbove) flips += 1;
  }
  return flips / Math.max(recent.length - 1, 1) > config.maxOscillationRatio;
}

export function calculateConfidence(input: {
  trendScore: number;
  slopeScore: number;
  pullbackScore: number;
  bounceScore: number;
  volumeScore: number;
  breadthScore: number;
  sectorScore: number;
  marketScore: number;
  config?: VWAPContinuationConfig;
}): number {
  const config = input.config ?? DEFAULT_VWAP_CONTINUATION_CONFIG;
  const w = config.confidenceWeights;
  const composite =
    input.trendScore * w.trend +
    input.slopeScore * w.vwapSlope +
    input.pullbackScore * w.pullback +
    input.bounceScore * w.bounce +
    input.volumeScore * w.volume +
    input.breadthScore * w.breadth +
    input.sectorScore * w.sector +
    input.marketScore * w.market;
  return clamp(
    round(composite, 1),
    config.confidenceFloor,
    config.scoreCeiling
  );
}

export function createEmptyVWAPContinuationDetection(
  warnings: string[],
  reasons: string[] = []
): VWAPContinuationDetection {
  return {
    detected: false,
    direction: "NONE",
    vwap: 0,
    distanceFromVWAP: 0,
    pullbackDetected: false,
    bounceConfirmed: false,
    volumeConfirmed: false,
    breadthConfirmed: false,
    sectorConfirmed: false,
    marketConfirmed: false,
    confidence: 0,
    reasons,
    warnings,
  };
}

function resolveVwapSeries(
  candles: readonly VWAPCandle[],
  vwap: number,
  series?: readonly number[]
): number[] {
  if (series && series.length >= 2) return [...series];
  const fromCandles = candles
    .map((c) => c.vwap)
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (fromCandles.length >= 2) return fromCandles;
  // Fallback flat series around current VWAP (slope will be ~0 → reject flat)
  return [vwap, vwap];
}

/**
 * Full VWAP continuation detection.
 */
export function detectVWAPContinuation(
  context: VWAPContinuationDetectionContext
): VWAPContinuationDetection {
  const config = resolveVWAPContinuationConfig(context.config);
  const data = context.input.vwapContinuation;
  const candles = data.candles5m;
  const vwap = data.vwap;
  const warnings: string[] = [];
  const reasons: string[] = [];

  if (!Number.isFinite(vwap) || vwap <= 0) {
    return createEmptyVWAPContinuationDetection(["Missing VWAP."]);
  }

  const last = candles[candles.length - 1];
  if (!last) {
    return createEmptyVWAPContinuationDetection(["Missing candles."], []);
  }

  const price = last.close;
  const distanceFromVWAP = measureVWAPDistance(price, vwap);
  const series = resolveVwapSeries(candles, vwap, data.vwapSeries);
  const slope = calculateVWAPSlope(series, config.slopeLookbackBars);

  if (Math.abs(slope) < config.minVwapSlope) {
    return {
      ...createEmptyVWAPContinuationDetection(
        ["Flat VWAP — continuation rejected."],
        reasons
      ),
      vwap,
      distanceFromVWAP,
    };
  }

  if (isOscillatingAroundVWAP(candles, vwap, config)) {
    return {
      ...createEmptyVWAPContinuationDetection(
        ["Price oscillating around VWAP — continuation rejected."],
        reasons
      ),
      vwap,
      distanceFromVWAP,
    };
  }

  let direction: Exclude<VWAPContinuationDirection, "NONE"> | null = null;
  if (price > vwap && slope > 0) direction = "BUY";
  else if (price < vwap && slope < 0) direction = "SELL";

  if (!direction) {
    return {
      ...createEmptyVWAPContinuationDetection(
        ["Price / VWAP slope alignment missing for continuation."],
        reasons
      ),
      vwap,
      distanceFromVWAP,
    };
  }

  reasons.push(
    direction === "BUY"
      ? "Price above VWAP with upward sloping VWAP."
      : "Price below VWAP with downward sloping VWAP."
  );

  const trend = validateTrend(candles, direction);
  const pullback = detectPullback(candles, vwap, direction, config);
  const bounce = detectBounce(candles, vwap, direction, config);
  const volume = validateVolume(
    candles,
    data.relativeVolume,
    data.averageVolume,
    config
  );
  const breadth = validateBreadth(direction, context.marketContext, config);
  const sector = validateSector(direction, context.marketContext, config);
  const market = validateMarket(
    direction,
    context.regime.regime,
    context.marketContext.riskMode,
    context.confidence.score,
    context.marketContext.volatility.score,
    config
  );

  warnings.push(
    ...trend.warnings,
    ...pullback.warnings,
    ...bounce.warnings,
    ...volume.warnings,
    ...breadth.warnings,
    ...sector.warnings,
    ...market.warnings
  );
  reasons.push(
    ...trend.reasons,
    ...pullback.reasons,
    ...bounce.reasons,
    ...volume.reasons,
    ...breadth.reasons,
    ...sector.reasons,
    ...market.reasons
  );

  const slopeScore = clamp(
    Math.min(Math.abs(slope) / config.minVwapSlope, 2) * 50,
    0,
    100
  );

  const confidence = calculateConfidence({
    trendScore: trend.score,
    slopeScore,
    pullbackScore: pullback.score,
    bounceScore: bounce.score,
    volumeScore: volume.score,
    breadthScore: breadth.score,
    sectorScore: sector.score,
    marketScore: market.score,
    config,
  });

  const allConfirmed =
    trend.valid &&
    pullback.detected &&
    bounce.confirmed &&
    volume.confirmed &&
    breadth.confirmed &&
    sector.confirmed &&
    market.confirmed;

  if (!allConfirmed) {
    warnings.push("VWAP continuation incomplete — confirmations failed.");
  }

  if (confidence < config.minRegimeConfidence) {
    warnings.push("Low Confidence — below institutional detection threshold.");
  }

  const detected =
    allConfirmed && confidence >= config.minRegimeConfidence;

  if (detected) {
    reasons.push(`VWAP ${direction} continuation detected.`);
  }

  return {
    detected,
    direction: detected ? direction : "NONE",
    vwap: round(vwap, 4),
    distanceFromVWAP,
    pullbackDetected: pullback.detected,
    bounceConfirmed: bounce.confirmed,
    volumeConfirmed: volume.confirmed,
    breadthConfirmed: breadth.confirmed,
    sectorConfirmed: sector.confirmed,
    marketConfirmed: market.confirmed,
    confidence: detected
      ? confidence
      : clamp(confidence, 0, config.minRegimeConfidence - 1),
    reasons: dedupe(reasons),
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
