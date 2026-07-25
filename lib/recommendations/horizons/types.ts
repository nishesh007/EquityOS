/**
 * Sprint 9F.2 — Horizon-First recommendation types.
 *
 * Each investment horizon is an independent pipeline: selection philosophy,
 * trade construction, and quality explainability are horizon-owned.
 */

import type { OpportunityCandidate } from "@/lib/opportunity-engine/types";
import type { InstitutionalStrategyId } from "@/lib/recommendations/horizons/ids";
import type { TradeMethodology } from "@/lib/opportunity-engine/dynamic-trade-construction";
import type { SharedRecommendation } from "@/lib/recommendations/shared-recommendation";

export type HorizonId = InstitutionalStrategyId;

export interface HorizonFactorResult {
  label: string;
  passed: boolean;
  weight: number;
  detail?: string;
}

export interface HorizonSelectionResult {
  horizonId: HorizonId;
  symbol: string;
  company: string;
  side: "Long" | "Short";
  /** Horizon fit score 0–100. */
  score: number;
  /** Why this stock belongs to this horizon. */
  belongsBecause: string[];
  /** Factors that qualified it. */
  qualifiedFactors: string[];
  /** Factors that failed (still may qualify overall). */
  rejectedFactors: string[];
  /** Why shorter/longer horizons are a weaker fit. */
  horizonFitNotes: string[];
  primaryStrategy: string;
  supportingStrategies: string[];
  factors: HorizonFactorResult[];
  /** Source OE candidate used for quotes / strategy signals (optional). */
  sourceCandidate: OpportunityCandidate;
}

export interface HorizonTradePlan {
  entry: number;
  entryLow: number;
  entryHigh: number;
  stopLoss: number;
  targets: [number, number, number];
  risk: number;
  reward: number;
  riskReward: number;
  expectedReturnPercent: number;
  holdingPeriod: string;
  holdingRationale: string;
  targetMethodology: string;
  methodology: TradeMethodology;
}

export interface HorizonRecommendation {
  horizonId: HorizonId;
  selection: HorizonSelectionResult;
  trade: HorizonTradePlan;
  recommendation: SharedRecommendation;
  quality: {
    whyThisHorizon: string[];
    qualifiedFactors: string[];
    rejectedFactors: string[];
    shorterLongerFit: string[];
    primaryStrategy: string;
    supportingStrategies: string[];
    holdingRationale: string;
    targetMethodology: string;
  };
  /** Sprint 9F.3 — institutional quality score after calibration. */
  recommendationQualityScore?: number;
  calibrationNotes?: string[];
}

export type HorizonPipelineSnapshot = Record<HorizonId, HorizonRecommendation[]>;

export interface HorizonUniverseMember {
  symbol: string;
  company: string;
  /** Best OE candidate for quotes / strategy signals (highest opportunity score). */
  candidate: OpportunityCandidate;
  /** All OE appearances for this symbol (any category). */
  appearances: OpportunityCandidate[];
}
