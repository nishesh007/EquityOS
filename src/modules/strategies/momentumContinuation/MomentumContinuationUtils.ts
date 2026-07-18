/**
 * Momentum Continuation utilities — Sprint 11B.3F.
 * Pure detection helpers for trend / pullback / resumption.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import type { MarketRegimeLabel } from "@/src/modules/marketRegime";
import {
  DEFAULT_MOMENTUM_CONTINUATION_CONFIG,
  resolveMomentumContinuationConfig,
  type MomentumContinuationConfig,
} from "./MomentumContinuationConstants";
import type {
  MomentumContinuationCandle,
  MomentumContinuationDetection,
  MomentumContinuationDetectionContext,
  MomentumContinuationDirection,
} from "./MomentumContinuationTypes";

export { resolveMomentumContinuationConfig };

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
  config: MomentumContinuationConfig = DEFAULT_MOMENTUM_CONTINUATION_CONFIG
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

export function detectTrendStructure(
  candles: readonly MomentumContinuationCandle[],
  lookback: number
): {
  bullish: boolean;
  bearish: boolean;
  score: number;
  reasons: string[];
  warnings: string[];
} {
  const window = candles.slice(-Math.max(lookback, 4));
  if (window.length < 4) {
    return {
      bullish: false,
      bearish: false,
      score: 25,
      reasons: [],
      warnings: ["Insufficient bars for trend structure."],
    };
  }

  const half = Math.floor(window.length / 2);
  const early = window.slice(0, half);
  const late = window.slice(half);
  const earlyHigh = Math.max(...early.map((c) => c.high));
  const earlyLow = Math.min(...early.map((c) => c.low));
  const lateHigh = Math.max(...late.map((c) => c.high));
  const lateLow = Math.min(...late.map((c) => c.low));

  const higherHighs = lateHigh > earlyHigh;
  const higherLows = lateLow > earlyLow;
  const lowerHighs = lateHigh < earlyHigh;
  const lowerLows = lateLow < earlyLow;

  if (higherHighs && higherLows) {
    return {
      bullish: true,
      bearish: false,
      score: 85,
      reasons: ["Primary trend remains intact (higher highs / higher lows)."],
      warnings: [],
    };
  }
  if (lowerHighs && lowerLows) {
    return {
      bullish: false,
      bearish: true,
      score: 85,
      reasons: ["Primary trend remains intact (lower highs / lower lows)."],
      warnings: [],
    };
  }
  return {
    bullish: false,
    bearish: false,
    score: 30,
    reasons: [],
    warnings: ["Weak Trend — structure not clearly directional."],
  };
}

export function validateEmaAlignment(
  direction: Exclude<MomentumContinuationDirection, "NONE">,
  price: number,
  ema20: number,
  ema50: number,
  ema20Series: readonly number[] | null | undefined,
  config: MomentumContinuationConfig
): { aligned: boolean; score: number; reasons: string[]; warnings: string[] } {
  const reasons: string[] = [];
  const warnings: string[] = [];
  if (
    !Number.isFinite(price) ||
    !Number.isFinite(ema20) ||
    !Number.isFinite(ema50) ||
    ema20 <= 0 ||
    ema50 <= 0
  ) {
    return {
      aligned: false,
      score: 20,
      reasons: [],
      warnings: ["EMA data missing."],
    };
  }

  const separation = Math.abs(ema20 - ema50) / price;
  if (separation < config.minEmaSeparationPct) {
    return {
      aligned: false,
      score: 25,
      reasons: [],
      warnings: ["Flat EMA — insufficient EMA20/EMA50 separation."],
    };
  }

  if (ema20Series && ema20Series.length >= config.emaSlopeLookback) {
    const series = ema20Series.slice(-config.emaSlopeLookback);
    const first = series[0]!;
    const last = series[series.length - 1]!;
    const slope = (last - first) / Math.abs(first);
    if (Math.abs(slope) < config.flatEmaSlopePct) {
      return {
        aligned: false,
        score: 28,
        reasons: [],
        warnings: ["Flat EMA — EMA20 slope too shallow."],
      };
    }
  }

  if (direction === "BUY") {
    const ok = price > ema20 && ema20 > ema50;
    if (ok) {
      reasons.push("Price above EMA20 with EMA20 above EMA50.");
      return { aligned: true, score: 88, reasons, warnings };
    }
    return {
      aligned: false,
      score: 30,
      reasons: [],
      warnings: ["Bullish EMA stack not confirmed."],
    };
  }

  const ok = price < ema20 && ema20 < ema50;
  if (ok) {
    reasons.push("Price below EMA20 with EMA20 below EMA50.");
    return { aligned: true, score: 88, reasons, warnings };
  }
  return {
    aligned: false,
    score: 30,
    reasons: [],
    warnings: ["Bearish EMA stack not confirmed."],
  };
}

export function validateVwapAlignment(
  direction: Exclude<MomentumContinuationDirection, "NONE">,
  price: number,
  vwap: number
): { aligned: boolean; score: number; reasons: string[]; warnings: string[] } {
  if (!Number.isFinite(vwap) || vwap <= 0 || !Number.isFinite(price)) {
    return {
      aligned: false,
      score: 35,
      reasons: [],
      warnings: ["VWAP missing."],
    };
  }
  if (direction === "BUY") {
    if (price >= vwap) {
      return {
        aligned: true,
        score: 80,
        reasons: ["Price above VWAP supports bullish continuation."],
        warnings: [],
      };
    }
    return {
      aligned: false,
      score: 30,
      reasons: [],
      warnings: ["Price below VWAP — bullish continuation rejected."],
    };
  }
  if (price <= vwap) {
    return {
      aligned: true,
      score: 80,
      reasons: ["Price below VWAP supports bearish continuation."],
      warnings: [],
    };
  }
  return {
    aligned: false,
    score: 30,
    reasons: [],
    warnings: ["Price above VWAP — bearish continuation rejected."],
  };
}

export function evaluatePullback(
  candles: readonly MomentumContinuationCandle[],
  direction: Exclude<MomentumContinuationDirection, "NONE">,
  atr: number | null,
  config: MomentumContinuationConfig
): {
  healthy: boolean;
  depth: number;
  pullbackHigh: number;
  pullbackLow: number;
  score: number;
  reasons: string[];
  warnings: string[];
} {
  const lookback = Math.max(config.pullbackLookbackBars, 3);
  const window = candles.slice(-lookback - 1, -1);
  const last = candles[candles.length - 1];
  if (window.length < 2 || !last) {
    return {
      healthy: false,
      depth: 0,
      pullbackHigh: 0,
      pullbackLow: 0,
      score: 20,
      reasons: [],
      warnings: ["Insufficient bars for pullback analysis."],
    };
  }

  const pullbackHigh = Math.max(...window.map((c) => c.high));
  const pullbackLow = Math.min(...window.map((c) => c.low));
  const impulseWindow = candles.slice(
    -Math.max(config.trendLookbackBars, lookback + 2),
    -1
  );
  const impulseHigh = Math.max(...impulseWindow.map((c) => c.high));
  const impulseLow = Math.min(...impulseWindow.map((c) => c.low));
  const impulseRange = Math.max(impulseHigh - impulseLow, 0.0001);

  let depth = 0;
  if (direction === "BUY") {
    depth = (impulseHigh - pullbackLow) / impulseRange;
  } else {
    depth = (pullbackHigh - impulseLow) / impulseRange;
  }

  const atrCap =
    atr !== null && Number.isFinite(atr) && atr > 0
      ? atr * config.maxPullbackAtrMultiple
      : Number.POSITIVE_INFINITY;
  const absoluteDepth =
    direction === "BUY" ? impulseHigh - pullbackLow : pullbackHigh - impulseLow;

  if (depth > config.maxPullbackFraction || absoluteDepth > atrCap) {
    return {
      healthy: false,
      depth: round(depth, 4),
      pullbackHigh: round(pullbackHigh, 4),
      pullbackLow: round(pullbackLow, 4),
      score: 25,
      reasons: [],
      warnings: ["Deep Pullback — continuation rejected."],
    };
  }

  return {
    healthy: true,
    depth: round(depth, 4),
    pullbackHigh: round(pullbackHigh, 4),
    pullbackLow: round(pullbackLow, 4),
    score: clamp(90 - depth * 80, 50, 95),
    reasons: ["Pullback respected institutional support."],
    warnings: [],
  };
}

export function detectMomentumResumption(
  candles: readonly MomentumContinuationCandle[],
  direction: Exclude<MomentumContinuationDirection, "NONE">,
  pullbackHigh: number,
  pullbackLow: number
): { resumed: boolean; score: number; reasons: string[]; warnings: string[] } {
  const last = candles[candles.length - 1];
  if (!last) {
    return {
      resumed: false,
      score: 20,
      reasons: [],
      warnings: ["No continuation candle."],
    };
  }

  if (direction === "BUY") {
    const ok =
      last.close > pullbackHigh &&
      last.close >= last.open &&
      last.close > last.low;
    if (ok) {
      return {
        resumed: true,
        score: 88,
        reasons: ["Continuation candle closes above pullback high."],
        warnings: [],
      };
    }
    return {
      resumed: false,
      score: 30,
      reasons: [],
      warnings: ["Momentum resumption not confirmed above pullback high."],
    };
  }

  const ok =
    last.close < pullbackLow &&
    last.close <= last.open &&
    last.close < last.high;
  if (ok) {
    return {
      resumed: true,
      score: 88,
      reasons: ["Continuation candle closes below pullback low."],
      warnings: [],
    };
  }
  return {
    resumed: false,
    score: 30,
    reasons: [],
    warnings: ["Momentum resumption not confirmed below pullback low."],
  };
}

export function validateAdx(
  adx: number | null | undefined,
  config: MomentumContinuationConfig
): { strong: boolean; score: number; reasons: string[]; warnings: string[] } {
  if (adx === null || adx === undefined || !Number.isFinite(adx)) {
    return {
      strong: false,
      score: 30,
      reasons: [],
      warnings: ["ADX missing."],
    };
  }
  if (adx < config.minAdx) {
    return {
      strong: false,
      score: clamp(adx * 2, 0, 100),
      reasons: [],
      warnings: ["Weak ADX — trend strength insufficient."],
    };
  }
  return {
    strong: true,
    score: clamp(50 + (adx - config.minAdx) * 2, 55, 100),
    reasons: [`ADX ${round(adx, 1)} confirms trend strength.`],
    warnings: [],
  };
}

export function validateVolume(
  candles: readonly MomentumContinuationCandle[],
  relativeVolume: number | null,
  config: MomentumContinuationConfig
): {
  confirmed: boolean;
  score: number;
  reasons: string[];
  warnings: string[];
} {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const last = candles[candles.length - 1];
  if (!last) {
    return {
      confirmed: false,
      score: 25,
      reasons: [],
      warnings: ["Volume data missing."],
    };
  }

  const prior = candles.slice(0, -1).slice(-6);
  const avgVol =
    prior.length > 0
      ? prior.reduce((s, c) => s + c.volume, 0) / prior.length
      : last.volume;
  const spike =
    avgVol > 0 && last.volume >= avgVol * config.volumeConfirmationMultiple;

  if (
    relativeVolume !== null &&
    Number.isFinite(relativeVolume) &&
    relativeVolume < config.minRelativeVolume
  ) {
    return {
      confirmed: false,
      score: 25,
      reasons: [],
      warnings: ["Low volume — relative volume below threshold."],
    };
  }

  if (!spike && (relativeVolume === null || relativeVolume < config.preferredRelativeVolume)) {
    warnings.push("Low volume — weak confirmation of renewed momentum.");
  } else {
    reasons.push("Relative volume confirms renewed momentum.");
  }

  const confirmed =
    spike ||
    (relativeVolume !== null &&
      Number.isFinite(relativeVolume) &&
      relativeVolume >= config.minRelativeVolume);

  return {
    confirmed,
    score: clamp(
      (spike ? 70 : 40) +
        (relativeVolume !== null && relativeVolume >= config.preferredRelativeVolume
          ? 25
          : relativeVolume !== null && relativeVolume >= config.minRelativeVolume
            ? 15
            : 0),
      0,
      100
    ),
    reasons,
    warnings,
  };
}

export function validateBreadth(
  direction: Exclude<MomentumContinuationDirection, "NONE">,
  context: InstitutionalMarketContext,
  config: MomentumContinuationConfig = DEFAULT_MOMENTUM_CONTINUATION_CONFIG
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
        reasons: ["Breadth positive for bullish continuation."],
        warnings: [],
      };
    }
    return {
      confirmed: false,
      score: clamp(score!, 0, 100),
      reasons: [],
      warnings: ["Weak Breadth — participation insufficient."],
    };
  }
  if (score! <= config.bearishBreadthMax) {
    return {
      confirmed: true,
      score: clamp(100 - score!, 0, 100),
      reasons: ["Breadth supports bearish continuation."],
      warnings: [],
    };
  }
  return {
    confirmed: false,
    score: clamp(score!, 0, 100),
    reasons: [],
    warnings: ["Weak Breadth for bearish continuation."],
  };
}

export function validateSector(
  direction: Exclude<MomentumContinuationDirection, "NONE">,
  context: InstitutionalMarketContext,
  config: MomentumContinuationConfig = DEFAULT_MOMENTUM_CONTINUATION_CONFIG
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
        reasons: ["Sector leadership supports continuation."],
        warnings: [],
      };
    }
    return {
      confirmed: false,
      score: avg,
      reasons: [],
      warnings: ["Weak Sector — leadership insufficient."],
    };
  }
  if (avg <= config.bearishSectorMax) {
    return {
      confirmed: true,
      score: clamp(100 - avg, 0, 100),
      reasons: ["Sector leadership supports continuation."],
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
  direction: Exclude<MomentumContinuationDirection, "NONE">,
  regime: MarketRegimeLabel,
  riskMode: InstitutionalMarketContext["riskMode"],
  regimeConfidence: number,
  volatilityScore: number,
  newsDriven: boolean,
  config: MomentumContinuationConfig = DEFAULT_MOMENTUM_CONTINUATION_CONFIG
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

  if (newsDriven) {
    return {
      confirmed: false,
      score: 15,
      reasons: [],
      warnings: ["News spike — momentum continuation rejected."],
    };
  }

  if (config.blockedRegimes.includes(regime)) {
    return {
      confirmed: false,
      score: 20,
      reasons: [],
      warnings: [`Sideways / incompatible regime ${regime} — momentum rejected.`],
    };
  }

  if (direction === "BUY" && config.bullBlockedRegimes.includes(regime)) {
    return {
      confirmed: false,
      score: 20,
      reasons: [],
      warnings: [`Regime ${regime} blocks bullish momentum continuation.`],
    };
  }
  if (direction === "SELL" && config.bearBlockedRegimes.includes(regime)) {
    return {
      confirmed: false,
      score: 20,
      reasons: [],
      warnings: [`Regime ${regime} blocks bearish momentum continuation.`],
    };
  }

  if (!config.compatibleRegimes.includes(regime)) {
    return {
      confirmed: false,
      score: 25,
      reasons: [],
      warnings: [`Regime ${regime} not compatible with momentum continuation.`],
    };
  }
  reasons.push("Trade aligns with market regime.");
  score += 20;

  if (regimeConfidence >= config.minRegimeConfidence) {
    score += 15;
  } else {
    warnings.push("Regime confidence below momentum threshold.");
    score -= 20;
  }

  if (volatilityScore > config.maxVolatilityScore) {
    warnings.push("Volatility too elevated for clean momentum continuation.");
    score -= 15;
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

function isCircuitMove(
  candle: MomentumContinuationCandle,
  config: MomentumContinuationConfig
): boolean {
  const mid = (candle.high + candle.low) / 2 || candle.close;
  if (!Number.isFinite(mid) || mid <= 0) return false;
  return (candle.high - candle.low) / mid >= config.circuitMovePct;
}

export function calculateConfidence(input: {
  trendScore: number;
  pullbackScore: number;
  volumeScore: number;
  adxScore: number;
  breadthScore: number;
  sectorScore: number;
  marketScore: number;
  vwapScore: number;
  config?: MomentumContinuationConfig;
}): number {
  const config = input.config ?? DEFAULT_MOMENTUM_CONTINUATION_CONFIG;
  const w = config.confidenceWeights;
  const composite =
    input.trendScore * w.trendStrength +
    input.pullbackScore * w.pullbackQuality +
    input.volumeScore * w.volume +
    input.adxScore * w.adx +
    input.breadthScore * w.breadth +
    input.sectorScore * w.sector +
    input.marketScore * w.market +
    input.vwapScore * w.vwap;
  return clamp(
    round(composite, 1),
    config.confidenceFloor,
    config.scoreCeiling
  );
}

export function createEmptyMomentumContinuationDetection(
  warnings: string[],
  reasons: string[] = []
): MomentumContinuationDetection {
  return {
    detected: false,
    direction: "NONE",
    trendStrength: 0,
    pullbackDepth: 0,
    pullbackHigh: 0,
    pullbackLow: 0,
    ema20: 0,
    ema50: 0,
    vwap: 0,
    adx: 0,
    rsi: 0,
    strongTrend: false,
    healthyPullback: false,
    momentumResumption: false,
    volumeConfirmed: false,
    breadthConfirmed: false,
    sectorConfirmed: false,
    marketConfirmed: false,
    confidence: 0,
    reasons,
    warnings,
  };
}

/**
 * Full momentum continuation detection.
 */
