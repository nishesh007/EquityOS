/**
 * Liquidity Sweep utilities — Sprint 11B.3E.
 * Pure detection helpers for stop hunts, liquidity grabs, and false breaks.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import type { MarketRegimeLabel } from "@/src/modules/marketRegime";
import {
  DEFAULT_LIQUIDITY_SWEEP_CONFIG,
  resolveLiquiditySweepConfig,
  type LiquiditySweepConfig,
} from "./LiquiditySweepConstants";
import type {
  LiquiditySweepCandle,
  LiquiditySweepDetection,
  LiquiditySweepDetectionContext,
  LiquiditySweepDirection,
  LiquiditySweepType,
  LiquidityZone,
} from "./LiquiditySweepTypes";

export { resolveLiquiditySweepConfig };

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
  config: LiquiditySweepConfig = DEFAULT_LIQUIDITY_SWEEP_CONFIG
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

export function findSwingHigh(
  candles: readonly LiquiditySweepCandle[],
  lookback: number
): number | null {
  if (candles.length < 3) return null;
  const prior = candles.slice(0, -1).slice(-Math.max(lookback, 3));
  if (prior.length === 0) return null;
  const high = Math.max(...prior.map((c) => c.high));
  return Number.isFinite(high) ? high : null;
}

export function findSwingLow(
  candles: readonly LiquiditySweepCandle[],
  lookback: number
): number | null {
  if (candles.length < 3) return null;
  const prior = candles.slice(0, -1).slice(-Math.max(lookback, 3));
  if (prior.length === 0) return null;
  const low = Math.min(...prior.map((c) => c.low));
  return Number.isFinite(low) ? low : null;
}

/**
 * Detect equal highs within tolerance (liquidity pool above).
 */
export function findEqualHigh(
  candles: readonly LiquiditySweepCandle[],
  lookback: number,
  tolerancePct: number
): { level: number; touches: number } | null {
  const prior = candles.slice(0, -1).slice(-Math.max(lookback, 4));
  if (prior.length < 2) return null;
  const highs = prior.map((c) => c.high).sort((a, b) => b - a);
  const peak = highs[0]!;
  const touches = highs.filter(
    (h) => Math.abs(h - peak) / peak <= tolerancePct
  ).length;
  if (touches < 2) return null;
  return { level: round(peak, 4), touches };
}

/**
 * Detect equal lows within tolerance (liquidity pool below).
 */
export function findEqualLow(
  candles: readonly LiquiditySweepCandle[],
  lookback: number,
  tolerancePct: number
): { level: number; touches: number } | null {
  const prior = candles.slice(0, -1).slice(-Math.max(lookback, 4));
  if (prior.length < 2) return null;
  const lows = prior.map((c) => c.low).sort((a, b) => a - b);
  const trough = lows[0]!;
  const touches = lows.filter(
    (l) => Math.abs(l - trough) / trough <= tolerancePct
  ).length;
  if (touches < 2) return null;
  return { level: round(trough, 4), touches };
}

export function resolveLiquidityZones(
  candles: readonly LiquiditySweepCandle[],
  config: LiquiditySweepConfig,
  supplied?: readonly LiquidityZone[] | null,
  recentSwingHigh?: number | null,
  recentSwingLow?: number | null
): LiquidityZone[] {
  if (supplied && supplied.length > 0) {
    return [...supplied];
  }
  const zones: LiquidityZone[] = [];
  const swingHigh =
    recentSwingHigh !== undefined &&
    recentSwingHigh !== null &&
    Number.isFinite(recentSwingHigh)
      ? recentSwingHigh
      : findSwingHigh(candles, config.swingLookbackBars);
  const swingLow =
    recentSwingLow !== undefined &&
    recentSwingLow !== null &&
    Number.isFinite(recentSwingLow)
      ? recentSwingLow
      : findSwingLow(candles, config.swingLookbackBars);

  if (swingHigh !== null) {
    zones.push({ level: swingHigh, kind: "swing_high", touches: 1 });
  }
  if (swingLow !== null) {
    zones.push({ level: swingLow, kind: "swing_low", touches: 1 });
  }

  const eqHigh = findEqualHigh(
    candles,
    config.swingLookbackBars,
    config.equalLevelTolerancePct
  );
  if (eqHigh) {
    zones.push({
      level: eqHigh.level,
      kind: "equal_high",
      touches: eqHigh.touches,
    });
  }
  const eqLow = findEqualLow(
    candles,
    config.swingLookbackBars,
    config.equalLevelTolerancePct
  );
  if (eqLow) {
    zones.push({
      level: eqLow.level,
      kind: "equal_low",
      touches: eqLow.touches,
    });
  }
  return zones;
}

