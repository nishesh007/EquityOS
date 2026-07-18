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

/* ─── Sprint 11B.1B — Market Breadth & Sector Strength ─── */

export type CapTier = "large" | "mid" | "small";

export type BreadthQualityLabel =
  | "Very Strong"
  | "Strong"
  | "Neutral"
  | "Weak"
  | "Very Weak";

export type SectorTrend =
  | "Strong Bull"
  | "Bull"
  | "Neutral"
  | "Bear"
  | "Strong Bear";

export type SectorRotationState = "improving" | "weakening" | "stable";

/**
 * Canonical sector labels evaluated by the Sector Strength Engine.
 */
export const SUPPORTED_SECTORS = [
  "Banking",
  "IT",
  "Auto",
  "Pharma",
  "Capital Goods",
  "FMCG",
  "Energy",
  "PSU",
  "Realty",
  "Metal",
  "Chemical",
  "Healthcare",
  "Financial Services",
  "Telecom",
  "Infrastructure",
] as const;

export type SupportedSector = (typeof SUPPORTED_SECTORS)[number];

export interface BreadthConfig {
  readonly veryStrongMin: number;
  readonly strongMin: number;
  readonly neutralMin: number;
  readonly weakMin: number;
  readonly largeCapMinCr: number;
  readonly midCapMinCr: number;
  readonly participationHighPct: number;
  readonly participationLowPct: number;
  readonly momentumStrongDelta: number;
  readonly qualityWeightAdvanceRatio: number;
  readonly qualityWeightParticipation: number;
  readonly qualityWeightCapBalance: number;
  readonly qualityWeightMomentum: number;
  readonly qualityWeightNewHighs: number;
  readonly leaderCount: number;
  readonly missingDataConfidencePenalty: number;
}

export const DEFAULT_BREADTH_CONFIG: BreadthConfig = {
  veryStrongMin: 80,
  strongMin: 60,
  neutralMin: 40,
  weakMin: 20,
  largeCapMinCr: 100_000,
  midCapMinCr: 20_000,
  participationHighPct: 65,
  participationLowPct: 40,
  momentumStrongDelta: 8,
  qualityWeightAdvanceRatio: 0.3,
  qualityWeightParticipation: 0.25,
  qualityWeightCapBalance: 0.2,
  qualityWeightMomentum: 0.15,
  qualityWeightNewHighs: 0.1,
  leaderCount: 5,
  missingDataConfidencePenalty: 10,
};

export interface SectorStrengthConfig {
  readonly strongBullMin: number;
  readonly bullMin: number;
  readonly bearMax: number;
  readonly strongBearMax: number;
  readonly weightPrice: number;
  readonly weightRelative: number;
  readonly weightBreadth: number;
  readonly weightVolume: number;
  readonly weightMomentum: number;
  readonly weightTrend: number;
  readonly weightParticipation: number;
  readonly weightRelativeStrength: number;
  readonly weightInstitutional: number;
  readonly rotationImproveDelta: number;
  readonly rotationWeakenDelta: number;
  readonly leaderCount: number;
  readonly missingDataConfidencePenalty: number;
}

export const DEFAULT_SECTOR_STRENGTH_CONFIG: SectorStrengthConfig = {
  strongBullMin: 75,
  bullMin: 58,
  bearMax: 42,
  strongBearMax: 25,
  weightPrice: 0.15,
  weightRelative: 0.12,
  weightBreadth: 0.15,
  weightVolume: 0.1,
  weightMomentum: 0.12,
  weightTrend: 0.12,
  weightParticipation: 0.1,
  weightRelativeStrength: 0.08,
  weightInstitutional: 0.06,
  rotationImproveDelta: 6,
  rotationWeakenDelta: -6,
  leaderCount: 5,
  missingDataConfidencePenalty: 8,
};

/** Constituent / mover snapshot used for cap-tier and equal-weight breadth. */
export interface ConstituentSnapshot {
  symbol: string;
  name: string;
  changePercent: number;
  volume: number;
  /** Volume ÷ average volume when available. */
  relativeVolume: number | null;
  marketCapCr: number | null;
  capTier: CapTier | null;
  sector: string | null;
  available: boolean;
}

export interface BreadthEngineInput {
  advances: number;
  declines: number;
  unchanged: number;
  newHighs: number;
  newLows: number;
  sectors: SectorPerformance[];
  constituents: ConstituentSnapshot[];
  volumeChangePercent: number | null;
  /** Prior breadth % for momentum; null on first run. */
  previousBreadthPercent: number | null;
  asOf: Date;
  config?: Partial<BreadthConfig>;
}

