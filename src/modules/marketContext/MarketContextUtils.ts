/**
 * Market Context Engine — pure calculators (Sprint 11B.1A).
 * All functions are side-effect free and reusable by the engine / tests.
 */

import { clamp, round } from "@/lib/engine/utils";
import { atr, ema, momentum } from "@/lib/technical/math";
import type { OhlcBar } from "@/lib/providers/types";
import type { SectorPerformance } from "@/types";
import {
  DEFAULT_MARKET_CONTEXT_CONFIG,
  type BreadthAnalysisResult,
  type BreadthContextSnapshot,
  type ConfidenceAnalysisResult,
  type IndexContextSnapshot,
  type MarketContext,
  type MarketContextConfig,
  type MarketContextInput,
  type MarketContextThresholds,
  type MarketStrengthAnalysisResult,
  type MarketStrengthWeights,
  type MarketTrend,
  type RiskMode,
  type RiskModeAnalysisResult,
  type TrendAnalysisResult,
  type TrendBias,
  type VixContextSnapshot,
  type VolatilityAnalysisResult,
  type VolatilityRegime,
} from "./MarketContextTypes";

function resolveConfig(partial?: Partial<MarketContextConfig>): MarketContextConfig {
  return {
    weights: {
      ...DEFAULT_MARKET_CONTEXT_CONFIG.weights,
      ...partial?.weights,
    },
    thresholds: {
      ...DEFAULT_MARKET_CONTEXT_CONFIG.thresholds,
      ...partial?.thresholds,
    },
  };
}

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function safeRatio(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return null;
  }
  return numerator / denominator;
}

function closesFromCandles(candles: OhlcBar[]): number[] {
  return candles.map((bar) => bar.close).filter((close) => Number.isFinite(close) && close > 0);
}

function detectSwingStructure(
  candles: OhlcBar[],
  lookback: number
): {
  higherHighs: boolean;
  higherLows: boolean;
  lowerHighs: boolean;
  lowerLows: boolean;
} {
  if (candles.length < lookback) {
    return {
      higherHighs: false,
      higherLows: false,
      lowerHighs: false,
      lowerLows: false,
    };
  }

  const window = candles.slice(-lookback);
  const mid = Math.floor(window.length / 2);
  const earlier = window.slice(0, mid);
  const later = window.slice(mid);

  const earlierHigh = Math.max(...earlier.map((bar) => bar.high));
  const laterHigh = Math.max(...later.map((bar) => bar.high));
  const earlierLow = Math.min(...earlier.map((bar) => bar.low));
  const laterLow = Math.min(...later.map((bar) => bar.low));

  return {
    higherHighs: laterHigh > earlierHigh,
    higherLows: laterLow > earlierLow,
    lowerHighs: laterHigh < earlierHigh,
    lowerLows: laterLow < earlierLow,
  };
}

function classifyTrend(score: number, thresholds: MarketContextThresholds): MarketTrend {
  if (score >= thresholds.strongBullScore) return "Strong Bull";
  if (score >= thresholds.weakBullScore) return "Weak Bull";
  if (score <= thresholds.strongBearScore) return "Strong Bear";
  if (score <= thresholds.weakBearScore) return "Weak Bear";
  return "Sideways";
}

function trendBias(trend: MarketTrend): TrendBias {
  if (trend === "Strong Bull" || trend === "Weak Bull") return "bullish";
  if (trend === "Strong Bear" || trend === "Weak Bear") return "bearish";
  return "neutral";
}

function mapSignedScoreToStrength(score: number): number {
  return clamp(round((score + 100) / 2, 1), 0, 100);
}

function classifyVolatilityRegime(score: number): VolatilityRegime {
  if (score >= 80) return "extreme";
  if (score >= 55) return "elevated";
  if (score <= 35) return "low";
  return "normal";
}

