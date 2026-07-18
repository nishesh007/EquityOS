/**
 * Flat Base utilities — Sprint 11B.3R.
 * Pure prior-trend / flat-base / breakout detection helpers.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { isStrategyEligible } from "../StrategyUtils";
import {
  DEFAULT_FLAT_BASE_CONFIG,
  FLAT_BASE_STRATEGY_ID,
  resolveFlatBaseConfig,
  type FlatBaseConfig,
} from "./FlatBaseConstants";
import type {
  FlatBaseCandle,
  FlatBaseDetection,
  FlatBaseDetectionContext,
  FlatBaseDirection,
  FlatBaseGeometry,
  FlatBaseMarketData,
} from "./FlatBaseTypes";

export { resolveFlatBaseConfig };

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
  config: FlatBaseConfig = DEFAULT_FLAT_BASE_CONFIG
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

export function createEmptyFlatBaseDetection(
  warnings: string[] = [],
  reasons: string[] = []
): FlatBaseDetection {
  return {
    detected: false,
    direction: "NONE",
    pivotPrice: 0,
    baseDepth: 0,
    baseDepthPct: 0,
    baseDuration: 0,
    baseLow: 0,
    baseQuality: 0,
    breakoutQuality: 0,
    trendQuality: 0,
    volumeConfirmation: 0,
    ema20: 0,
    ema50: 0,
    ema150: 0,
    ema200: 0,
    vwap: 0,
    atr: 0,
    flatBaseValid: false,
    baseValid: false,
    breakoutConfirmed: false,
    volumeConfirmed: false,
    rsConfirmed: false,
    breadthConfirmed: false,
    sectorConfirmed: false,
    marketConfirmed: false,
    priorAdvancePct: 0,
    confidence: 0,
    reasons,
    warnings,
  };
}

function averageVolume(candles: readonly FlatBaseCandle[]): number {
  if (candles.length === 0) return 0;
  return candles.reduce((s, c) => s + c.volume, 0) / candles.length;
}

function averageTrueRange(
  candles: readonly FlatBaseCandle[]
): number {
  if (candles.length === 0) return 0;
  return (
    candles.reduce((s, c) => s + (c.high - c.low), 0) / candles.length
  );
}

export function validatePriorTrend(input: {
  candles: readonly FlatBaseCandle[];
  ema50: number;
  ema150: number;
  ema200: number;
  lastClose: number;
  relativeStrength: number | null | undefined;
  config: FlatBaseConfig;
  /** First index of the flat base window (prior advance ends just before). */
  baseStartIndex?: number;
}): {
  valid: boolean;
  priorAdvancePct: number;
  score: number;
  reasons: string[];
  warnings: string[];
} {
  const {
    candles,
    ema50,
    ema150,
    ema200,
    lastClose,
    relativeStrength,
    config,
    baseStartIndex,
  } = input;
  const reasons: string[] = [];
  const warnings: string[] = [];

  if (!(ema50 > ema150 && ema150 > ema200)) {
    return {
      valid: false,
      priorAdvancePct: 0,
      score: 25,
      reasons: [],
      warnings: ["Weak Trend — EMA stack not aligned."],
    };
  }
  if (!(lastClose >= ema50)) {
    return {
      valid: false,
      priorAdvancePct: 0,
      score: 30,
      reasons: [],
      warnings: ["Weak Trend — price below EMA50."],
    };
  }

  const resolvedBaseStart =
    baseStartIndex !== undefined && Number.isFinite(baseStartIndex)
      ? Math.max(1, Math.floor(baseStartIndex))
      : Math.max(
          1,
          candles.length - config.minBaseDurationBars - 1
        );
  const lookback = Math.min(
    config.priorAdvanceLookbackBars,
    Math.max(resolvedBaseStart - 1, 1)
  );
  const priorWindow = candles.slice(
    resolvedBaseStart - lookback,
    resolvedBaseStart
  );
  if (priorWindow.length === 0) {
    return {
      valid: false,
      priorAdvancePct: 0,
      score: 20,
      reasons: [],
      warnings: ["Prior advance data insufficient."],
    };
  }

  const troughLow = Math.min(...priorWindow.map((c) => c.low));
  const peakHigh = Math.max(...priorWindow.map((c) => c.high));
  if (!(troughLow > 0)) {
    return {
      valid: false,
      priorAdvancePct: 0,
      score: 20,
      reasons: [],
      warnings: ["Prior advance data insufficient."],
    };
  }

  const priorAdvancePct = (peakHigh - troughLow) / troughLow;
  if (priorAdvancePct < config.minPriorAdvancePct) {
    return {
      valid: false,
      priorAdvancePct: round(priorAdvancePct, 4),
      score: 30,
      reasons: [],
      warnings: ["Weak Trend — prior advance insufficient."],
    };
  }

  if (
    relativeStrength !== null &&
    relativeStrength !== undefined &&
    Number.isFinite(relativeStrength) &&
    relativeStrength < config.minRelativeStrength
  ) {
    return {
      valid: false,
      priorAdvancePct: round(priorAdvancePct, 4),
      score: 35,
      reasons: [],
      warnings: ["Weak Relative Strength — leadership missing."],
    };
  }

  reasons.push("Flat base formed after a strong advance.");
  return {
    valid: true,
    priorAdvancePct: round(priorAdvancePct, 4),
    score: clamp(60 + priorAdvancePct * 100, 55, 95),
    reasons,
    warnings,
  };
}

