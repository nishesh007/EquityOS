/**
 * EMA Pullback utilities — Sprint 11B.3P.
 * Pure trend / pullback detection helpers.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { isStrategyEligible } from "../StrategyUtils";
import {
  DEFAULT_EMA_PULLBACK_CONFIG,
  EMA_PULLBACK_STRATEGY_ID,
  resolveEMAPullbackConfig,
  type EMAPullbackConfig,
} from "./EMAPullbackConstants";
import type {
  EMAPullbackCandle,
  EMAPullbackDetection,
  EMAPullbackDetectionContext,
  EMAPullbackDirection,
  EMAPullbackMarketData,
  EMAPullbackTrendDirection,
  EMAPullbackType,
} from "./EMAPullbackTypes";

export { resolveEMAPullbackConfig };

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
  config: EMAPullbackConfig = DEFAULT_EMA_PULLBACK_CONFIG
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

export function createEmptyEMAPullbackDetection(
  warnings: string[] = [],
  reasons: string[] = []
): EMAPullbackDetection {
  return {
    detected: false,
    direction: "NONE",
    trendDirection: "None",
    pullbackType: "none",
    trendQuality: 0,
    pullbackQuality: 0,
    emaAlignment: 0,
    volumeQuality: 0,
    pullbackDepth: 0,
    pullbackHigh: 0,
    pullbackLow: 0,
    ema9: 0,
    ema20: 0,
    ema50: 0,
    ema100: 0,
    ema200: 0,
    vwap: 0,
    atr: 0,
    adx: 0,
    rsi: 0,
    strongTrend: false,
    controlledPullback: false,
    bullishRejection: false,
    higherLow: false,
    volumeConfirmed: false,
    breadthConfirmed: false,
    sectorConfirmed: false,
    marketConfirmed: false,
    confidence: 0,
    reasons,
    warnings,
  };
}

function selectPrimaryCandles(
  data: EMAPullbackMarketData
): readonly EMAPullbackCandle[] {
  if (data.candles5m && data.candles5m.length >= 8) return data.candles5m;
  if (data.candles15m && data.candles15m.length >= 8) return data.candles15m;
  if (data.candles1m && data.candles1m.length >= 8) return data.candles1m;
  return data.candlesDaily;
}

function touchesLevel(
  candle: EMAPullbackCandle,
  level: number,
  tolerancePct: number
): boolean {
  if (!Number.isFinite(level) || level <= 0) return false;
  const band = level * tolerancePct;
  return candle.low <= level + band && candle.high >= level - band;
}

function isEmaRising(
  series: readonly number[] | null | undefined,
  fallbackEma20: number,
  lookback: number,
  minSlopePct: number
): boolean {
  if (series && series.length >= lookback + 1) {
    const end = series[series.length - 1]!;
    const start = series[series.length - 1 - lookback]!;
    if (start <= 0) return false;
    return (end - start) / start >= minSlopePct;
  }
  return Number.isFinite(fallbackEma20) && fallbackEma20 > 0;
}

export function detectTrendStructure(input: {
  ema20: number;
  ema50: number;
  ema100: number;
  ema200: number;
  price: number;
  ema20Rising: boolean;
  adx: number | null | undefined;
  config: EMAPullbackConfig;
}): {
  bull: boolean;
  bear: boolean;
  score: number;
  reasons: string[];
  warnings: string[];
} {
  const { ema20, ema50, ema100, ema200, price, ema20Rising, adx, config } =
    input;
  const reasons: string[] = [];
  const warnings: string[] = [];

  const bullStack = ema20 > ema50 && ema50 > ema100 && ema100 > ema200;
  const bearStack = ema20 < ema50 && ema50 < ema100 && ema100 < ema200;
  const adxOk =
    adx !== null &&
    adx !== undefined &&
    Number.isFinite(adx) &&
    adx >= config.minAdx;

  const bull =
    bullStack && price >= ema20 && ema20Rising && (adxOk || adx == null);
  const bear =
    bearStack && price <= ema20 && !ema20Rising && (adxOk || adx == null);

  if (bull) {
    reasons.push("Trend structure remains intact.");
    reasons.push("Strong bull EMA stack confirmed.");
  } else if (bear) {
    reasons.push("Trend structure remains intact.");
    reasons.push("Strong bear EMA stack confirmed.");
  } else {
    warnings.push("Trend structure incomplete.");
  }

  let score = 30;
  if (bull || bear) {
    score = 70;
    if (adxOk) score += 15;
    if (ema20Rising && bull) score += 10;
    if (!ema20Rising && bear) score += 10;
  }

  return {
    bull,
    bear,
    score: clamp(score, 0, 100),
    reasons,
    warnings,
  };
}

export function classifyPullbackType(input: {
  candle: EMAPullbackCandle;
  ema20: number;
  ema50: number;
  vwap: number;
  config: EMAPullbackConfig;
  /** Prefer level nearest the pullback extreme (low for bull, high for bear). */
  bias?: "BUY" | "SELL";
}): EMAPullbackType {
  const { candle, ema20, ema50, vwap, config } = input;
  const extreme =
    input.bias === "SELL" ? candle.high : candle.low;
  const candidates: Array<{
    type: Exclude<EMAPullbackType, "none">;
    level: number;
    tol: number;
  }> = [
    { type: "ema20", level: ema20, tol: config.emaTouchTolerancePct },
    { type: "ema50", level: ema50, tol: config.emaTouchTolerancePct },
    { type: "vwap", level: vwap, tol: config.vwapTouchTolerancePct },
  ];
  let best: { type: Exclude<EMAPullbackType, "none">; distance: number } | null =
    null;
  for (const candidate of candidates) {
    if (!touchesLevel(candle, candidate.level, candidate.tol)) continue;
    const distance =
      Math.abs(extreme - candidate.level) / Math.max(candidate.level, 0.0001);
    if (!best || distance < best.distance) {
      best = { type: candidate.type, distance };
    }
  }
  return best?.type ?? "none";
}

