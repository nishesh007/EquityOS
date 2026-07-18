/**
 * Market Context Engine — type contracts (Sprint 11B.1A).
 * First stage of the institutional trading pipeline:
 * Market Data → Market Context → Market Regime → Strategy Engines.
 */

import type { OhlcBar } from "@/lib/providers/types";
import type { MarketBreadth, MarketIndex, MarketPulse, SectorPerformance } from "@/types";

export type MarketTrend =
  | "Strong Bull"
  | "Weak Bull"
  | "Sideways"
  | "Weak Bear"
  | "Strong Bear";

export type RiskMode = "Risk On" | "Neutral" | "Risk Off";

export type TrendBias = "bullish" | "bearish" | "neutral";

export type VolatilityRegime = "low" | "normal" | "elevated" | "extreme";

/**
 * Fully populated market context snapshot returned by the engine.
 */
export interface MarketContext {
  marketTrend: MarketTrend;
  /** Composite market strength score 0–100. */
  marketStrength: number;
  /** Breadth participation score 0–100. */
  marketBreadth: number;
  /** Volatility intensity score 0–100 (higher = more volatile). */
  volatility: number;
  riskMode: RiskMode;
  leadingSectors: string[];
  weakSectors: string[];
  /** Factor-agreement confidence 0–100. */
  confidence: number;
  reasons: string[];
  lastUpdated: Date;
}

/**
 * Named weight configuration for market strength scoring.
 * Weights must sum to 1.0.
 */
export interface MarketStrengthWeights {
  readonly trend: number;
  readonly breadth: number;
  readonly sectorStrength: number;
  readonly momentum: number;
  readonly volatility: number;
}

/**
 * Domain thresholds used by calculators — no inline magic numbers.
 */
export interface MarketContextThresholds {
  readonly emaFastPeriod: number;
  readonly emaSlowPeriod: number;
  readonly momentumPeriod: number;
  readonly atrPeriod: number;
  readonly swingLookback: number;
  readonly sectorLeadCount: number;
  readonly strongBullScore: number;
  readonly weakBullScore: number;
  readonly weakBearScore: number;
  readonly strongBearScore: number;
  readonly vixLow: number;
  readonly vixElevated: number;
  readonly vixExtreme: number;
  readonly atrExpansionRatio: number;
  readonly indexMoveElevatedPct: number;
  readonly advanceDeclineBullish: number;
  readonly advanceDeclineBearish: number;
  readonly sectorParticipationBullish: number;
  readonly sectorParticipationBearish: number;
  readonly riskOnMinStrength: number;
  readonly riskOffMaxStrength: number;
  readonly riskOnMaxVolatility: number;
  readonly riskOffMinVolatility: number;
  readonly missingDataConfidencePenalty: number;
  readonly disagreementConfidencePenalty: number;
}

export interface MarketContextConfig {
  readonly weights: MarketStrengthWeights;
  readonly thresholds: MarketContextThresholds;
}

export const DEFAULT_MARKET_STRENGTH_WEIGHTS: MarketStrengthWeights = {
  trend: 0.3,
  breadth: 0.25,
  sectorStrength: 0.2,
  momentum: 0.15,
  volatility: 0.1,
};

export const DEFAULT_MARKET_CONTEXT_THRESHOLDS: MarketContextThresholds = {
  emaFastPeriod: 20,
  emaSlowPeriod: 50,
  momentumPeriod: 10,
  atrPeriod: 14,
  swingLookback: 20,
  sectorLeadCount: 3,
  strongBullScore: 60,
  weakBullScore: 20,
  weakBearScore: -20,
  strongBearScore: -60,
  vixLow: 13,
  vixElevated: 18,
  vixExtreme: 25,
  atrExpansionRatio: 1.25,
  indexMoveElevatedPct: 1.2,
  advanceDeclineBullish: 1.25,
  advanceDeclineBearish: 0.8,
  sectorParticipationBullish: 0.6,
  sectorParticipationBearish: 0.4,
  riskOnMinStrength: 58,
  riskOffMaxStrength: 42,
  riskOnMaxVolatility: 45,
  riskOffMinVolatility: 55,
  missingDataConfidencePenalty: 12,
  disagreementConfidencePenalty: 8,
};

