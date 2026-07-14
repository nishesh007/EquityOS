/**
 * Institutional report document model and builder.
 */

import type { ReportType, ReportDetailLevel } from "./ReportConfiguration";
import type { ReportFilters } from "./ReportFilters";
import type {
  ReportAnalyticsSection,
  ReportAuditSection,
  ReportModuleBreakdownRow,
  ReportSummarySection,
} from "./ReportSections";

export interface ReportValidationMetrics {
  totalValidations: number;
  passed: number;
  failed: number;
  warnings: number;
  critical: number;
  averageRuntime: number;
}

export interface ReportTrustMetrics {
  averageTrustScore: number;
  rejectedObjects: number;
  trustDistribution: Record<string, number>;
}

export interface ReportAuditInformation {
  configurationVersion: string;
  engineVersion: string;
  generatedBy: string;
  sourceModules: string[];
}

export interface InstitutionalReport {
  reportId: string;
  reportType: ReportType;
  title: string;
  generatedTime: string;
  reportingPeriod: { from: string; to: string };
  filters: ReportFilters;
  detailLevel: ReportDetailLevel;
  summary: ReportSummarySection;
  moduleScores: ReportModuleBreakdownRow[];
  validationMetrics: ReportValidationMetrics;
  trustMetrics: ReportTrustMetrics;
  analyticsSummary: ReportAnalyticsSection;
  warnings: string[];
  errors: string[];
  recommendations: string[];
  auditInformation: ReportAuditInformation;
  sectionsIncluded: string[];
  partial: boolean;
  engineVersion: string;
}

export interface ReportBuildInput {
  reportType: ReportType;
  title: string;
  detailLevel: ReportDetailLevel;
  sectionsIncluded: string[];
  filters: ReportFilters;
  reportingPeriod: { from: string; to: string };
  summary: ReportSummarySection;
  moduleScores: ReportModuleBreakdownRow[];
  validationMetrics: ReportValidationMetrics;
  trustMetrics: ReportTrustMetrics;
  analyticsSummary: ReportAnalyticsSection;
  audit: ReportAuditSection;
  warnings: string[];
  errors: string[];
  recommendations: string[];
  engineVersion: string;
  partial?: boolean;
}

export class ReportBuilder {
  build(input: ReportBuildInput): InstitutionalReport {
    return {
      reportId: createReportId(),
      reportType: input.reportType,
      title: input.title,
      generatedTime: new Date().toISOString(),
      reportingPeriod: input.reportingPeriod,
      filters: input.filters,
      detailLevel: input.detailLevel,
      summary: input.summary,
      moduleScores: filterModulesByDetail(
        input.moduleScores,
        input.detailLevel
      ),
      validationMetrics: input.validationMetrics,
      trustMetrics: input.trustMetrics,
      analyticsSummary: selectAnalyticsDetail(
        input.analyticsSummary,
        input.detailLevel,
        input.sectionsIncluded
      ),
      warnings: input.warnings,
      errors: input.errors,
      recommendations: input.recommendations,
      auditInformation: {
        configurationVersion: input.audit.configurationVersion,
        engineVersion: input.audit.engineVersion,
        generatedBy: "ValidationReportingEngine",
        sourceModules: input.moduleScores.map((m) => m.module),
      },
      sectionsIncluded: input.sectionsIncluded,
      partial: input.partial ?? false,
      engineVersion: input.engineVersion,
    };
  }
}

export function createReportId(): string {
  return `rpt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function filterModulesByDetail(
  modules: ReportModuleBreakdownRow[],
  detail: ReportDetailLevel
): ReportModuleBreakdownRow[] {
  if (detail === "SUMMARY") return modules.slice(0, 5);
  if (detail === "STANDARD") return modules.slice(0, 20);
  return modules;
}

function selectAnalyticsDetail(
  analytics: ReportAnalyticsSection,
  detail: ReportDetailLevel,
  sections: string[]
): ReportAnalyticsSection {
  if (!sections.includes("analytics")) {
    return {
      trendAnalysis: {},
      ruleEffectiveness: {},
      failureAnalytics: {},
      distributionAnalytics: {},
      predictionAnalytics: {},
      healthScore: analytics.healthScore,
    };
  }
  if (detail === "SUMMARY") {
    return {
      trendAnalysis: { overall: analytics.trendAnalysis["overallDirection"] },
      ruleEffectiveness: {
        ruleCount: (analytics.ruleEffectiveness as { ruleCount?: number })
          ?.ruleCount,
      },
      failureAnalytics: {
        totalFailures: (analytics.failureAnalytics as { totalFailures?: number })
          ?.totalFailures,
      },
      distributionAnalytics: {},
      predictionAnalytics: {
        averageConfidence: (
          analytics.predictionAnalytics as { averageConfidence?: number }
        )?.averageConfidence,
      },
      healthScore: analytics.healthScore,
    };
  }
  return analytics;
}