export function detectFlatBaseGeometry(
  candles: readonly FlatBaseCandle[],
  config: FlatBaseConfig
): FlatBaseGeometry | null {
  const n = candles.length;
  if (n < config.minBaseDurationBars + config.priorAdvanceLookbackBars) {
    return null;
  }

  let best: FlatBaseGeometry | null = null;
  let bestScore = -1;

  // Base ends one bar before breakout (last candle reserved for breakout).
  const baseEnd = n - 2;
  for (
    let duration = config.minBaseDurationBars;
    duration <= Math.min(config.maxBaseDurationBars, baseEnd);
    duration += 1
  ) {
    const start = baseEnd - duration + 1;
    if (start < config.priorAdvanceLookbackBars) continue;
    const window = candles.slice(start, baseEnd + 1);
    const pivotPrice = Math.max(...window.map((c) => c.high));
    const baseLow = Math.min(...window.map((c) => c.low));
    const baseDepth = pivotPrice - baseLow;
    const baseDepthPct = baseDepth / Math.max(pivotPrice, 0.0001);

    if (baseDepthPct > config.maxBaseDepthPct) continue;

    // Higher lows preferred
    let higherLows = true;
    let priorLow = window[0]!.low;
    for (let i = 1; i < window.length; i += 1) {
      const low = window[i]!.low;
      if (low + pivotPrice * config.higherLowEpsilonPct < priorLow * 0.985) {
        higherLows = false;
        break;
      }
      priorLow = Math.max(priorLow * 0.998, low);
    }

    const priorWindow = candles.slice(
      Math.max(0, start - config.priorAdvanceLookbackBars),
      start
    );
    const priorAtr = averageTrueRange(priorWindow);
    const baseAtr = averageTrueRange(window);
    const atrContracted =
      priorAtr <= 0 ||
      baseAtr <= priorAtr * (1 - config.minAtrContractionFraction);

    const closeHigh = Math.max(...window.map((c) => c.close));
    const closeLow = Math.min(...window.map((c) => c.close));
    const closeMid = (closeHigh + closeLow) / 2;
    const tightCloses =
      closeMid > 0 && (closeHigh - closeLow) / closeMid <= config.maxCloseRangePct;

    // Reject wide swings: average range vs depth
    const avgRange = averageTrueRange(window);
    const wideSwings = avgRange > pivotPrice * config.maxBaseDepthPct * 0.7;
    if (wideSwings && !tightCloses) continue;

    const score =
      (atrContracted ? 30 : 10) +
      (tightCloses ? 25 : 10) +
      (higherLows ? 20 : 5) +
      clamp(25 - baseDepthPct * 100, 0, 25);

    if (score > bestScore) {
      bestScore = score;
      best = {
        startIndex: start,
        endIndex: baseEnd,
        pivotPrice: round(pivotPrice, 4),
        baseLow: round(baseLow, 4),
        baseDepth: round(baseDepth, 4),
        baseDepthPct: round(baseDepthPct, 4),
        baseDuration: duration,
        higherLows,
        atrContracted,
        tightCloses,
      };
    }
  }

  return best;
}

