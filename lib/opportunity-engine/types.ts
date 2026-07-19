import type { ConvictionComponents } from "@/lib/opportunity-engine/conviction";
import type { AISelfReview } from "@/lib/opportunity-engine/ai-review";
import type { ConfidenceReasonContribution } from "@/lib/opportunity-engine/reasons";
import type { TradeOutcome } from "@/lib/opportunity-engine/trade-outcome";
import type { EnrichedQuote } from "@/lib/market-data/enriched-quote";

export type ExpiredSetupOutcome =
  | "Target Hit"
  | "Target1 Hit"
  | "Stopped Out"
  | "Failed Breakout"
  | "Trend Reversed"
  | "Volume Disappeared"
  | "Range Bound"
  | "Never Triggered"
  | "Rejected at Resistance"
  | "Momentum Faded"
  | "Conviction Dropped"
  | "Breakout Failed"
  | "Target Never Triggered";

export type GapProbabilityLevel = "High" | "Medium" | "Low";

export type OpportunityCategory =
  | "intraday"
  | "swing"
  | "breakout"
  | "momentum"
  | "relative_volume"
  | "mean_reversion"
  | "ai_high_conviction";

export const OPPORTUNITY_CATEGORIES: OpportunityCategory[] = [
  "intraday",
  "swing",
  "breakout",
  "momentum",
  "relative_volume",
  "mean_reversion",
  "ai_high_conviction",
];

export const CATEGORY_LABELS: Record<OpportunityCategory, string> = {
  intraday: "Intraday Opportunities",
  swing: "Swing Trade Opportunities",
  breakout: "Breakout Candidates",
  momentum: "Momentum Leaders",
  relative_volume: "High Relative Volume",
  mean_reversion: "Mean Reversion Ideas",
  ai_high_conviction: "AI High Conviction Picks",
};

export const CATEGORY_LIMITS: Record<OpportunityCategory, number> = {
  intraday: 18,
  swing: 15,
  breakout: 12,
  momentum: 12,
  relative_volume: 12,
  mean_reversion: 10,
  ai_high_conviction: 10,
};

export interface OpportunityStrategySignal {
  strategy: string;
  strategyId: string;
  category: string;
  timeframe: string;
  signal: "BUY" | "SELL" | "WATCHLIST" | "IGNORE";
  entry: number;
  stopLoss: number;
  target: number;
  target1: number;
  target2: number;
  holdingPeriod: string;
  confidence: number;
  conviction: number;
  risk: number;
  reward: number;
  riskReward: number;
  reasons: string[];
  evidence: string[];
  tags: string[];
  marketContext: string;
  marketRegime: string;
  eligibility: {
    eligible: boolean;
    score: number;
    reasons: string[];
  };
  timestamp: string;
}

export interface OpportunityStrategyConsensus {
  primaryStrategy: string;
  primaryStrategyId: string;
  supportingStrategies: string[];
  opposingStrategies: string[];
  agreementPercent: number;
  conflictPercent: number;
  agreementScore: number;
  combinedScore: number;
  finalConfidence: number;
  conviction: number;
  technicalFramework: string[];
  fundamentalFramework: string[];
  valuationFramework: string[];
  growthFramework: string[];
  combinedVerdict: string;
}

export interface OpportunityLongTermRanking {
  technicalQuality: number;
  fundamentalQuality: number;
  valuation: number;
  growth: number;
  capitalAllocation: number;
  momentum: number;
  institutionalOwnership: number;
  sectorStrength: number;
  marketContext: number;
  marketRegime: number;
  aiConfidence: number;
  risk: number;
  reward: number;
  frameworkScore: number;
}

export interface OpportunityCandidate {
  id: string;
  symbol: string;
  company: string;
  category: OpportunityCategory;
  side: "Long" | "Short";
  rank: number;
  previousRank: number | null;
  aiConvictionScore: number;
  entryZone: { low: number; high: number };
  stopLoss: number;
  target1: number;
  target2: number;
  riskReward: number;
  confidencePercent: number;
  reason: string;
  confidenceReasons?: string[];
  confidenceReasonContributions?: ConfidenceReasonContribution[];
  convictionComponents?: ConvictionComponents;
  scanMetrics?: Record<string, number | string | null>;
  bestCallScore?: number;
  bestCallReasons?: string[];
  highestConviction?: number;
  moveAfterSignalPercent?: number;
  reasonMissed?: string;
  expiredOutcome?: ExpiredSetupOutcome;
  expiredReason?: string;
  peakTime?: string;
  gapProbability?: number;
  gapProbabilityLevel?: GapProbabilityLevel;
  openingBias?: string;
  expectedCatalyst?: string;
  sectorStrength?: number;
  maximumGainAfterSignal?: number;
  maximumDrawdownAfterSignal?: number;
  setupDurationHours?: number;
  nearestFilterFailures?: string[];
  firstDetectedAt: string;
  lastDetectedAt: string;
  lastUpdatedAt: string;
  timeHorizon?: string;
  /** Presentation status for recommendation-backed candidate views. */
  status?: RecommendationRecordStatus;
  quote?: EnrichedQuote;
  /* ── Sprint 11B Prompt 3 — Trading Pipeline enrichment ── */
  /** Whether the candidate passed Strategy Eligibility + pipeline gates. */
  pipelineEligible?: boolean;
  /** Strategy eligibility score 0–100 from the eligibility matrix. */
  eligibilityScore?: number;
  /** Unified Final Opportunity Score 0–100. */
  opportunityScore?: number;
  /** Institutional / pipeline health contribution 0–100. */
  institutionalScore?: number;
  /** Validation contribution 0–100. */
  validationScore?: number;
  /** Live market regime label from Trading Pipeline. */
  marketRegime?: string;
  /** Live market trend from Institutional Market Context. */
  marketTrend?: string;
  /** Risk mode from Institutional Market Context. */
  riskMode?: string;
  /** Pipeline confidence 0–100. */
  pipelineConfidence?: number;
  /** Matched strategy id from eligibility matrix. */
  strategyId?: string;
  strategyName?: string;
  eligibleReasons?: string[];
  rejectedReasons?: string[];
  /** Canonical output selected from StrategyEngine execution. */
  strategySignal?: OpportunityStrategySignal;
  /** Ranked, deduplicated StrategyEngine outputs for this symbol. */
  strategySignals?: OpportunityStrategySignal[];
  /** Registry ids actually executed for this candidate. */
  executedStrategyIds?: string[];
  /** Multi-strategy consensus / conflict for Swing & Position suites. */
  strategyConsensus?: OpportunityStrategyConsensus;
  /** Long-term ranking factor breakdown. */
  longTermRanking?: OpportunityLongTermRanking;
  /** Framework score used for Swing/Position ranking. */
  frameworkScore?: number;
}