function mapVixToVolatilityScore(
  vix: number,
  thresholds: MarketContextThresholds
): number {
  if (vix <= thresholds.vixLow) {
    return clamp(round((vix / thresholds.vixLow) * 30, 1), 0, 30);
  }
  if (vix <= thresholds.vixElevated) {
    const span = thresholds.vixElevated - thresholds.vixLow;
    const progress = span > 0 ? (vix - thresholds.vixLow) / span : 0;
    return clamp(round(30 + progress * 25, 1), 30, 55);
  }
  if (vix <= thresholds.vixExtreme) {
    const span = thresholds.vixExtreme - thresholds.vixElevated;
    const progress = span > 0 ? (vix - thresholds.vixElevated) / span : 0;
    return clamp(round(55 + progress * 25, 1), 55, 80);
  }
  const excess = vix - thresholds.vixExtreme;
  return clamp(round(80 + excess * 1.5, 1), 80, 100);
}

function sectorStrengthScore(sectors: SectorPerformance[]): number {
  if (sectors.length === 0) return 50;
  const avgChange =
    sectors.reduce((sum, sector) => sum + sector.changePercent, 0) / sectors.length;
  const avgBreadth =
    sectors.reduce((sum, sector) => sum + sector.breadth, 0) / sectors.length;
  const changeComponent = clamp(50 + avgChange * 12, 0, 100);
  return clamp(round(changeComponent * 0.55 + avgBreadth * 0.45, 1), 0, 100);
}

function selectSectorsByDirection(
  sectors: SectorPerformance[],
  direction: "leading" | "weak",
  count: number
): string[] {
  const sorted = [...sectors].sort((a, b) =>
    direction === "leading"
      ? b.changePercent - a.changePercent
      : a.changePercent - b.changePercent
  );
  return sorted
    .filter((sector) =>
      direction === "leading" ? sector.changePercent > 0 : sector.changePercent < 0
    )
    .slice(0, count)
    .map((sector) => sector.name);
}

/**
 * Calculates market trend from index structure, EMA direction,
 * higher-highs / higher-lows, and momentum.
 */