export const DEFAULT_MARKET_CONTEXT_CONFIG: MarketContextConfig = {
  weights: DEFAULT_MARKET_STRENGTH_WEIGHTS,
  thresholds: DEFAULT_MARKET_CONTEXT_THRESHOLDS,
};

/** Per-index snapshot consumed by trend / momentum calculators. */
export interface IndexContextSnapshot {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  high: number;
  low: number;
  open?: number;
  previousClose?: number;
  /** Historical closes (oldest → newest) for EMA / momentum. */
  closes: number[];
  /** OHLC bars for ATR expansion analysis. */
  candles: OhlcBar[];
  available: boolean;
}

export interface VixContextSnapshot {
  level: number;
  changePercent: number;
  available: boolean;
}

export interface BreadthContextSnapshot {
  advances: number;
  declines: number;
  unchanged: number;
  newHighs: number;
  newLows: number;
  sectors: SectorPerformance[];
  available: boolean;
}

/**
 * Normalized engine input assembled from existing EquityOS market services.
 * Calculators never fetch — they only consume this structure.
 */
export interface MarketContextInput {
  nifty: IndexContextSnapshot;
  sensex: IndexContextSnapshot;
  bankNifty: IndexContextSnapshot;
  indiaVix: VixContextSnapshot;
  breadth: BreadthContextSnapshot;
  /** Optional aggregate volume change % vs recent average. */
  volumeChangePercent: number | null;
  asOf: Date;
  config?: Partial<MarketContextConfig>;
}

export interface TrendAnalysisResult {
  trend: MarketTrend;
  /** Signed trend score −100…+100. */
  score: number;
  /** Contribution mapped to 0–100 for strength weighting. */
  strengthComponent: number;
  bias: TrendBias;
  emaFast: number | null;
  emaSlow: number | null;
  momentumPct: number | null;
  higherHighs: boolean;
  higherLows: boolean;
  lowerHighs: boolean;
  lowerLows: boolean;
  factorsAvailable: number;
  factorsTotal: number;
  reasons: string[];
}

export interface BreadthAnalysisResult {
  /** Breadth score 0–100. */
  score: number;
  advanceDeclineRatio: number | null;
  sectorParticipation: number | null;
  newHighsRatio: number | null;
  leadingSectors: string[];
  weakSectors: string[];
  factorsAvailable: number;
  factorsTotal: number;
  reasons: string[];
}

export interface VolatilityAnalysisResult {
  /** Volatility intensity 0–100. */
  score: number;
  regime: VolatilityRegime;
  indiaVix: number | null;
  atrExpansion: number | null;
  indexMoveAbsPct: number | null;
  /** Inverse score used as strength contribution (calm markets score higher). */
  strengthComponent: number;
  factorsAvailable: number;
  factorsTotal: number;
  reasons: string[];
}

export interface RiskModeAnalysisResult {
  riskMode: RiskMode;
  reasons: string[];
}

export interface MarketStrengthAnalysisResult {
  marketStrength: number;
  components: {
    trend: number;
    breadth: number;
    sectorStrength: number;
    momentum: number;
    volatility: number;
  };
  reasons: string[];
}

export interface ConfidenceAnalysisResult {
  confidence: number;
  agreementScore: number;
  missingFactorCount: number;
  reasons: string[];
}

export interface MarketContextAnalysisBreakdown {
  trend: TrendAnalysisResult;
  breadth: BreadthAnalysisResult;
  volatility: VolatilityAnalysisResult;
  risk: RiskModeAnalysisResult;
  strength: MarketStrengthAnalysisResult;
  confidence: ConfidenceAnalysisResult;
}

export type MarketContextListener = (context: MarketContext) => void;

export interface MarketContextServiceOptions {
  /** Force bypass of in-memory cache. */
  forceRefresh?: boolean;
}

/** Raw market payloads collected once by the service (no duplicate fetching). */
export interface MarketContextRawData {
  indices: MarketIndex[];
  breadth: MarketBreadth;
  pulse: MarketPulse;
  niftyCandles: OhlcBar[];
  bankNiftyCandles: OhlcBar[];
  sensexCandles: OhlcBar[];
  fetchedAt: Date;
}