function minPenetration(
  price: number,
  atr: number | null,
  config: LiquiditySweepConfig
): number {
  const pctPen = price * config.minSweepPenetrationPct;
  if (atr !== null && Number.isFinite(atr) && atr > 0) {
    return Math.max(pctPen, atr * config.minSweepPenetrationAtrMultiple);
  }
  return pctPen;
}

export interface SweepCandidate {
  direction: Exclude<LiquiditySweepDirection, "NONE">;
  sweepType: Exclude<LiquiditySweepType, "none">;
  liquidityLevel: number;
  sweepExtreme: number;
  reclaimClose: number;
  sweepDistance: number;
  qualityScore: number;
}

/**
 * Evaluate whether the last candle swept a liquidity level and reclaimed.
 */
export function evaluateSweepOnCandle(
  candle: LiquiditySweepCandle,
  zone: LiquidityZone,
  atr: number | null,
  config: LiquiditySweepConfig
): SweepCandidate | null {
  const level = zone.level;
  if (!Number.isFinite(level) || level <= 0) return null;
  const pen = minPenetration(level, atr, config);
  const range = Math.max(candle.high - candle.low, pen);
  const reclaimNeed = range * config.minReclaimFraction;

  // Bearish sweep: take liquidity above, close back below
  if (zone.kind === "swing_high" || zone.kind === "equal_high") {
    const swept = candle.high >= level + pen;
    const reclaimed = candle.close <= level - reclaimNeed * 0.15;
    if (!swept || !reclaimed) return null;
    const equal = zone.kind === "equal_high" || zone.touches >= 2;
    const sweepType: Exclude<LiquiditySweepType, "none"> = equal
      ? "equal_high_sweep"
      : candle.close < candle.open
        ? "false_breakout"
        : "swing_high_sweep";
    const distance = candle.high - level;
    return {
      direction: "SELL",
      sweepType:
        distance >= pen * 2
          ? equal
            ? "liquidity_grab"
            : "stop_hunt"
          : sweepType,
      liquidityLevel: round(level, 4),
      sweepExtreme: round(candle.high, 4),
      reclaimClose: round(candle.close, 4),
      sweepDistance: round(distance, 4),
      qualityScore: clamp(
        55 +
          (equal ? 15 : 8) +
          Math.min((distance / Math.max(pen, 0.0001)) * 8, 20),
        0,
        100
      ),
    };
  }

  // Bullish sweep: take liquidity below, close back above
  if (zone.kind === "swing_low" || zone.kind === "equal_low") {
    const swept = candle.low <= level - pen;
    const reclaimed = candle.close >= level + reclaimNeed * 0.15;
    if (!swept || !reclaimed) return null;
    const equal = zone.kind === "equal_low" || zone.touches >= 2;
    const sweepType: Exclude<LiquiditySweepType, "none"> = equal
      ? "equal_low_sweep"
      : candle.close > candle.open
        ? "false_breakdown"
        : "swing_low_sweep";
    const distance = level - candle.low;
    return {
      direction: "BUY",
      sweepType:
        distance >= pen * 2
          ? equal
            ? "liquidity_grab"
            : "stop_hunt"
          : sweepType,
      liquidityLevel: round(level, 4),
      sweepExtreme: round(candle.low, 4),
      reclaimClose: round(candle.close, 4),
      sweepDistance: round(distance, 4),
      qualityScore: clamp(
        55 +
          (equal ? 15 : 8) +
          Math.min((distance / Math.max(pen, 0.0001)) * 8, 20),
        0,
        100
      ),
    };
  }

  // Custom zone — infer direction from wick
  if (candle.high >= level + pen && candle.close < level) {
    return {
      direction: "SELL",
      sweepType: "liquidity_grab",
      liquidityLevel: round(level, 4),
      sweepExtreme: round(candle.high, 4),
      reclaimClose: round(candle.close, 4),
      sweepDistance: round(candle.high - level, 4),
      qualityScore: 60,
    };
  }
  if (candle.low <= level - pen && candle.close > level) {
    return {
      direction: "BUY",
      sweepType: "liquidity_grab",
      liquidityLevel: round(level, 4),
      sweepExtreme: round(candle.low, 4),
      reclaimClose: round(candle.close, 4),
      sweepDistance: round(level - candle.low, 4),
      qualityScore: 60,
    };
  }
  return null;
}