export function calculateTrend(
  primary: IndexContextSnapshot,
  secondary: IndexContextSnapshot | null,
  thresholds: MarketContextThresholds = DEFAULT_MARKET_CONTEXT_CONFIG.thresholds
): TrendAnalysisResult {
  const reasons: string[] = [];
  let score = 0;
  let weightUsed = 0;
  let factorsAvailable = 0;
  const factorsTotal = 5;

  const closes =
    primary.closes.length > 0
      ? primary.closes
      : closesFromCandles(primary.candles);

  const emaFast = closes.length >= thresholds.emaFastPeriod
    ? ema(closes, thresholds.emaFastPeriod)
    : null;
  const emaSlow = closes.length >= thresholds.emaSlowPeriod
    ? ema(closes, thresholds.emaSlowPeriod)
    : null;
  const momentumPct =
    closes.length > thresholds.momentumPeriod
      ? momentum(closes, thresholds.momentumPeriod)
      : null;

  const swings = detectSwingStructure(primary.candles, thresholds.swingLookback);

  if (primary.available && isFiniteNumber(primary.changePercent)) {
    factorsAvailable += 1;
    const indexContribution = clamp(primary.changePercent * 18, -35, 35);
    score += indexContribution;
    weightUsed += 1;
    if (primary.changePercent > 0.35) {
      reasons.push(`${primary.name} advancing (${round(primary.changePercent, 2)}%)`);
    } else if (primary.changePercent < -0.35) {
      reasons.push(`${primary.name} declining (${round(primary.changePercent, 2)}%)`);
    }
  }

  if (isFiniteNumber(emaFast) && primary.price > 0) {
    factorsAvailable += 1;
    if (primary.price > emaFast) {
      score += 22;
      reasons.push(`${primary.name} above ${thresholds.emaFastPeriod}EMA`);
    } else {
      score -= 22;
      reasons.push(`${primary.name} below ${thresholds.emaFastPeriod}EMA`);
    }
    weightUsed += 1;
  }

  if (isFiniteNumber(emaFast) && isFiniteNumber(emaSlow)) {
    factorsAvailable += 1;
    if (emaFast > emaSlow) {
      score += 18;
      reasons.push(`EMA stack bullish (${thresholds.emaFastPeriod}>${thresholds.emaSlowPeriod})`);
    } else if (emaFast < emaSlow) {
      score -= 18;
      reasons.push(`EMA stack bearish (${thresholds.emaFastPeriod}<${thresholds.emaSlowPeriod})`);
    }
    weightUsed += 1;
  }

  if (primary.candles.length >= thresholds.swingLookback) {
    factorsAvailable += 1;
    if (swings.higherHighs && swings.higherLows) {
      score += 20;
      reasons.push("Higher highs and higher lows");
    } else if (swings.lowerHighs && swings.lowerLows) {
      score -= 20;
      reasons.push("Lower highs and lower lows");
    } else if (swings.higherHighs || swings.higherLows) {
      score += 8;
    } else if (swings.lowerHighs || swings.lowerLows) {
      score -= 8;
    }
    weightUsed += 1;
  }

  if (isFiniteNumber(momentumPct)) {
    factorsAvailable += 1;
    score += clamp(momentumPct * 4, -25, 25);
    weightUsed += 1;
    if (momentumPct >= 1.5) {
      reasons.push(`Momentum positive (${round(momentumPct, 2)}%)`);
    } else if (momentumPct <= -1.5) {
      reasons.push(`Momentum negative (${round(momentumPct, 2)}%)`);
    }
  }

  if (
    secondary?.available &&
    isFiniteNumber(secondary.changePercent) &&
    isFiniteNumber(primary.changePercent)
  ) {
    if (secondary.changePercent > primary.changePercent + 0.15) {
      score += 8;
      reasons.push(`${secondary.name} leading`);
    } else if (secondary.changePercent < primary.changePercent - 0.15) {
      score -= 4;
      reasons.push(`${secondary.name} lagging`);
    }
  }

  const normalizedScore =
    weightUsed > 0 ? clamp(round(score * (4 / Math.max(weightUsed, 1)), 1), -100, 100) : 0;
  const trend = classifyTrend(normalizedScore, thresholds);

  if (factorsAvailable === 0) {
    reasons.push("Insufficient index data — trend defaulted to Sideways");
  }

  return {
    trend,
    score: normalizedScore,
    strengthComponent: mapSignedScoreToStrength(normalizedScore),
    bias: trendBias(trend),
    emaFast,
    emaSlow,
    momentumPct,
    higherHighs: swings.higherHighs,
    higherLows: swings.higherLows,
    lowerHighs: swings.lowerHighs,
    lowerLows: swings.lowerLows,
    factorsAvailable,
    factorsTotal,
    reasons,
  };
}

/**
 * Calculates market breadth from advance/decline ratio and sector participation.
 */
