/**
 * Cup & Handle utilities — Sprint 11B.3Q.
 * Pure cup / handle / breakout detection helpers.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { isStrategyEligible } from "../StrategyUtils";
import {
  DEFAULT_CUP_HANDLE_CONFIG,
  CUP_HANDLE_STRATEGY_ID,
  resolveCupHandleConfig,
  type CupHandleConfig,
} from "./CupHandleConstants";
import type {
  CupGeometry,
  CupHandleCandle,
  CupHandleDetection,
  CupHandleDetectionContext,
  CupHandleDirection,
  CupHandleMarketData,
  HandleGeometry,
} from "./CupHandleTypes";

export { resolveCupHandleConfig };

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
  config: CupHandleConfig = DEFAULT_CUP_HANDLE_CONFIG
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

export function createEmptyCupHandleDetection(
  warnings: string[] = [],
  reasons: string[] = []
): CupHandleDetection {
  return {
    detected: false,
    direction: "NONE",
    cupDepth: 0,
    cupDepthPct: 0,
    cupDuration: 0,
    handleDepth: 0,
    handleDepthPct: 0,
    handleDuration: 0,
    pivotPrice: 0,
    leftPeakPrice: 0,
    cupBottomPrice: 0,
    rightPeakPrice: 0,
    handleHigh: 0,
    handleLow: 0,
    cupQuality: 0,
    handleQuality: 0,
    breakoutQuality: 0,
    volumeConfirmation: 0,
    ema20: 0,
    ema50: 0,
    ema150: 0,
    ema200: 0,
    vwap: 0,
    atr: 0,
    roundedCup: false,
    handleValid: false,
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

function averageVolume(candles: readonly CupHandleCandle[]): number {
  if (candles.length === 0) return 0;
  return candles.reduce((s, c) => s + c.volume, 0) / candles.length;
}

export function isRoundedCup(
  candles: readonly CupHandleCandle[],
  leftIdx: number,
  bottomIdx: number,
  rightIdx: number,
  config: CupHandleConfig
): { rounded: boolean; score: number; reasons: string[]; warnings: string[] } {
  const reasons: string[] = [];
  const warnings: string[] = [];
  if (rightIdx <= leftIdx + 4 || bottomIdx <= leftIdx || bottomIdx >= rightIdx) {
    return {
      rounded: false,
      score: 20,
      reasons: [],
      warnings: ["Invalid cup window."],
    };
  }

  const leftPeak = candles[leftIdx]!.high;
  const bottom = candles[bottomIdx]!.low;
  const depth = leftPeak - bottom;
  if (depth <= 0) {
    return {
      rounded: false,
      score: 15,
      reasons: [],
      warnings: ["Cup depth invalid."],
    };
  }

  const zone = bottom + depth * config.bottomZoneFraction;
  let dwell = 0;
  for (let i = leftIdx; i <= rightIdx; i += 1) {
    if (candles[i]!.low <= zone) dwell += 1;
  }
  if (dwell < config.minBottomDwellBars) {
    warnings.push("V-shaped Cup Rejection — bottom too sharp.");
    return { rounded: false, score: 25, reasons: [], warnings };
  }

  const descentBars = bottomIdx - leftIdx;
  const ascentBars = rightIdx - bottomIdx;
  const asymmetry =
    Math.abs(descentBars - ascentBars) / Math.max(descentBars + ascentBars, 1);
  if (asymmetry > config.maxVShapeAsymmetry) {
    warnings.push("V-shaped Cup Rejection — asymmetric legs.");
    return { rounded: false, score: 30, reasons: [], warnings };
  }

  reasons.push("Rounded cup formation identified.");
  return {
    rounded: true,
    score: clamp(70 + dwell * 2 - asymmetry * 20, 55, 95),
    reasons,
    warnings,
  };
}

export function detectCupGeometry(
  candles: readonly CupHandleCandle[],
  config: CupHandleConfig
): CupGeometry | null {
  const n = candles.length;
  if (n < config.minCupDurationBars + config.minHandleDurationBars + 2) {
    return null;
  }

  let best: CupGeometry | null = null;
  let bestScore = -1;

  const searchEnd = n - config.minHandleDurationBars - 1;
  const step = Math.max(1, Math.floor((searchEnd - config.minCupDurationBars) / 40));

  for (let left = 0; left < searchEnd - config.minCupDurationBars; left += step) {
    const maxRight = Math.min(left + config.maxCupDurationBars, searchEnd);
    for (
      let right = left + config.minCupDurationBars;
      right <= maxRight;
      right += step
    ) {
      const leftPeak = candles[left]!.high;
      let bottomIdx = left;
      let bottomPrice = candles[left]!.low;
      for (let i = left + 1; i < right; i += 1) {
        if (candles[i]!.low < bottomPrice) {
          bottomPrice = candles[i]!.low;
          bottomIdx = i;
        }
      }
      if (bottomIdx <= left || bottomIdx >= right) continue;

      const depth = leftPeak - bottomPrice;
      const depthPct = depth / leftPeak;
      if (
        depthPct < config.minCupDepthPct ||
        depthPct > config.maxCupDepthPct
      ) {
        continue;
      }

      const rightPeak = candles[right]!.high;
      if (rightPeak < leftPeak * config.rightPeakRecoveryMin) continue;

      const rounded = isRoundedCup(candles, left, bottomIdx, right, config);
      if (!rounded.rounded) continue;

      let higherLows = true;
      let priorLow = candles[bottomIdx]!.low;
      for (let i = bottomIdx + 1; i <= right; i += 1) {
        const swing = candles[i]!.low;
        if (i > bottomIdx + 2 && swing < priorLow * 0.97) {
          higherLows = false;
          break;
        }
        priorLow = Math.max(priorLow, swing * 0.995);
      }

      const duration = right - left + 1;
      const score =
        rounded.score +
        (higherLows ? 10 : 0) +
        clamp((1 - Math.abs(depthPct - 0.2) / 0.2) * 10, 0, 10);

      if (score > bestScore) {
        bestScore = score;
        best = {
          leftPeakIndex: left,
          leftPeakPrice: round(leftPeak, 4),
          cupBottomIndex: bottomIdx,
          cupBottomPrice: round(bottomPrice, 4),
          rightPeakIndex: right,
          rightPeakPrice: round(rightPeak, 4),
          cupDepth: round(depth, 4),
          cupDepthPct: round(depthPct, 4),
          cupDuration: duration,
          cupWidth: duration,
          rounded: true,
          higherLows,
        };
      }
    }
  }

  return best;
}

export function detectHandleGeometry(
  candles: readonly CupHandleCandle[],
  cup: CupGeometry,
  config: CupHandleConfig
): HandleGeometry | null {
  const start = cup.rightPeakIndex;
  const maxEnd = Math.min(
    start + config.maxHandleDurationBars,
    candles.length - 2
  );
  if (maxEnd - start < config.minHandleDurationBars) return null;

  let best: HandleGeometry | null = null;
  let bestScore = -1;

  for (
    let end = start + config.minHandleDurationBars;
    end <= maxEnd;
    end += 1
  ) {
    const window = candles.slice(start, end + 1);
    const handleHigh = Math.max(...window.map((c) => c.high));
    const handleLow = Math.min(...window.map((c) => c.low));
    const handleDepth = handleHigh - handleLow;
    const handleDepthPct = handleDepth / Math.max(handleHigh, 0.0001);

    if (handleDepthPct > config.maxHandleDepthPct) continue;

    const cupMid =
      cup.cupBottomPrice +
      (cup.leftPeakPrice - cup.cupBottomPrice) * config.handleUpperHalfMin;
    const upperHalf = handleLow >= cupMid * 0.98;
    if (!upperHalf) continue;

    const earlyVol = averageVolume(
      window.slice(0, Math.ceil(window.length / 2))
    );
    const lateVol = averageVolume(
      window.slice(Math.floor(window.length / 2))
    );
    const decliningVolume =
      earlyVol <= 0 ||
      lateVol <= earlyVol * config.handleVolumeDeclineMaxRatio;

    const midPrice = (handleHigh + handleLow) / 2;
    const rangePct = midPrice > 0 ? handleDepth / midPrice : 1;
    const tightRange = rangePct <= config.handleMaxRangePct;

    if (!decliningVolume && !tightRange) continue;

    const duration = end - start + 1;
    const score =
      (decliningVolume ? 40 : 20) +
      (tightRange ? 30 : 10) +
      (upperHalf ? 20 : 0) +
      clamp(20 - handleDepthPct * 100, 0, 20);

    if (score > bestScore) {
      bestScore = score;
      best = {
        startIndex: start,
        endIndex: end,
        handleHigh: round(handleHigh, 4),
        handleLow: round(handleLow, 4),
        handleDepth: round(handleDepth, 4),
        handleDepthPct: round(handleDepthPct, 4),
        handleDuration: duration,
        decliningVolume,
        upperHalf,
        tightRange,
      };
    }
  }

  return best;
}

export function validateSector(
  context: InstitutionalMarketContext,
  config: CupHandleConfig = DEFAULT_CUP_HANDLE_CONFIG
): boolean {
  return averageSectorScore(context) >= config.bullishSectorMin;
}

export function validateBreadth(
  context: InstitutionalMarketContext,
  config: CupHandleConfig = DEFAULT_CUP_HANDLE_CONFIG
): boolean {
  return context.marketBreadth.score >= config.bullishBreadthMin;
}

export function calculateConfidence(input: {
  cupQuality: number;
  handleQuality: number;
  breakoutQuality: number;
  volumeConfirmation: number;
  relativeStrength: number;
  sectorScore: number;
  riskRewardProxy: number;
  config: CupHandleConfig;
}): number {
  const w = input.config.confidenceWeights;
  const total =
    w.cupQuality +
    w.handleQuality +
    w.breakoutQuality +
    w.volumeConfirmation +
    w.relativeStrength +
    w.sector +
    w.riskReward;
  const composite =
    (input.cupQuality * w.cupQuality +
      input.handleQuality * w.handleQuality +
      input.breakoutQuality * w.breakoutQuality +
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

export function detectCupHandle(
  context: CupHandleDetectionContext
): CupHandleDetection {
  const config = resolveCupHandleConfig(context.config);
  const warnings: string[] = [];
  const reasons: string[] = [];
  const data = context.input.cupHandle;
  const candles = data.candlesDaily;

  if (candles.length < config.minimumDailyCandles) {
    return createEmptyCupHandleDetection(
      ["Insufficient daily OHLC for Cup & Handle."],
      ["Enough Candles missing."]
    );
  }

  const eligible = isStrategyEligible(
    CUP_HANDLE_STRATEGY_ID,
    context.eligibleStrategies ?? []
  );
  if (!eligible) {
    return createEmptyCupHandleDetection(
      ["Eligible Strategy gate failed for Cup & Handle."],
      ["Eligible Strategy gate failed for Cup & Handle."]
    );
  }

  if (data.newsDriven === true) {
    return createEmptyCupHandleDetection(
      ["News-driven move — Cup & Handle rejected."],
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
    return createEmptyCupHandleDetection(
      ["Circuit-like range — rejected."],
      ["Circuit movement — Cup & Handle invalid."]
    );
  }

  const cup = detectCupGeometry(candles, config);
  if (!cup) {
    return createEmptyCupHandleDetection(
      ["No valid cup pattern."],
      ["Valid Cup Patterns missing — cup not detected."]
    );
  }

  const roundedCheck = isRoundedCup(
    candles,
    cup.leftPeakIndex,
    cup.cupBottomIndex,
    cup.rightPeakIndex,
    config
  );
  if (!roundedCheck.rounded) {
    return createEmptyCupHandleDetection(
      roundedCheck.warnings,
      roundedCheck.warnings
    );
  }
  reasons.push(...roundedCheck.reasons);

  if (cup.cupDepthPct < config.minCupDepthPct) {
    return createEmptyCupHandleDetection(
      ["Shallow Cup — depth insufficient."],
      ["Shallow Cup — depth below institutional minimum."]
    );
  }
  if (cup.cupDepthPct > config.maxCupDepthPct) {
    return createEmptyCupHandleDetection(
      ["Deep Cup — depth excessive."],
      ["Deep Cup — depth above institutional maximum."]
    );
  }

  const handle = detectHandleGeometry(candles, cup, config);
  if (!handle) {
    return createEmptyCupHandleDetection(
      ["Handle invalid."],
      ["Deep Handle Rejection or handle not formed."]
    );
  }
  if (handle.handleDepthPct > config.maxHandleDepthPct) {
    return createEmptyCupHandleDetection(
      ["Deep Handle Rejection."],
      ["Deep Handle Rejection — pullback exceeds limit."]
    );
  }
  if (!handle.decliningVolume) {
    warnings.push("Handle volume not clearly declining.");
  } else {
    reasons.push("Handle formed with declining volume.");
    reasons.push("Supply absorbed during consolidation.");
  }

  const pivotPrice = handle.handleHigh;

  const ema20 = data.ema20;
  const ema50 = data.ema50;
  const ema150 = data.ema150;
  const ema200 = data.ema200;
  if (
    ema20 === null ||
    ema50 === null ||
    !Number.isFinite(ema20) ||
    !Number.isFinite(ema50)
  ) {
    return createEmptyCupHandleDetection(
      ["EMA stack incomplete."],
      ["Trend structure incomplete."]
    );
  }
  if (!(ema20 > ema50)) {
    return createEmptyCupHandleDetection(
      ["EMA20 not above EMA50."],
      ["Weak trend — EMA alignment failed."]
    );
  }

  if (
    !(Number.isFinite(data.vwap) && data.vwap > 0 && last.close >= data.vwap)
  ) {
    return createEmptyCupHandleDetection(
      ["Price below VWAP."],
      ["VWAP alignment failed."]
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
    return createEmptyCupHandleDetection(
      ["Breakout not confirmed above handle."],
      ["False Breakout — close below pivot."]
    );
  }
  if (!volumeOk) {
    return createEmptyCupHandleDetection(
      ["Weak volume on breakout."],
      ["Weak Volume — institutional participation missing."]
    );
  }
  if (closeStrength < config.breakoutCloseStrengthFraction) {
    return createEmptyCupHandleDetection(
      ["Weak breakout close."],
      ["Weak breakout — close strength insufficient."]
    );
  }

  const extension =
    pivotPrice > 0 ? (last.close - pivotPrice) / pivotPrice : 0;
  if (extension > config.maxExtensionBeyondPivotPct) {
    return createEmptyCupHandleDetection(
      ["Late breakout — extended beyond pivot."],
      ["Late Breakout — extension excessive."]
    );
  }

  const prior = candles[candles.length - 2];
  if (
    prior &&
    last.open > prior.high * 1.02 &&
    last.close < last.open &&
    last.volume < avgVol
  ) {
    return createEmptyCupHandleDetection(
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
    return createEmptyCupHandleDetection(
      ["Weak Relative Strength."],
      ["Weak Relative Strength — leadership missing."]
    );
  }

  const sectorConfirmed = validateSector(context.marketContext, config);
  const breadthConfirmed = validateBreadth(context.marketContext, config);
  if (!sectorConfirmed) {
    return createEmptyCupHandleDetection(
      ["Weak sector."],
      ["Weak Sector — leadership missing."]
    );
  }
  if (!breadthConfirmed) {
    return createEmptyCupHandleDetection(
      ["Weak breadth."],
      ["Weak Breadth — market participation missing."]
    );
  }

  const riskMode = context.marketContext.riskMode;
  if (config.blockedRiskModes.includes(riskMode)) {
    return createEmptyCupHandleDetection(
      ["Risk Off blocks Cup & Handle buys."],
      ["Risk Off — Cup & Handle buys blocked."]
    );
  }
  if (
    config.requireRiskOnOrNeutral &&
    riskMode !== "Risk On" &&
    riskMode !== "Neutral"
  ) {
    return createEmptyCupHandleDetection(
      ["Risk mode not supportive."],
      ["Risk regime incompatible with Cup & Handle."]
    );
  }

  if (config.blockedRegimes.includes(context.regime.regime)) {
    return createEmptyCupHandleDetection(
      [`Regime ${context.regime.regime} blocked.`],
      ["Market regime incompatible with Cup & Handle."]
    );
  }
  if (
    config.compatibleRegimes.length > 0 &&
    !config.compatibleRegimes.includes(context.regime.regime)
  ) {
    return createEmptyCupHandleDetection(
      ["Market regime not compatible."],
      ["Market regime incompatible with Cup & Handle."]
    );
  }
  if (context.confidence.score < config.minRegimeConfidence) {
    return createEmptyCupHandleDetection(
      ["Regime confidence too low."],
      ["Market regime confidence insufficient."]
    );
  }
  if (context.marketContext.volatility.score > config.maxVolatilityScore) {
    return createEmptyCupHandleDetection(
      ["Volatility too high."],
      ["High volatility — Cup & Handle rejected."]
    );
  }

  reasons.push("Breakout confirmed with institutional participation.");
  reasons.push(
    "Relative strength and sector leadership support continuation."
  );

  const cupQuality = clamp(
    round(
      55 +
        (cup.rounded ? 15 : 0) +
        (cup.higherLows ? 10 : 0) +
        clamp((1 - Math.abs(cup.cupDepthPct - 0.22) / 0.22) * 15, 0, 15),
      1
    ),
    0,
    100
  );
  const handleQuality = clamp(
    round(
      50 +
        (handle.decliningVolume ? 20 : 0) +
        (handle.tightRange ? 15 : 0) +
        (handle.upperHalf ? 15 : 0),
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
  const volumeConfirmation = clamp(
    round(50 + (data.relativeVolume ?? 1) * 20 + (volumeOk ? 15 : 0), 1),
    0,
    100
  );

  const confidence = Math.max(
    config.confidenceFloor,
    calculateConfidence({
      cupQuality,
      handleQuality,
      breakoutQuality,
      volumeConfirmation,
      relativeStrength: clamp(rs ?? 60, 0, 100),
      sectorScore: averageSectorScore(context.marketContext),
      riskRewardProxy: 70,
      config,
    })
  );

  const direction: CupHandleDirection = "BUY";

  return {
    detected: true,
    direction,
    cupDepth: cup.cupDepth,
    cupDepthPct: cup.cupDepthPct,
    cupDuration: cup.cupDuration,
    handleDepth: handle.handleDepth,
    handleDepthPct: handle.handleDepthPct,
    handleDuration: handle.handleDuration,
    pivotPrice: round(pivotPrice, 4),
    leftPeakPrice: cup.leftPeakPrice,
    cupBottomPrice: cup.cupBottomPrice,
    rightPeakPrice: cup.rightPeakPrice,
    handleHigh: handle.handleHigh,
    handleLow: handle.handleLow,
    cupQuality,
    handleQuality,
    breakoutQuality,
    volumeConfirmation,
    ema20,
    ema50,
    ema150: ema150 ?? 0,
    ema200: ema200 ?? 0,
    vwap: data.vwap,
    atr: data.atr ?? 0,
    roundedCup: true,
    handleValid: true,
    breakoutConfirmed: true,
    volumeConfirmed: volumeOk,
    rsConfirmed,
    breadthConfirmed,
    sectorConfirmed,
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

export type { CupHandleMarketData };
