/**
 * Health classification and summary metric types for the Validation Dashboard.
 */

import type { DashboardHealthThresholds } from "./DashboardConfiguration";
import type {
  DashboardModuleHealthStatus,
  DashboardModuleStatus,
} from "./DashboardRegistry";

export type DashboardHealthClassification =
  | "EXCELLENT"
  | "HEALTHY"
  | "STABLE"
  | "NEEDS_ATTENTION"
  | "CRITICAL";

export interface DashboardSummaryMetrics {
  totalValidations: number;
  passedValidations: number;
  failedValidations: number;
  warningCount: number;
  criticalCount: number;
  averageIntegrityScore: number;
  averageTrustScore: number;
  averageHallucinationScore: number;
  historicalPerformanceScore: number;
  recommendationQuality: number;
  tradeSetupQuality: number;
  generatedAt: string;
}

export interface DashboardSystemHealth {
  overallHealthScore: number;
  overallClassification: DashboardHealthClassification;
  validationEngineHealth: number;
  ruleEngineHealth: number;
  trustEngineHealth: number;
  historicalEngineHealth: number;
  recommendationHealth: number;
  marketHealth: number;
  technicalHealth: number;
  fundamentalHealth: number;
  deteriorating: boolean;
}

export interface DashboardSummary {
  summary: DashboardSummaryMetrics;
  modules: DashboardModuleStatus[];
  health: DashboardSystemHealth;
  engineVersion: string;
}

export function classifyHealth(
  score: number,
  thresholds: DashboardHealthThresholds
): DashboardHealthClassification {
  if (!Number.isFinite(score)) return "CRITICAL";
  if (score >= thresholds.excellent) return "EXCELLENT";
  if (score >= thresholds.healthy) return "HEALTHY";
  if (score >= thresholds.stable) return "STABLE";
  if (score >= thresholds.needsAttention) return "NEEDS_ATTENTION";
  return "CRITICAL";
}

export function toModuleHealthStatus(
  classification: DashboardHealthClassification
): DashboardModuleHealthStatus {
  return classification;
}

export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value * 100) / 100));
}
