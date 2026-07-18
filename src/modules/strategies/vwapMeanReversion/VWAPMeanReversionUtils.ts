/**
 * VWAP Mean Reversion utilities — Sprint 11B.3D.1.
 * Pure detection helpers. No trade level calculation.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import type { MarketRegimeLabel } from "@/src/modules/marketRegime";
import {
  DEFAULT_VWAP_MEAN_REVERSION_CONFIG,
  resolveVWAPMeanReversionConfig,
  type VWAPMeanReversionConfig,
} from "./VWAPMeanReversionConstants";
import type {
  VWAPMeanReversionCandle,
  VWAPMeanReversionDetection,
  VWAPMeanReversionDetectionContext,
  VWAPMeanReversionDirection,
  VWAPStandardDeviationBands,
} from "./VWAPMeanReversionTypes";

export { resolveVWAPMeanReversionConfig };

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
  config: VWAPMeanReversionConfig = DEFAULT_VWAP_MEAN_REVERSION_CONFIG
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
 * Signed deviation of price from VWAP in σ units (negative = below VWAP).
 */
export function calculateDeviation(
  price: number,
  vwap: number,
  sigma: number
): number {
  if (
    !Number.isFinite(price) ||
    !Number.isFinite(vwap) ||
    !Number.isFinite(sigma) ||
    sigma <= 0
  ) {
    return 0;
  }
  return round((price - vwap) / sigma, 4);
}

/**
 * Build VWAP ± kσ bands. Uses supplied σ or derives from closes vs VWAP.
 */
export function calculateVWAPBands(
  candles: readonly VWAPMeanReversionCandle[],
  vwap: number,
  sigmaOverride?: number | null,
  bandSigma: number = DEFAULT_VWAP_MEAN_REVERSION_CONFIG.bandSigma
): VWAPStandardDeviationBands | null {
  if (!Number.isFinite(vwap) || vwap <= 0) return null;

  let sigma = sigmaOverride ?? null;
  if (sigma === null || !Number.isFinite(sigma) || sigma <= 0) {
    if (candles.length < 3) return null;
    const variance =
      candles.reduce((sum, c) => {
        const d = c.close - vwap;
        return sum + d * d;
      }, 0) / candles.length;
    sigma = Math.sqrt(variance);
  }
  if (!Number.isFinite(sigma) || sigma <= 0) return null;

  const k = bandSigma;
  return {
    upper: round(vwap + k * sigma, 4),
    lower: round(vwap - k * sigma, 4),
    sigma: round(sigma, 6),
  };
}

/**
 * Detect momentum exhaustion after an extended move.
 */