export interface BreadthAnalysis {
  advanceCount: number;
  declineCount: number;
  unchangedCount: number;
  advanceDeclineRatio: number;
  netAdvances: number;
  breadthPercent: number;
  participationPercent: number;
  equalWeightBreadth: number;
  largeCapBreadth: number;
  midCapBreadth: number;
  smallCapBreadth: number;
  breadthMomentum: number;
  breadthQuality: BreadthQualityLabel;
  /** Composite breadth score 0–100. */
  score: number;
  confidence: number;
  reasons: string[];
  lastUpdated: Date;
}

export interface SectorEngineInput {
  sectors: SectorPerformance[];
  constituents: ConstituentSnapshot[];
  /** Benchmark index change % (typically Nifty) for relative performance. */
  benchmarkChangePercent: number | null;
  marketVolumeChangePercent: number | null;
  /** Prior sector scores keyed by canonical sector name (rotation). */
  previousScores: Record<string, number>;
  asOf: Date;
  config?: Partial<SectorStrengthConfig>;
}

export interface SectorAnalysis {
  sector: string;
  score: number;
  trend: SectorTrend;
  relativeStrength: number;
  breadth: number;
  volume: number;
  momentum: number;
  participation: number;
  confidence: number;
  reasons: string[];
}

export interface SectorRotationSummary {
  improving: string[];
  weakening: string[];
  stable: string[];
  leaders: string[];
  laggards: string[];
  reasons: string[];
}

export interface SectorStrengthAnalysis {
  sectors: SectorAnalysis[];
  leaders: SectorAnalysis[];
  weakest: SectorAnalysis[];
  rotation: SectorRotationSummary;
  confidence: number;
  reasons: string[];
  lastUpdated: Date;
}

/* ─── Sprint 11B.1C — India VIX & Volatility Engine ─── */

/**
 * Institutional volatility regime labels (11B.1C).
 * Distinct from the lighter 11B.1A VolatilityRegime union.
 */
export type InstitutionalVolatilityRegime =
  | "Very Low"
  | "Low"
  | "Normal"
  | "Elevated"
  | "High"
  | "Extreme";

export type VolatilityTrendState =
  | "Increasing"
  | "Decreasing"
  | "Stable"
  | "Expanding"
  | "Contracting";

export type GapDirection = "up" | "down" | "flat";

export interface VolatilityConfig {
  readonly atrPeriod: number;
  readonly historicalVolPeriod: number;
  readonly realizedVolPeriod: number;
  readonly vixVeryLow: number;
  readonly vixLow: number;
  readonly vixNormal: number;
  readonly vixElevated: number;
  readonly vixHigh: number;
  readonly scoreVeryQuietMax: number;
  readonly scoreLowMax: number;
  readonly scoreNormalMax: number;
  readonly scoreHighMax: number;
  readonly atrExpandRatio: number;
  readonly atrCompressRatio: number;
  readonly rangeElevatedPct: number;
  readonly rangeQuietPct: number;
  readonly gapMaterialPct: number;
  readonly vixMomentumStrongPct: number;
  readonly trendStableBand: number;
  readonly weightVix: number;
  readonly weightAtr: number;
  readonly weightHistorical: number;
  readonly weightRealized: number;
  readonly weightRange: number;
  readonly weightGap: number;
  readonly riskOnMaxScore: number;
  readonly riskOffMinScore: number;
  readonly riskOnMinBreadth: number;
  readonly riskOffMaxBreadth: number;
  readonly riskOnMinStrength: number;
  readonly riskOffMaxStrength: number;
  readonly missingDataConfidencePenalty: number;
}

export const DEFAULT_VOLATILITY_CONFIG: VolatilityConfig = {
  atrPeriod: 14,
  historicalVolPeriod: 20,
  realizedVolPeriod: 10,
  vixVeryLow: 11,
  vixLow: 13,
  vixNormal: 16,
  vixElevated: 18,
  vixHigh: 22,
  scoreVeryQuietMax: 20,
  scoreLowMax: 40,
  scoreNormalMax: 60,
  scoreHighMax: 80,
  atrExpandRatio: 1.25,
  atrCompressRatio: 0.85,
  rangeElevatedPct: 1.5,
  rangeQuietPct: 0.6,
  gapMaterialPct: 0.5,
  vixMomentumStrongPct: 5,
  trendStableBand: 3,
  weightVix: 0.4,
  weightAtr: 0.15,
  weightHistorical: 0.12,
  weightRealized: 0.12,
  weightRange: 0.12,
  weightGap: 0.09,
  riskOnMaxScore: 42,
  riskOffMinScore: 62,
  riskOnMinBreadth: 55,
  riskOffMaxBreadth: 45,
  riskOnMinStrength: 55,
  riskOffMaxStrength: 45,
  missingDataConfidencePenalty: 14,
};

