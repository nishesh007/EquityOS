/**
 * 52-Week High Breakout utilities — Sprint 11B.3S.
 * Pure detection / validation helpers.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { isStrategyEligible } from "../StrategyUtils";
import {
  DEFAULT_FIFTY_TWO_WEEK_HIGH_CONFIG,
  FIFTY_TWO_WEEK_HIGH_STRATEGY_ID,
  resolveFiftyTwoWeekHighConfig,
  type FiftyTwoWeekHighConfig,
} from "./FiftyTwoWeekHighConstants";
import type {
  FiftyTwoWeekHighBreakoutInfo,
  FiftyTwoWeekHighCandle,
  FiftyTwoWeekHighDetection,
  FiftyTwoWeekHighDetectionContext,
  FiftyTwoWeekHighDirection,
  FiftyTwoWeekHighMarketData,
} from "./FiftyTwoWeekHighTypes";

export { resolveFiftyTwoWeekHighConfig };

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
  config: FiftyTwoWeekHighConfig = DEFAULT_FIFTY_TWO_WEEK_HIGH_CONFIG
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

export function createEmptyFiftyTwoWeekHighDetection(
  warnings: string[] = [],
  reasons: string[] = []
): FiftyTwoWeekHighDetection {
  return {
    detected: false,
    direction: "NONE",
    previous52WeekHigh: 0,
    currentBreakoutLevel: 0,
    breakoutAge: 0,
    distanceFromBreakout: 0,
    distanceFromBreakoutAtr: 0,
    breakoutQuality: 0,
    trendQuality: 0,
    volumeConfirmation: 0,
    momentumPersistence: 0,
    ema20: 0,
    ema50: 0,
    ema150: 0,
    ema200: 0,
    vwap: 0,
    atr: 0,
    swingLow: 0,
    breakoutConfirmed: false,
    volumeConfirmed: false,
    rsConfirmed: false,
    breadthConfirmed: false,
    sectorConfirmed: false,
    marketConfirmed: false,
    institutionalConfirmed: false,
    closingBreakout: false,
    intradayBreakout: false,
    breakoutAttempts: 0,
    confidence: 0,
    reasons,
    warnings,
  };
}

function averageVolume(candles: readonly FiftyTwoWeekHighCandle[]): number {
  if (candles.length === 0) return 0;
  return candles.reduce((s, c) => s + c.volume, 0) / candles.length;
}

function countDistributionDays(
  candles: readonly FiftyTwoWeekHighCandle[],
  lookback: number
): number {
  const window = candles.slice(-lookback);
  let count = 0;
  for (let i = 1; i < window.length; i += 1) {
    const prev = window[i - 1]!;
    const cur = window[i]!;
    if (cur.close < prev.close && cur.volume > prev.volume) {
      count += 1;
    }
  }
  return count;
}

export function resolvePrevious52WeekHigh(
  candles: readonly FiftyTwoWeekHighCandle[],
  provided: number | null | undefined,
  config: FiftyTwoWeekHighConfig
): number {
  if (
    provided !== null &&
    provided !== undefined &&
    Number.isFinite(provided) &&
    provided > 0
  ) {
    return provided;
  }
  if (candles.length < 2) return 0;
  const lookback = Math.min(
    config.fiftyTwoWeekLookbackBars,
    candles.length - 1
  );
  const prior = candles.slice(candles.length - 1 - lookback, -1);
  if (prior.length === 0) return 0;
  return Math.max(...prior.map((c) => c.high));
}

export function analyzeBreakout(input: {
  candles: readonly FiftyTwoWeekHighCandle[];
  previous52WeekHigh: number;
  atr: number;
  config: FiftyTwoWeekHighConfig;
}): FiftyTwoWeekHighBreakoutInfo | null {
  const { candles, previous52WeekHigh, atr, config } = input;
  if (candles.length < 2 || !(previous52WeekHigh > 0)) return null;

  const last = candles[candles.length - 1]!;
  const closingBreakout = last.close > previous52WeekHigh;
  const intradayBreakout = last.high > previous52WeekHigh;

  // Age: bars since first close above previous high within max age window.
  const scanStart = Math.max(
    0,
    candles.length - 1 - config.maxBreakoutAgeBars - 5
  );
  let firstBreakIndex = -1;
  for (let i = scanStart; i < candles.length; i += 1) {
    if (candles[i]!.close > previous52WeekHigh) {
      firstBreakIndex = i;
      break;
    }
  }
  const breakoutAge =
    firstBreakIndex >= 0 ? candles.length - 1 - firstBreakIndex : 999;

  let breakoutAttempts = 0;
  const attemptStart = Math.max(
    0,
    candles.length - Math.min(config.fiftyTwoWeekLookbackBars, 40)
  );
  for (let i = attemptStart; i < candles.length; i += 1) {
    if (candles[i]!.high > previous52WeekHigh) breakoutAttempts += 1;
  }

  const distanceFromBreakout = last.close - previous52WeekHigh;
  const distanceFromBreakoutAtr =
    atr > 0 ? distanceFromBreakout / atr : distanceFromBreakout > 0 ? 999 : 0;

  const swingWindow = candles.slice(-Math.min(10, candles.length));
  const swingLow = Math.min(...swingWindow.map((c) => c.low));

  return {
    previous52WeekHigh: round(previous52WeekHigh, 4),
    currentBreakoutLevel: round(previous52WeekHigh, 4),
    breakoutAge,
    distanceFromBreakout: round(distanceFromBreakout, 4),
    distanceFromBreakoutAtr: round(distanceFromBreakoutAtr, 4),
    closingBreakout,
    intradayBreakout,
    breakoutAttempts,
    swingLow: round(swingLow, 4),
  };
}

export function validateSector(
  context: InstitutionalMarketContext,
  config: FiftyTwoWeekHighConfig = DEFAULT_FIFTY_TWO_WEEK_HIGH_CONFIG
): boolean {
  return averageSectorScore(context) >= config.bullishSectorMin;
}

export function validateBreadth(
  context: InstitutionalMarketContext,
  config: FiftyTwoWeekHighConfig = DEFAULT_FIFTY_TWO_WEEK_HIGH_CONFIG
): boolean {
  return context.marketBreadth.score >= config.bullishBreadthMin;
}

export function calculateConfidence(input: {
  breakoutQuality: number;
  trendQuality: number;
  relativeStrength: number;
  volumeConfirmation: number;
  sectorLeadership: number;
  marketRegime: number;
  riskRewardProxy: number;
  config: FiftyTwoWeekHighConfig;
}): number {
  const w = input.config.confidenceWeights;
  const total =
    w.breakoutQuality +
    w.trendQuality +
    w.relativeStrength +
    w.volumeConfirmation +
    w.sectorLeadership +
    w.marketRegime +
    w.riskReward;
  const composite =
    (input.breakoutQuality * w.breakoutQuality +
      input.trendQuality * w.trendQuality +
      input.relativeStrength * w.relativeStrength +
      input.volumeConfirmation * w.volumeConfirmation +
      input.sectorLeadership * w.sectorLeadership +
      input.marketRegime * w.marketRegime +
      input.riskRewardProxy * w.riskReward) /
    Math.max(total, 0.0001);
  return clamp(
    round(composite, 1),
    input.config.scoreFloor,
    input.config.scoreCeiling
  );
}

export function detectFiftyTwoWeekHigh(
  context: FiftyTwoWeekHighDetectionContext
): FiftyTwoWeekHighDetection {
  const config = resolveFiftyTwoWeekHighConfig(context.config);
  const warnings: string[] = [];
  const reasons: string[] = [];
  const data = context.input.fiftyTwoWeekHigh;
  const candles = data.candlesDaily;

  if (candles.length < config.minimumDailyCandles) {
    return createEmptyFiftyTwoWeekHighDetection(
      ["Insufficient daily OHLC for 52-Week High."],
      ["Enough Candles missing."]
    );
  }

  const eligible = isStrategyEligible(
    FIFTY_TWO_WEEK_HIGH_STRATEGY_ID,
    context.eligibleStrategies ?? []
  );
  if (!eligible) {
    return createEmptyFiftyTwoWeekHighDetection(
      ["Eligible Strategy gate failed for 52-Week High."],
      ["Eligible Strategy gate failed for 52-Week High."]
    );
  }

  if (data.newsDriven === true) {
    return createEmptyFiftyTwoWeekHighDetection(
      ["News-only spike — 52-Week High rejected."],
      ["News-only spike — not institutional breakout."]
    );
  }

  const last = candles[candles.length - 1]!;
  const mid = (last.high + last.low) / 2 || last.close;
  if (
    Number.isFinite(mid) &&
    mid > 0 &&
    (last.high - last.low) / mid >= config.circuitMovePct
  ) {
    return createEmptyFiftyTwoWeekHighDetection(
      ["Circuit-like range — rejected."],
      ["Circuit movement — 52-Week High invalid."]
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
    return createEmptyFiftyTwoWeekHighDetection(
      ["EMA stack incomplete."],
      ["Trend structure incomplete."]
    );
  }

  if (!(ema20 > ema50 && ema50 > ema150 && ema150 > ema200)) {
    return createEmptyFiftyTwoWeekHighDetection(
      ["Weak trend — EMA stack not aligned."],
      ["Trend structure remains weak."]
    );
  }

  if (!(last.close >= ema20)) {
    return createEmptyFiftyTwoWeekHighDetection(
      ["Price below EMA20."],
      ["Trend structure not confirmed above EMA20."]
    );
  }

  if (!(Number.isFinite(data.vwap) && data.vwap > 0 && last.close >= data.vwap)) {
    return createEmptyFiftyTwoWeekHighDetection(
      ["Price below VWAP."],
      ["VWAP alignment failed."]
    );
  }

  const atr =
    data.atr !== null && Number.isFinite(data.atr) && data.atr! > 0
      ? data.atr!
      : Math.max(last.close * 0.015, 0.01);

  const previous52WeekHigh = resolvePrevious52WeekHigh(
    candles,
    data.fiftyTwoWeekHigh,
    config
  );
  if (!(previous52WeekHigh > 0)) {
    return createEmptyFiftyTwoWeekHighDetection(
      ["52-week high unavailable."],
      ["Previous 52-week high missing."]
    );
  }

  const breakout = analyzeBreakout({
    candles,
    previous52WeekHigh,
    atr,
    config,
  });
  if (!breakout) {
    return createEmptyFiftyTwoWeekHighDetection(
      ["Breakout analysis failed."],
      ["Fresh breakout not detected."]
    );
  }

  if (!breakout.closingBreakout) {
    return createEmptyFiftyTwoWeekHighDetection(
      ["No closing breakout above 52-week high."],
      ["Failed Breakouts — close below previous high."]
    );
  }

  if (breakout.breakoutAge > config.maxBreakoutAgeBars) {
    return createEmptyFiftyTwoWeekHighDetection(
      ["Old Breakout Rejection."],
      ["Old Breakout Rejection — breakout older than lookback."]
    );
  }

  if (breakout.distanceFromBreakoutAtr > config.maxExtensionAtrMultiple) {
    return createEmptyFiftyTwoWeekHighDetection(
      ["Extended Breakout Rejection."],
      ["Extended Breakout Rejection — too far above breakout in ATR terms."]
    );
  }

  const avgVol =
    data.averageVolume20d &&
    Number.isFinite(data.averageVolume20d) &&
    data.averageVolume20d > 0
      ? data.averageVolume20d
      : averageVolume(candles.slice(-20));

  if (avgVol < config.minAverageVolume) {
    return createEmptyFiftyTwoWeekHighDetection(
      ["Illiquid stock."],
      ["Illiquid stock — average volume below threshold."]
    );
  }

  const volumeOk =
    (data.relativeVolume === null ||
      !Number.isFinite(data.relativeVolume) ||
      data.relativeVolume >= config.minBreakoutRelativeVolume) &&
    avgVol > 0 &&
    last.volume >= avgVol * config.breakoutVolumeMultiple;

  if (!volumeOk) {
    return createEmptyFiftyTwoWeekHighDetection(
      ["Low volume breakout."],
      ["Low Volume Rejection — institutional participation missing."]
    );
  }

  const closeStrength =
    last.high > last.low
      ? (last.close - last.low) / (last.high - last.low)
      : 0.5;
  if (closeStrength < config.breakoutCloseStrengthFraction) {
    return createEmptyFiftyTwoWeekHighDetection(
      ["Weak breakout close."],
      ["Failed Breakouts — weak close."]
    );
  }

  const distributionDays = countDistributionDays(
    candles,
    config.distributionLookbackBars
  );
  if (distributionDays > config.maxDistributionDays) {
    return createEmptyFiftyTwoWeekHighDetection(
      ["Distribution days increasing."],
      ["Distribution days increasing — institutional selling pressure."]
    );
  }

  const rs = data.relativeStrength;
  const rsConfirmed =
    rs === null ||
    rs === undefined ||
    !Number.isFinite(rs) ||
    rs >= config.minRelativeStrength;
  if (!rsConfirmed) {
    return createEmptyFiftyTwoWeekHighDetection(
      ["Weak Relative Strength."],
      ["Weak Relative Strength — leadership missing."]
    );
  }

  const sectorConfirmed = validateSector(context.marketContext, config);
  const breadthConfirmed = validateBreadth(context.marketContext, config);
  if (!sectorConfirmed) {
    return createEmptyFiftyTwoWeekHighDetection(
      ["Weak sector."],
      ["Weak Sector — leadership missing."]
    );
  }
  if (!breadthConfirmed) {
    return createEmptyFiftyTwoWeekHighDetection(
      ["Weak breadth."],
      ["Weak Breadth — market participation missing."]
    );
  }

  const riskMode = context.marketContext.riskMode;
  if (config.blockedRiskModes.includes(riskMode)) {
    return createEmptyFiftyTwoWeekHighDetection(
      ["Risk Off blocks 52-Week High buys."],
      ["Risk Off — 52-Week High buys blocked."]
    );
  }
  if (config.requireRiskOn && riskMode !== "Risk On") {
    return createEmptyFiftyTwoWeekHighDetection(
      ["Risk ON required."],
      ["Risk regime incompatible — Risk ON required."]
    );
  }

  if (config.blockedRegimes.includes(context.regime.regime)) {
    return createEmptyFiftyTwoWeekHighDetection(
      [`Regime ${context.regime.regime} blocked.`],
      ["Market regime incompatible with 52-Week High."]
    );
  }
  if (
    config.compatibleRegimes.length > 0 &&
    !config.compatibleRegimes.includes(context.regime.regime)
  ) {
    return createEmptyFiftyTwoWeekHighDetection(
      ["Market regime not compatible."],
      ["Market regime incompatible with 52-Week High."]
    );
  }
  if (context.confidence.score < config.minRegimeConfidence) {
    return createEmptyFiftyTwoWeekHighDetection(
      ["Regime confidence too low."],
      ["Market regime confidence insufficient."]
    );
  }
  if (context.marketContext.volatility.score > config.maxVolatilityScore) {
    return createEmptyFiftyTwoWeekHighDetection(
      ["Volatility too high."],
      ["High volatility — 52-Week High rejected."]
    );
  }

  reasons.push("Stock has achieved a fresh 52-week high.");
  reasons.push("Institutional buying confirmed by strong volume.");
  reasons.push("Relative strength ranks among market leaders.");
  reasons.push("Sector leadership supports continuation.");
  reasons.push("Trend structure remains exceptionally strong.");

  const breakoutQuality = clamp(
    round(
      55 +
        closeStrength * 20 +
        (breakout.breakoutAge === 0 ? 15 : Math.max(0, 10 - breakout.breakoutAge * 3)) +
        (breakout.distanceFromBreakoutAtr <= 1 ? 10 : 0),
      1
    ),
    0,
    100
  );
  const trendQuality = clamp(
    round(70 + (ema20 > ema50 ? 10 : 0) + (ema50 > ema150 ? 10 : 0), 1),
    0,
    100
  );
  const volumeConfirmation = clamp(
    round(50 + (data.relativeVolume ?? 1) * 20 + (volumeOk ? 15 : 0), 1),
    0,
    100
  );
  const momentumPersistence = clamp(
    round(
      50 +
        Math.min(breakout.breakoutAttempts, 5) * 5 +
        (breakout.closingBreakout ? 15 : 0),
      1
    ),
    0,
    100
  );

  const confidence = Math.max(
    config.confidenceFloor,
    calculateConfidence({
      breakoutQuality,
      trendQuality,
      relativeStrength: clamp(rs ?? 65, 0, 100),
      volumeConfirmation,
      sectorLeadership: averageSectorScore(context.marketContext),
      marketRegime: clamp(context.marketContext.confidence, 0, 100),
      riskRewardProxy: 70,
      config,
    })
  );

  const direction: FiftyTwoWeekHighDirection = "BUY";

  return {
    detected: true,
    direction,
    previous52WeekHigh: breakout.previous52WeekHigh,
    currentBreakoutLevel: breakout.currentBreakoutLevel,
    breakoutAge: breakout.breakoutAge,
    distanceFromBreakout: breakout.distanceFromBreakout,
    distanceFromBreakoutAtr: breakout.distanceFromBreakoutAtr,
    breakoutQuality,
    trendQuality,
    volumeConfirmation,
    momentumPersistence,
    ema20,
    ema50,
    ema150,
    ema200,
    vwap: data.vwap,
    atr,
    swingLow: breakout.swingLow,
    breakoutConfirmed: true,
    volumeConfirmed: volumeOk,
    rsConfirmed,
    breadthConfirmed,
    sectorConfirmed,
    marketConfirmed: true,
    institutionalConfirmed: volumeOk,
    closingBreakout: breakout.closingBreakout,
    intradayBreakout: breakout.intradayBreakout,
    breakoutAttempts: breakout.breakoutAttempts,
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

export type { FiftyTwoWeekHighMarketData };