export function detectExhaustion(
  candles: readonly VWAPMeanReversionCandle[],
  direction: Exclude<VWAPMeanReversionDirection, "NONE">,
  config: VWAPMeanReversionConfig = DEFAULT_VWAP_MEAN_REVERSION_CONFIG
): { exhausted: boolean; score: number; reasons: string[]; warnings: string[] } {
  const lookback = candles.slice(-Math.max(config.exhaustionLookback, 2));
  if (lookback.length < 2) {
    return {
      exhausted: false,
      score: 25,
      reasons: [],
      warnings: ["Insufficient bars for exhaustion."],
    };
  }

  const ranges = lookback.map((c) => Math.max(c.high - c.low, 0));
  const early = ranges.slice(0, Math.ceil(ranges.length / 2));
  const late = ranges.slice(Math.floor(ranges.length / 2));
  const earlyAvg =
    early.reduce((s, r) => s + r, 0) / Math.max(early.length, 1);
  const lateAvg = late.reduce((s, r) => s + r, 0) / Math.max(late.length, 1);

  const bodies = lookback.map((c) => Math.abs(c.close - c.open));
  const earlyBody =
    bodies.slice(0, Math.ceil(bodies.length / 2)).reduce((s, b) => s + b, 0) /
    Math.max(Math.ceil(bodies.length / 2), 1);
  const lateBody =
    bodies.slice(Math.floor(bodies.length / 2)).reduce((s, b) => s + b, 0) /
    Math.max(Math.ceil(bodies.length / 2), 1);

  const rangeCompressing = lateAvg <= earlyAvg * 0.85;
  const bodyShrinking = lateBody <= earlyBody * 0.9;

  if (direction === "BUY") {
    // Selling momentum weakens: later lows stop accelerating vs earlier lows
    const lows = lookback.map((c) => c.low);
    const half = Math.floor(lows.length / 2);
    const earlyLowAvg =
      lows.slice(0, Math.max(half, 1)).reduce((s, v) => s + v, 0) /
      Math.max(half, 1);
    const lateLowAvg =
      lows.slice(half).reduce((s, v) => s + v, 0) /
      Math.max(lows.length - half, 1);
    const lowsStabilizing = lateLowAvg >= earlyLowAvg * 0.997;
    const slowing = lowsStabilizing || rangeCompressing;
    if (slowing && (rangeCompressing || bodyShrinking || lowsStabilizing)) {
      return {
        exhausted: true,
        score: 80,
        reasons: ["Selling momentum weakens."],
        warnings: [],
      };
    }
    return {
      exhausted: false,
      score: 35,
      reasons: [],
      warnings: ["Selling momentum still strong."],
    };
  }

  const highs = lookback.map((c) => c.high);
  const half = Math.floor(highs.length / 2);
  const earlyHighAvg =
    highs.slice(0, Math.max(half, 1)).reduce((s, v) => s + v, 0) /
    Math.max(half, 1);
  const lateHighAvg =
    highs.slice(half).reduce((s, v) => s + v, 0) /
    Math.max(highs.length - half, 1);
  const highsStabilizing = lateHighAvg <= earlyHighAvg * 1.003;
  const slowing = highsStabilizing || rangeCompressing;
  if (slowing && (rangeCompressing || bodyShrinking || highsStabilizing)) {
    return {
      exhausted: true,
      score: 80,
      reasons: ["Buying momentum weakens."],
      warnings: [],
    };
  }
  return {
    exhausted: false,
    score: 35,
    reasons: [],
    warnings: ["Buying momentum still strong."],
  };
}

/**
 * Detect reversal candle: long wick or directional reversal close.
 */
export function detectReversal(
  candles: readonly VWAPMeanReversionCandle[],
  direction: Exclude<VWAPMeanReversionDirection, "NONE">,
  config: VWAPMeanReversionConfig = DEFAULT_VWAP_MEAN_REVERSION_CONFIG
): {
  confirmed: boolean;
  score: number;
  reasons: string[];
  warnings: string[];
} {
  const last = candles[candles.length - 1];
  if (!last) {
    return {
      confirmed: false,
      score: 20,
      reasons: [],
      warnings: ["No Reversal confirmation candle."],
    };
  }

  const range = Math.max(last.high - last.low, 0);
  if (range <= 0) {
    return {
      confirmed: false,
      score: 20,
      reasons: [],
      warnings: ["No Reversal confirmation — zero range candle."],
    };
  }

  const body = Math.abs(last.close - last.open);
  const lowerWick = Math.min(last.open, last.close) - last.low;
  const upperWick = last.high - Math.max(last.open, last.close);

  if (direction === "BUY") {
    const longLowerWick = lowerWick / range >= config.minWickBodyRatio;
    const bullishReversal =
      last.close > last.open && last.close > (last.high + last.low) / 2;
    if (longLowerWick || bullishReversal) {
      return {
        confirmed: true,
        score: 85,
        reasons: longLowerWick
          ? ["Long lower wick confirms bullish reversal."]
          : ["Bullish reversal candle confirmed."],
        warnings: [],
      };
    }
    return {
      confirmed: false,
      score: 30,
      reasons: [],
      warnings: ["No Reversal confirmation."],
    };
  }

  const longUpperWick = upperWick / range >= config.minWickBodyRatio;
  const bearishReversal =
    last.close < last.open && last.close < (last.high + last.low) / 2;
  if (longUpperWick || bearishReversal) {
    return {
      confirmed: true,
      score: 85,
      reasons: longUpperWick
        ? ["Long upper wick confirms bearish reversal."]
        : ["Bearish reversal candle confirmed."],
      warnings: [],
    };
  }
  return {
    confirmed: false,
    score: 30,
    reasons: [],
    warnings: ["No Reversal confirmation."],
  };
}

/**
 * Compute RSI from closes when not supplied.
 */
