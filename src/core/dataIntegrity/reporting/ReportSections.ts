/**
 * Report section type definitions.
 */

import type { ReportFilters } from "./ReportFilters";

export interface ReportSummarySection {
  overallValidationScore: number;
  integrityScore: number;
  trustScore: number;
  hallucinationScore: number;
  historicalScore: number;
  recommendationQuality: number;
  tradeQuality: number;
  overallHealth: number;
}

export interface ReportModuleBreakdownRow {
  module: string;
  status: "ACTIVE" | "IDLE" | "DEGRADED" | "OFFLINE" | "UNKNOWN";
  validationCount: number;
  successPercent: number;
  failurePercent: number;
  averageRuntime: number;
  averageScore: number;
  trend: "UP" | "DOWN" | "FLAT" | "UNKNOWN";
  warnings: number;
}

export interface ReportAnalyticsSection {
  trendAnalysis: Record<string, unknown>;
  ruleEffectiveness: Record<string, unknown>;
  failureAnalytics: Record<string, unknown>;
  distributionAnalytics: Record<string, unknown>;
  predictionAnalytics: Record<string, unknown>;
  healthScore: number;
}

export interface ReportAuditSection {
  validationHistory: Array<Record<string, unknown>>;
  recentEvents: Array<Record<string, unknown>>;
  criticalFailures: Array<Record<string, unknown>>;
  ruleViolations: Array<Record<string, unknown>>;
  trustChanges: Array<Record<string, unknown>>;
  configurationVersion: string;
  engineVersion: string;
}

export interface ReportSections {
  summary: ReportSummarySection;
  moduleBreakdown: ReportModuleBreakdownRow[];
  analytics: ReportAnalyticsSection;
  audit: ReportAuditSection;
  warnings: string[];
  errors: string[];
  recommendations: string[];
  filters: ReportFilters;
}