export function evaluatePullback(input: {
  candles: readonly EMAPullbackCandle[];
  direction: Exclude<EMAPullbackDirection, "NONE">;
  ema20: number;
  ema50: number;
  vwap: number;
  atr: number | null;
  config: EMAPullbackConfig;
}): {
  healthy: boolean;
  pullbackType: EMAPullbackType;
  depth: number;
  pullbackHigh: number;
  pullbackLow: number;
  lowVolumeRetracement: boolean;
  bullishRejection: boolean;
  higherLow: boolean;
  score: number;
  reasons: string[];
  warnings: string[];
} {
  const { candles, direction, ema20, ema50, vwap, atr, config } = input;
  const lookback = Math.max(config.pullbackLookbackBars, 3);
  const window = candles.slice(-lookback - 1, -1);
  const last = candles[candles.length - 1];
  if (window.length < 2 || !last) {
    return {
      healthy: false,
      pullbackType: "none",
      depth: 0,
      pullbackHigh: 0,
      pullbackLow: 0,
      lowVolumeRetracement: false,
      bullishRejection: false,
      higherLow: false,
      score: 20,
      reasons: [],
      warnings: ["Insufficient bars for pullback analysis."],
    };
  }

  const pullbackHigh = Math.max(...window.map((c) => c.high));
  const pullbackLow = Math.min(...window.map((c) => c.low));
  // Local impulse: recent swing into the pullback (not full trend history).
  const impulseWindow = candles.slice(
    -Math.max(config.pullbackLookbackBars + 4, lookback + 2),
    -1
  );
  const impulseHigh = Math.max(
    ...impulseWindow.map((c) => c.high),
    pullbackHigh
  );
  const impulseLow = Math.min(...impulseWindow.map((c) => c.low), pullbackLow);
  const localSwing =
    direction === "BUY"
      ? Math.max(impulseHigh - pullbackLow, 0)
      : Math.max(pullbackHigh - impulseLow, 0);
  const referenceRange = Math.max(
    atr !== null && Number.isFinite(atr) && atr > 0 ? atr * 2 : 0,
    localSwing,
    0.0001
  );

  const depth =
    direction === "BUY"
      ? (impulseHigh - pullbackLow) / referenceRange
      : (pullbackHigh - impulseLow) / referenceRange;

  const atrCap =
    atr !== null && Number.isFinite(atr) && atr > 0
      ? atr * config.maxPullbackAtrMultiple
      : Number.POSITIVE_INFINITY;
  const absoluteDepth =
    direction === "BUY" ? impulseHigh - pullbackLow : pullbackHigh - impulseLow;

  if (absoluteDepth > atrCap * 1.25) {
    return {
      healthy: false,
      pullbackType: "none",
      depth: round(depth, 4),
      pullbackHigh: round(pullbackHigh, 4),
      pullbackLow: round(pullbackLow, 4),
      lowVolumeRetracement: false,
      bullishRejection: false,
      higherLow: false,
      score: 20,
      reasons: [],
      warnings: ["Deep correction — EMA pullback rejected."],
    };
  }

  if (depth > config.deepCorrectionFraction) {
    return {
      healthy: false,
      pullbackType: "none",
      depth: round(depth, 4),
      pullbackHigh: round(pullbackHigh, 4),
      pullbackLow: round(pullbackLow, 4),
      lowVolumeRetracement: false,
      bullishRejection: false,
      higherLow: false,
      score: 20,
      reasons: [],
      warnings: ["Deep correction — EMA pullback rejected."],
    };
  }

  if (depth > config.maxPullbackFraction || absoluteDepth > atrCap) {
    return {
      healthy: false,
      pullbackType: "none",
      depth: round(depth, 4),
      pullbackHigh: round(pullbackHigh, 4),
      pullbackLow: round(pullbackLow, 4),
      lowVolumeRetracement: false,
      bullishRejection: false,
      higherLow: false,
      score: 25,
      reasons: [],
      warnings: ["Deep Pullback — continuation rejected."],
    };
  }

  const touchCandle = [...window, last]
    .filter(
      (c) =>
        classifyPullbackType({
          candle: c,
          ema20,
          ema50,
          vwap,
          config,
          bias: direction,
        }) !== "none"
    )
    .sort((a, b) =>
      direction === "BUY" ? a.low - b.low : b.high - a.high
    )[0] ?? last;

  const pullbackType = classifyPullbackType({
    candle: touchCandle,
    ema20,
    ema50,
    vwap,
    config,
    bias: direction,
  });

  if (pullbackType === "none") {
    return {
      healthy: false,
      pullbackType: "none",
      depth: round(depth, 4),
      pullbackHigh: round(pullbackHigh, 4),
      pullbackLow: round(pullbackLow, 4),
      lowVolumeRetracement: false,
      bullishRejection: false,
      higherLow: false,
      score: 30,
      reasons: [],
      warnings: ["No EMA/VWAP pullback touch detected."],
    };
  }

  const priorVol =
    window.slice(0, -1).reduce((s, c) => s + c.volume, 0) /
    Math.max(window.length - 1, 1);
  const pullbackBars = window.filter((c) =>
    direction === "BUY" ? c.close < c.open : c.close > c.open
  );
  const avgPullbackVol =
    pullbackBars.length > 0
      ? pullbackBars.reduce((s, c) => s + c.volume, 0) / pullbackBars.length
      : touchCandle.volume;
  const lowVolumeRetracement =
    priorVol <= 0 ||
    avgPullbackVol <= priorVol * config.pullbackVolumeMaxMultiple;

  const bullishRejection =
    direction === "BUY"
      ? last.close >= last.open &&
        last.low <= Math.min(ema20, ema50, vwap) * 1.01 &&
        last.close > last.low
      : last.close <= last.open &&
        last.high >= Math.max(ema20, ema50, vwap) * 0.99 &&
        last.close < last.high;

  const priorSwing = candles[candles.length - lookback - 2];
  const higherLow =
    direction === "BUY"
      ? !priorSwing || pullbackLow >= priorSwing.low * 0.995
      : !priorSwing || pullbackHigh <= priorSwing.high * 1.005;

  const reasons: string[] = [];
  if (pullbackType === "ema20") {
    reasons.push(
      direction === "BUY"
        ? "Price pulled back to rising EMA20."
        : "Price pulled back to falling EMA20."
    );
  } else if (pullbackType === "ema50") {
    reasons.push("Price pulled back to EMA50 support.");
  } else {
    reasons.push("Price pulled back to VWAP.");
  }
  if (lowVolumeRetracement) {
    reasons.push("Low-volume retracement suggests profit booking.");
  }
  if (bullishRejection) {
    reasons.push(
      direction === "BUY"
        ? "Bullish rejection confirms institutional buying."
        : "Bearish rejection confirms institutional selling."
    );
  }

  return {
    healthy: true,
    pullbackType,
    depth: round(depth, 4),
    pullbackHigh: round(pullbackHigh, 4),
    pullbackLow: round(pullbackLow, 4),
    lowVolumeRetracement,
    bullishRejection,
    higherLow,
    score: clamp(
      55 +
        (lowVolumeRetracement ? 15 : 0) +
        (bullishRejection ? 15 : 0) +
        (higherLow ? 10 : 0) -
        depth * 20,
      40,
      95
    ),
    reasons,
    warnings: [],
  };
}