export function computeRSI(
  closes: readonly number[],
  lookback: number = DEFAULT_VWAP_MEAN_REVERSION_CONFIG.rsiLookback
): number | null {
  if (closes.length < lookback + 1) return null;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - lookback; i < closes.length; i += 1) {
    const delta = closes[i]! - closes[i - 1]!;
    if (delta >= 0) gains += delta;
    else losses -= delta;
  }
  const avgGain = gains / lookback;
  const avgLoss = losses / lookback;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return round(100 - 100 / (1 + rs), 2);
}

export function validateRSI(
  rsi: number | null,
  direction: Exclude<VWAPMeanReversionDirection, "NONE">,
  config: VWAPMeanReversionConfig = DEFAULT_VWAP_MEAN_REVERSION_CONFIG
): { valid: boolean; score: number; reasons: string[]; warnings: string[] } {
  if (rsi === null || !Number.isFinite(rsi)) {
    return {
      valid: false,
      score: 30,
      reasons: [],
      warnings: ["RSI unavailable."],
    };
  }
  if (direction === "BUY") {
    if (rsi <= config.rsiOversold) {
      return {
        valid: true,
        score: 85,
        reasons: [`RSI oversold at ${round(rsi, 1)}.`],
        warnings: [],
      };
    }
    return {
      valid: false,
      score: clamp(rsi, 0, 100),
      reasons: [],
      warnings: [`RSI ${round(rsi, 1)} not oversold.`],
    };
  }
  if (rsi >= config.rsiOverbought) {
    return {
      valid: true,
      score: 85,
      reasons: [`RSI overbought at ${round(rsi, 1)}.`],
      warnings: [],
    };
  }
  return {
    valid: false,
    score: clamp(100 - rsi, 0, 100),
    reasons: [],
    warnings: [`RSI ${round(rsi, 1)} not overbought.`],
  };
}

export function validateVolume(
  candles: readonly VWAPMeanReversionCandle[],
  relativeVolume: number | null,
  averageVolume: number | null | undefined,
  config: VWAPMeanReversionConfig = DEFAULT_VWAP_MEAN_REVERSION_CONFIG
): { stable: boolean; score: number; reasons: string[]; warnings: string[] } {
  const last = candles[candles.length - 1];
  if (!last || !Number.isFinite(last.volume) || last.volume <= 0) {
    return {
      stable: false,
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
  const reasons: string[] = [];
  const warnings: string[] = [];
  let score = 50;

  if (multiple <= config.maxVolumeStabilityMultiple) {
    score += 25;
    reasons.push("Volume stabilizes after extension.");
  } else {
    warnings.push("Volume still expanding — continuation risk.");
    score -= 20;
  }

  if (
    relativeVolume !== null &&
    Number.isFinite(relativeVolume) &&
    relativeVolume > config.maxRelativeVolumeContinuation
  ) {
    warnings.push("Relative volume suggests strong trend continuation.");
    score -= 25;
  } else if (
    relativeVolume !== null &&
    Number.isFinite(relativeVolume) &&
    relativeVolume >= config.minRelativeVolumeLiquidity
  ) {
    score += 15;
    reasons.push(`Relative volume ${round(relativeVolume, 2)} liquid.`);
  } else if (relativeVolume === null || !Number.isFinite(relativeVolume)) {
    warnings.push("Relative volume unavailable.");
    score -= 10;
  } else {
    warnings.push("Low liquidity — relative volume below threshold.");
    score -= 25;
  }

  const stable =
    multiple <= config.maxVolumeStabilityMultiple &&
    (relativeVolume === null ||
      !Number.isFinite(relativeVolume) ||
      (relativeVolume <= config.maxRelativeVolumeContinuation &&
        relativeVolume >= config.minRelativeVolumeLiquidity));

  return {
    stable,
    score: clamp(score, config.scoreFloor, config.scoreCeiling),
    reasons,
    warnings,
  };
}

export function validateBreadth(
  direction: Exclude<VWAPMeanReversionDirection, "NONE">,
  context: InstitutionalMarketContext,
  config: VWAPMeanReversionConfig = DEFAULT_VWAP_MEAN_REVERSION_CONFIG
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
    // Breadth not collapsing
    if (score! >= config.bullishBreadthMin) {
      return {
        confirmed: true,
        score: clamp(score!, 0, 100),
        reasons: [`Breadth not collapsing at ${round(score!, 0)}.`],
        warnings: [],
      };
    }
    return {
      confirmed: false,
      score: clamp(score!, 0, 100),
      reasons: [],
      warnings: ["Weak Breadth — collapsing participation."],
    };
  }
  if (score! <= config.bearishBreadthMax) {
    return {
      confirmed: true,
      score: clamp(100 - score!, 0, 100),
      reasons: [`Breadth not euphoric at ${round(score!, 0)}.`],
      warnings: [],
    };
  }
  return {
    confirmed: false,
    score: clamp(score!, 0, 100),
    reasons: [],
    warnings: ["Weak Breadth for bearish mean reversion — too strong upside."],
  };
}

export function validateSector(
  direction: Exclude<VWAPMeanReversionDirection, "NONE">,
  context: InstitutionalMarketContext,
  config: VWAPMeanReversionConfig = DEFAULT_VWAP_MEAN_REVERSION_CONFIG
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
        reasons: [`Sector not extremely weak at ${round(avg, 0)}.`],
        warnings: [],
      };
    }
    return {
      confirmed: false,
      score: avg,
      reasons: [],
      warnings: ["Weak Sector — extremely weak for bullish mean reversion."],
    };
  }
  if (avg <= config.bearishSectorMax) {
    return {
      confirmed: true,
      score: clamp(100 - avg, 0, 100),
      reasons: [`Sector not extremely strong at ${round(avg, 0)}.`],
      warnings: [],
    };
  }
  return {
    confirmed: false,
    score: avg,
    reasons: [],
    warnings: ["Weak Sector posture for bearish mean reversion."],
  };
}