export interface VolatilityEngineInput {
  indiaVix: number | null;
  indiaVixChangePercent: number | null;
  /** Prior VIX level for trend/momentum when available. */
  previousIndiaVix: number | null;
  nifty: IndexContextSnapshot;
  sensex: IndexContextSnapshot;
  bankNifty: IndexContextSnapshot;
  /** Market breadth score 0–100 when available. */
  breadthScore: number | null;
  /** Composite market strength 0–100 when available. */
  marketStrength: number | null;
  volumeChangePercent: number | null;
  asOf: Date;
  config?: Partial<VolatilityConfig>;
}

export interface GapRiskResult {
  gapPercent: number;
  direction: GapDirection;
  magnitudeScore: number;
  reasons: string[];
}

export interface AtrExpansionResult {
  atr: number | null;
  atrPercent: number | null;
  expansionRatio: number | null;
  expanding: boolean;
  compressing: boolean;
  expansionScore: number;
  reasons: string[];
}

/**
 * Fully populated institutional volatility analysis (Sprint 11B.1C).
 */
export interface VolatilityAnalysis {
  score: number;
  regime: InstitutionalVolatilityRegime;
  trend: VolatilityTrendState;
  indiaVix: number;
  atr: number;
  historicalVolatility: number;
  realizedVolatility: number;
  gapPercent: number;
  dailyRange: number;
  intradayRange: number;
  riskMode: RiskMode;
  confidence: number;
  reasons: string[];
  /** Extended diagnostics retained for institutional consumers. */
  vixTrend: VolatilityTrendState;
  vixMomentum: number;
  atrExpansion: boolean;
  atrCompression: boolean;
  relativeVolatility: number;
  volatilityExpansion: boolean;
  volatilityCompression: boolean;
  gapDirection: GapDirection;
  lastUpdated: Date;
}

/* ─── Sprint 11B.1D — Market Context Aggregator ─── */

export type QualityGrade = "A+" | "A" | "B" | "C";

/**
 * Configurable health-score weights for institutional aggregation.
 * Weights should sum to 1.0.
 */
export interface AggregatorHealthWeights {
  readonly marketTrend: number;
  readonly breadth: number;
  readonly sector: number;
  readonly volatility: number;
  readonly momentum: number;
  readonly participation: number;
}

export interface AggregatorConfig {
  readonly weights: AggregatorHealthWeights;
  readonly gradeAPlusMin: number;
  readonly gradeAMin: number;
  readonly gradeBMin: number;
  readonly summaryMaxPoints: number;
  readonly summaryMinPoints: number;
  readonly conflictConfidencePenalty: number;
  readonly missingSubsystemPenalty: number;
  readonly lowSubsystemConfidenceThreshold: number;
  readonly lowSubsystemConfidencePenalty: number;
}

export const DEFAULT_AGGREGATOR_HEALTH_WEIGHTS: AggregatorHealthWeights = {
  marketTrend: 0.25,
  breadth: 0.2,
  sector: 0.2,
  volatility: 0.15,
  momentum: 0.1,
  participation: 0.1,
};

export const DEFAULT_AGGREGATOR_CONFIG: AggregatorConfig = {
  weights: DEFAULT_AGGREGATOR_HEALTH_WEIGHTS,
  gradeAPlusMin: 95,
  gradeAMin: 85,
  gradeBMin: 70,
  summaryMaxPoints: 8,
  summaryMinPoints: 5,
  conflictConfidencePenalty: 10,
  missingSubsystemPenalty: 12,
  lowSubsystemConfidenceThreshold: 40,
  lowSubsystemConfidencePenalty: 8,
};

/**
 * Canonical single source of truth for the institutional trading pipeline.
 * Downstream engines must consume this object only.
 */
export interface InstitutionalMarketContext {
  timestamp: Date;
  marketTrend: MarketTrend;
  marketStrength: number;
  marketBreadth: BreadthAnalysis;
  sectorStrength: SectorAnalysis[];
  sectorRotation: SectorRotationSummary;
  volatility: VolatilityAnalysis;
  riskMode: RiskMode;
  confidence: number;
  healthScore: number;
  qualityGrade: QualityGrade;
  summary: string[];
  /** Non-fatal subsystem warnings (missing/conflicting/degraded data). */
  warnings: string[];
}

/**
 * Already-computed subsystem outputs. Aggregator never recalculates these.
 */
export interface AggregatorInput {
  context: MarketContext | null;
  breadth: BreadthAnalysis | null;
  sector: SectorStrengthAnalysis | null;
  volatility: VolatilityAnalysis | null;
  timestamp?: Date;
  config?: Partial<AggregatorConfig> & {
    weights?: Partial<AggregatorHealthWeights>;
  };
}

export interface AggregatorSectionAvailability {
  context: boolean;
  breadth: boolean;
  sector: boolean;
  volatility: boolean;
}
