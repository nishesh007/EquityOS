/**
 * Strategy Eligibility Matrix — type contracts (Sprint 11B.2C).
 * Third stage of the institutional trading pipeline:
 * Market Context → Market Regime → Strategy Eligibility → Strategy Engines.
 *
 * Decides which registered strategies may execute under the current regime.
 * Does not generate trade signals or evaluate confluence.
 */

import type {
  InstitutionalMarketContext,
  RiskMode,
} from "@/src/modules/marketContext";
import type {
  MarketRegime,
  MarketRegimeLabel,
} from "@/src/modules/marketRegime";

export type StrategyCategory = "Scalp" | "Intraday" | "Swing" | "Position";

export type StrategyId =
  | "scalping"
  | "orb"
  | "vwap-continuation"
  | "vwap-mean-reversion"
  | "liquidity-sweep"
  | "momentum-continuation"
  | "opening-range-fade"
  | "gap-and-go"
  | "relative-strength"
  | "institutional-accumulation"
  | "breakout-retest"
  | "sector-rotation"
  | "news-momentum"
  | "vcp"
  | "stage-analysis"
  | "darvas"
  | "relative-strength-leadership"
  | "ema-pullback"
  | "cup-and-handle"
  | "flat-base"
  | "fifty-two-week-high"
  | "earnings-momentum"
  | "buffett"
  | "graham"
  | "lynch"
  | "greenblatt"
  | "quality-compounder";

/**
 * Configurable metadata for a single registered strategy.
 * All eligibility thresholds live here — never hardcode inside the engine.
 */
export interface StrategyProfile {
  id: StrategyId;
  name: string;
  category: StrategyCategory;
  supportedRegimes: MarketRegimeLabel[];
  blockedRegimes: MarketRegimeLabel[];
  minimumConfidence: number;
  minimumMarketStrength: number;
  minimumBreadth: number;
  minimumSectorStrength: number;
  minimumHealthScore: number;
  /** Higher = preferred when sorting eligible strategies. */
  priority: number;
  enabled: boolean;
  /** Risk modes that force rejection. */
  blockedRiskModes: RiskMode[];
  /**
   * Reject when India VIX / volatility score exceeds this ceiling.
   * Null = no maximum constraint.
   */
  maximumVolatilityScore: number | null;
  /**
   * Reject when volatility score is below this floor.
   * Null = no minimum constraint.
   */
  minimumVolatilityScore: number | null;
}

/**
 * Configurable eligibility score weights (must sum to 1.0).
 */
export interface StrategyEligibilityWeights {
  readonly regimeMatch: number;
  readonly confidence: number;
  readonly breadth: number;
  readonly sectorStrength: number;
  readonly marketStrength: number;
  readonly healthScore: number;
}

export interface StrategyEligibilityConfig {
  readonly weights: StrategyEligibilityWeights;
  /** Category sort order when priority and score tie. */
  readonly categoryOrder: readonly StrategyCategory[];
  readonly scoreFloor: number;
  readonly scoreCeiling: number;
  readonly missingContextPenalty: number;
  /** Minimum composite score required in addition to hard gates. */
  readonly minimumEligibilityScore: number;
}

export const DEFAULT_STRATEGY_ELIGIBILITY_WEIGHTS: StrategyEligibilityWeights = {
  regimeMatch: 0.3,
  confidence: 0.2,
  breadth: 0.15,
  sectorStrength: 0.15,
  marketStrength: 0.1,
  healthScore: 0.1,
};

export const DEFAULT_STRATEGY_ELIGIBILITY_CONFIG: StrategyEligibilityConfig = {
  weights: DEFAULT_STRATEGY_ELIGIBILITY_WEIGHTS,
  categoryOrder: ["Scalp", "Intraday", "Swing", "Position"],
  scoreFloor: 0,
  scoreCeiling: 100,
  missingContextPenalty: 40,
  minimumEligibilityScore: 55,
};

/**
 * Per-strategy evaluation result.
 */
export interface EligibleStrategy {
  strategyId: StrategyId;
  name: string;
  category: StrategyCategory;
  eligible: boolean;
  priority: number;
  score: number;
  reasons: string[];
  blockedReasons: string[];
}

/**
 * Full matrix evaluation snapshot.
 */
export interface StrategyEligibilitySnapshot {
  timestamp: Date;
  regime: MarketRegimeLabel;
  confidence: number;
  marketStrength: number;
  healthScore: number;
  riskMode: RiskMode;
  strategies: EligibleStrategy[];
  eligible: EligibleStrategy[];
  rejected: EligibleStrategy[];
  summary: string[];
  warnings: string[];
}

export interface StrategyEligibilityInput {
  context: InstitutionalMarketContext | null;
  regime: MarketRegime | null;
  profiles?: readonly StrategyProfile[];
  config?: Partial<StrategyEligibilityConfig> & {
    weights?: Partial<StrategyEligibilityWeights>;
  };
}

export type StrategyEligibilityListener = (
  snapshot: StrategyEligibilitySnapshot
) => void;

export interface StrategyEligibilityServiceOptions {
  forceRefresh?: boolean;
}