export function detectMomentumContinuation(
  context: MomentumContinuationDetectionContext
): MomentumContinuationDetection {
  const config = resolveMomentumContinuationConfig(context.config);
  const data = context.input.momentumContinuation;
  const candles = data.candles5m;
  const warnings: string[] = [];
  const reasons: string[] = [];

  const last = candles[candles.length - 1];
  if (!last) {
    return createEmptyMomentumContinuationDetection(["Missing candles."]);
  }

  if (isCircuitMove(last, config)) {
    return createEmptyMomentumContinuationDetection(
      ["Circuit movement — momentum continuation rejected."],
      reasons
    );
  }

  const ema20 = data.ema20;
  const ema50 = data.ema50;
  if (
    ema20 === null ||
    ema50 === null ||
    !Number.isFinite(ema20) ||
    !Number.isFinite(ema50)
  ) {
    return createEmptyMomentumContinuationDetection(["EMA20/EMA50 missing."]);
  }

  const structure = detectTrendStructure(candles, config.trendLookbackBars);
  warnings.push(...structure.warnings);
  reasons.push(...structure.reasons);

  let direction: Exclude<MomentumContinuationDirection, "NONE"> | null = null;
  if (structure.bullish) direction = "BUY";
  else if (structure.bearish) direction = "SELL";

  if (!direction) {
    return createEmptyMomentumContinuationDetection(warnings, reasons);
  }

  const ema = validateEmaAlignment(
    direction,
    last.close,
    ema20,
    ema50,
    data.ema20Series,
    config
  );
  warnings.push(...ema.warnings);
  reasons.push(...ema.reasons);
  if (!ema.aligned) {
    return {
      ...createEmptyMomentumContinuationDetection(warnings, reasons),
      direction: "NONE",
      ema20,
      ema50,
      vwap: data.vwap,
      adx: data.adx ?? 0,
      rsi: data.rsi ?? 0,
    };
  }

  const vwap = validateVwapAlignment(direction, last.close, data.vwap);
  warnings.push(...vwap.warnings);
  reasons.push(...vwap.reasons);
  if (!vwap.aligned) {
    return createEmptyMomentumContinuationDetection(warnings, reasons);
  }

  const adx = validateAdx(data.adx, config);
  warnings.push(...adx.warnings);
  reasons.push(...adx.reasons);
  if (!adx.strong) {
    return {
      ...createEmptyMomentumContinuationDetection(warnings, reasons),
      ema20,
      ema50,
      vwap: data.vwap,
      adx: data.adx ?? 0,
      rsi: data.rsi ?? 0,
      strongTrend: false,
    };
  }

  const pullback = evaluatePullback(candles, direction, data.atr, config);
  warnings.push(...pullback.warnings);
  reasons.push(...pullback.reasons);
  if (!pullback.healthy) {
    return {
      ...createEmptyMomentumContinuationDetection(warnings, reasons),
      trendStrength: structure.score,
      pullbackDepth: pullback.depth,
      pullbackHigh: pullback.pullbackHigh,
      pullbackLow: pullback.pullbackLow,
      ema20,
      ema50,
      vwap: data.vwap,
      adx: data.adx ?? 0,
      rsi: data.rsi ?? 0,
      strongTrend: true,
      healthyPullback: false,
    };
  }

  const resumption = detectMomentumResumption(
    candles,
    direction,
    pullback.pullbackHigh,
    pullback.pullbackLow
  );
  warnings.push(...resumption.warnings);
  reasons.push(...resumption.reasons);
  if (!resumption.resumed) {
    return {
      ...createEmptyMomentumContinuationDetection(warnings, reasons),
      trendStrength: structure.score,
      pullbackDepth: pullback.depth,
      pullbackHigh: pullback.pullbackHigh,
      pullbackLow: pullback.pullbackLow,
      ema20,
      ema50,
      vwap: data.vwap,
      adx: data.adx ?? 0,
      rsi: data.rsi ?? 0,
      strongTrend: true,
      healthyPullback: true,
      momentumResumption: false,
    };
  }

  const volume = validateVolume(candles, data.relativeVolume, config);
  warnings.push(...volume.warnings);
  reasons.push(...volume.reasons);

  const breadth = validateBreadth(direction, context.marketContext, config);
  warnings.push(...breadth.warnings);
  reasons.push(...breadth.reasons);

  const sector = validateSector(direction, context.marketContext, config);
  warnings.push(...sector.warnings);
  reasons.push(...sector.reasons);

  const market = validateMarket(
    direction,
    context.regime.regime,
    context.marketContext.riskMode,
    context.confidence.score,
    context.marketContext.volatility?.score ?? 50,
    data.newsDriven === true,
    config
  );
  warnings.push(...market.warnings);
  reasons.push(...market.reasons);

  if (!volume.confirmed || !breadth.confirmed || !sector.confirmed || !market.confirmed) {
    return {
      ...createEmptyMomentumContinuationDetection(warnings, reasons),
      trendStrength: structure.score,
      pullbackDepth: pullback.depth,
      pullbackHigh: pullback.pullbackHigh,
      pullbackLow: pullback.pullbackLow,
      ema20,
      ema50,
      vwap: data.vwap,
      adx: data.adx ?? 0,
      rsi: data.rsi ?? 0,
      strongTrend: true,
      healthyPullback: true,
      momentumResumption: true,
      volumeConfirmed: volume.confirmed,
      breadthConfirmed: breadth.confirmed,
      sectorConfirmed: sector.confirmed,
      marketConfirmed: market.confirmed,
      confidence: calculateConfidence({
        trendScore: structure.score,
        pullbackScore: pullback.score,
        volumeScore: volume.score,
        adxScore: adx.score,
        breadthScore: breadth.score,
        sectorScore: sector.score,
        marketScore: market.score,
        vwapScore: vwap.score,
        config,
      }),
    };
  }

  const confidence = calculateConfidence({
    trendScore: structure.score,
    pullbackScore: pullback.score,
    volumeScore: volume.score,
    adxScore: adx.score,
    breadthScore: breadth.score,
    sectorScore: sector.score,
    marketScore: market.score,
    vwapScore: vwap.score,
    config,
  });

  reasons.push(`Momentum Continuation ${direction} detected.`);

  return {
    detected: true,
    direction,
    trendStrength: structure.score,
    pullbackDepth: pullback.depth,
    pullbackHigh: pullback.pullbackHigh,
    pullbackLow: pullback.pullbackLow,
    ema20,
    ema50,
    vwap: data.vwap,
    adx: data.adx ?? 0,
    rsi: data.rsi ?? 0,
    strongTrend: true,
    healthyPullback: true,
    momentumResumption: true,
    volumeConfirmed: true,
    breadthConfirmed: true,
    sectorConfirmed: true,
    marketConfirmed: true,
    confidence,
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