export type RecommendationRecordStatus =
  | "ACTIVE"
  | "EXPIRED"
  | "INVALIDATED"
  | "ARCHIVED";

export interface RecommendationLifecycleEvent {
  readonly status: RecommendationRecordStatus;
  readonly occurredAt: string;
  readonly reason: string;
}

/**
 * Append-only recommendation memory. The candidate is the original,
 * point-in-time recommendation and is never replaced or rescored.
 * Lifecycle changes are recorded separately in lifecycleEvents.
 */
export interface OpportunityRecommendationRecord {
  readonly recommendationId: string;
  readonly candidate: OpportunityCandidate;
  readonly generatedAt: string;
  readonly status: RecommendationRecordStatus;
  readonly statusChangedAt: string;
  readonly lifecycleEvents: readonly RecommendationLifecycleEvent[];
}

export interface PostMarketMarketSummary {
  narrative: string;
  strongestSector: { name: string; changePercent: number };
  weakestSector: { name: string; changePercent: number };
  breadth: {
    advances: number;
    declines: number;
    unchanged: number;
    advanceRatio: number;
  };
  institutionalFlow: { fii: number; dii: number; asOf: string };
  topBreakouts: OpportunityCandidate[];
  topBreakdowns: OpportunityCandidate[];
  topVolumeShock: OpportunityCandidate[];
}

export interface PostMarketReport {
  tomorrowWatchlist: OpportunityCandidate[];
  missedOpportunities: OpportunityCandidate[];
  bestCallsOfDay: OpportunityCandidate[];
  tradeOutcomes?: TradeOutcome[];
  aiReviews?: AISelfReview[];
  marketSummary?: PostMarketMarketSummary;
  sectionNotes?: Partial<Record<"tomorrowWatchlist" | "missedOpportunities" | "bestCallsOfDay", string>>;
  generatedAt: string;
  sessionDate: string;
}

export interface ScanHistoryEntry {
  scannedAt: string;
  durationMs: number;
  symbolsScanned: number;
  added: number;
  removed: number;
  updated: number;
  scanCount: number;
}

export interface ScanMetrics {
  durationMs: number;
  symbolsScanned: number;
  added: number;
  removed: number;
  updated: number;
  scannedAt: string;
}

export interface OpportunityEngineState {
  /** IST trading session date (YYYY-MM-DD) owning the active registry. */
  tradingDate: string | null;
  lastScannedAt: string | null;
  nextScanAt: string | null;
  isFrozen: boolean;
  isScanning: boolean;
  marketOpen: boolean;
  scanCount: number;
  universeSize: number;
  categories: Record<OpportunityCategory, OpportunityCandidate[]>;
  /** Permanent recommendation memory; active dashboard views filter this list. */
  recommendations: OpportunityRecommendationRecord[];
  postMarket: PostMarketReport | null;
  scanHistory: ScanHistoryEntry[];
  lastScanMetrics: ScanMetrics | null;
  /**
   * Last Trading Pipeline summary used for ranking (Sprint 11B Prompt 3).
   * Shared Context → Regime → Eligibility snapshot.
   */
  pipeline?: {
    regime: string;
    marketTrend: string;
    riskMode: string;
    confidence: number;
    confidenceGrade: string;
    pipelineHealth: number;
    healthGrade: string;
    eligibleStrategyCount: number;
    rejectedStrategyCount: number;
    timestamp: string;
    eligibleStrategies: Array<{
      strategyId: string;
      name: string;
      category: string;
      score: number;
      reasons: string[];
    }>;
  } | null;
}

export interface OpportunityDaySnapshot {
  tradingDate: string;
  archivedAt: string;
  state: OpportunityEngineState;
  firstDetectedMap: Record<string, string>;
}

export interface ScanResult {
  state: OpportunityEngineState;
  added: number;
  removed: number;
  updated: number;
  durationMs: number;
  symbolsScanned: number;
}

export interface CategoryScanCandidate {
  symbol: string;
  company: string;
  category: OpportunityCategory;
  side: "Long" | "Short";
  score: number;
  reason: string;
  confidencePercent: number;
  aiConvictionScore: number;
  metrics: Record<string, number | null>;
}

export const SCAN_INTERVAL_MS = 15 * 60 * 1000;
export const MAX_SCAN_HISTORY = 50;

