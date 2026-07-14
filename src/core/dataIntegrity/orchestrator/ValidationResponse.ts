/**
 * Unified validation response model.
 */

import type { ValidationEngineId } from "./ValidationConfiguration";
import type { WorkflowState } from "./ValidationWorkflow";

export type ValidationStatus =
  | "APPROVED"
  | "WARNING"
  | "REJECTED"
  | "PARTIAL"
  | "FAILED"
  | "CANCELLED"
  | "TIMED_OUT";

export interface ValidationTraceStep {
  engineId: ValidationEngineId;
  status: "PASSED" | "FAILED" | "SKIPPED" | "CACHED" | "ERROR" | "TIMEOUT";
  executionTimeMs: number;
  score?: number;
  message?: string;
  cached?: boolean;
  attempt?: number;
}

export interface EngineScoreBag {
  integrityScore?: number;
  trustScore?: number;
  hallucinationScore?: number;
  historicalScore?: number;
  recommendationQuality?: number;
  tradeQuality?: number;
  overallValidationScore?: number;
  [engineId: string]: number | undefined;
}

export interface ValidationResponse {
  requestId: string;
  validationStatus: ValidationStatus;
  integrityScore: number;
  trustScore: number;
  hallucinationScore: number;
  historicalScore: number;
  recommendationQuality: number;
  tradeQuality: number;
  overallValidationScore: number;
  warnings: string[];
  errors: string[];
  executionTime: number;
  validationTrace: ValidationTraceStep[];
  workflowState: WorkflowState;
  enginesExecuted: ValidationEngineId[];
  scores: EngineScoreBag;
  engineVersion: string;
  cached: boolean;
  timestamp: string;
}

export function emptyScores(): EngineScoreBag {
  return {
    integrityScore: 0,
    trustScore: 0,
    hallucinationScore: 0,
    historicalScore: 0,
    recommendationQuality: 0,
    tradeQuality: 0,
    overallValidationScore: 0,
  };
}
