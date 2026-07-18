/**
 * Volatility calculators — Sprint 11B.1C.
 * Pure functions only; no I/O. Multi-factor institutional volatility model.
 */

import { clamp, round } from "@/lib/engine/utils";
import { atr, volatility as historicalVolatilityFn } from "@/lib/technical/math";
import type { OhlcBar } from "@/lib/providers/types";
import {
  DEFAULT_VOLATILITY_CONFIG,
  type AtrExpansionResult,
  type GapDirection,
  type GapRiskResult,
  type IndexContextSnapshot,
  type InstitutionalVolatilityRegime,
  type RiskMode,
  type VolatilityAnalysis,
  type VolatilityConfig,
  type VolatilityEngineInput,
  type VolatilityTrendState,
} from "./MarketContextTypes";

export function resolveVolatilityConfig(
  partial?: Partial<VolatilityConfig>
): VolatilityConfig {
  return { ...DEFAULT_VOLATILITY_CONFIG, ...partial };
}

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function primaryIndex(input: VolatilityEngineInput): IndexContextSnapshot {
  if (input.nifty.available) return input.nifty;
  if (input.sensex.available) return input.sensex;
  return input.bankNifty;
}

function closesFromIndex(index: IndexContextSnapshot): number[] {
  if (index.closes.length > 0) return index.closes;
  return index.candles
    .map((bar) => bar.close)
    .filter((close) => Number.isFinite(close) && close > 0);
}

/**
 * Annualized historical volatility (%) from close series.
 * Reuses lib/technical volatility (already annualized percent).
 */
export function calculateHistoricalVolatility(
  closes: number[],
  period: number = DEFAULT_VOLATILITY_CONFIG.historicalVolPeriod
): number | null {
  if (closes.length < period + 1) return null;
  const value = historicalVolatilityFn(closes, period);
  if (!isFiniteNumber(value)) return null;
  return clamp(round(value, 2), 0, 100);
}

/**
 * Realized volatility over a shorter window (percent).
 */
export function calculateRealizedVolatility(
  closes: number[],
  period: number = DEFAULT_VOLATILITY_CONFIG.realizedVolPeriod
): number | null {
  return calculateHistoricalVolatility(closes, period);
}

export function calculateDailyRangePercent(
  index: IndexContextSnapshot
): number | null {
  if (!index.available || index.price <= 0) return null;
  const high = index.high > 0 ? index.high : index.price;
  const low = index.low > 0 ? index.low : index.price;
  if (high < low) return null;
  return clamp(round(((high - low) / index.price) * 100, 3), 0, 100);
}

export function calculateIntradayRangePercent(
  candles: OhlcBar[]
): number | null {
  if (candles.length === 0) return null;
  const last = candles[candles.length - 1];
  if (!last || last.close <= 0) return null;
  return clamp(round(((last.high - last.low) / last.close) * 100, 3), 0, 100);
}

/**
 * ATR expansion / compression vs prior ATR window.
 */
export function calculateATRExpansion(
  candles: OhlcBar[],
  config: VolatilityConfig = DEFAULT_VOLATILITY_CONFIG
): AtrExpansionResult {
  const reasons: string[] = [];
  if (candles.length < config.atrPeriod * 2) {
    return {
      atr: null,
      atrPercent: null,
      expansionRatio: null,
      expanding: false,
      compressing: false,
      expansionScore: 50,
      reasons: ["Insufficient candles for ATR expansion"],
    };
  }

  const currentAtr = atr(candles, config.atrPeriod);
  const priorWindow = candles.slice(0, -config.atrPeriod);
  const priorAtr =
    priorWindow.length >= config.atrPeriod + 1
      ? atr(priorWindow, config.atrPeriod)
      : null;

  const lastClose = candles[candles.length - 1]?.close ?? 0;
  const atrPercent =
    isFiniteNumber(currentAtr) && lastClose > 0
      ? round((currentAtr / lastClose) * 100, 3)
      : null;

  if (!isFiniteNumber(currentAtr) || !isFiniteNumber(priorAtr) || priorAtr <= 0) {
    return {
      atr: currentAtr,
      atrPercent,
      expansionRatio: null,
      expanding: false,
      compressing: false,
      expansionScore: 50,
      reasons: ["ATR baseline unavailable"],
    };
  }

  const expansionRatio = round(currentAtr / priorAtr, 3);
  const expanding = expansionRatio >= config.atrExpandRatio;
  const compressing = expansionRatio <= config.atrCompressRatio;
  const expansionScore = clamp(
    round(50 + (expansionRatio - 1) * 80, 1),
    0,
    100
  );

  if (expanding) reasons.push("ATR expanding");
  else if (compressing) reasons.push("ATR contracting");
  else reasons.push(`ATR stable (${expansionRatio}x)`);

  return {
    atr: round(currentAtr, 2),
    atrPercent,
    expansionRatio,
    expanding,
    compressing,
    expansionScore,
    reasons,
  };
}

