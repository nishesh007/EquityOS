/**
 * Darvas Box utilities — Sprint 11B.3N.
 * Pure detection helpers for Nicolas Darvas consolidation boxes.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { isStrategyEligible } from "../StrategyUtils";
import {
  DEFAULT_DARVAS_BOX_CONFIG,
  DARVAS_BOX_STRATEGY_ID,
  resolveDarvasBoxConfig,
  type DarvasBoxConfig,
} from "./DarvasBoxConstants";
import type {
  DarvasBoxCandle,
  DarvasBoxDetection,
  DarvasBoxDetectionContext,
  DarvasBoxDirection,
  DarvasBoxGeometry,
} from "./DarvasBoxTypes";

export { resolveDarvasBoxConfig };

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
  config: DarvasBoxConfig = DEFAULT_DARVAS_BOX_CONFIG
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

export function createEmptyDarvasBoxDetection(
  warnings: string[] = [],
  reasons: string[] = []
): DarvasBoxDetection {
  return {
    detected: false,
    direction: "NONE",
    boxHigh: 0,
    boxLow: 0,
    boxHeight: 0,
    boxDuration: 0,
    resistanceTouches: 0,
    supportTouches: 0,
    failedBreakoutAttempts: 0,
    boxQuality: 0,
    breakoutQuality: 0,
    volumeConfirmation: 0,
    trendStructure: 0,
    ema20: 0,
    ema50: 0,
    ema150: 0,
    ema200: 0,
    vwap: 0,
    atr: 0,
    breakoutConfirmed: false,
    volumeConfirmed: false,
    rsConfirmed: false,
    breadthConfirmed: false,
    sectorConfirmed: false,
    marketConfirmed: false,
    confidence: 0,
    reasons,
    warnings,
  };
}

function barRange(c: DarvasBoxCandle): number {
  return Math.max(c.high - c.low, 0.0001);
}

function closePositionInBar(c: DarvasBoxCandle): number {
  return (c.close - c.low) / barRange(c);
}

function averageVolume(candles: readonly DarvasBoxCandle[]): number {
  if (candles.length === 0) return 0;
  return candles.reduce((s, c) => s + c.volume, 0) / candles.length;
}

function averageRange(candles: readonly DarvasBoxCandle[]): number {
  if (candles.length === 0) return 0;
  return candles.reduce((s, c) => s + barRange(c), 0) / candles.length;
}

function isCircuitMove(candle: DarvasBoxCandle, config: DarvasBoxConfig): boolean {
  const mid = (candle.high + candle.low) / 2 || candle.close;
  if (!Number.isFinite(mid) || mid <= 0) return false;
  return (candle.high - candle.low) / mid >= config.circuitMovePct;
}

export function validateSector(
  context: InstitutionalMarketContext,
  config: DarvasBoxConfig = DEFAULT_DARVAS_BOX_CONFIG
): boolean {
  return averageSectorScore(context) >= config.bullishSectorMin;
}

export function validateBreadth(
  context: InstitutionalMarketContext,
  config: DarvasBoxConfig = DEFAULT_DARVAS_BOX_CONFIG
): boolean {
  return context.marketBreadth.score >= config.bullishBreadthMin;
}

export function evaluateBoxWindow(
  candles: readonly DarvasBoxCandle[],
  startIndex: number,
  endIndex: number,
  config: DarvasBoxConfig
): (DarvasBoxGeometry & { quality: number; volumeContracted: boolean }) | null {
  if (endIndex <= startIndex) return null;
  const window = candles.slice(startIndex, endIndex + 1);
  const duration = window.length;
  if (duration < config.minBoxSessions || duration > config.maxBoxSessions) {
    return null;
  }

  const rawHigh = Math.max(...window.map((c) => c.high));
  const rawLow = Math.min(...window.map((c) => c.low));

  // Prefer a resistance level with multiple touches (ignore single outlier wicks).
  const highs = window.map((c) => c.high).sort((a, b) => b - a);
  let boxHigh = rawHigh;
  for (const candidate of highs.slice(0, Math.min(5, highs.length))) {
    const touches = window.filter(
      (c) =>
        Math.abs(c.high - candidate) / candidate <=
        config.resistanceTouchTolerancePct
    ).length;
    if (touches >= config.minResistanceTouches) {
      boxHigh = candidate;
      break;
    }
  }

  const lows = window.map((c) => c.low).sort((a, b) => a - b);
  let boxLow = rawLow;
  for (const candidate of lows.slice(0, Math.min(5, lows.length))) {
    const touches = window.filter(
      (c) =>
        Math.abs(c.low - candidate) / candidate <=
        config.supportTouchTolerancePct
    ).length;
    if (touches >= config.minSupportTouches) {
      boxLow = candidate;
      break;
    }
  }

  const boxHeight = boxHigh - boxLow;
  const mid = (boxHigh + boxLow) / 2 || boxHigh;
  if (mid <= 0 || boxHeight <= 0) return null;

  const widthPct = boxHeight / mid;
  if (widthPct > config.maxBoxWidthPct || widthPct < config.minBoxWidthPct) {
    return null;
  }

  let resistanceTouches = 0;
  let supportTouches = 0;
  let failedBreakoutAttempts = 0;

  for (const c of window) {
    if (
      Math.abs(c.high - boxHigh) / boxHigh <= config.resistanceTouchTolerancePct
    ) {
      resistanceTouches += 1;
    }
    if (
      Math.abs(c.low - boxLow) / boxLow <= config.supportTouchTolerancePct
    ) {
      supportTouches += 1;
    }
    // Failed breakout: wick above resistance but close back inside
    if (
      c.high > boxHigh * (1 + config.resistanceTouchTolerancePct) &&
      c.close < boxHigh
    ) {
      failedBreakoutAttempts += 1;
    }
  }

  if (resistanceTouches < config.minResistanceTouches) return null;
  if (supportTouches < config.minSupportTouches) return null;

  // Price mostly remains inside (closes inside)
  const closesInside = window.filter(
    (c) => c.close <= boxHigh && c.close >= boxLow
  ).length;
  if (closesInside / duration < 0.75) return null;

  const early = window.slice(0, Math.floor(duration / 2));
  const late = window.slice(Math.floor(duration / 2));
  const earlyVol = averageVolume(early);
  const lateVol = averageVolume(late);
  const volumeContracted =
    earlyVol > 0 && lateVol <= earlyVol * config.volumeContractionMaxRatio;

  const earlyRange = averageRange(early);
  const lateRange = averageRange(late);
  const decliningVol =
    earlyRange > 0 && lateRange <= earlyRange * 0.95;

  let quality = 45;
  quality += Math.min(resistanceTouches * 6, 18);
  quality += Math.min(supportTouches * 5, 15);
  quality += Math.min(failedBreakoutAttempts * 8, 16);
  if (volumeContracted) quality += 12;
  if (decliningVol) quality += 8;
  if (widthPct <= config.maxBoxWidthPct * 0.6) quality += 6;
  quality = clamp(quality, 0, 100);

  return {
    boxHigh: round(boxHigh, 4),
    boxLow: round(boxLow, 4),
    boxHeight: round(boxHeight, 4),
    boxDuration: duration,
    startIndex,
    endIndex,
    resistanceTouches,
    supportTouches,
    failedBreakoutAttempts,
    quality,
    volumeContracted,
  };
}

export function findBestDarvasBox(
  candles: readonly DarvasBoxCandle[],
  excludeLastBars: number,
  config: DarvasBoxConfig
): (DarvasBoxGeometry & { quality: number; volumeContracted: boolean }) | null {
  const end = candles.length - 1 - excludeLastBars;
  if (end < config.minBoxSessions) return null;

  let best: (DarvasBoxGeometry & {
    quality: number;
    volumeContracted: boolean;
  }) | null = null;

  for (
    let duration = config.minBoxSessions;
    duration <= Math.min(config.maxBoxSessions, end + 1);
    duration++
  ) {
    const start = end - duration + 1;
    if (start < 0) continue;
    const candidate = evaluateBoxWindow(candles, start, end, config);
    if (!candidate) continue;
    if (
      !best ||
      candidate.quality > best.quality ||
      (candidate.quality === best.quality &&
        candidate.failedBreakoutAttempts > best.failedBreakoutAttempts)
    ) {
      best = candidate;
    }
  }
  return best;
}

export function calculateConfidence(input: {
  boxQuality: number;
  breakoutQuality: number;
  volumeConfirmation: number;
  trendStructure: number;
  relativeStrength: number;
  sectorScore: number;
  marketScore: number;
  riskRewardProxy: number;
  config: DarvasBoxConfig;
}): number {
  const w = input.config.confidenceWeights;
  const total =
    w.boxQuality +
    w.breakoutQuality +
    w.volumeConfirmation +
    w.trendStructure +
    w.relativeStrength +
    w.sector +
    w.market +
    w.riskReward;
  const composite =
    (input.boxQuality * w.boxQuality +
      input.breakoutQuality * w.breakoutQuality +
      input.volumeConfirmation * w.volumeConfirmation +
      input.trendStructure * w.trendStructure +
      input.relativeStrength * w.relativeStrength +
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

export function detectDarvasBox(
  context: DarvasBoxDetectionContext
): DarvasBoxDetection {
  const config = resolveDarvasBoxConfig(context.config);
  const warnings: string[] = [];
  const reasons: string[] = [];
  const data = context.input.darvasBox;
  const candles = data.candlesDaily;

  if (candles.length < config.minimumDailyCandles) {
    return createEmptyDarvasBoxDetection(
      ["Insufficient daily OHLC for Darvas Box detection."],
      ["Enough Candles missing."]
    );
  }

  const eligible = isStrategyEligible(
    DARVAS_BOX_STRATEGY_ID,
    context.eligibleStrategies ?? []
  );
  if (!eligible) {
    return createEmptyDarvasBoxDetection(
      ["Eligible Strategy gate failed for Darvas Box."],
      ["Eligible Strategy gate failed for Darvas Box."]
    );
  }

  if (data.newsDriven === true) {
    return createEmptyDarvasBoxDetection(
      ["News-driven spike — Darvas Box rejected."],
      ["News-driven price action — invalid box context."]
    );
  }

  const last = candles[candles.length - 1]!;
  if (isCircuitMove(last, config)) {
    return createEmptyDarvasBoxDetection(
      ["Circuit-like range on breakout bar — rejected."],
      ["False breakout risk — extreme range."]
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
    return createEmptyDarvasBoxDetection(
      ["EMA20/EMA50 missing."],
      ["Trend structure incomplete."]
    );
  }

  const box = findBestDarvasBox(candles, 1, config);
  if (!box) {
    return createEmptyDarvasBoxDetection(
      ["No valid Darvas Box consolidation found."],
      ["Invalid box — consolidation criteria failed."]
    );
  }

  if (!box.volumeContracted) {
    warnings.push("Volume contraction inside box is soft.");
  }

  // Breakout checks
  const closedAbove = last.close > box.boxHigh;
  if (!closedAbove) {
    return createEmptyDarvasBoxDetection(
      ["Price has not closed above Box High."],
      ["Breakout not confirmed."]
    );
  }

  const strongClose =
    closePositionInBar(last) >= config.breakoutCloseStrengthFraction;
  if (!strongClose) {
    return createEmptyDarvasBoxDetection(
      ["Weak close on breakout bar."],
      ["False breakout — weak close."]
    );
  }

  const extensionPct =
    box.boxHigh > 0 ? (last.close - box.boxHigh) / box.boxHigh : 0;
  if (extensionPct > config.maxExtensionBeyondBoxPct) {
    return createEmptyDarvasBoxDetection(
      ["Late / extended breakout beyond box tolerance."],
      ["Late breakout — price extended beyond box."]
    );
  }

  const avgVol =
    data.averageVolume20d &&
    Number.isFinite(data.averageVolume20d) &&
    data.averageVolume20d > 0
      ? data.averageVolume20d
      : averageVolume(candles.slice(box.startIndex, box.endIndex + 1));

  const volumeConfirmed =
    avgVol > 0 &&
    last.volume >= avgVol * config.breakoutVolumeMultiple &&
    (data.relativeVolume === null ||
      !Number.isFinite(data.relativeVolume) ||
      data.relativeVolume >= config.minBreakoutRelativeVolume);

  if (!volumeConfirmed) {
    return createEmptyDarvasBoxDetection(
      ["Breakout volume / relative volume insufficient."],
      ["Weak volume — breakout not institutionally confirmed."]
    );
  }

  if (!(last.close >= data.vwap && Number.isFinite(data.vwap) && data.vwap > 0)) {
    return createEmptyDarvasBoxDetection(
      ["Price below VWAP on breakout."],
      ["VWAP alignment failed."]
    );
  }

  if (!(ema20 > ema50)) {
    return createEmptyDarvasBoxDetection(
      ["EMA20 not above EMA50."],
      ["Weak trend — EMA stack not bullish."]
    );
  }

  const rs = data.relativeStrength ?? 50;
  const rsConfirmed = rs >= config.minRelativeStrength;
  if (!rsConfirmed) {
    return createEmptyDarvasBoxDetection(
      ["Weak relative strength."],
      ["Weak Relative Strength — leadership missing."]
    );
  }

  const sectorConfirmed = validateSector(context.marketContext, config);
  const breadthConfirmed = validateBreadth(context.marketContext, config);
  if (!sectorConfirmed) {
    return createEmptyDarvasBoxDetection(
      ["Weak sector for Darvas breakout."],
      ["Weak sector — leadership missing."]
    );
  }
  if (!breadthConfirmed) {
    return createEmptyDarvasBoxDetection(
      ["Weak breadth for Darvas breakout."],
      ["Weak breadth — participation missing."]
    );
  }

  const riskMode = context.marketContext.riskMode;
  if (config.blockedRiskModes.includes(riskMode)) {
    return createEmptyDarvasBoxDetection(
      ["Risk Off blocks Darvas buys."],
      ["Risk Off — Darvas Box buys blocked."]
    );
  }
  if (
    config.requireRiskOnOrNeutral &&
    riskMode !== "Risk On" &&
    riskMode !== "Neutral"
  ) {
    return createEmptyDarvasBoxDetection(
      ["Risk mode not supportive for Darvas."],
      ["Risk regime incompatible with Darvas Box."]
    );
  }

  if (config.blockedRegimes.includes(context.regime.regime)) {
    return createEmptyDarvasBoxDetection(
      [`Regime ${context.regime.regime} blocked for Darvas.`],
      ["Market regime incompatible with Darvas Box."]
    );
  }
  if (
    config.compatibleRegimes.length > 0 &&
    !config.compatibleRegimes.includes(context.regime.regime)
  ) {
    return createEmptyDarvasBoxDetection(
      ["Market regime not in compatible set for Darvas."],
      ["Market regime incompatible with Darvas Box."]
    );
  }
  if (context.confidence.score < config.minRegimeConfidence) {
    return createEmptyDarvasBoxDetection(
      ["Regime confidence too low."],
      ["Market regime confidence insufficient."]
    );
  }
  if (context.marketContext.volatility.score > config.maxVolatilityScore) {
    return createEmptyDarvasBoxDetection(
      ["Volatility too high for Darvas Box."],
      ["High volatility — Darvas Box rejected."]
    );
  }

  const marketConfirmed = true;
  const breakoutQuality = clamp(
    round(
      55 +
        closePositionInBar(last) * 20 +
        (volumeConfirmed ? 15 : 0) +
        (extensionPct < config.maxExtensionBeyondBoxPct * 0.5 ? 10 : 0),
      1
    ),
    0,
    100
  );

  const volumeConfirmation = clamp(
    round(
      60 +
        (data.relativeVolume ?? 1) * 12 +
        (box.volumeContracted ? 10 : 0),
      1
    ),
    0,
    100
  );

  const trendStructure = clamp(
    round(
      50 +
        (ema20 > ema50 ? 25 : 0) +
        (data.ema150 !== null && ema20 > data.ema150 ? 15 : 5) +
        (last.close > (data.fiftyTwoWeekHigh ?? last.close) * 0.85 ? 10 : 0),
      1
    ),
    0,
    100
  );

  reasons.push("Price has formed a valid Darvas Box.");
  reasons.push("Multiple resistance tests confirmed.");
  reasons.push("Breakout occurred with strong institutional volume.");
  reasons.push("Relative Strength confirms leadership.");
  reasons.push("Sector and market regime support continuation.");

  const confidence = Math.max(
    config.confidenceFloor,
    calculateConfidence({
      boxQuality: box.quality,
      breakoutQuality,
      volumeConfirmation,
      trendStructure,
      relativeStrength: clamp(rs, 0, 100),
      sectorScore: averageSectorScore(context.marketContext),
      marketScore: clamp(context.marketContext.confidence, 0, 100),
      riskRewardProxy: 70,
      config,
    })
  );

  const direction: DarvasBoxDirection = "BUY";

  return {
    detected: true,
    direction,
    boxHigh: box.boxHigh,
    boxLow: box.boxLow,
    boxHeight: box.boxHeight,
    boxDuration: box.boxDuration,
    resistanceTouches: box.resistanceTouches,
    supportTouches: box.supportTouches,
    failedBreakoutAttempts: box.failedBreakoutAttempts,
    boxQuality: box.quality,
    breakoutQuality,
    volumeConfirmation,
    trendStructure,
    ema20,
    ema50,
    ema150: data.ema150 ?? 0,
    ema200: data.ema200 ?? 0,
    vwap: data.vwap,
    atr: data.atr ?? 0,
    breakoutConfirmed: true,
    volumeConfirmed,
    rsConfirmed,
    breadthConfirmed,
    sectorConfirmed,
    marketConfirmed,
    confidence,
    reasons: dedupe(reasons),
    warnings: dedupe(warnings),
  };
}

/** Pure box finder for tests (no breakout/trade gates). */
export function detectBoxOnly(
  candles: readonly DarvasBoxCandle[],
  config?: Partial<DarvasBoxConfig>
): (DarvasBoxGeometry & { quality: number; volumeContracted: boolean }) | null {
  return findBestDarvasBox(
    candles,
    0,
    resolveDarvasBoxConfig(config)
  );
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