export function validateSector(
  context: InstitutionalMarketContext,
  config: FlatBaseConfig = DEFAULT_FLAT_BASE_CONFIG
): boolean {
  return averageSectorScore(context) >= config.bullishSectorMin;
}

export function validateBreadth(
  context: InstitutionalMarketContext,
  config: FlatBaseConfig = DEFAULT_FLAT_BASE_CONFIG
): boolean {
  return context.marketBreadth.score >= config.bullishBreadthMin;
}

export function calculateConfidence(input: {
  baseQuality: number;
  breakoutQuality: number;
  trendQuality: number;
  volumeConfirmation: number;
  relativeStrength: number;
  sectorScore: number;
  riskRewardProxy: number;
  config: FlatBaseConfig;
}): number {
  const w = input.config.confidenceWeights;
  const total =
    w.baseQuality +
    w.breakoutQuality +
    w.trendQuality +
    w.volumeConfirmation +
    w.relativeStrength +
    w.sector +
    w.riskReward;
  const composite =
    (input.baseQuality * w.baseQuality +
      input.breakoutQuality * w.breakoutQuality +
      input.trendQuality * w.trendQuality +
      input.volumeConfirmation * w.volumeConfirmation +
      input.relativeStrength * w.relativeStrength +
      input.sectorScore * w.sector +
      input.riskRewardProxy * w.riskReward) /
    Math.max(total, 0.0001);
  return clamp(
    round(composite, 1),
    input.config.scoreFloor,
    input.config.scoreCeiling
  );
}