/**
 * Gap risk from open vs previous close (or candle open/prev close).
 */
export function calculateGapRisk(
  index: IndexContextSnapshot,
  config: VolatilityConfig = DEFAULT_VOLATILITY_CONFIG
): GapRiskResult {
  const reasons: string[] = [];
  let gapPercent = 0;
  let direction: GapDirection = "flat";

  const open = index.open;
  const previousClose = index.previousClose;
  const candles = index.candles;

  if (
    isFiniteNumber(open) &&
    isFiniteNumber(previousClose) &&
    previousClose > 0
  ) {
    gapPercent = round(((open - previousClose) / previousClose) * 100, 3);
  } else if (candles.length >= 2) {
    const last = candles[candles.length - 1];
    const prev = candles[candles.length - 2];
    if (prev.close > 0) {
      gapPercent = round(((last.open - prev.close) / prev.close) * 100, 3);
    }
  }

  if (gapPercent > config.gapMaterialPct * 0.2) direction = "up";
  else if (gapPercent < -config.gapMaterialPct * 0.2) direction = "down";

  const magnitudeScore = clamp(round(Math.abs(gapPercent) * 25, 1), 0, 100);

  if (Math.abs(gapPercent) >= config.gapMaterialPct) {
    reasons.push(
      direction === "up"
        ? `Material gap up (${gapPercent}%)`
        : `Material gap down (${gapPercent}%)`
    );
  }

  return { gapPercent, direction, magnitudeScore, reasons };
}

function mapVixToScore(
  vix: number,
  config: VolatilityConfig
): number {
  if (vix <= config.vixVeryLow) {
    return clamp(round((vix / config.vixVeryLow) * 18, 1), 0, 18);
  }
  if (vix <= config.vixLow) {
    const span = config.vixLow - config.vixVeryLow;
    const progress = span > 0 ? (vix - config.vixVeryLow) / span : 0;
    return clamp(round(18 + progress * 18, 1), 18, 36);
  }
  if (vix <= config.vixNormal) {
    const span = config.vixNormal - config.vixLow;
    const progress = span > 0 ? (vix - config.vixLow) / span : 0;
    return clamp(round(36 + progress * 18, 1), 36, 54);
  }
  if (vix <= config.vixElevated) {
    const span = config.vixElevated - config.vixNormal;
    const progress = span > 0 ? (vix - config.vixNormal) / span : 0;
    return clamp(round(54 + progress * 14, 1), 54, 68);
  }
  if (vix <= config.vixHigh) {
    const span = config.vixHigh - config.vixElevated;
    const progress = span > 0 ? (vix - config.vixElevated) / span : 0;
    return clamp(round(68 + progress * 14, 1), 68, 82);
  }
  return clamp(round(82 + (vix - config.vixHigh) * 1.8, 1), 82, 100);
}

/**
 * Composite volatility score 0–100.
 * 0–20 Extremely Quiet · 21–40 Low · 41–60 Normal · 61–80 High · 81–100 Extreme
 */