export function detectBestSweep(
  candles: readonly LiquiditySweepCandle[],
  zones: readonly LiquidityZone[],
  atr: number | null,
  config: LiquiditySweepConfig
): SweepCandidate | null {
  const last = candles[candles.length - 1];
  if (!last || zones.length === 0) return null;
  let best: SweepCandidate | null = null;
  for (const zone of zones) {
    const candidate = evaluateSweepOnCandle(last, zone, atr, config);
    if (!candidate) continue;
    if (!best || candidate.qualityScore > best.qualityScore) {
      best = candidate;
    }
  }
  return best;
}

export function detectReversalCandle(
  candles: readonly LiquiditySweepCandle[],
  direction: Exclude<LiquiditySweepDirection, "NONE">,
  config: LiquiditySweepConfig = DEFAULT_LIQUIDITY_SWEEP_CONFIG
): { confirmed: boolean; score: number; reasons: string[]; warnings: string[] } {
  const last = candles[candles.length - 1];
  if (!last) {
    return {
      confirmed: false,
      score: 20,
      reasons: [],
      warnings: ["No candle for reversal confirmation."],
    };
  }
  const range = Math.max(last.high - last.low, 0.0001);
  const body = Math.abs(last.close - last.open);
  const upperWick = last.high - Math.max(last.open, last.close);
  const lowerWick = Math.min(last.open, last.close) - last.low;

  if (direction === "BUY") {
    const wickRatio = lowerWick / range;
    const bullishClose = last.close > last.open || last.close > (last.high + last.low) / 2;
    if (wickRatio >= config.minWickBodyRatio && bullishClose) {
      return {
        confirmed: true,
        score: clamp(60 + wickRatio * 40, 0, 100),
        reasons: ["Strong rejection confirms stop hunt."],
        warnings: [],
      };
    }
    if (bullishClose && lowerWick > body * 0.8) {
      return {
        confirmed: true,
        score: 65,
        reasons: ["Reversal candle confirms exhaustion."],
        warnings: [],
      };
    }
    return {
      confirmed: false,
      score: 30,
      reasons: [],
      warnings: ["Weak reversal — bullish reclaim not confirmed."],
    };
  }

  const wickRatio = upperWick / range;
  const bearishClose = last.close < last.open || last.close < (last.high + last.low) / 2;
  if (wickRatio >= config.minWickBodyRatio && bearishClose) {
    return {
      confirmed: true,
      score: clamp(60 + wickRatio * 40, 0, 100),
      reasons: ["Strong rejection confirms stop hunt."],
      warnings: [],
    };
  }
  if (bearishClose && upperWick > body * 0.8) {
    return {
      confirmed: true,
      score: 65,
      reasons: ["Reversal candle confirms exhaustion."],
      warnings: [],
    };
  }
  return {
    confirmed: false,
    score: 30,
    reasons: [],
    warnings: ["Weak reversal — bearish reclaim not confirmed."],
  };
}