export function calculateBreadth(
  breadth: BreadthContextSnapshot,
  thresholds: MarketContextThresholds = DEFAULT_MARKET_CONTEXT_CONFIG.thresholds
): BreadthAnalysisResult {
  const reasons: string[] = [];
  let factorsAvailable = 0;
  const factorsTotal = 3;

  const leadingSectors = selectSectorsByDirection(
    breadth.sectors,
    "leading",
    thresholds.sectorLeadCount
  );
  const weakSectors = selectSectorsByDirection(
    breadth.sectors,
    "weak",
    thresholds.sectorLeadCount
  );

  if (!breadth.available) {
    reasons.push("Breadth data unavailable — using neutral breadth");
    return {
      score: 50,
      advanceDeclineRatio: null,
      sectorParticipation: null,
      newHighsRatio: null,
      leadingSectors,
      weakSectors,
      factorsAvailable: 0,
      factorsTotal,
      reasons,
    };
  }

  const totalIssues = breadth.advances + breadth.declines + breadth.unchanged;
  const advanceDeclineRatio = safeRatio(breadth.advances, Math.max(breadth.declines, 1));
  const advancingSectors = breadth.sectors.filter((sector) => sector.changePercent > 0).length;
  const sectorParticipation =
    breadth.sectors.length > 0
      ? advancingSectors / breadth.sectors.length
      : null;
  const highsTotal = breadth.newHighs + breadth.newLows;
  const newHighsRatio =
    highsTotal > 0 ? breadth.newHighs / highsTotal : null;

  let score = 50;

  if (totalIssues > 0 && isFiniteNumber(advanceDeclineRatio)) {
    factorsAvailable += 1;
    const adComponent = clamp(50 + (advanceDeclineRatio - 1) * 40, 0, 100);
    score = adComponent;
    if (advanceDeclineRatio >= thresholds.advanceDeclineBullish) {
      reasons.push("Market breadth positive");
    } else if (advanceDeclineRatio <= thresholds.advanceDeclineBearish) {
      reasons.push("Market breadth negative");
    } else {
      reasons.push(
        `Advance/decline balanced (${breadth.advances}/${breadth.declines})`
      );
    }
  }

  if (isFiniteNumber(sectorParticipation)) {
    factorsAvailable += 1;
    const participationScore = clamp(round(sectorParticipation * 100, 1), 0, 100);
    score = round(score * 0.55 + participationScore * 0.45, 1);
    if (sectorParticipation >= thresholds.sectorParticipationBullish) {
      reasons.push("Sector participation broad");
    } else if (sectorParticipation <= thresholds.sectorParticipationBearish) {
      reasons.push("Sector participation narrow");
    }
  }

  if (isFiniteNumber(newHighsRatio)) {
    factorsAvailable += 1;
    const highsScore = clamp(round(newHighsRatio * 100, 1), 0, 100);
    score = round(score * 0.7 + highsScore * 0.3, 1);
    if (newHighsRatio >= 0.6) {
      reasons.push(`New highs dominate (${breadth.newHighs} vs ${breadth.newLows})`);
    } else if (newHighsRatio <= 0.4) {
      reasons.push(`New lows elevated (${breadth.newLows} vs ${breadth.newHighs})`);
    }
  }

  if (leadingSectors.length > 0) {
    reasons.push(`Leading sectors: ${leadingSectors.join(", ")}`);
  }

  return {
    score: clamp(round(score, 1), 0, 100),
    advanceDeclineRatio: advanceDeclineRatio !== null ? round(advanceDeclineRatio, 3) : null,
    sectorParticipation:
      sectorParticipation !== null ? round(sectorParticipation, 3) : null,
    newHighsRatio: newHighsRatio !== null ? round(newHighsRatio, 3) : null,
    leadingSectors,
    weakSectors,
    factorsAvailable,
    factorsTotal,
    reasons,
  };
}

/**
 * Calculates volatility from India VIX, ATR expansion, and index movement.
 */