export function validateMarket(
  direction: Exclude<VWAPMeanReversionDirection, "NONE">,
  regime: MarketRegimeLabel,
  riskMode: InstitutionalMarketContext["riskMode"],
  regimeConfidence: number,
  volatilityScore: number,
  newsDriven: boolean,
  config: VWAPMeanReversionConfig = DEFAULT_VWAP_MEAN_REVERSION_CONFIG
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

  if (newsDriven || regime === "Event Driven") {
    return {
      confirmed: false,
      score: 15,
      reasons: [],
      warnings: ["News-driven move — mean reversion rejected."],
    };
  }

  if (config.blockedRegimes.includes(regime)) {
    return {
      confirmed: false,
      score: 20,
      reasons: [],
      warnings: [`Market regime ${regime} incompatible with mean reversion.`],
    };
  }

  if (
    direction === "BUY" &&
    config.bullBlockedRegimes.includes(regime)
  ) {
    return {
      confirmed: false,
      score: 20,
      reasons: [],
      warnings: ["Market in Strong Bear regime — bullish mean reversion rejected."],
    };
  }
  if (
    direction === "SELL" &&
    config.bearBlockedRegimes.includes(regime)
  ) {
    return {
      confirmed: false,
      score: 20,
      reasons: [],
      warnings: ["Market in Strong Bull regime — bearish mean reversion rejected."],
    };
  }

  if (!config.compatibleRegimes.includes(regime)) {
    return {
      confirmed: false,
      score: 25,
      reasons: [],
      warnings: [`Regime ${regime} not compatible with mean reversion.`],
    };
  }
  reasons.push(`Market regime ${regime} compatible.`);
  score += 20;

  if (regimeConfidence >= config.minRegimeConfidence) {
    reasons.push(`Regime confidence ${round(regimeConfidence, 0)} adequate.`);
    score += 15;
  } else {
    warnings.push("High uncertainty — regime confidence below threshold.");
    score -= 20;
  }

  if (volatilityScore > config.maxVolatilityScore) {
    warnings.push("Very high volatility — mean reversion rejected.");
    score -= 25;
  } else {
    score += 10;
  }

  return {
    confirmed:
      config.compatibleRegimes.includes(regime) &&
      !config.blockedRegimes.includes(regime) &&
      !config.blockedRiskModes.includes(riskMode) &&
      !newsDriven &&
      regimeConfidence >= config.minRegimeConfidence &&
      volatilityScore <= config.maxVolatilityScore &&
      !(direction === "BUY" && config.bullBlockedRegimes.includes(regime)) &&
      !(direction === "SELL" && config.bearBlockedRegimes.includes(regime)),
    score: clamp(score, config.scoreFloor, config.scoreCeiling),
    reasons,
    warnings,
  };
}

