/**
 * Breakout Retest utilities — Sprint 11B.3I.
 * Pure detection helpers for breakout → retest → continuation patterns.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import type { MarketRegimeLabel } from "@/src/modules/marketRegime";
import {
  DEFAULT_BREAKOUT_RETEST_CONFIG,
  resolveBreakoutRetestConfig,
  type BreakoutRetestConfig,
} from "./BreakoutRetestConstants";
import type {
  BreakoutRetestCandle,
  BreakoutRetestDetection,
  BreakoutRetestDetectionContext,
  BreakoutRetestDirection,
} from "./BreakoutRetestTypes";

export { resolveBreakoutRetestConfig };

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
  config: BreakoutRetestConfig = DEFAULT_BREAKOUT_RETEST_CONFIG
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

function barRange(c: BreakoutRetestCandle): number {
  return Math.max(c.high - c.low, 0.0001);
}

function closePositionInBar(c: BreakoutRetestCandle): number {
  const range = barRange(c);
  return (c.close - c.low) / range;
}

function averageVolume(
  candles: readonly BreakoutRetestCandle[],
  excludeLast = 1
): number {
  const slice = candles.slice(0, Math.max(candles.length - excludeLast, 0));
  if (slice.length === 0) return candles[candles.length - 1]?.volume ?? 0;
  return slice.reduce((s, c) => s + c.volume, 0) / slice.length;
}

function isCircuitMove(
  candle: BreakoutRetestCandle,
  config: BreakoutRetestConfig
): boolean {
  const mid = (candle.high + candle.low) / 2 || candle.close;
  if (!Number.isFinite(mid) || mid <= 0) return false;
  return (candle.high - candle.low) / mid >= config.circuitMovePct;
}

function deriveSwingHigh(
  candles: readonly BreakoutRetestCandle[],
  excludeLastBars: number
): number | null {
  const end = Math.max(candles.length - excludeLastBars, 1);
  const window = candles.slice(0, end);
  if (window.length < 3) return null;
  const highs = window.map((c) => c.high);
  const sorted = [...highs].sort((a, b) => b - a);
  const candidate = sorted[0]!;
  const touches = highs.filter(
    (h) => Math.abs(h - candidate) / candidate <= 0.002
  ).length;
  return touches >= 1 ? candidate : null;
}

function deriveSwingLow(
  candles: readonly BreakoutRetestCandle[],
  excludeLastBars: number
): number | null {
  const end = Math.max(candles.length - excludeLastBars, 1);
  const window = candles.slice(0, end);
  if (window.length < 3) return null;
  const lows = window.map((c) => c.low);
  const sorted = [...lows].sort((a, b) => a - b);
  const candidate = sorted[0]!;
  const touches = lows.filter(
    (l) => Math.abs(l - candidate) / candidate <= 0.002
  ).length;
  return touches >= 1 ? candidate : null;
}

export function resolveResistanceLevel(
  candles: readonly BreakoutRetestCandle[],
  levels: readonly number[] | undefined,
  config: BreakoutRetestConfig
): number | null {
  if (levels && levels.length > 0) {
    const valid = levels.filter((l) => Number.isFinite(l) && l > 0);
    if (valid.length > 0) return valid[0]!;
  }
  return deriveSwingHigh(candles, config.retestLookbackBars + 2);
}

export function resolveSupportLevel(
  candles: readonly BreakoutRetestCandle[],
  levels: readonly number[] | undefined,
  config: BreakoutRetestConfig
): number | null {
  if (levels && levels.length > 0) {
    const valid = levels.filter((l) => Number.isFinite(l) && l > 0);
    if (valid.length > 0) return valid[0]!;
  }
  return deriveSwingLow(candles, config.retestLookbackBars + 2);
}

interface BreakoutBarResult {
  index: number;
  level: number;
  extreme: number;
  quality: number;
  volume: number;
}

function findBreakoutBar(
  candles: readonly BreakoutRetestCandle[],
  direction: Exclude<BreakoutRetestDirection, "NONE">,
  level: number,
  atr: number | null,
  config: BreakoutRetestConfig
): BreakoutBarResult | null {
  const end = Math.max(candles.length - 2, 1);
  const start = Math.max(0, end - config.breakoutLookbackBars);
  const avgVol = averageVolume(candles, 1);

  for (let i = end - 1; i >= start; i--) {
    const c = candles[i]!;
    const volOk =
      avgVol > 0 && c.volume >= avgVol * config.breakoutVolumeMultiple;
    const pos = closePositionInBar(c);

    if (direction === "BUY") {
      const penetrated = c.high > level;
      const minPen =
        level * config.minBreakoutPenetrationPct +
        (atr !== null && atr > 0
          ? atr * config.minBreakoutPenetrationAtrMultiple
          : 0);
      const strongClose =
        pos >= config.breakoutCloseStrengthFraction && c.close > level;
      const falseBreak = candles
        .slice(i + 1, end)
        .some((bar) => bar.close < level * (1 - config.retestTouchTolerancePct));

      if (
        penetrated &&
        c.close - level >= minPen &&
        strongClose &&
        volOk &&
        !falseBreak
      ) {
        return {
          index: i,
          level,
          extreme: c.high,
          quality: clamp(70 + pos * 25 + (volOk ? 10 : 0), 0, 100),
          volume: c.volume,
        };
      }
    } else {
      const penetrated = c.low < level;
      const minPen =
        level * config.minBreakoutPenetrationPct +
        (atr !== null && atr > 0
          ? atr * config.minBreakoutPenetrationAtrMultiple
          : 0);
      const strongClose =
        pos <= 1 - config.breakoutCloseStrengthFraction && c.close < level;
      const falseBreak = candles
        .slice(i + 1, end)
        .some((bar) => bar.close > level * (1 + config.retestTouchTolerancePct));

      if (
        penetrated &&
        level - c.close >= minPen &&
        strongClose &&
        volOk &&
        !falseBreak
      ) {
        return {
          index: i,
          level,
          extreme: c.low,
          quality: clamp(70 + (1 - pos) * 25 + (volOk ? 10 : 0), 0, 100),
          volume: c.volume,
        };
      }
    }
  }
  return null;
}

export function evaluateRetestQuality(input: {
  direction: Exclude<BreakoutRetestDirection, "NONE">;
  breakout: BreakoutBarResult;
  retestBars: readonly BreakoutRetestCandle[];
  config: BreakoutRetestConfig;
}): {
  quality: number;
  retestLow: number;
  retestHigh: number;
  held: boolean;
  volumeContracted: boolean;
  acceptance: boolean;
  reasons: string[];
  warnings: string[];
} {
  const { direction, breakout, retestBars, config } = input;
  const reasons: string[] = [];
  const warnings: string[] = [];

  if (retestBars.length === 0) {
    return {
      quality: 0,
      retestLow: 0,
      retestHigh: 0,
      held: false,
      volumeContracted: false,
      acceptance: false,
      reasons,
      warnings: ["No retest bars found."],
    };
  }

  const retestLow = Math.min(...retestBars.map((c) => c.low));
  const retestHigh = Math.max(...retestBars.map((c) => c.high));
  const breakoutMove = Math.abs(breakout.extreme - breakout.level);
  const tolerance = breakout.level * config.retestTouchTolerancePct;

  let touched = false;
  let deepViolation = false;
  let volumeContracted = true;

  for (const bar of retestBars) {
    if (direction === "BUY") {
      if (bar.low <= breakout.level + tolerance) touched = true;
      const depth = breakout.level - bar.low;
      if (breakoutMove > 0 && depth / breakoutMove > config.maxRetestDepthFraction) {
        deepViolation = true;
      }
    } else {
      if (bar.high >= breakout.level - tolerance) touched = true;
      const depth = bar.high - breakout.level;
      if (breakoutMove > 0 && depth / breakoutMove > config.maxRetestDepthFraction) {
        deepViolation = true;
      }
    }
    if (bar.volume > breakout.volume * config.retestVolumeContractionMax) {
      volumeContracted = false;
    }
  }

  const last = retestBars[retestBars.length - 1]!;
  let acceptance = false;
  if (direction === "BUY") {
    acceptance =
      last.close > breakout.level &&
      last.close >= last.open &&
      retestLow >= breakout.level * (1 - config.maxRetestDepthFraction * 0.01);
  } else {
    acceptance =
      last.close < breakout.level &&
      last.close <= last.open &&
      retestHigh <= breakout.level * (1 + config.maxRetestDepthFraction * 0.01);
  }

  const held = touched && !deepViolation;
  if (held) reasons.push("Retest held with declining volume.");
  if (volumeContracted) reasons.push("Volume contracted on retest vs breakout bar.");
  if (!touched) warnings.push("Retest did not touch breakout zone.");
  if (deepViolation) warnings.push("Deep retracement — retest violated breakout move.");
  if (!volumeContracted) warnings.push("Volume did not contract on retest.");
  if (!acceptance) warnings.push("Weak confirmation — acceptance not confirmed.");

  let quality = 40;
  if (held) quality += 25;
  if (volumeContracted) quality += 15;
  if (acceptance) quality += 20;
  quality -= retestBars.length > config.maxRetestBars ? 15 : 0;

  return {
    quality: clamp(quality, 0, 100),
    retestLow,
    retestHigh,
    held,
    volumeContracted,
    acceptance,
    reasons,
    warnings,
  };
}

export function validateEmaAlignment(
  direction: Exclude<BreakoutRetestDirection, "NONE">,
  price: number,
  ema20: number,
  ema50: number,
  config: BreakoutRetestConfig
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

  if (direction === "BUY") {
    const ok = price >= ema20 && ema20 > ema50;
    if (ok) {
      reasons.push("EMA20 above EMA50 with price above EMA20.");
      return { aligned: true, score: 88, reasons, warnings };
    }
    return {
      aligned: false,
      score: 30,
      reasons: [],
      warnings: ["Bullish EMA stack not confirmed."],
    };
  }

  const ok = price <= ema20 && ema20 < ema50;
  if (ok) {
    reasons.push("EMA20 below EMA50 with price below EMA20.");
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
  direction: Exclude<BreakoutRetestDirection, "NONE">,
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
        reasons: ["Price above VWAP supports breakout continuation."],
        warnings: [],
      };
    }
    return {
      aligned: false,
      score: 30,
      reasons: [],
      warnings: ["Price below VWAP — breakout retest rejected."],
    };
  }
  if (price <= vwap) {
    return {
      aligned: true,
      score: 80,
      reasons: ["Price below VWAP supports breakdown retest."],
      warnings: [],
    };
  }
  return {
    aligned: false,
    score: 30,
    reasons: [],
    warnings: ["Price above VWAP — breakdown retest rejected."],
  };
}

export function validateVolume(
  candles: readonly BreakoutRetestCandle[],
  relativeVolume: number | null,
  config: BreakoutRetestConfig
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

  const avgVol = averageVolume(candles);
  const spike =
    avgVol > 0 && last.volume >= avgVol * config.breakoutVolumeMultiple;

  if (
    relativeVolume !== null &&
    Number.isFinite(relativeVolume) &&
    relativeVolume < config.minRelativeVolume
  ) {
    return {
      confirmed: false,
      score: 25,
      reasons: [],
      warnings: ["Low RVOL — relative volume below threshold."],
    };
  }

  if (
    !spike &&
    (relativeVolume === null ||
      relativeVolume < config.preferredRelativeVolume)
  ) {
    warnings.push("Low volume — weak breakout confirmation.");
  } else {
    reasons.push("Institutional buying resumed after pullback.");
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
        (relativeVolume !== null &&
        relativeVolume >= config.preferredRelativeVolume
          ? 25
          : relativeVolume !== null &&
              relativeVolume >= config.minRelativeVolume
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
  direction: Exclude<BreakoutRetestDirection, "NONE">,
  context: InstitutionalMarketContext,
  config: BreakoutRetestConfig = DEFAULT_BREAKOUT_RETEST_CONFIG
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
        reasons: ["Market breadth confirms breakout."],
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
      reasons: ["Market breadth confirms breakdown retest."],
      warnings: [],
    };
  }
  return {
    confirmed: false,
    score: clamp(score!, 0, 100),
    reasons: [],
    warnings: ["Weak Breadth for breakdown retest."],
  };
}

export function validateSector(
  direction: Exclude<BreakoutRetestDirection, "NONE">,
  context: InstitutionalMarketContext,
  config: BreakoutRetestConfig = DEFAULT_BREAKOUT_RETEST_CONFIG
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
        reasons: ["Sector leadership remains intact."],
        warnings: [],
      };
    }
    return {
      confirmed: false,
      score: avg,
      reasons: [],
      warnings: ["Weak Sector — breakout retest insufficient."],
    };
  }
  if (avg <= config.bearishSectorMax) {
    return {
      confirmed: true,
      score: clamp(100 - avg, 0, 100),
      reasons: ["Sector weakness supports breakdown retest."],
      warnings: [],
    };
  }
  return {
    confirmed: false,
    score: avg,
    reasons: [],
    warnings: ["Weak Sector for breakdown retest."],
  };
}

export function validateMarket(
  direction: Exclude<BreakoutRetestDirection, "NONE">,
  regime: MarketRegimeLabel,
  riskMode: InstitutionalMarketContext["riskMode"],
  regimeConfidence: number,
  volatilityScore: number,
  newsDriven: boolean,
  config: BreakoutRetestConfig = DEFAULT_BREAKOUT_RETEST_CONFIG
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
      warnings: ["News spike — breakout retest rejected."],
    };
  }

  if (config.blockedRegimes.includes(regime)) {
    return {
      confirmed: false,
      score: 20,
      reasons: [],
      warnings: [`Regime ${regime} blocked for breakout retest.`],
    };
  }

  if (direction === "BUY" && config.bullBlockedRegimes.includes(regime)) {
    return {
      confirmed: false,
      score: 20,
      reasons: [],
      warnings: [`Regime ${regime} blocks bullish breakout retest.`],
    };
  }
  if (direction === "SELL" && config.bearBlockedRegimes.includes(regime)) {
    return {
      confirmed: false,
      score: 20,
      reasons: [],
      warnings: [`Regime ${regime} blocks bearish breakdown retest.`],
    };
  }

  if (!config.compatibleRegimes.includes(regime)) {
    return {
      confirmed: false,
      score: 25,
      reasons: [],
      warnings: [`Regime ${regime} not compatible with breakout retest.`],
    };
  }
  reasons.push("Trade aligns with market regime.");
  score += 20;

  if (regimeConfidence >= config.minRegimeConfidence) {
    score += 15;
  } else {
    warnings.push("Regime confidence below breakout retest threshold.");
    score -= 20;
  }

  if (volatilityScore > config.maxVolatilityScore) {
    warnings.push("Volatility too elevated for clean breakout retest.");
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

export function calculateConfidence(input: {
  breakoutQuality: number;
  retestQuality: number;
  volumeScore: number;
  trendScore: number;
  breadthScore: number;
  sectorScore: number;
  marketScore: number;
  vwapScore: number;
  config?: BreakoutRetestConfig;
}): number {
  const config = input.config ?? DEFAULT_BREAKOUT_RETEST_CONFIG;
  const w = config.confidenceWeights;
  const composite =
    input.breakoutQuality * w.breakoutQuality +
    input.retestQuality * w.retestQuality +
    input.volumeScore * w.volume +
    input.trendScore * w.trendStructure +
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

export function createEmptyBreakoutRetestDetection(
  warnings: string[],
  reasons: string[] = []
): BreakoutRetestDetection {
  return {
    detected: false,
    direction: "NONE",
    phase: "none",
    breakoutLevel: 0,
    breakoutExtreme: 0,
    retestLow: 0,
    retestHigh: 0,
    breakoutQuality: 0,
    retestQuality: 0,
    ema20: 0,
    ema50: 0,
    vwap: 0,
    breakoutConfirmed: false,
    retestHeld: false,
    continuationConfirmed: false,
    volumeConfirmed: false,
    breadthConfirmed: false,
    sectorConfirmed: false,
    marketConfirmed: false,
    confidence: 0,
    reasons,
    warnings,
  };
}

function detectDirectionalBreakoutRetest(
  candles: readonly BreakoutRetestCandle[],
  direction: Exclude<BreakoutRetestDirection, "NONE">,
  level: number | null,
  atr: number | null,
  ema20: number,
  ema50: number,
  vwap: number,
  config: BreakoutRetestConfig
): {
  breakout: BreakoutBarResult | null;
  retest: ReturnType<typeof evaluateRetestQuality> | null;
  confirmation: boolean;
} {
  if (level === null || level <= 0) {
    return { breakout: null, retest: null, confirmation: false };
  }

  const breakout = findBreakoutBar(candles, direction, level, atr, config);
  if (!breakout) {
    return { breakout: null, retest: null, confirmation: false };
  }

  const retestStart = breakout.index + 1;
  const retestEnd = candles.length - 1;
  const retestBars = candles.slice(retestStart, retestEnd);
  const retest = evaluateRetestQuality({
    direction,
    breakout,
    retestBars,
    config,
  });

  const last = candles[candles.length - 1]!;
  let confirmation = false;
  if (direction === "BUY") {
    const higherLow =
      retestBars.length === 0 ||
      last.low >= Math.min(...retestBars.map((c) => c.low)) * 0.999;
    confirmation =
      last.close > breakout.level &&
      last.close >= last.open &&
      higherLow &&
      retest.held;
  } else {
    const lowerHigh =
      retestBars.length === 0 ||
      last.high <= Math.max(...retestBars.map((c) => c.high)) * 1.001;
    confirmation =
      last.close < breakout.level &&
      last.close <= last.open &&
      lowerHigh &&
      retest.held;
  }

  const ema = validateEmaAlignment(direction, last.close, ema20, ema50, config);
  const vwapCheck = validateVwapAlignment(direction, last.close, vwap);
  if (!ema.aligned || !vwapCheck.aligned) {
    confirmation = false;
  }

  return { breakout, retest, confirmation };
}

/**
 * Full breakout retest detection.
 */