export function validateBreadth(
  context: InstitutionalMarketContext,
  direction: Exclude<EMAPullbackDirection, "NONE">,
  config: EMAPullbackConfig = DEFAULT_EMA_PULLBACK_CONFIG
): boolean {
  if (direction === "BUY") {
    return context.marketBreadth.score >= config.bullishBreadthMin;
  }
  return context.marketBreadth.score <= config.bearishBreadthMax;
}

export function validateSector(
  context: InstitutionalMarketContext,
  direction: Exclude<EMAPullbackDirection, "NONE">,
  config: EMAPullbackConfig = DEFAULT_EMA_PULLBACK_CONFIG
): boolean {
  const score = averageSectorScore(context);
  if (direction === "BUY") return score >= config.bullishSectorMin;
  return score <= config.bearishSectorMax;
}

export function calculateConfidence(input: {
  trendQuality: number;
  pullbackQuality: number;
  emaAlignment: number;
  volumeQuality: number;
  sectorScore: number;
  marketScore: number;
  riskRewardProxy: number;
  config: EMAPullbackConfig;
}): number {
  const w = input.config.confidenceWeights;
  const total =
    w.trendQuality +
    w.pullbackQuality +
    w.emaAlignment +
    w.volumeQuality +
    w.sector +
    w.market +
    w.riskReward;
  const composite =
    (input.trendQuality * w.trendQuality +
      input.pullbackQuality * w.pullbackQuality +
      input.emaAlignment * w.emaAlignment +
      input.volumeQuality * w.volumeQuality +
      input.sectorScore * w.sector +
      input.marketScore * w.market +
      input.riskRewardProxy * w.riskReward) /
    Math.max(total, 0.0001);
  return clamp(
    round(composite, 1),
    input.config.scoreFloor,
    input.config.scoreCeiling
  );
}