export function validateVolume(
  candles: readonly LiquiditySweepCandle[],
  relativeVolume: number | null,
  config: LiquiditySweepConfig = DEFAULT_LIQUIDITY_SWEEP_CONFIG
): {
  spike: boolean;
  relativeConfirmed: boolean;
  score: number;
  reasons: string[];
  warnings: string[];
} {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const last = candles[candles.length - 1];
  if (!last) {
    return {
      spike: false,
      relativeConfirmed: false,
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
    avgVol > 0 && last.volume >= avgVol * config.volumeSpikeMultiple;
  if (spike) {
    reasons.push("Volume spike indicates institutional participation.");
  } else {
    warnings.push("Weak Volume — no clear institutional spike.");
  }

  let relativeConfirmed = true;
  if (relativeVolume !== null && Number.isFinite(relativeVolume)) {
    if (relativeVolume < config.minRelativeVolume) {
      relativeConfirmed = false;
      warnings.push("Low liquidity relative volume.");
    } else if (relativeVolume >= config.preferredRelativeVolume) {
      reasons.push("Relative volume confirms liquidity grab.");
    }
  } else {
    warnings.push("Relative volume missing — soft confirmation only.");
  }

  const score = clamp(
    (spike ? 70 : 35) +
      (relativeConfirmed
        ? relativeVolume !== null &&
          relativeVolume >= config.preferredRelativeVolume
          ? 25
          : 15
        : 0),
    config.scoreFloor,
    config.scoreCeiling
  );

  return { spike, relativeConfirmed, score, reasons, warnings };
}

export function validateBreadth(
  direction: Exclude<LiquiditySweepDirection, "NONE">,
  context: InstitutionalMarketContext,
  config: LiquiditySweepConfig = DEFAULT_LIQUIDITY_SWEEP_CONFIG
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
        reasons: ["Breadth supports reversal."],
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
      reasons: ["Breadth supports reversal."],
      warnings: [],
    };
  }
  return {
    confirmed: false,
    score: clamp(score!, 0, 100),
    reasons: [],
    warnings: ["Weak Breadth for bearish liquidity sweep."],
  };
}

export function validateSector(
  direction: Exclude<LiquiditySweepDirection, "NONE">,
  context: InstitutionalMarketContext,
  config: LiquiditySweepConfig = DEFAULT_LIQUIDITY_SWEEP_CONFIG
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
        reasons: [`Sector participation adequate (avg ${round(avg, 0)}).`],
        warnings: [],
      };
    }
    return {
      confirmed: false,
      score: avg,
      reasons: [],
      warnings: ["Weak Sector — extremely weak for bullish sweep."],
    };
  }
  if (avg <= config.bearishSectorMax) {
    return {
      confirmed: true,
      score: clamp(100 - avg, 0, 100),
      reasons: [`Sector participation adequate (avg ${round(avg, 0)}).`],
      warnings: [],
    };
  }
  return {
    confirmed: false,
    score: avg,
    reasons: [],
    warnings: ["Weak Sector posture for bearish liquidity sweep."],
  };
}

export function validateMarket(
  direction: Exclude<LiquiditySweepDirection, "NONE">,
  regime: MarketRegimeLabel,
  riskMode: InstitutionalMarketContext["riskMode"],
  regimeConfidence: number,
  volatilityScore: number,
  newsDriven: boolean,
  config: LiquiditySweepConfig = DEFAULT_LIQUIDITY_SWEEP_CONFIG
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
      warnings: ["News spike — liquidity sweep rejected."],
    };
  }

  if (config.blockedRegimes.includes(regime)) {
    return {
      confirmed: false,
      score: 20,
      reasons: [],
      warnings: [`Market regime ${regime} incompatible with liquidity sweep.`],
    };
  }

  if (direction === "BUY" && config.bullBlockedRegimes.includes(regime)) {
    return {
      confirmed: false,
      score: 20,
      reasons: [],
      warnings: ["Market in Strong Bear regime — bullish sweep rejected."],
    };
  }
  if (direction === "SELL" && config.bearBlockedRegimes.includes(regime)) {
    return {
      confirmed: false,
      score: 20,
      reasons: [],
      warnings: ["Market in Strong Bull regime — bearish sweep rejected."],
    };
  }

  if (!config.compatibleRegimes.includes(regime)) {
    return {
      confirmed: false,
      score: 25,
      reasons: [],
      warnings: [`Regime ${regime} not compatible with liquidity sweep.`],
    };
  }
  reasons.push("Trade aligns with current market regime.");
  score += 20;

  if (regimeConfidence >= config.minRegimeConfidence) {
    score += 15;
  } else {
    warnings.push("High uncertainty — regime confidence below threshold.");
    score -= 20;
  }

  if (volatilityScore < config.minVolatilityScore) {
    warnings.push("Volatility too low for institutional liquidity sweeps.");
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
      volatilityScore >= config.minVolatilityScore &&
      !(direction === "BUY" && config.bullBlockedRegimes.includes(regime)) &&
      !(direction === "SELL" && config.bearBlockedRegimes.includes(regime)),
    score: clamp(score, config.scoreFloor, config.scoreCeiling),
    reasons,
    warnings,
  };
}

