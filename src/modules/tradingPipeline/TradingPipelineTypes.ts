/**
 * Trading Pipeline — type contracts (Sprint 11B.2D).
 * Integrates Market Context → Regime → Confidence → Eligibility
 * into one institutional market-intelligence pipeline.
 *
 * Does not generate trades, run strategy engines, or evaluate confluence.
 */

import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import type {
  MarketRegime,
  RegimeConfidenceAnalysis,
} from "@/src/modules/marketRegime";
import type { EligibleStrategy } from "@/src/modules/strategyEligibility";

/** Fixed pipeline stage order — never reorder. */
export const PIPELINE_STAGE_ORDER = [
  "Market Context",
  "Market Regime",
  "Confidence",
  "Eligibility",
] as const;

export type PipelineStageName = (typeof PIPELINE_STAGE_ORDER)[number];

export type PipelineHealthGrade = "Excellent" | "Good" | "Fair" | "Poor";

export type PipelineStageStatus =
  | "pending"
  | "running"
  | "success"
  | "failed"
  | "skipped"
  | "cached";

export interface PipelineStageRecord {
  stage: PipelineStageName;
  status: PipelineStageStatus;
  order: number;
  durationMs: number;
  cacheHit: boolean;
  error?: string;
  warning?: string;
}

/**
 * Canonical pipeline output.
 */
export interface TradingPipelineResult {
  context: InstitutionalMarketContext;
  regime: MarketRegime;
  confidence: RegimeConfidenceAnalysis;
  eligibleStrategies: EligibleStrategy[];
  pipelineHealth: number;
  healthGrade: PipelineHealthGrade;
  pipelineConfidence: number;
  executionTime: number;
  warnings: string[];
  errors: string[];
  timestamp: Date;
  stages: PipelineStageRecord[];
}

/**
 * Configurable health / confidence weights (must sum to 1.0 each).
 */
export interface PipelineHealthWeights {
  readonly contextValid: number;
  readonly regimeValid: number;
  readonly confidenceValid: number;
  readonly eligibilityValid: number;
  readonly dataQuality: number;
}

export interface PipelineConfidenceWeights {
  readonly contextConfidence: number;
  readonly regimeConfidence: number;
  readonly confidenceScore: number;
  readonly eligibilityCoverage: number;
}

export interface TradingPipelineConfig {
  readonly healthWeights: PipelineHealthWeights;
  readonly confidenceWeights: PipelineConfidenceWeights;
  readonly excellentMin: number;
  readonly goodMin: number;
  readonly fairMin: number;
  readonly healthFloor: number;
  readonly confidenceFloor: number;
  readonly maxTimestampSkewMs: number;
  readonly cacheTtlMs: number;
  readonly stageFailureHealthPenalty: number;
  readonly minValidConfidence: number;
  readonly maxValidConfidence: number;
}

export const DEFAULT_PIPELINE_HEALTH_WEIGHTS: PipelineHealthWeights = {
  contextValid: 0.2,
  regimeValid: 0.2,
  confidenceValid: 0.2,
  eligibilityValid: 0.2,
  dataQuality: 0.2,
};

export const DEFAULT_PIPELINE_CONFIDENCE_WEIGHTS: PipelineConfidenceWeights = {
  contextConfidence: 0.25,
  regimeConfidence: 0.25,
  confidenceScore: 0.3,
  eligibilityCoverage: 0.2,
};

export const DEFAULT_TRADING_PIPELINE_CONFIG: TradingPipelineConfig = {
  healthWeights: DEFAULT_PIPELINE_HEALTH_WEIGHTS,
  confidenceWeights: DEFAULT_PIPELINE_CONFIDENCE_WEIGHTS,
  excellentMin: 85,
  goodMin: 70,
  fairMin: 50,
  healthFloor: 15,
  confidenceFloor: 20,
  maxTimestampSkewMs: 5 * 60 * 1000,
  cacheTtlMs: 30_000,
  stageFailureHealthPenalty: 20,
  minValidConfidence: 0,
  maxValidConfidence: 100,
};

/**
 * Accumulated pipeline metrics across runs.
 */
export interface PipelineMetricsSnapshot {
  executionTimeMs: number;
  engineTimeMs: number;
  cacheHits: number;
  cacheMisses: number;
  warnings: number;
  errors: number;
  skippedEngines: number;
  successfulEngines: number;
  failedEngines: number;
  totalRuns: number;
  lastRunAt: Date | null;
  stageDurations: Record<PipelineStageName, number>;
}

export interface PipelineValidationIssue {
  code: string;
  severity: "error" | "warning";
  message: string;
  stage?: PipelineStageName;
}

export interface PipelineValidationResult {
  valid: boolean;
  issues: PipelineValidationIssue[];
  errors: string[];
  warnings: string[];
}

export interface TradingPipelineRunOptions {
  /** Inject pre-built institutional context (tests / offline). Skips fetch. */
  context?: InstitutionalMarketContext | null;
  forceRefresh?: boolean;
  /** Optional fingerprint override for cache keying. */
  cacheKey?: string;
}

export type TradingPipelineListener = (result: TradingPipelineResult) => void;

export interface TradingPipelineServiceOptions {
  forceRefresh?: boolean;
}