export function calculateVolatilityScore(components: {
  vixScore: number | null;
  atrScore: number | null;
  historicalScore: number | null;
  realizedScore: number | null;
  rangeScore: number | null;
  gapScore: number | null;
  config?: VolatilityConfig;
}): number {
  const config = resolveVolatilityConfig(components.config);
  const pairs: Array<{ value: number; weight: number }> = [];

  if (isFiniteNumber(components.vixScore)) {
    pairs.push({ value: components.vixScore, weight: config.weightVix });
  }
  if (isFiniteNumber(components.atrScore)) {
    pairs.push({ value: components.atrScore, weight: config.weightAtr });
  }
  if (isFiniteNumber(components.historicalScore)) {
    pairs.push({
      value: components.historicalScore,
      weight: config.weightHistorical,
    });
  }
  if (isFiniteNumber(components.realizedScore)) {
    pairs.push({
      value: components.realizedScore,
      weight: config.weightRealized,
    });
  }
  if (isFiniteNumber(components.rangeScore)) {
    pairs.push({ value: components.rangeScore, weight: config.weightRange });
  }
  if (isFiniteNumber(components.gapScore)) {
    pairs.push({ value: components.gapScore, weight: config.weightGap });
  }

  if (pairs.length === 0) return 50;

  const weightSum = pairs.reduce((sum, pair) => sum + pair.weight, 0);
  const scored =
    pairs.reduce((sum, pair) => sum + pair.value * pair.weight, 0) / weightSum;
  return clamp(round(scored, 1), 0, 100);
}

/**
 * Classify institutional volatility regime from score + VIX level.
 */
export function calculateVolatilityRegime(
  score: number,
  indiaVix: number | null,
  config: VolatilityConfig = DEFAULT_VOLATILITY_CONFIG
): InstitutionalVolatilityRegime {
  if (isFiniteNumber(indiaVix)) {
    if (indiaVix >= config.vixHigh + 4 || score >= 90) return "Extreme";
    if (indiaVix >= config.vixHigh || score >= config.scoreHighMax) return "High";
    if (indiaVix >= config.vixElevated || score >= config.scoreNormalMax) {
      return "Elevated";
    }
    if (indiaVix <= config.vixVeryLow && score <= config.scoreVeryQuietMax) {
      return "Very Low";
    }
    if (indiaVix <= config.vixLow || score <= config.scoreLowMax) return "Low";
    return "Normal";
  }

  if (score <= config.scoreVeryQuietMax) return "Very Low";
  if (score <= config.scoreLowMax) return "Low";
  if (score <= config.scoreNormalMax) return "Normal";
  if (score <= config.scoreHighMax - 10) return "Elevated";
  if (score <= config.scoreHighMax) return "High";
  return "Extreme";
}

/**
 * Volatility trend from VIX momentum, ATR expansion, and score delta proxies.
 */
export function calculateVolatilityTrend(input: {
  vixMomentum: number;
  atrExpanding: boolean;
  atrCompressing: boolean;
  relativeVolatility: number;
  score: number;
  config?: VolatilityConfig;
}): VolatilityTrendState {
  const config = resolveVolatilityConfig(input.config);

  if (input.atrExpanding && input.vixMomentum >= config.vixMomentumStrongPct) {
    return "Expanding";
  }
  if (
    input.atrCompressing &&
    input.vixMomentum <= -config.vixMomentumStrongPct
  ) {
    return "Contracting";
  }
  if (input.vixMomentum >= config.vixMomentumStrongPct) return "Increasing";
  if (input.vixMomentum <= -config.vixMomentumStrongPct) return "Decreasing";
  if (Math.abs(input.vixMomentum) <= config.trendStableBand) {
    if (input.relativeVolatility > 1.15) return "Expanding";
    if (input.relativeVolatility < 0.85) return "Contracting";
    return "Stable";
  }
  return input.vixMomentum > 0 ? "Increasing" : "Decreasing";
}

/**
 * Risk mode from VIX/volatility score, breadth, market strength, and range expansion.
 */