function isStrongTrendContinuation(
  candles: readonly LiquiditySweepCandle[],
  direction: Exclude<LiquiditySweepDirection, "NONE">,
  config: LiquiditySweepConfig
): boolean {
  const window = candles.slice(-Math.max(config.trendSlopeLookback, 3));
  if (window.length < 3) return false;
  const first = window[0]!.close;
  const last = window[window.length - 1]!.close;
  if (!Number.isFinite(first) || first === 0) return false;
  const slope = (last - first) / Math.abs(first);
  // After a bullish sweep, reject if still strongly selling (continuation dump)
  if (direction === "BUY") {
    return slope <= -config.strongTrendSlope;
  }
  return slope >= config.strongTrendSlope;
}

function isCircuitMove(
  candle: LiquiditySweepCandle,
  config: LiquiditySweepConfig
): boolean {
  const mid = (candle.high + candle.low) / 2 || candle.close;
  if (!Number.isFinite(mid) || mid <= 0) return false;
  return (candle.high - candle.low) / mid >= config.circuitMovePct;
}

export function calculateConfidence(input: {
  sweepScore: number;
  reversalScore: number;
  volumeScore: number;
  breadthScore: number;
  sectorScore: number;
  marketScore: number;
  structureScore: number;
  config?: LiquiditySweepConfig;
}): number {
  const config = input.config ?? DEFAULT_LIQUIDITY_SWEEP_CONFIG;
  const w = config.confidenceWeights;
  const composite =
    input.sweepScore * w.sweepQuality +
    input.reversalScore * w.reversal +
    input.volumeScore * w.volume +
    input.breadthScore * w.breadth +
    input.sectorScore * w.sector +
    input.marketScore * w.market +
    input.structureScore * w.structure;
  return clamp(
    round(composite, 1),
    config.confidenceFloor,
    config.scoreCeiling
  );
}

export function createEmptyLiquiditySweepDetection(
  warnings: string[],
  reasons: string[] = []
): LiquiditySweepDetection {
  return {
    detected: false,
    direction: "NONE",
    sweepType: "none",
    liquidityLevel: 0,
    sweepExtreme: 0,
    reclaimClose: 0,
    sweepDistance: 0,
    reversalConfirmed: false,
    volumeSpike: false,
    relativeVolumeConfirmed: false,
    breadthConfirmed: false,
    sectorConfirmed: false,
    marketConfirmed: false,
    confidence: 0,
    reasons,
    warnings,
  };
}

/**
 * Full liquidity sweep detection.
 */