export function calculateVolatility(
  indiaVix: VixContextSnapshot,
  primary: IndexContextSnapshot,
  thresholds: MarketContextThresholds = DEFAULT_MARKET_CONTEXT_CONFIG.thresholds
): VolatilityAnalysisResult {
  const reasons: string[] = [];
  let factorsAvailable = 0;
  const factorsTotal = 3;
  const components: number[] = [];

  let atrExpansion: number | null = null;
  const indexMoveAbsPct = primary.available
    ? Math.abs(primary.changePercent)
    : null;

  if (indiaVix.available && indiaVix.level > 0) {
    factorsAvailable += 1;
    const vixScore = mapVixToVolatilityScore(indiaVix.level, thresholds);
    components.push(vixScore);
    if (indiaVix.level <= thresholds.vixLow) {
      reasons.push("India VIX low");
    } else if (indiaVix.level >= thresholds.vixExtreme) {
      reasons.push("India VIX extreme");
    } else if (indiaVix.level >= thresholds.vixElevated) {
      reasons.push("India VIX elevated");
    } else {
      reasons.push(`India VIX at ${round(indiaVix.level, 2)}`);
    }
  }

  if (primary.candles.length >= thresholds.atrPeriod * 2) {
    const currentAtr = atr(primary.candles, thresholds.atrPeriod);
    const priorWindow = primary.candles.slice(0, -thresholds.atrPeriod);
    const priorAtr =
      priorWindow.length >= thresholds.atrPeriod + 1
        ? atr(priorWindow, thresholds.atrPeriod)
        : null;

    if (isFiniteNumber(currentAtr) && isFiniteNumber(priorAtr) && priorAtr > 0) {
      factorsAvailable += 1;
      atrExpansion = round(currentAtr / priorAtr, 3);
      if (atrExpansion >= thresholds.atrExpansionRatio) {
        const expansionScore = clamp(
          round(55 + (atrExpansion - 1) * 40, 1),
          55,
          100
        );
        components.push(expansionScore);
        reasons.push(`ATR expanding (${round(atrExpansion, 2)}x)`);
      } else if (atrExpansion <= 0.85) {
        components.push(28);
        reasons.push("ATR contracting");
      } else {
        components.push(48);
      }
    }
  }

  if (isFiniteNumber(indexMoveAbsPct)) {
    factorsAvailable += 1;
    if (indexMoveAbsPct >= thresholds.indexMoveElevatedPct) {
      const moveScore = clamp(round(50 + indexMoveAbsPct * 18, 1), 50, 100);
      components.push(moveScore);
      reasons.push(`Index move elevated (${round(indexMoveAbsPct, 2)}%)`);
    } else {
      components.push(clamp(round(indexMoveAbsPct * 25, 1), 10, 45));
    }
  }

  const score =
    components.length > 0
      ? clamp(
          round(
            components.reduce((sum, value) => sum + value, 0) / components.length,
            1
          ),
          0,
          100
        )
      : 50;

  if (factorsAvailable === 0) {
    reasons.push("Volatility inputs missing — using neutral volatility");
  }

  const strengthComponent = clamp(round(100 - score, 1), 0, 100);

  return {
    score,
    regime: classifyVolatilityRegime(score),
    indiaVix: indiaVix.available ? indiaVix.level : null,
    atrExpansion,
    indexMoveAbsPct: indexMoveAbsPct !== null ? round(indexMoveAbsPct, 3) : null,
    strengthComponent,
    factorsAvailable,
    factorsTotal,
    reasons,
  };
}

/**
 * Derives risk mode from trend bias, strength, breadth, and volatility.
 */
export function calculateRiskMode(
  trend: TrendAnalysisResult,
  breadth: BreadthAnalysisResult,
  volatility: VolatilityAnalysisResult,
  marketStrength: number,
  thresholds: MarketContextThresholds = DEFAULT_MARKET_CONTEXT_CONFIG.thresholds
): RiskModeAnalysisResult {
  const reasons: string[] = [];
  let bullishVotes = 0;
  let bearishVotes = 0;

  if (trend.bias === "bullish") bullishVotes += 1;
  if (trend.bias === "bearish") bearishVotes += 1;

  if (breadth.score >= 58) bullishVotes += 1;
  if (breadth.score <= 42) bearishVotes += 1;

  if (volatility.score <= thresholds.riskOnMaxVolatility) bullishVotes += 1;
  if (volatility.score >= thresholds.riskOffMinVolatility) bearishVotes += 1;

  if (marketStrength >= thresholds.riskOnMinStrength) bullishVotes += 1;
  if (marketStrength <= thresholds.riskOffMaxStrength) bearishVotes += 1;

  let riskMode: RiskMode = "Neutral";
  if (bullishVotes >= 3 && bearishVotes === 0) {
    riskMode = "Risk On";
    reasons.push("Risk On — trend, breadth, and volatility aligned bullish");
  } else if (bearishVotes >= 3 && bullishVotes === 0) {
    riskMode = "Risk Off";
    reasons.push("Risk Off — defensive conditions dominate");
  } else if (bullishVotes > bearishVotes + 1) {
    riskMode = "Risk On";
    reasons.push("Risk On — majority factors supportive");
  } else if (bearishVotes > bullishVotes + 1) {
    riskMode = "Risk Off";
    reasons.push("Risk Off — majority factors defensive");
  } else {
    reasons.push("Risk mode Neutral — mixed factor signals");
  }

  return { riskMode, reasons };
}