export function detectFlatBase(
  context: FlatBaseDetectionContext
): FlatBaseDetection {
  const config = resolveFlatBaseConfig(context.config);
  const warnings: string[] = [];
  const reasons: string[] = [];
  const data = context.input.flatBase;
  const candles = data.candlesDaily;

  if (candles.length < config.minimumDailyCandles) {
    return createEmptyFlatBaseDetection(
      ["Insufficient daily OHLC for Flat Base."],
      ["Enough Candles missing."]
    );
  }

  const eligible = isStrategyEligible(
    FLAT_BASE_STRATEGY_ID,
    context.eligibleStrategies ?? []
  );
  if (!eligible) {
    return createEmptyFlatBaseDetection(
      ["Eligible Strategy gate failed for Flat Base."],
      ["Eligible Strategy gate failed for Flat Base."]
    );
  }

  if (data.newsDriven === true) {
    return createEmptyFlatBaseDetection(
      ["News-driven move — Flat Base rejected."],
      ["News-only move — not institutional base."]
    );
  }

  const last = candles[candles.length - 1]!;
  const mid = (last.high + last.low) / 2 || last.close;
  if (
    Number.isFinite(mid) &&
    mid > 0 &&
    (last.high - last.low) / mid >= config.circuitMovePct
  ) {
    return createEmptyFlatBaseDetection(
      ["Circuit-like range — rejected."],
      ["Circuit movement — Flat Base invalid."]
    );
  }

  const ema20 = data.ema20;
  const ema50 = data.ema50;
  const ema150 = data.ema150;
  const ema200 = data.ema200;
  if (
    ema20 === null ||
    ema50 === null ||
    ema150 === null ||
    ema200 === null ||
    !Number.isFinite(ema20) ||
    !Number.isFinite(ema50) ||
    !Number.isFinite(ema150) ||
    !Number.isFinite(ema200)
  ) {
    return createEmptyFlatBaseDetection(
      ["EMA stack incomplete."],
      ["Trend structure incomplete."]
    );
  }

  const base = detectFlatBaseGeometry(candles, config);
  if (!base) {
    return createEmptyFlatBaseDetection(
      ["No valid flat base."],
      ["Valid Bases missing — flat consolidation not detected."]
    );
  }

  if (base.baseDepthPct > config.maxBaseDepthPct) {
    return createEmptyFlatBaseDetection(
      ["Deep Base Rejection."],
      ["Deep Base Rejection — depth exceeds 15% limit."]
    );
  }

  if (!base.tightCloses && !base.atrContracted) {
    return createEmptyFlatBaseDetection(
      ["Wide Base Rejection."],
      ["Wide Base Rejection — volatility not contracted."]
    );
  }

  const prior = validatePriorTrend({
    candles,
    ema50,
    ema150,
    ema200,
    lastClose: last.close,
    relativeStrength: data.relativeStrength,
    config,
    baseStartIndex: base.startIndex,
  });
  if (!prior.valid) {
    return createEmptyFlatBaseDetection(prior.warnings, prior.warnings);
  }
  reasons.push(...prior.reasons);

  if (base.atrContracted) {
    reasons.push("Volatility contracted throughout the base.");
  }
  reasons.push("Price remained within acceptable depth.");

  // Distribution check in base
  const baseWindow = candles.slice(base.startIndex, base.endIndex + 1);
  const earlyVol = averageVolume(
    baseWindow.slice(0, Math.ceil(baseWindow.length / 2))
  );
  const lateVol = averageVolume(
    baseWindow.slice(Math.floor(baseWindow.length / 2))
  );
  if (earlyVol > 0 && lateVol > earlyVol * 1.4) {
    const downBars = baseWindow.filter((c) => c.close < c.open).length;
    if (downBars > baseWindow.length * 0.55) {
      return createEmptyFlatBaseDetection(
        ["Distribution in base."],
        ["Distribution — Flat Base invalidated."]
      );
    }
  }

  const pivotPrice = base.pivotPrice;

  if (!(Number.isFinite(data.vwap) && data.vwap > 0 && last.close >= data.vwap)) {
    return createEmptyFlatBaseDetection(
      ["Price below VWAP."],
      ["VWAP alignment failed."]
    );
  }

  if (!(ema20 > ema50)) {
    return createEmptyFlatBaseDetection(
      ["EMA20 not above EMA50."],
      ["Weak trend — EMA alignment failed on breakout."]
    );
  }

  const avgVol =
    data.averageVolume20d &&
    Number.isFinite(data.averageVolume20d) &&
    data.averageVolume20d > 0
      ? data.averageVolume20d
      : averageVolume(candles.slice(-20));

  const closeStrength =
    last.high > last.low
      ? (last.close - last.low) / (last.high - last.low)
      : 0.5;

  const breakoutClose = last.close > pivotPrice;
  const volumeOk =
    (data.relativeVolume === null ||
      !Number.isFinite(data.relativeVolume) ||
      data.relativeVolume >= config.minBreakoutRelativeVolume) &&
    avgVol > 0 &&
    last.volume >= avgVol * config.breakoutVolumeMultiple;

  if (!breakoutClose) {
    return createEmptyFlatBaseDetection(
      ["Breakout not confirmed above pivot."],
      ["False Breakout — close below pivot."]
    );
  }
  if (!volumeOk) {
    return createEmptyFlatBaseDetection(
      ["Weak volume on breakout."],
      ["Weak Volume — institutional participation missing."]
    );
  }
  if (closeStrength < config.breakoutCloseStrengthFraction) {
    return createEmptyFlatBaseDetection(
      ["Weak breakout close."],
      ["Weak close — breakout strength insufficient."]
    );
  }

  const extension =
    pivotPrice > 0 ? (last.close - pivotPrice) / pivotPrice : 0;
  if (extension > config.maxExtensionBeyondPivotPct) {
    return createEmptyFlatBaseDetection(
      ["Late breakout — extended beyond pivot."],
      ["Late Breakout — extension excessive."]
    );
  }

  const priorBar = candles[candles.length - 2];
  if (
    priorBar &&
    last.open > priorBar.high * 1.02 &&
    last.close < last.open &&
    last.volume < avgVol
  ) {
    return createEmptyFlatBaseDetection(
      ["Gap exhaustion."],
      ["Gap exhaustion — breakout rejected."]
    );
  }

  const rs = data.relativeStrength;
  const rsConfirmed =
    rs === null ||
    rs === undefined ||
    !Number.isFinite(rs) ||
    rs >= config.minRelativeStrength;
  if (!rsConfirmed) {
    return createEmptyFlatBaseDetection(
      ["Weak Relative Strength."],
      ["Weak Relative Strength — leadership missing."]
    );
  }

  const sectorConfirmed = validateSector(context.marketContext, config);
  const breadthConfirmed = validateBreadth(context.marketContext, config);
  if (!sectorConfirmed) {
    return createEmptyFlatBaseDetection(
      ["Weak sector."],
      ["Weak Sector — leadership missing."]
    );
  }
  if (!breadthConfirmed) {
    return createEmptyFlatBaseDetection(
      ["Weak breadth."],
      ["Weak Breadth — market participation missing."]
    );
  }

  const riskMode = context.marketContext.riskMode;
  if (config.blockedRiskModes.includes(riskMode)) {
    return createEmptyFlatBaseDetection(
      ["Risk Off blocks Flat Base buys."],
      ["Risk Off — Flat Base buys blocked."]
    );
  }
  if (
    config.requireRiskOnOrNeutral &&
    riskMode !== "Risk On" &&
    riskMode !== "Neutral"
  ) {
    return createEmptyFlatBaseDetection(
      ["Risk mode not supportive."],
      ["Risk regime incompatible with Flat Base."]
    );
  }

  if (config.blockedRegimes.includes(context.regime.regime)) {
    return createEmptyFlatBaseDetection(
      [`Regime ${context.regime.regime} blocked.`],
      ["Market regime incompatible with Flat Base."]
    );
  }
  if (
    config.compatibleRegimes.length > 0 &&
    !config.compatibleRegimes.includes(context.regime.regime)
  ) {
    return createEmptyFlatBaseDetection(
      ["Market regime not compatible."],
      ["Market regime incompatible with Flat Base."]
    );
  }
  if (context.confidence.score < config.minRegimeConfidence) {
    return createEmptyFlatBaseDetection(
      ["Regime confidence too low."],
      ["Market regime confidence insufficient."]
    );
  }
  if (context.marketContext.volatility.score > config.maxVolatilityScore) {
    return createEmptyFlatBaseDetection(
      ["Volatility too high."],
      ["High volatility — Flat Base rejected."]
    );
  }

  reasons.push("Breakout confirmed with institutional volume.");
  reasons.push("Sector leadership supports continuation.");

  const baseQuality = clamp(
    round(
      50 +
        (base.atrContracted ? 15 : 0) +
        (base.tightCloses ? 15 : 0) +
        (base.higherLows ? 10 : 0) +
        clamp(15 - base.baseDepthPct * 80, 0, 15),
      1
    ),
    0,
    100
  );
  const breakoutQuality = clamp(
    round(55 + closeStrength * 25 + (volumeOk ? 15 : 0), 1),
    0,
    100
  );
  const trendQuality = prior.score;
  const volumeConfirmation = clamp(
    round(50 + (data.relativeVolume ?? 1) * 20 + (volumeOk ? 15 : 0), 1),
    0,
    100
  );

  const confidence = Math.max(
    config.confidenceFloor,
    calculateConfidence({
      baseQuality,
      breakoutQuality,
      trendQuality,
      volumeConfirmation,
      relativeStrength: clamp(rs ?? 60, 0, 100),
      sectorScore: averageSectorScore(context.marketContext),
      riskRewardProxy: 70,
      config,
    })
  );

  const direction: FlatBaseDirection = "BUY";

  return {
    detected: true,
    direction,
    pivotPrice: round(pivotPrice, 4),
    baseDepth: base.baseDepth,
    baseDepthPct: base.baseDepthPct,
    baseDuration: base.baseDuration,
    baseLow: base.baseLow,
    baseQuality,
    breakoutQuality,
    trendQuality,
    volumeConfirmation,
    ema20,
    ema50,
    ema150,
    ema200,
    vwap: data.vwap,
    atr: data.atr ?? 0,
    flatBaseValid: true,
    baseValid: true,
    breakoutConfirmed: true,
    volumeConfirmed: volumeOk,
    rsConfirmed,
    breadthConfirmed,
    sectorConfirmed,
    marketConfirmed: true,
    priorAdvancePct: prior.priorAdvancePct,
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

export type { FlatBaseMarketData };