function isStrongTrendContinuation(
  candles: readonly VWAPMeanReversionCandle[],
  direction: Exclude<VWAPMeanReversionDirection, "NONE">,
  config: VWAPMeanReversionConfig
): boolean {
  const window = candles.slice(-Math.max(config.trendSlopeLookback, 3));
  if (window.length < 3) return false;
  const first = window[0]!.close;
  const last = window[window.length - 1]!.close;
  if (!Number.isFinite(first) || first === 0) return false;
  const slope = (last - first) / Math.abs(first);
  if (direction === "BUY") {
    // Still strongly selling into lows
    return slope <= -config.strongTrendSlope;
  }
  return slope >= config.strongTrendSlope;
}

function isCircuitMove(
  candle: VWAPMeanReversionCandle,
  config: VWAPMeanReversionConfig
): boolean {
  const mid = (candle.high + candle.low) / 2 || candle.close;
  if (!Number.isFinite(mid) || mid <= 0) return false;
  return (candle.high - candle.low) / mid >= config.circuitMovePct;
}

export function calculateConfidence(input: {
  deviationScore: number;
  rsiScore: number;
  reversalScore: number;
  volumeScore: number;
  exhaustionScore: number;
  breadthScore: number;
  sectorScore: number;
  marketScore: number;
  config?: VWAPMeanReversionConfig;
}): number {
  const config = input.config ?? DEFAULT_VWAP_MEAN_REVERSION_CONFIG;
  const w = config.confidenceWeights;
  const composite =
    input.deviationScore * w.deviation +
    input.rsiScore * w.rsi +
    input.reversalScore * w.reversal +
    input.volumeScore * w.volume +
    input.exhaustionScore * w.exhaustion +
    input.breadthScore * w.breadth +
    input.sectorScore * w.sector +
    input.marketScore * w.market;
  return clamp(
    round(composite, 1),
    config.confidenceFloor,
    config.scoreCeiling
  );
}

export function createEmptyVWAPMeanReversionDetection(
  warnings: string[],
  reasons: string[] = []
): VWAPMeanReversionDetection {
  return {
    detected: false,
    direction: "NONE",
    vwap: 0,
    deviation: 0,
    deviationBand: 0,
    rsi: 0,
    reversalConfirmed: false,
    volumeStable: false,
    breadthConfirmed: false,
    sectorConfirmed: false,
    marketConfirmed: false,
    confidence: 0,
    reasons,
    warnings,
  };
}

/**
 * Full VWAP mean reversion detection.
 */