/**
 * Weighted market strength score (0–100).
 * Trend 30% · Breadth 25% · Sector Strength 20% · Momentum 15% · Volatility 10%.
 */
export function calculateMarketStrength(
  trend: TrendAnalysisResult,
  breadth: BreadthAnalysisResult,
  volatility: VolatilityAnalysisResult,
  sectors: SectorPerformance[] = [],
  weights: MarketStrengthWeights = DEFAULT_MARKET_CONTEXT_CONFIG.weights
): MarketStrengthAnalysisResult {
  const momentumComponent = isFiniteNumber(trend.momentumPct)
    ? clamp(round(50 + trend.momentumPct * 8, 1), 0, 100)
    : 50;

  const sectorComponent =
    sectors.length > 0
      ? sectorStrengthScore(sectors)
      : breadth.sectorParticipation !== null
        ? clamp(round(breadth.sectorParticipation * 100, 1), 0, 100)
        : 50;

  const components = {
    trend: trend.strengthComponent,
    breadth: breadth.score,
    sectorStrength: sectorComponent,
    momentum: momentumComponent,
    volatility: volatility.strengthComponent,
  };

  const marketStrength = clamp(
    round(
      components.trend * weights.trend +
        components.breadth * weights.breadth +
        components.sectorStrength * weights.sectorStrength +
        components.momentum * weights.momentum +
        components.volatility * weights.volatility,
      1
    ),
    0,
    100
  );

  const reasons: string[] = [
    `Market strength ${marketStrength} (T${round(components.trend, 0)}/B${round(components.breadth, 0)}/S${round(components.sectorStrength, 0)}/M${round(components.momentum, 0)}/V${round(components.volatility, 0)})`,
  ];

  return { marketStrength, components, reasons };
}

/**
 * Confidence rises with factor agreement and available inputs.
 */
export function calculateConfidence(
  trend: TrendAnalysisResult,
  breadth: BreadthAnalysisResult,
  volatility: VolatilityAnalysisResult,
  risk: RiskModeAnalysisResult,
  marketStrength: number,
  thresholds: MarketContextThresholds = DEFAULT_MARKET_CONTEXT_CONFIG.thresholds
): ConfidenceAnalysisResult {
  const reasons: string[] = [];

  const availableFactors =
    trend.factorsAvailable +
    breadth.factorsAvailable +
    volatility.factorsAvailable;
  const totalFactors =
    trend.factorsTotal + breadth.factorsTotal + volatility.factorsTotal;
  const missingFactorCount = Math.max(totalFactors - availableFactors, 0);
  const coverageRatio = totalFactors > 0 ? availableFactors / totalFactors : 0;

  const signedSignals: number[] = [
    trend.score / 100,
    (breadth.score - 50) / 50,
    (marketStrength - 50) / 50,
    volatility.strengthComponent >= 50 ? 0.35 : -0.35,
  ];

  if (risk.riskMode === "Risk On") signedSignals.push(0.5);
  if (risk.riskMode === "Risk Off") signedSignals.push(-0.5);

  const mean =
    signedSignals.reduce((sum, value) => sum + value, 0) / signedSignals.length;
  const variance =
    signedSignals.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    signedSignals.length;
  const dispersion = Math.sqrt(variance);
  const agreementScore = clamp(round((1 - Math.min(dispersion, 1)) * 100, 1), 0, 100);

  let confidence = clamp(
    round(agreementScore * 0.65 + coverageRatio * 100 * 0.35, 1),
    0,
    100
  );

  confidence = clamp(
    round(
      confidence -
        missingFactorCount * (thresholds.missingDataConfidencePenalty / 3),
      1
    ),
    0,
    100
  );

  const bullishAligned =
    trend.bias === "bullish" &&
    breadth.score >= 55 &&
    (risk.riskMode === "Risk On" || risk.riskMode === "Neutral");
  const bearishAligned =
    trend.bias === "bearish" &&
    breadth.score <= 45 &&
    (risk.riskMode === "Risk Off" || risk.riskMode === "Neutral");

  if (bullishAligned || bearishAligned) {
    confidence = clamp(round(confidence + 6, 1), 0, 100);
    reasons.push("High agreement between trend, breadth, and risk mode");
  } else if (dispersion > 0.55) {
    confidence = clamp(
      round(confidence - thresholds.disagreementConfidencePenalty, 1),
      0,
      100
    );
    reasons.push("Factor disagreement reduced confidence");
  }

  if (missingFactorCount > 0) {
    reasons.push(`Missing data reduced confidence (${missingFactorCount} factors)`);
  } else {
    reasons.push("Full factor coverage");
  }

  return {
    confidence: clamp(round(confidence, 1), 0, 100),
    agreementScore,
    missingFactorCount,
    reasons,
  };
}