export function calculateRiskMode(
  input: {
    score: number;
    regime: InstitutionalVolatilityRegime;
    breadthScore: number | null;
    marketStrength: number | null;
    rangeExpanding: boolean;
    atrExpanding: boolean;
  },
  config: VolatilityConfig = DEFAULT_VOLATILITY_CONFIG
): RiskMode {
  let riskOnVotes = 0;
  let riskOffVotes = 0;

  if (input.score <= config.riskOnMaxScore) riskOnVotes += 1;
  if (input.score >= config.riskOffMinScore) riskOffVotes += 1;

  if (
    input.regime === "Very Low" ||
    input.regime === "Low" ||
    input.regime === "Normal"
  ) {
    riskOnVotes += 1;
  }
  if (
    input.regime === "Elevated" ||
    input.regime === "High" ||
    input.regime === "Extreme"
  ) {
    riskOffVotes += 1;
  }

  if (
    isFiniteNumber(input.breadthScore) &&
    input.breadthScore >= config.riskOnMinBreadth
  ) {
    riskOnVotes += 1;
  }
  if (
    isFiniteNumber(input.breadthScore) &&
    input.breadthScore <= config.riskOffMaxBreadth
  ) {
    riskOffVotes += 1;
  }

  if (
    isFiniteNumber(input.marketStrength) &&
    input.marketStrength >= config.riskOnMinStrength
  ) {
    riskOnVotes += 1;
  }
  if (
    isFiniteNumber(input.marketStrength) &&
    input.marketStrength <= config.riskOffMaxStrength
  ) {
    riskOffVotes += 1;
  }

  if (input.rangeExpanding || input.atrExpanding) riskOffVotes += 1;

  if (riskOffVotes >= riskOnVotes + 2) return "Risk Off";
  if (riskOnVotes >= riskOffVotes + 2) return "Risk On";
  if (riskOffVotes > riskOnVotes) return "Risk Off";
  if (riskOnVotes > riskOffVotes) return "Risk On";
  return "Neutral";
}

/**
 * Confidence from factor coverage and internal agreement.
 */
export function calculateConfidence(
  input: {
    factorsAvailable: number;
    factorsTotal: number;
    vixAvailable: boolean;
    atrAvailable: boolean;
    score: number;
    regime: InstitutionalVolatilityRegime;
  },
  config: VolatilityConfig = DEFAULT_VOLATILITY_CONFIG
): number {
  const coverage =
    input.factorsTotal > 0 ? input.factorsAvailable / input.factorsTotal : 0;
  let confidence = clamp(round(40 + coverage * 55, 1), 0, 100);

  if (!input.vixAvailable) {
    confidence -= config.missingDataConfidencePenalty * 1.5;
  }
  if (!input.atrAvailable) {
    confidence -= config.missingDataConfidencePenalty / 2;
  }

  const expectedScoreBand =
    input.regime === "Very Low" || input.regime === "Low"
      ? input.score <= 45
      : input.regime === "High" || input.regime === "Extreme"
        ? input.score >= 60
        : input.score >= 35 && input.score <= 70;

  if (expectedScoreBand) confidence += 5;
  else confidence -= 4;

  return clamp(round(confidence, 1), 0, 100);
}

function mapVolPercentToScore(volPercent: number): number {
  // Typical equity HV ~10–35%; map into 0–100 intensity.
  return clamp(round(volPercent * 2.2, 1), 0, 100);
}

function mapRangeToScore(
  rangePct: number,
  config: VolatilityConfig
): number {
  if (rangePct <= config.rangeQuietPct) {
    return clamp(round((rangePct / config.rangeQuietPct) * 30, 1), 0, 30);
  }
  if (rangePct <= config.rangeElevatedPct) {
    const span = config.rangeElevatedPct - config.rangeQuietPct;
    const progress = span > 0 ? (rangePct - config.rangeQuietPct) / span : 0;
    return clamp(round(30 + progress * 35, 1), 30, 65);
  }
  return clamp(
    round(65 + (rangePct - config.rangeElevatedPct) * 12, 1),
    65,
    100
  );
}