export function detectVWAPMeanReversion(
  context: VWAPMeanReversionDetectionContext
): VWAPMeanReversionDetection {
  const config = resolveVWAPMeanReversionConfig(context.config);
  const data = context.input.vwapMeanReversion;
  const candles = data.candles5m;
  const vwap = data.vwap;
  const warnings: string[] = [];
  const reasons: string[] = [];

  if (!Number.isFinite(vwap) || vwap <= 0) {
    return createEmptyVWAPMeanReversionDetection(["Missing VWAP."]);
  }

  const bands =
    data.bands &&
    Number.isFinite(data.bands.sigma) &&
    data.bands.sigma > 0
      ? data.bands
      : calculateVWAPBands(
          candles,
          vwap,
          data.vwapStdDev,
          config.bandSigma
        );

  if (!bands) {
    return createEmptyVWAPMeanReversionDetection(["Missing Bands."]);
  }

  const last = candles[candles.length - 1];
  if (!last) {
    return createEmptyVWAPMeanReversionDetection(["Missing candles."]);
  }

  if (isCircuitMove(last, config)) {
    return {
      ...createEmptyVWAPMeanReversionDetection(
        ["Circuit movement — mean reversion rejected."],
        reasons
      ),
      vwap,
      deviationBand: bands.sigma,
    };
  }

  const price = last.close;
  const deviation = calculateDeviation(price, vwap, bands.sigma);
  const absDev = Math.abs(deviation);

  if (absDev < config.hugVwapMaxSigma) {
    return {
      ...createEmptyVWAPMeanReversionDetection(
        ["Price hugging VWAP — mean reversion rejected."],
        reasons
      ),
      vwap,
      deviation,
      deviationBand: bands.sigma,
    };
  }

  if (absDev < config.minDeviationSigma || absDev > config.maxDeviationSigma) {
    return {
      ...createEmptyVWAPMeanReversionDetection(
        [
          absDev > config.maxDeviationSigma
            ? "Deviation beyond 2.5σ window — mean reversion rejected."
            : "Deviation below 1.5σ — extension insufficient.",
        ],
        reasons
      ),
      vwap,
      deviation,
      deviationBand: bands.sigma,
    };
  }

  let direction: Exclude<VWAPMeanReversionDirection, "NONE"> | null = null;
  if (deviation <= -config.minDeviationSigma) direction = "BUY";
  else if (deviation >= config.minDeviationSigma) direction = "SELL";

  if (!direction) {
    return {
      ...createEmptyVWAPMeanReversionDetection(
        ["No directional mean-reversion extension."],
        reasons
      ),
      vwap,
      deviation,
      deviationBand: bands.sigma,
    };
  }

  reasons.push(
    direction === "BUY"
      ? `Price ${round(absDev, 2)}σ below VWAP.`
      : `Price ${round(absDev, 2)}σ above VWAP.`
  );

  if (isStrongTrendContinuation(candles, direction, config)) {
    return {
      ...createEmptyVWAPMeanReversionDetection(
        ["Strong trend continuation — mean reversion rejected."],
        reasons
      ),
      vwap,
      deviation,
      deviationBand: bands.sigma,
    };
  }

  const rsiValue =
    data.rsi !== undefined && data.rsi !== null && Number.isFinite(data.rsi)
      ? data.rsi
      : computeRSI(
          candles.map((c) => c.close),
          config.rsiLookback
        );

  const exhaustion = detectExhaustion(candles, direction, config);
  const reversal = detectReversal(candles, direction, config);
  const rsiCheck = validateRSI(rsiValue, direction, config);
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
    data.newsDriven === true,
    config
  );

  warnings.push(
    ...exhaustion.warnings,
    ...reversal.warnings,
    ...rsiCheck.warnings,
    ...volume.warnings,
    ...breadth.warnings,
    ...sector.warnings,
    ...market.warnings
  );
  reasons.push(
    ...exhaustion.reasons,
    ...reversal.reasons,
    ...rsiCheck.reasons,
    ...volume.reasons,
    ...breadth.reasons,
    ...sector.reasons,
    ...market.reasons
  );

  const deviationScore = clamp(
    ((absDev - config.minDeviationSigma) /
      Math.max(config.maxDeviationSigma - config.minDeviationSigma, 0.1)) *
      100,
    40,
    100
  );

  const confidence = calculateConfidence({
    deviationScore,
    rsiScore: rsiCheck.score,
    reversalScore: reversal.score,
    volumeScore: volume.score,
    exhaustionScore: exhaustion.score,
    breadthScore: breadth.score,
    sectorScore: sector.score,
    marketScore: market.score,
    config,
  });

  const allConfirmed =
    exhaustion.exhausted &&
    reversal.confirmed &&
    rsiCheck.valid &&
    volume.stable &&
    breadth.confirmed &&
    sector.confirmed &&
    market.confirmed;

  if (!allConfirmed) {
    warnings.push("VWAP mean reversion incomplete — confirmations failed.");
  }

  if (confidence < config.minRegimeConfidence) {
    warnings.push("Low Confidence — below institutional detection threshold.");
  }

  const detected =
    allConfirmed && confidence >= config.minRegimeConfidence;

  if (detected) {
    reasons.push(`VWAP ${direction} mean reversion detected.`);
  }

  return {
    detected,
    direction: detected ? direction : "NONE",
    vwap: round(vwap, 4),
    deviation,
    deviationBand: bands.sigma,
    rsi: rsiValue ?? 0,
    reversalConfirmed: reversal.confirmed,
    volumeStable: volume.stable,
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