function emptyIndex(symbol: string, name: string): IndexContextSnapshot {
  return {
    symbol,
    name,
    price: 0,
    changePercent: 0,
    high: 0,
    low: 0,
    closes: [],
    candles: [],
    available: false,
  };
}

/**
 * Builds a graceful neutral fallback context when inputs are missing.
 */
export function createFallbackMarketContext(
  asOf: Date = new Date(),
  reason = "Insufficient market data — neutral context applied"
): MarketContext {
  return {
    marketTrend: "Sideways",
    marketStrength: 50,
    marketBreadth: 50,
    volatility: 50,
    riskMode: "Neutral",
    leadingSectors: [],
    weakSectors: [],
    confidence: 25,
    reasons: [reason],
    lastUpdated: asOf,
  };
}

/**
 * Assembles a complete MarketContext from normalized input.
 */
export function buildMarketContextFromInput(input: MarketContextInput): MarketContext {
  const config = resolveConfig(input.config);
  const { thresholds, weights } = config;

  const hasAnyData =
    input.nifty.available ||
    input.sensex.available ||
    input.bankNifty.available ||
    input.indiaVix.available ||
    input.breadth.available;

  if (!hasAnyData) {
    return createFallbackMarketContext(input.asOf);
  }

  const primary = input.nifty.available
    ? input.nifty
    : input.sensex.available
      ? input.sensex
      : input.bankNifty.available
        ? input.bankNifty
        : emptyIndex("NIFTY", "Nifty 50");

  const secondary = input.bankNifty.available
    ? input.bankNifty
    : input.sensex.available
      ? input.sensex
      : null;

  const trend = calculateTrend(primary, secondary, thresholds);
  const breadth = calculateBreadth(input.breadth, thresholds);
  const volatility = calculateVolatility(input.indiaVix, primary, thresholds);
  const strength = calculateMarketStrength(
    trend,
    breadth,
    volatility,
    input.breadth.sectors,
    weights
  );
  const risk = calculateRiskMode(
    trend,
    breadth,
    volatility,
    strength.marketStrength,
    thresholds
  );
  const confidence = calculateConfidence(
    trend,
    breadth,
    volatility,
    risk,
    strength.marketStrength,
    thresholds
  );

  const reasons = dedupeReasons([
    ...trend.reasons,
    ...breadth.reasons,
    ...volatility.reasons,
    ...risk.reasons,
    ...strength.reasons,
    ...confidence.reasons,
  ]);

  return {
    marketTrend: trend.trend,
    marketStrength: strength.marketStrength,
    marketBreadth: breadth.score,
    volatility: volatility.score,
    riskMode: risk.riskMode,
    leadingSectors: breadth.leadingSectors,
    weakSectors: breadth.weakSectors,
    confidence: confidence.confidence,
    reasons,
    lastUpdated: input.asOf,
  };
}

function dedupeReasons(reasons: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const reason of reasons) {
    const key = reason.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(key);
  }
  return result;
}

export function resolveMarketContextConfig(
  partial?: Partial<MarketContextConfig>
): MarketContextConfig {
  return resolveConfig(partial);
}