export function detectBreakoutRetest(
  context: BreakoutRetestDetectionContext
): BreakoutRetestDetection {
  const config = resolveBreakoutRetestConfig(context.config);
  const data = context.input.breakoutRetest;
  const candles = data.candles5m;
  const warnings: string[] = [];
  const reasons: string[] = [];

  const last = candles[candles.length - 1];
  if (!last) {
    return createEmptyBreakoutRetestDetection(["Missing candles."]);
  }

  if (isCircuitMove(last, config)) {
    return createEmptyBreakoutRetestDetection(
      ["Circuit movement — breakout retest rejected."],
      reasons
    );
  }

  if (data.newsDriven === true) {
    return createEmptyBreakoutRetestDetection(
      ["News spike — breakout retest rejected."],
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
    return createEmptyBreakoutRetestDetection(["EMA20/EMA50 missing."]);
  }

  const atr = data.atr ?? context.input.atr ?? null;
  const resistance = resolveResistanceLevel(
    candles,
    data.resistanceLevels,
    config
  );
  const support = resolveSupportLevel(candles, data.supportLevels, config);

  const bull = detectDirectionalBreakoutRetest(
    candles,
    "BUY",
    resistance,
    atr,
    ema20,
    ema50,
    data.vwap,
    config
  );
  const bear = detectDirectionalBreakoutRetest(
    candles,
    "SELL",
    support,
    atr,
    ema20,
    ema50,
    data.vwap,
    config
  );

  let direction: Exclude<BreakoutRetestDirection, "NONE"> | null = null;
  let breakout: BreakoutBarResult | null = null;
  let retest: ReturnType<typeof evaluateRetestQuality> | null = null;
  let confirmation = false;

  const bullScore =
    (bull.breakout?.quality ?? 0) +
    (bull.retest?.quality ?? 0) +
    (bull.confirmation ? 20 : 0);
  const bearScore =
    (bear.breakout?.quality ?? 0) +
    (bear.retest?.quality ?? 0) +
    (bear.confirmation ? 20 : 0);

  if (bull.breakout && bullScore >= bearScore) {
    direction = "BUY";
    breakout = bull.breakout;
    retest = bull.retest;
    confirmation = bull.confirmation;
    reasons.push("Resistance converted into support.");
  } else if (bear.breakout) {
    direction = "SELL";
    breakout = bear.breakout;
    retest = bear.retest;
    confirmation = bear.confirmation;
    reasons.push("Support converted into resistance.");
  }

  if (!direction || !breakout || !retest) {
    return createEmptyBreakoutRetestDetection(
      [...warnings, "No breakout retest pattern detected."],
      reasons
    );
  }

  warnings.push(...retest.warnings);
  reasons.push(...retest.reasons);

  if (!retest.held) {
    return {
      ...createEmptyBreakoutRetestDetection(warnings, reasons),
      direction: "NONE",
      phase: "retest",
      breakoutLevel: breakout.level,
      breakoutExtreme: breakout.extreme,
      retestLow: retest.retestLow,
      retestHigh: retest.retestHigh,
      breakoutQuality: breakout.quality,
      retestQuality: retest.quality,
      ema20,
      ema50,
      vwap: data.vwap,
      retestHeld: false,
      confidence: 0,
    };
  }

  if (!confirmation) {
    return {
      ...createEmptyBreakoutRetestDetection(
        [...warnings, "Weak confirmation — acceptance not confirmed."],
        reasons
      ),
      direction: "NONE",
      phase: "retest",
      breakoutLevel: breakout.level,
      breakoutExtreme: breakout.extreme,
      retestLow: retest.retestLow,
      retestHigh: retest.retestHigh,
      breakoutQuality: breakout.quality,
      retestQuality: retest.quality,
      ema20,
      ema50,
      vwap: data.vwap,
      retestHeld: true,
      continuationConfirmed: false,
      confidence: calculateConfidence({
        breakoutQuality: breakout.quality,
        retestQuality: retest.quality,
        volumeScore: 40,
        trendScore: 50,
        breadthScore: 40,
        sectorScore: 40,
        marketScore: 40,
        vwapScore: 40,
        config,
      }),
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
    false,
    config
  );
  warnings.push(...market.warnings);
  reasons.push(...market.reasons);

  const ema = validateEmaAlignment(direction, last.close, ema20, ema50, config);
  warnings.push(...ema.warnings);
  reasons.push(...ema.reasons);

  const vwapCheck = validateVwapAlignment(direction, last.close, data.vwap);
  warnings.push(...vwapCheck.warnings);
  reasons.push(...vwapCheck.reasons);

  const confidence = calculateConfidence({
    breakoutQuality: breakout.quality,
    retestQuality: retest.quality,
    volumeScore: volume.score,
    trendScore: ema.score,
    breadthScore: breadth.score,
    sectorScore: sector.score,
    marketScore: market.score,
    vwapScore: vwapCheck.score,
    config,
  });

  if (
    !volume.confirmed ||
    !breadth.confirmed ||
    !sector.confirmed ||
    !market.confirmed ||
    !ema.aligned ||
    !vwapCheck.aligned
  ) {
    return {
      ...createEmptyBreakoutRetestDetection(warnings, reasons),
      direction: "NONE",
      phase: "continuation",
      breakoutLevel: breakout.level,
      breakoutExtreme: breakout.extreme,
      retestLow: retest.retestLow,
      retestHigh: retest.retestHigh,
      breakoutQuality: breakout.quality,
      retestQuality: retest.quality,
      ema20,
      ema50,
      vwap: data.vwap,
      breakoutConfirmed: true,
      retestHeld: true,
      continuationConfirmed: confirmation,
      volumeConfirmed: volume.confirmed,
      breadthConfirmed: breadth.confirmed,
      sectorConfirmed: sector.confirmed,
      marketConfirmed: market.confirmed,
      confidence,
    };
  }

  reasons.push(`Breakout Retest ${direction} detected.`);

  return {
    detected: true,
    direction,
    phase: "continuation",
    breakoutLevel: breakout.level,
    breakoutExtreme: breakout.extreme,
    retestLow: retest.retestLow,
    retestHigh: retest.retestHigh,
    breakoutQuality: breakout.quality,
    retestQuality: retest.quality,
    ema20,
    ema50,
    vwap: data.vwap,
    breakoutConfirmed: true,
    retestHeld: true,
    continuationConfirmed: true,
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