export function detectEMAPullback(
  context: EMAPullbackDetectionContext
): EMAPullbackDetection {
  const config = resolveEMAPullbackConfig(context.config);
  const warnings: string[] = [];
  const reasons: string[] = [];
  const data = context.input.emaPullback;
  const candles = selectPrimaryCandles(data);

  if (candles.length < config.minimumIntradayCandles) {
    return createEmptyEMAPullbackDetection(
      ["Insufficient OHLC for EMA Pullback."],
      ["Enough Candles missing."]
    );
  }
  if (data.candlesDaily.length < config.minimumDailyCandles) {
    return createEmptyEMAPullbackDetection(
      ["Insufficient daily OHLC for EMA Pullback."],
      ["Enough Candles missing."]
    );
  }

  const eligible = isStrategyEligible(
    EMA_PULLBACK_STRATEGY_ID,
    context.eligibleStrategies ?? []
  );
  if (!eligible) {
    return createEmptyEMAPullbackDetection(
      ["Eligible Strategy gate failed for EMA Pullback."],
      ["Eligible Strategy gate failed for EMA Pullback."]
    );
  }

  if (data.newsDriven === true) {
    return createEmptyEMAPullbackDetection(
      ["News-driven move — EMA pullback rejected."],
      ["News-only move — not institutional pullback."]
    );
  }

  const last = candles[candles.length - 1]!;
  const mid = (last.high + last.low) / 2 || last.close;
  if (
    Number.isFinite(mid) &&
    mid > 0 &&
    (last.high - last.low) / mid >= config.circuitMovePct
  ) {
    return createEmptyEMAPullbackDetection(
      ["Circuit-like range — rejected."],
      ["Circuit movement — EMA pullback invalid."]
    );
  }

  const ema20 = data.ema20;
  const ema50 = data.ema50;
  const ema100 = data.ema100;
  const ema200 = data.ema200;
  if (
    ema20 === null ||
    ema50 === null ||
    ema100 === null ||
    ema200 === null ||
    !Number.isFinite(ema20) ||
    !Number.isFinite(ema50) ||
    !Number.isFinite(ema100) ||
    !Number.isFinite(ema200)
  ) {
    return createEmptyEMAPullbackDetection(
      ["EMA stack incomplete."],
      ["Trend structure incomplete."]
    );
  }

  if (!Number.isFinite(data.vwap) || data.vwap <= 0) {
    return createEmptyEMAPullbackDetection(
      ["VWAP missing."],
      ["VWAP alignment failed."]
    );
  }

  const ema20Rising = isEmaRising(
    data.ema20Series,
    ema20,
    config.emaSlopeLookback,
    config.minEmaSlopePct
  );

  const trend = detectTrendStructure({
    ema20,
    ema50,
    ema100,
    ema200,
    price: last.close,
    ema20Rising,
    adx: data.adx,
    config,
  });

  if (!trend.bull && !trend.bear) {
    return createEmptyEMAPullbackDetection(
      [...trend.warnings, "No strong EMA trend."],
      ["Trend reversal / structure broken."]
    );
  }

  const direction: Exclude<EMAPullbackDirection, "NONE"> = trend.bull
    ? "BUY"
    : "SELL";
  const trendDirection: EMAPullbackTrendDirection = trend.bull ? "Bull" : "Bear";

  if (config.blockedRiskModes.includes(context.marketContext.riskMode)) {
    return createEmptyEMAPullbackDetection(
      ["Risk Off blocks EMA Pullback."],
      ["Risk Off — EMA Pullback blocked."]
    );
  }

  if (config.blockedRegimes.includes(context.regime.regime)) {
    return createEmptyEMAPullbackDetection(
      [`Regime ${context.regime.regime} blocked.`],
      ["Market regime incompatible with EMA Pullback."]
    );
  }

  const compatible =
    direction === "BUY"
      ? config.compatibleBullRegimes
      : config.compatibleBearRegimes;
  if (compatible.length > 0 && !compatible.includes(context.regime.regime)) {
    return createEmptyEMAPullbackDetection(
      ["Market regime not compatible with direction."],
      ["Market regime incompatible with EMA Pullback."]
    );
  }

  if (context.confidence.score < config.minRegimeConfidence) {
    return createEmptyEMAPullbackDetection(
      ["Regime confidence too low."],
      ["Market regime confidence insufficient."]
    );
  }

  if (context.marketContext.volatility.score > config.maxVolatilityScore) {
    return createEmptyEMAPullbackDetection(
      ["Volatility too high."],
      ["High volatility — EMA Pullback rejected."]
    );
  }

  const breadthConfirmed = validateBreadth(
    context.marketContext,
    direction,
    config
  );
  const sectorConfirmed = validateSector(
    context.marketContext,
    direction,
    config
  );
  if (!breadthConfirmed) {
    return createEmptyEMAPullbackDetection(
      ["Weak breadth."],
      ["Weak breadth — market participation missing."]
    );
  }
  if (!sectorConfirmed) {
    return createEmptyEMAPullbackDetection(
      ["Weak sector."],
      ["Weak sector — pullback continuation missing."]
    );
  }

  const rs = data.relativeStrength;
  if (
    direction === "BUY" &&
    rs !== null &&
    rs !== undefined &&
    Number.isFinite(rs) &&
    rs < config.minRelativeStrength
  ) {
    return createEmptyEMAPullbackDetection(
      ["Weak relative strength."],
      ["Weak relative strength — trend leadership missing."]
    );
  }

  const pullback = evaluatePullback({
    candles,
    direction,
    ema20,
    ema50,
    vwap: data.vwap,
    atr: data.atr,
    config,
  });
  if (!pullback.healthy) {
    return createEmptyEMAPullbackDetection(pullback.warnings, pullback.warnings);
  }

  const avgVol =
    data.averageVolume20d &&
    Number.isFinite(data.averageVolume20d) &&
    data.averageVolume20d > 0
      ? data.averageVolume20d
      : candles.slice(-20).reduce((s, c) => s + c.volume, 0) /
        Math.min(20, candles.length);

  const prior = candles[candles.length - 2];
  if (
    direction === "BUY" &&
    prior &&
    last.close < last.open &&
    last.volume > avgVol * config.highVolumeSellingMultiple &&
    last.close < prior.close
  ) {
    return createEmptyEMAPullbackDetection(
      ["High-volume selling on pullback."],
      ["High-volume selling — trend reversal risk."]
    );
  }

  const volumeWeak =
    data.relativeVolume !== null &&
    Number.isFinite(data.relativeVolume) &&
    data.relativeVolume < config.minRelativeVolume;

  if (volumeWeak) {
    return createEmptyEMAPullbackDetection(
      ["Weak volume."],
      ["Weak volume — institutional participation missing."]
    );
  }

  const confirmationOk =
    avgVol <= 0 ||
    last.volume >= avgVol * config.confirmationVolumeMultiple ||
    (data.relativeVolume ?? 1) >= config.preferredRelativeVolume ||
    pullback.bullishRejection;

  const volumeQuality = clamp(
    round(
      45 +
        (pullback.lowVolumeRetracement ? 20 : 0) +
        (confirmationOk ? 20 : 0) +
        ((data.relativeVolume ?? 1) >= config.preferredRelativeVolume ? 15 : 0),
      1
    ),
    0,
    100
  );

  const emaAlignment = clamp(
    round(
      50 +
        (direction === "BUY"
          ? (ema20 > ema50 ? 15 : 0) +
            (ema50 > ema100 ? 15 : 0) +
            (ema100 > ema200 ? 15 : 0)
          : (ema20 < ema50 ? 15 : 0) +
            (ema50 < ema100 ? 15 : 0) +
            (ema100 < ema200 ? 15 : 0)),
      1
    ),
    0,
    100
  );

  reasons.push(...trend.reasons);
  reasons.push(...pullback.reasons);
  reasons.push("Sector and market remain supportive.");

  const confidence = Math.max(
    config.confidenceFloor,
    calculateConfidence({
      trendQuality: trend.score,
      pullbackQuality: pullback.score,
      emaAlignment,
      volumeQuality,
      sectorScore: averageSectorScore(context.marketContext),
      marketScore: clamp(context.marketContext.confidence, 0, 100),
      riskRewardProxy: 70,
      config,
    })
  );

  return {
    detected: true,
    direction,
    trendDirection,
    pullbackType: pullback.pullbackType,
    trendQuality: trend.score,
    pullbackQuality: pullback.score,
    emaAlignment,
    volumeQuality,
    pullbackDepth: pullback.depth,
    pullbackHigh: pullback.pullbackHigh,
    pullbackLow: pullback.pullbackLow,
    ema9: data.ema9 ?? 0,
    ema20,
    ema50,
    ema100,
    ema200,
    vwap: data.vwap,
    atr: data.atr ?? 0,
    adx: data.adx ?? 0,
    rsi: data.rsi ?? 0,
    strongTrend: true,
    controlledPullback: true,
    bullishRejection: pullback.bullishRejection,
    higherLow: pullback.higherLow,
    volumeConfirmed: confirmationOk && !volumeWeak,
    breadthConfirmed,
    sectorConfirmed,
    marketConfirmed: true,
    confidence,
    reasons: dedupe(reasons),
    warnings: dedupe([...warnings, ...trend.warnings]),
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