function buildReasons(params: {
  indiaVix: number | null;
  vixMomentum: number;
  atrResult: AtrExpansionResult;
  dailyRange: number | null;
  historicalVolatility: number | null;
  realizedVolatility: number | null;
  relativeVolatility: number;
  gap: GapRiskResult;
  trend: VolatilityTrendState;
  riskMode: RiskMode;
  regime: InstitutionalVolatilityRegime;
  config: VolatilityConfig;
}): string[] {
  const reasons: string[] = [];
  const {
    indiaVix,
    vixMomentum,
    atrResult,
    dailyRange,
    historicalVolatility,
    relativeVolatility,
    gap,
    trend,
    riskMode,
    regime,
    config,
  } = params;

  if (isFiniteNumber(indiaVix)) {
    if (vixMomentum >= config.vixMomentumStrongPct) {
      reasons.push("India VIX rising rapidly");
    } else if (vixMomentum <= -config.vixMomentumStrongPct) {
      reasons.push("India VIX falling");
    } else {
      reasons.push(`India VIX at ${round(indiaVix, 2)}`);
    }
  } else {
    reasons.push("India VIX unavailable — using multi-factor volatility");
  }

  reasons.push(...atrResult.reasons);
  reasons.push(...gap.reasons);

  if (isFiniteNumber(dailyRange)) {
    if (dailyRange >= config.rangeElevatedPct) {
      reasons.push("Daily ranges increasing");
    } else if (dailyRange <= config.rangeQuietPct) {
      reasons.push("Daily ranges compressed");
    }
  }

  if (isFiniteNumber(historicalVolatility) && relativeVolatility < 0.9) {
    reasons.push("Volatility remains below historical average");
  } else if (relativeVolatility > 1.15) {
    reasons.push("Realized volatility above historical average");
  }

  if (trend === "Expanding") reasons.push("Volatility expanding");
  if (trend === "Contracting") reasons.push("Volatility contracting");

  if (riskMode === "Risk On") reasons.push("Risk appetite improving");
  if (riskMode === "Risk Off") reasons.push("Risk appetite deteriorating");

  reasons.push(`Volatility regime: ${regime}`);
  return dedupe(reasons);
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

/**
 * Builds a complete VolatilityAnalysis from normalized engine input.
 */
export function buildVolatilityAnalysis(
  input: VolatilityEngineInput
): VolatilityAnalysis {
  const config = resolveVolatilityConfig(input.config);
  const primary = primaryIndex(input);
  const closes = closesFromIndex(primary);

  const vixAvailable = isFiniteNumber(input.indiaVix) && input.indiaVix > 0;
  const indiaVix = vixAvailable ? (input.indiaVix as number) : 0;

  const vixMomentum = (() => {
    if (isFiniteNumber(input.indiaVixChangePercent)) {
      return round(input.indiaVixChangePercent, 2);
    }
    if (
      vixAvailable &&
      isFiniteNumber(input.previousIndiaVix) &&
      input.previousIndiaVix > 0
    ) {
      return round(
        ((indiaVix - input.previousIndiaVix) / input.previousIndiaVix) * 100,
        2
      );
    }
    return 0;
  })();

  const atrResult = calculateATRExpansion(primary.candles, config);
  const gap = calculateGapRisk(primary, config);
  const dailyRange = calculateDailyRangePercent(primary);
  const intradayRange =
    calculateIntradayRangePercent(primary.candles) ?? dailyRange;

  const historicalVolatility = calculateHistoricalVolatility(
    closes,
    config.historicalVolPeriod
  );
  const realizedVolatility = calculateRealizedVolatility(
    closes,
    config.realizedVolPeriod
  );

  const relativeVolatility =
    isFiniteNumber(historicalVolatility) &&
    historicalVolatility > 0 &&
    isFiniteNumber(realizedVolatility)
      ? round(realizedVolatility / historicalVolatility, 3)
      : 1;

  const vixScore = vixAvailable ? mapVixToScore(indiaVix, config) : null;
  const atrScore = atrResult.expansionScore;
  const historicalScore = isFiniteNumber(historicalVolatility)
    ? mapVolPercentToScore(historicalVolatility)
    : null;
  const realizedScore = isFiniteNumber(realizedVolatility)
    ? mapVolPercentToScore(realizedVolatility)
    : null;
  const rangeScore = isFiniteNumber(dailyRange)
    ? mapRangeToScore(dailyRange, config)
    : isFiniteNumber(intradayRange)
      ? mapRangeToScore(intradayRange, config)
      : null;
  const gapScore = gap.magnitudeScore;

  const scoreRaw = calculateVolatilityScore({
    vixScore,
    atrScore: atrResult.atr !== null ? atrScore : null,
    historicalScore,
    realizedScore,
    rangeScore,
    gapScore: Math.abs(gap.gapPercent) > 0 ? gapScore : null,
    config,
  });

  // Elevated/high VIX must floor the composite — institutional risk signal.
  let score = scoreRaw;
  if (vixAvailable && isFiniteNumber(vixScore)) {
    if (indiaVix >= config.vixHigh) {
      score = Math.max(scoreRaw, vixScore);
    } else if (indiaVix >= config.vixElevated) {
      score = Math.max(scoreRaw, round(scoreRaw * 0.45 + vixScore * 0.55, 1));
    }
  }
  score = clamp(round(score, 1), 0, 100);

  const regime = calculateVolatilityRegime(
    score,
    vixAvailable ? indiaVix : null,
    config
  );

  const trend = calculateVolatilityTrend({
    vixMomentum,
    atrExpanding: atrResult.expanding,
    atrCompressing: atrResult.compressing,
    relativeVolatility,
    score,
    config,
  });

  const rangeExpanding =
    isFiniteNumber(dailyRange) && dailyRange >= config.rangeElevatedPct;

  const riskMode = calculateRiskMode(
    {
      score,
      regime,
      breadthScore: input.breadthScore,
      marketStrength: input.marketStrength,
      rangeExpanding,
      atrExpanding: atrResult.expanding,
    },
    config
  );

  const factors = [
    vixAvailable,
    atrResult.atr !== null,
    isFiniteNumber(historicalVolatility),
    isFiniteNumber(realizedVolatility),
    isFiniteNumber(dailyRange) || isFiniteNumber(intradayRange),
    Math.abs(gap.gapPercent) > 0 || primary.available,
  ];
  const factorsAvailable = factors.filter(Boolean).length;

  if (factorsAvailable === 0) {
    return createFallbackVolatilityAnalysis(
      input.asOf,
      "Insufficient volatility inputs — neutral fallback applied"
    );
  }

  const confidence = calculateConfidence(
    {
      factorsAvailable,
      factorsTotal: factors.length,
      vixAvailable,
      atrAvailable: atrResult.atr !== null,
      score,
      regime,
    },
    config
  );

  const volatilityExpansion =
    atrResult.expanding || relativeVolatility > 1.15 || trend === "Expanding";
  const volatilityCompression =
    atrResult.compressing ||
    relativeVolatility < 0.85 ||
    trend === "Contracting";

  const reasons = buildReasons({
    indiaVix: vixAvailable ? indiaVix : null,
    vixMomentum,
    atrResult,
    dailyRange,
    historicalVolatility,
    realizedVolatility,
    relativeVolatility,
    gap,
    trend,
    riskMode,
    regime,
    config,
  });

  return {
    score,
    regime,
    trend,
    indiaVix: vixAvailable ? round(indiaVix, 2) : 0,
    atr: atrResult.atr ?? 0,
    historicalVolatility: historicalVolatility ?? 0,
    realizedVolatility: realizedVolatility ?? 0,
    gapPercent: gap.gapPercent,
    dailyRange: dailyRange ?? 0,
    intradayRange: intradayRange ?? 0,
    riskMode,
    confidence,
    reasons,
    vixTrend: calculateVolatilityTrend({
      vixMomentum,
      atrExpanding: false,
      atrCompressing: false,
      relativeVolatility: 1,
      score: vixScore ?? 50,
      config,
    }),
    vixMomentum,
    atrExpansion: atrResult.expanding,
    atrCompression: atrResult.compressing,
    relativeVolatility,
    volatilityExpansion,
    volatilityCompression,
    gapDirection: gap.direction,
    lastUpdated: input.asOf,
  };
}

export function createFallbackVolatilityAnalysis(
  asOf: Date = new Date(),
  reason = "Insufficient volatility data — neutral volatility applied"
): VolatilityAnalysis {
  return {
    score: 50,
    regime: "Normal",
    trend: "Stable",
    indiaVix: 0,
    atr: 0,
    historicalVolatility: 0,
    realizedVolatility: 0,
    gapPercent: 0,
    dailyRange: 0,
    intradayRange: 0,
    riskMode: "Neutral",
    confidence: 20,
    reasons: [reason],
    vixTrend: "Stable",
    vixMomentum: 0,
    atrExpansion: false,
    atrCompression: false,
    relativeVolatility: 1,
    volatilityExpansion: false,
    volatilityCompression: false,
    gapDirection: "flat",
    lastUpdated: asOf,
  };
}