export function detectLiquiditySweep(
  context: LiquiditySweepDetectionContext
): LiquiditySweepDetection {
  const config = resolveLiquiditySweepConfig(context.config);
  const data = context.input.liquiditySweep;
  const candles = data.candles5m;
  const warnings: string[] = [];
  const reasons: string[] = [];

  const last = candles[candles.length - 1];
  if (!last) {
    return createEmptyLiquiditySweepDetection(["Missing candles."]);
  }

  if (isCircuitMove(last, config)) {
    return createEmptyLiquiditySweepDetection(
      ["Circuit movement — liquidity sweep rejected."],
      reasons
    );
  }

  const zones = resolveLiquidityZones(
    candles,
    config,
    data.liquidityZones,
    data.recentSwingHigh,
    data.recentSwingLow
  );
  if (zones.length === 0) {
    return createEmptyLiquiditySweepDetection(
      ["No liquidity zones available."],
      reasons
    );
  }

  const sweep = detectBestSweep(candles, zones, data.atr, config);
  if (!sweep) {
    return createEmptyLiquiditySweepDetection(
      ["No liquidity sweep / reclaim pattern detected."],
      reasons
    );
  }

  reasons.push(
    sweep.direction === "BUY"
      ? "Liquidity below swing low successfully swept."
      : "Liquidity above swing high successfully swept."
  );

  if (isStrongTrendContinuation(candles, sweep.direction, config)) {
    return {
      ...createEmptyLiquiditySweepDetection(
        [
          "Trend continuation — false sweep rejected.",
          ...warnings,
        ],
        reasons
      ),
      liquidityLevel: sweep.liquidityLevel,
      sweepExtreme: sweep.sweepExtreme,
      reclaimClose: sweep.reclaimClose,
      sweepDistance: sweep.sweepDistance,
      sweepType: sweep.sweepType,
    };
  }

  const reversal = detectReversalCandle(candles, sweep.direction, config);
  warnings.push(...reversal.warnings);
  reasons.push(...reversal.reasons);
  if (!reversal.confirmed) {
    return {
      ...createEmptyLiquiditySweepDetection(
        ["Weak reversal — sweep reclaim rejected.", ...warnings],
        reasons
      ),
      liquidityLevel: sweep.liquidityLevel,
      sweepExtreme: sweep.sweepExtreme,
      reclaimClose: sweep.reclaimClose,
      sweepDistance: sweep.sweepDistance,
      sweepType: sweep.sweepType,
    };
  }

  const volume = validateVolume(candles, data.relativeVolume, config);
  warnings.push(...volume.warnings);
  reasons.push(...volume.reasons);

  const breadth = validateBreadth(sweep.direction, context.marketContext, config);
  warnings.push(...breadth.warnings);
  reasons.push(...breadth.reasons);

  const sector = validateSector(sweep.direction, context.marketContext, config);
  warnings.push(...sector.warnings);
  reasons.push(...sector.reasons);

  const market = validateMarket(
    sweep.direction,
    context.regime.regime,
    context.marketContext.riskMode,
    context.confidence.score,
    context.marketContext.volatility?.score ?? 50,
    data.newsDriven === true,
    config
  );
  warnings.push(...market.warnings);
  reasons.push(...market.reasons);

  if (!breadth.confirmed || !sector.confirmed || !market.confirmed) {
    return {
      ...createEmptyLiquiditySweepDetection(warnings, reasons),
      liquidityLevel: sweep.liquidityLevel,
      sweepExtreme: sweep.sweepExtreme,
      reclaimClose: sweep.reclaimClose,
      sweepDistance: sweep.sweepDistance,
      sweepType: sweep.sweepType,
      reversalConfirmed: reversal.confirmed,
      volumeSpike: volume.spike,
      relativeVolumeConfirmed: volume.relativeConfirmed,
      breadthConfirmed: breadth.confirmed,
      sectorConfirmed: sector.confirmed,
      marketConfirmed: market.confirmed,
      confidence: calculateConfidence({
        sweepScore: sweep.qualityScore,
        reversalScore: reversal.score,
        volumeScore: volume.score,
        breadthScore: breadth.score,
        sectorScore: sector.score,
        marketScore: market.score,
        structureScore: sweep.qualityScore,
        config,
      }),
    };
  }

  if (
    data.relativeVolume !== null &&
    Number.isFinite(data.relativeVolume) &&
    data.relativeVolume < config.minRelativeVolume
  ) {
    return {
      ...createEmptyLiquiditySweepDetection(
        ["Low liquidity — sweep rejected.", ...warnings],
        reasons
      ),
      liquidityLevel: sweep.liquidityLevel,
      sweepExtreme: sweep.sweepExtreme,
      reclaimClose: sweep.reclaimClose,
      sweepDistance: sweep.sweepDistance,
      sweepType: sweep.sweepType,
      reversalConfirmed: true,
      volumeSpike: volume.spike,
      relativeVolumeConfirmed: false,
      breadthConfirmed: true,
      sectorConfirmed: true,
      marketConfirmed: true,
    };
  }

  const confidence = calculateConfidence({
    sweepScore: sweep.qualityScore,
    reversalScore: reversal.score,
    volumeScore: volume.score,
    breadthScore: breadth.score,
    sectorScore: sector.score,
    marketScore: market.score,
    structureScore: sweep.qualityScore,
    config,
  });

  reasons.push(
    `Liquidity Sweep ${sweep.direction} detected (${sweep.sweepType}).`
  );

  return {
    detected: true,
    direction: sweep.direction,
    sweepType: sweep.sweepType,
    liquidityLevel: sweep.liquidityLevel,
    sweepExtreme: sweep.sweepExtreme,
    reclaimClose: sweep.reclaimClose,
    sweepDistance: sweep.sweepDistance,
    reversalConfirmed: true,
    volumeSpike: volume.spike,
    relativeVolumeConfirmed: volume.relativeConfirmed,
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
