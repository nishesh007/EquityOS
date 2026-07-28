/**
 * Recommendation Calibration Engine v1 — types.
 * Suggests Quality Gate threshold adjustments from Paper Trading outcomes.
 * Never auto-applies thresholds (human approval required).
 */

import type { QUALITY_GATE_THRESHOLDS } from "@/lib/recommendations/quality-gate";
import type { TradeOutcomeExitReason } from "@/lib/paper-trading/outcomes/types";

export type CalibrationDimension =
  | "strategy"
  | "horizon"
  | "regime"
  | "conviction"
  | "risk_reward"
  | "sector"
  | "liquidity";

export type ThresholdKey = keyof typeof QUALITY_GATE_THRESHOLDS;

export interface CalibrationBucketMetrics {
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  averageReturn: number;
  averageHoldingMs: number;
  averageHoldingHours: number;
  averageMfe: number;
  averageMae: number;
  averageDrawdown: number;
  expectancy: number;
  profitFactor: number;
  exitReasonDistribution: Record<TradeOutcomeExitReason, number>;
}

export interface CalibrationBucket extends CalibrationBucketMetrics {
  dimension: CalibrationDimension;
  key: string;
  label: string;
}

export interface ThresholdSuggestion {
  key: ThresholdKey;
  current: number;
  suggested: number;
  direction: "raise" | "lower" | "hold";
  rationale: string;
  supportingBucket: string;
  expectedImpact: string;
  confidence: number;
}

export interface CalibrationReport {
  generatedAt: string;
  sampleSize: number;
  closedTrades: number;
  currentThresholds: typeof QUALITY_GATE_THRESHOLDS;
  suggestedThresholds: Partial<Record<ThresholdKey, number>>;
  suggestions: ThresholdSuggestion[];
  buckets: CalibrationBucket[];
  bestBucket: CalibrationBucket | null;
  worstBucket: CalibrationBucket | null;
  overall: CalibrationBucketMetrics;
  confidence: number;
  notes: string[];
}
