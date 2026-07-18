/**
 * VCP utilities — Sprint 11B.3L.
 * Pure detection helpers for Minervini-style Volatility Contraction Pattern.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import type { MarketRegimeLabel } from "@/src/modules/marketRegime";
import { isStrategyEligible } from "../StrategyUtils";
import {
  DEFAULT_VCP_CONFIG,
  VCP_STRATEGY_ID,
  resolveVCPConfig,
  type VCPConfig,
} from "./VCPConstants";
import type {
  VCPCandle,
  VCPContraction,
  VCPDetection,
  VCPDetectionContext,
  VCPDirection,
} from "./VCPTypes";

export { resolveVCPConfig };

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
  config: VCPConfig = DEFAULT_VCP_CONFIG
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

export function createEmptyVCPDetection(
  warnings: string[] = [],
  reasons: string[] = []
): VCPDetection {
  return {
    detected: false,
    direction: "NONE",
    contractionCount: 0,
    contractions: [],
    pivotPrice: 0,
    pivotLow: 0,
    lastContractionLow: 0,
    patternQuality: 0,
    contractionQuality: 0,
    volumeDryUpScore: 0,
    breakoutQuality: 0,
    ema20: 0,
    ema50: 0,
    ema150: 0,
    ema200: 0,
    vwap: 0,
    atr: 0,
    primaryUptrend: false,
    volumeDryUp: false,
    breakoutConfirmed: false,
    breadthConfirmed: false,
    sectorConfirmed: false,
    marketConfirmed: false,
    confidence: 0,
    reasons,
    warnings,
  };
}

function barRange(c: VCPCandle): number {
  return Math.max(c.high - c.low, 0.0001);
}

function closePositionInBar(c: VCPCandle): number {
  return (c.close - c.low) / barRange(c);
}

function averageVolume(candles: readonly VCPCandle[]): number {
  if (candles.length === 0) return 0;
  return candles.reduce((s, c) => s + c.volume, 0) / candles.length;
}

function averageRange(candles: readonly VCPCandle[]): number {
  if (candles.length === 0) return 0;
  return candles.reduce((s, c) => s + barRange(c), 0) / candles.length;
}

function isCircuitMove(candle: VCPCandle, config: VCPConfig): boolean {
  const mid = (candle.high + candle.low) / 2 || candle.close;
  if (!Number.isFinite(mid) || mid <= 0) return false;
  return (candle.high - candle.low) / mid >= config.circuitMovePct;
}

export function validatePrimaryUptrend(input: {
  close: number;
  ema50: number | null;
  ema150: number | null;
  ema200: number | null;
  fiftyTwoWeekHigh: number | null | undefined;
  config: VCPConfig;
}): { ok: boolean; reason: string } {
  const { close, ema50, ema150, ema200, fiftyTwoWeekHigh, config } = input;
  if (
    ema150 === null ||
    ema200 === null ||
    !Number.isFinite(ema150) ||
    !Number.isFinite(ema200)
  ) {
    return { ok: false, reason: "EMA150/EMA200 missing for primary uptrend." };
  }
  const stacked =
    close > ema150 &&
    ema150 > ema200 &&
    (ema50 === null ||
      !Number.isFinite(ema50) ||
      ema50 > ema150 * (1 - config.minEmaSeparationPct));
  if (!stacked) {
    return { ok: false, reason: "Primary uptrend not confirmed (EMA stack)." };
  }
  if (
    fiftyTwoWeekHigh !== null &&
    fiftyTwoWeekHigh !== undefined &&
    Number.isFinite(fiftyTwoWeekHigh) &&
    fiftyTwoWeekHigh > 0
  ) {
    const distance = (fiftyTwoWeekHigh - close) / fiftyTwoWeekHigh;
    if (distance > config.nearFiftyTwoWeekHighPct) {
      return {
        ok: false,
        reason: "Price too far from 52-week high for VCP base.",
      };
    }
  }
  return { ok: true, reason: "Primary uptrend confirmed." };
}

export function validateSector(
  context: InstitutionalMarketContext,
  config: VCPConfig = DEFAULT_VCP_CONFIG
): boolean {
  return averageSectorScore(context) >= config.bullishSectorMin;
}

export function validateBreadth(
  context: InstitutionalMarketContext,
  config: VCPConfig = DEFAULT_VCP_CONFIG
): boolean {
  return context.marketBreadth.score >= config.bullishBreadthMin;
}

export function validateMarket(
  regimeLabel: MarketRegimeLabel,
  confidenceScore: number,
  riskMode: InstitutionalMarketContext["riskMode"],
  volatilityScore: number,
  config: VCPConfig = DEFAULT_VCP_CONFIG
): boolean {
  if (config.blockedRegimes.includes(regimeLabel)) return false;
  if (config.blockedRiskModes.includes(riskMode)) return false;
  if (confidenceScore < config.minRegimeConfidence) return false;
  if (volatilityScore > config.maxVolatilityScore) return false;
  if (
    config.compatibleRegimes.length > 0 &&
    !config.compatibleRegimes.includes(regimeLabel)
  ) {
    return false;
  }
  return true;
}

export function validateVolume(input: {
  breakoutVolume: number;
  averageVolume: number;
  relativeVolume: number | null;
  config: VCPConfig;
}): boolean {
  const { breakoutVolume, averageVolume, relativeVolume, config } = input;
  if (averageVolume <= 0) return false;
  if (breakoutVolume < averageVolume * config.breakoutVolumeMultiple) {
    return false;
  }
  if (
    relativeVolume !== null &&
    Number.isFinite(relativeVolume) &&
    relativeVolume < config.minBreakoutRelativeVolume
  ) {
    return false;
  }
  return true;
}

interface ContractionCandidate {
  contractions: VCPContraction[];
  contractionQuality: number;
  volumeDryUpScore: number;
  volumeDryUp: boolean;
  atrDeclineOk: boolean;
  rangeDeclineOk: boolean;
}

function evaluateContractionSplit(
  base: readonly VCPCandle[],
  count: number,
  config: VCPConfig
): ContractionCandidate | null {
  if (base.length < count * 2) return null;
  const segmentSize = Math.floor(base.length / count);
  if (segmentSize < 2) return null;

  const contractions: VCPContraction[] = [];
  for (let i = 0; i < count; i++) {
    const start = i * segmentSize;
    const end = i === count - 1 ? base.length : (i + 1) * segmentSize;
    const slice = base.slice(start, end);
    if (slice.length < 2) return null;
    const high = Math.max(...slice.map((c) => c.high));
    const low = Math.min(...slice.map((c) => c.low));
    const range = high - low;
    if (range <= 0) return null;
    contractions.push({
      index: i,
      high,
      low,
      range,
      averageVolume: averageVolume(slice),
    });
  }

  for (let i = 1; i < contractions.length; i++) {
    const prev = contractions[i - 1]!;
    const curr = contractions[i]!;
    if (curr.range > prev.range * config.contractionShrinkFactor) {
      return null;
    }
    if (curr.low < prev.low * (1 - config.higherLowEpsilonPct)) {
      return null;
    }
  }

  const early = base.slice(0, Math.floor(base.length / 2));
  const late = base.slice(Math.floor(base.length / 2));
  const earlyVol = averageVolume(early);
  const lateVol = averageVolume(late);
  const volumeDryUp =
    earlyVol > 0 && lateVol <= earlyVol * config.volumeDryUpMaxRatio;

  const lastContraction = contractions[contractions.length - 1]!;
  const nearPivotVol = lastContraction.averageVolume;
  const priorVol =
    contractions
      .slice(0, -1)
      .reduce((s, c) => s + c.averageVolume, 0) /
    Math.max(contractions.length - 1, 1);
  const pivotDryUp =
    priorVol > 0 && nearPivotVol <= priorVol * (1 + config.higherLowEpsilonPct);

  let volumeDryUpScore = 35;
  if (volumeDryUp) volumeDryUpScore += 30;
  if (pivotDryUp) volumeDryUpScore += 25;
  if (lateVol < earlyVol) volumeDryUpScore += 10;
  volumeDryUpScore = clamp(volumeDryUpScore, 0, 100);

  const supplyDryUpConfirmed =
    (volumeDryUp && pivotDryUp) ||
    (volumeDryUpScore >= 70 && lateVol < earlyVol);

  const firstHalfRange = averageRange(early);
  const secondHalfRange = averageRange(late);
  const rangeDeclineOk =
    firstHalfRange > 0 &&
    secondHalfRange <=
      firstHalfRange * (1 - config.minRangeDeclineFraction);

  const ranges = contractions.map((c) => c.range);
  const shrinkScore =
    ranges.length > 1
      ? clamp(
          100 -
            ((ranges[ranges.length - 1]! / ranges[0]!) * 100),
          40,
          100
        )
      : 50;

  const higherLowScore = contractions.every(
    (c, i) => i === 0 || c.low >= contractions[i - 1]!.low
  )
    ? 90
    : 40;

  const contractionQuality = clamp(
    round((shrinkScore * 0.55 + higherLowScore * 0.45) / 1, 1),
    0,
    100
  );

  return {
    contractions,
    contractionQuality,
    volumeDryUpScore,
    volumeDryUp: supplyDryUpConfirmed,
    atrDeclineOk: rangeDeclineOk,
    rangeDeclineOk,
  };
}

function isBetterContractionCandidate(
  candidate: ContractionCandidate,
  best: ContractionCandidate
): boolean {
  if (candidate.volumeDryUp !== best.volumeDryUp) {
    return candidate.volumeDryUp;
  }
  if (candidate.volumeDryUpScore !== best.volumeDryUpScore) {
    return candidate.volumeDryUpScore > best.volumeDryUpScore;
  }
  if (candidate.contractionQuality !== best.contractionQuality) {
    return candidate.contractionQuality > best.contractionQuality;
  }
  return candidate.contractions.length > best.contractions.length;
}

export function findBestContractions(
  baseCandles: readonly VCPCandle[],
  config: VCPConfig
): ContractionCandidate | null {
  let best: ContractionCandidate | null = null;
  for (
    let count = config.minContractions;
    count <= config.maxContractions;
    count++
  ) {
    const candidate = evaluateContractionSplit(baseCandles, count, config);
    if (!candidate) continue;
    if (!best || isBetterContractionCandidate(candidate, best)) {
      best = candidate;
    }
  }
  return best;
}

export function calculateConfidence(input: {
  patternQuality: number;
  contractionQuality: number;
  volumeDryUpScore: number;
  breakoutQuality: number;
  sectorScore: number;
  marketScore: number;
  vwapScore: number;
  config: VCPConfig;
}): number {
  const w = input.config.confidenceWeights;
  const total =
    w.patternQuality +
    w.contractionQuality +
    w.volumeDryUp +
    w.breakoutQuality +
    w.sector +
    w.market +
    w.vwap;
  const composite =
    (input.patternQuality * w.patternQuality +
      input.contractionQuality * w.contractionQuality +
      input.volumeDryUpScore * w.volumeDryUp +
      input.breakoutQuality * w.breakoutQuality +
      input.sectorScore * w.sector +
      input.marketScore * w.market +
      input.vwapScore * w.vwap) /
    Math.max(total, 0.0001);
  return clamp(
    round(composite, 1),
    input.config.scoreFloor,
    input.config.scoreCeiling
  );
}

export function detectVCP(
  context: VCPDetectionContext
): VCPDetection {
  const config = resolveVCPConfig(context.config);
  const warnings: string[] = [];
  const reasons: string[] = [];
  const data = context.input.vcp;
  const candles = data.candlesDaily;

  if (candles.length < config.minimumSessionCandles) {
    return createEmptyVCPDetection(
      ["Insufficient daily OHLC for VCP detection."],
      ["Enough Candles missing."]
    );
  }

  const eligible = isStrategyEligible(
    VCP_STRATEGY_ID,
    context.eligibleStrategies ?? []
  );
  if (!eligible) {
    return createEmptyVCPDetection(
      ["Eligible Strategy gate failed for VCP."],
      ["Eligible Strategy gate failed for VCP."]
    );
  }

  const last = candles[candles.length - 1]!;

  const ema20 = data.ema20;
  const ema50 = data.ema50;
  const ema150 = data.ema150;
  const ema200 = data.ema200;
  const atr = data.atr;
  const vwap = data.vwap;

  const uptrend = validatePrimaryUptrend({
    close: last.close,
    ema50,
    ema150,
    ema200,
    fiftyTwoWeekHigh: data.fiftyTwoWeekHigh,
    config,
  });
  if (!uptrend.ok) {
    return createEmptyVCPDetection([uptrend.reason], [uptrend.reason]);
  }
  reasons.push(uptrend.reason);

  const baseEnd = candles.length - 1;
  type Ranked = {
    candidate: NonNullable<ReturnType<typeof findBestContractions>>;
    base: readonly VCPCandle[];
  };
  const ranked: Ranked[] = [];

  const pushCandidate = (
    candidateBase: readonly VCPCandle[],
    candidate: NonNullable<ReturnType<typeof findBestContractions>>
  ) => {
    ranked.push({ candidate, base: candidateBase });
  };

  // Prefer compact bases ending at the breakout (Minervini VCP sits under pivot).
  const segmentSizes = [6, 8, 10] as const;
  for (
    let count = config.minContractions;
    count <= config.maxContractions;
    count++
  ) {
    for (const segmentSize of segmentSizes) {
      const len = count * segmentSize;
      if (len > baseEnd || len < config.minContractions * 4) continue;
      const candidateBase = candles.slice(baseEnd - len, baseEnd);
      const candidate = evaluateContractionSplit(
        candidateBase,
        count,
        config
      );
      if (candidate) pushCandidate(candidateBase, candidate);
    }
  }

  // Fallback: scan contiguous windows if structured segments miss.
  if (ranked.filter((r) => r.candidate.volumeDryUp).length === 0) {
    const maxBase = Math.min(40, baseEnd);
    const minBase = Math.max(config.minContractions * 4, 16);
    for (let len = minBase; len <= maxBase; len++) {
      const candidateBase = candles.slice(baseEnd - len, baseEnd);
      const candidate = findBestContractions(candidateBase, config);
      if (candidate) pushCandidate(candidateBase, candidate);
    }
  }

  ranked.sort((a, b) => {
    const aClears =
      last.close > a.candidate.contractions[a.candidate.contractions.length - 1]!.high
        ? 1
        : 0;
    const bClears =
      last.close > b.candidate.contractions[b.candidate.contractions.length - 1]!.high
        ? 1
        : 0;
    if (aClears !== bClears) return bClears - aClears;
    if (a.candidate.volumeDryUp !== b.candidate.volumeDryUp) {
      return a.candidate.volumeDryUp ? -1 : 1;
    }
    return (
      b.candidate.contractionQuality +
      b.candidate.volumeDryUpScore -
      (a.candidate.contractionQuality + a.candidate.volumeDryUpScore)
    );
  });

  const selected = ranked[0];
  if (!selected || selected.base.length < config.minContractions * 2) {
    return createEmptyVCPDetection(
      ["Volatility contractions not meeting VCP criteria."],
      ["Weak pattern — contractions failed shrink / higher-low tests."]
    );
  }
  const contractionResult = selected.candidate;
  const base = selected.base;

  const { contractions, contractionQuality, volumeDryUpScore, volumeDryUp } =
    contractionResult;

  if (!contractionResult.rangeDeclineOk) {
    warnings.push("Average range decline across base is soft.");
  }

  if (!volumeDryUp) {
    return createEmptyVCPDetection(
      ["Volume dry-up near pivot not confirmed."],
      ["Weak volume — supply not drying up in base."]
    );
  }
  reasons.push("Volume dried up near pivot.");

  const lastContraction = contractions[contractions.length - 1]!;
  const pivotPrice = lastContraction.high;
  const pivotLow = Math.min(...contractions.map((c) => c.low));
  const lastContractionLow = lastContraction.low;

  const extensionPct =
    pivotPrice > 0 ? (last.close - pivotPrice) / pivotPrice : 0;
  if (extensionPct > config.maxExtensionBeyondPivotPct) {
    return createEmptyVCPDetection(
      ["Late / extended breakout beyond pivot tolerance."],
      ["Late entry — price extended beyond pivot."]
    );
  }

  if (isCircuitMove(last, config)) {
    return createEmptyVCPDetection(
      ["Circuit-like range on breakout bar — rejected."],
      ["False breakout risk — extreme range."]
    );
  }

  const closedAbovePivot = last.close > pivotPrice;
  const strongClose =
    closePositionInBar(last) >= config.breakoutCloseStrengthFraction;
  if (!closedAbovePivot) {
    return createEmptyVCPDetection(
      ["Price has not closed above pivot."],
      ["Breakout not confirmed."]
    );
  }
  if (!strongClose) {
    return createEmptyVCPDetection(
      ["Weak close on breakout bar."],
      ["False breakout risk — weak close."]
    );
  }

  const avgVol =
    data.averageVolume20d &&
    Number.isFinite(data.averageVolume20d) &&
    data.averageVolume20d > 0
      ? data.averageVolume20d
      : averageVolume(base);

  const volumeOk = validateVolume({
    breakoutVolume: last.volume,
    averageVolume: avgVol,
    relativeVolume: data.relativeVolume,
    config,
  });
  if (!volumeOk) {
    return createEmptyVCPDetection(
      ["Breakout volume / relative volume insufficient."],
      ["Weak volume — breakout not institutionally confirmed."]
    );
  }

  // Reject distribution: mid-base spike without trend
  const midSpike = base.some((c, i) => {
    if (i < 2 || i >= base.length - 2) return false;
    const localAvg = averageVolume(base.slice(Math.max(0, i - 3), i));
    return (
      localAvg > 0 &&
      c.volume >= localAvg * 2.5 &&
      c.close < c.open &&
      c.high < pivotPrice
    );
  });
  if (midSpike) {
    return createEmptyVCPDetection(
      ["Distribution volume spike inside base."],
      ["Weak volume — distribution detected in base."]
    );
  }

  const sectorConfirmed = validateSector(context.marketContext, config);
  const breadthConfirmed = validateBreadth(context.marketContext, config);
  const marketConfirmed = validateMarket(
    context.regime.regime,
    context.confidence.score,
    context.marketContext.riskMode,
    context.marketContext.volatility.score,
    config
  );

  if (!sectorConfirmed) {
    return createEmptyVCPDetection(
      ["Sector strength insufficient for VCP breakout."],
      ["Weak sector — leadership missing."]
    );
  }
  if (!breadthConfirmed) {
    return createEmptyVCPDetection(
      ["Market breadth insufficient for VCP breakout."],
      ["Weak breadth — participation missing."]
    );
  }
  if (!marketConfirmed) {
    return createEmptyVCPDetection(
      ["Market regime / risk mode not supportive for VCP."],
      ["Market regime incompatible with VCP."]
    );
  }

  reasons.push(
    `${contractions.length} successful volatility contractions detected.`
  );
  reasons.push("Breakout confirmed with institutional participation.");
  reasons.push("Sector leadership supports continuation.");
  reasons.push("Pattern meets Minervini VCP criteria.");

  const breakoutQuality = clamp(
    round(
      55 +
        closePositionInBar(last) * 25 +
        (volumeOk ? 15 : 0) +
        (extensionPct < config.maxExtensionBeyondPivotPct * 0.5 ? 5 : 0),
      1
    ),
    0,
    100
  );

  const patternQuality = clamp(
    round(
      contractionQuality * 0.45 +
        volumeDryUpScore * 0.25 +
        breakoutQuality * 0.3,
      1
    ),
    0,
    100
  );

  const sectorScore = averageSectorScore(context.marketContext);
  const marketScore = clamp(context.marketContext.confidence, 0, 100);
  let vwapScore = 50;
  if (Number.isFinite(vwap) && vwap > 0) {
    vwapScore = last.close >= vwap ? 85 : 35;
  }

  const confidence = Math.max(
    config.confidenceFloor,
    calculateConfidence({
      patternQuality,
      contractionQuality,
      volumeDryUpScore,
      breakoutQuality,
      sectorScore,
      marketScore,
      vwapScore,
      config,
    })
  );

  const direction: VCPDirection = "BUY";

  return {
    detected: true,
    direction,
    contractionCount: contractions.length,
    contractions,
    pivotPrice: round(pivotPrice, 4),
    pivotLow: round(pivotLow, 4),
    lastContractionLow: round(lastContractionLow, 4),
    patternQuality,
    contractionQuality,
    volumeDryUpScore,
    breakoutQuality,
    ema20: ema20 ?? 0,
    ema50: ema50 ?? 0,
    ema150: ema150 ?? 0,
    ema200: ema200 ?? 0,
    vwap,
    atr: atr ?? 0,
    primaryUptrend: true,
    volumeDryUp,
    breakoutConfirmed: true,
    breadthConfirmed,
    sectorConfirmed,
    marketConfirmed,
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
