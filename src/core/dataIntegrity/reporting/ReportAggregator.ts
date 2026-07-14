/**
 * Aggregates read-only validation/analytics outputs into report sections.
 * Never mutates source engines.
 */

import type { ReportingConfiguration } from "./ReportConfiguration";
import type { ReportFilters } from "./ReportFilters";
import { matchesList, isInDateRange } from "./ReportFilters";
import type {
  ReportAnalyticsSection,
  ReportAuditSection,
  ReportModuleBreakdownRow,
  ReportSummarySection,
} from "./ReportSections";
import type {
  ReportTrustMetrics,
  ReportValidationMetrics,
} from "./ReportBuilder";

/** Normalized payload supplied by live collectors or tests. */
export interface ReportSourcePayload {
  sourceId: string;
  module?: string;
  timestamp?: string;
  stock?: string;
  sector?: string;
  exchange?: string;
  recommendation?: string;
  trustClassification?: string;
  severity?: string;
  validationType?: string;
  validationCount?: number;
  passed?: number;
  failed?: number;
  warnings?: number;
  critical?: number;
  averageRuntime?: number;
  averageScore?: number;
  integrityScore?: number;
  trustScore?: number;
  hallucinationScore?: number;
  historicalScore?: number;
  recommendationQuality?: number;
  tradeQuality?: number;
  overallHealth?: number;
  trend?: "UP" | "DOWN" | "FLAT" | "UNKNOWN";
  status?: ReportModuleBreakdownRow["status"];
  analytics?: Partial<ReportAnalyticsSection>;
  audit?: Partial<ReportAuditSection>;
  warningsList?: string[];
  errorsList?: string[];
  recommendationsList?: string[];
  trustDistribution?: Record<string, number>;
  rejectedObjects?: number;
  metadata?: Record<string, unknown>;
}

export interface AggregatedReportData {
  summary: ReportSummarySection;
  moduleScores: ReportModuleBreakdownRow[];
  validationMetrics: ReportValidationMetrics;
  trustMetrics: ReportTrustMetrics;
  analyticsSummary: ReportAnalyticsSection;
  audit: ReportAuditSection;
  warnings: string[];
  errors: string[];
  recommendations: string[];
  partial: boolean;
  unavailableModules: string[];
}

export class ReportAggregator {
  constructor(private readonly config: ReportingConfiguration) {}

  aggregate(
    payloads: ReportSourcePayload[],
    filters: ReportFilters
  ): AggregatedReportData {
    const filtered = payloads.filter((p) => this.matchesFilters(p, filters));
    const unavailableModules: string[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];
    const recommendations: string[] = [];

    if (filtered.length === 0) {
      warnings.push("No source payloads matched report filters.");
    }

    const byModule = new Map<string, ReportSourcePayload[]>();
    for (const p of filtered) {
      const key = p.module ?? p.sourceId;
      const list = byModule.get(key) ?? [];
      list.push(p);
      byModule.set(key, list);
    }

    const moduleScores: ReportModuleBreakdownRow[] = [];
    for (const [module, rows] of byModule) {
      try {
        moduleScores.push(this.toModuleRow(module, rows));
      } catch {
        unavailableModules.push(module);
        warnings.push(`Module ${module} unavailable for reporting.`);
      }
    }

    const integrity = avg(filtered.map((p) => p.integrityScore));
    const trust = avg(filtered.map((p) => p.trustScore));
    const hallucination = avg(filtered.map((p) => p.hallucinationScore));
    const historical = avg(filtered.map((p) => p.historicalScore));
    const recQuality = avg(filtered.map((p) => p.recommendationQuality));
    const tradeQuality = avg(filtered.map((p) => p.tradeQuality));
    const health = avg(
      filtered.map((p) => p.overallHealth).filter((v): v is number => v != null)
    );
    const moduleAvg = avg(moduleScores.map((m) => m.averageScore));
    const overallValidationScore = clamp(
      averageOf([
        integrity,
        trust,
        hallucination,
        historical,
        recQuality,
        tradeQuality,
        moduleAvg,
      ])
    );

    const summary: ReportSummarySection = {
      overallValidationScore,
      integrityScore: clamp(integrity),
      trustScore: clamp(trust),
      hallucinationScore: clamp(hallucination),
      historicalScore: clamp(historical),
      recommendationQuality: clamp(recQuality),
      tradeQuality: clamp(tradeQuality),
      overallHealth: clamp(health || overallValidationScore),
    };

    const totalValidations = sum(filtered.map((p) => p.validationCount ?? 0));
    const passed = sum(filtered.map((p) => p.passed ?? 0));
    const failed = sum(filtered.map((p) => p.failed ?? 0));
    const warnCount = sum(filtered.map((p) => p.warnings ?? 0));
    const critical = sum(filtered.map((p) => p.critical ?? 0));

    const validationMetrics: ReportValidationMetrics = {
      totalValidations,
      passed,
      failed,
      warnings: warnCount,
      critical,
      averageRuntime: round2(avg(filtered.map((p) => p.averageRuntime))),
    };

    const trustDistribution: Record<string, number> = {};
    for (const p of filtered) {
      if (p.trustClassification) {
        trustDistribution[p.trustClassification] =
          (trustDistribution[p.trustClassification] ?? 0) + 1;
      }
      if (p.trustDistribution) {
        for (const [k, v] of Object.entries(p.trustDistribution)) {
          trustDistribution[k] = (trustDistribution[k] ?? 0) + v;
        }
      }
    }

    const trustMetrics: ReportTrustMetrics = {
      averageTrustScore: clamp(trust),
      rejectedObjects: sum(filtered.map((p) => p.rejectedObjects ?? 0)),
      trustDistribution,
    };

    const analyticsSummary = this.mergeAnalytics(filtered);
    const audit = this.mergeAudit(filtered);

    for (const p of filtered) {
      warnings.push(...(p.warningsList ?? []));
      errors.push(...(p.errorsList ?? []));
      recommendations.push(...(p.recommendationsList ?? []));
    }

    if (failed > 0) {
      recommendations.push(
        "Review failed validations and remediate highest-frequency rule violations."
      );
    }
    if (summary.trustScore < 80) {
      recommendations.push(
        "Trust score below institutional threshold — investigate contributing modules."
      );
    }
    if (summary.hallucinationScore > 0 && summary.hallucinationScore < 80) {
      recommendations.push(
        "Hallucination quality below target — strengthen evidence and fact checks."
      );
    }

    const partial =
      unavailableModules.length > 0 ||
      (this.config.mode === "relaxed" && filtered.length < payloads.length);

    return {
      summary,
      moduleScores,
      validationMetrics,
      trustMetrics,
      analyticsSummary,
      audit,
      warnings: unique(warnings),
      errors: unique(errors),
      recommendations: unique(recommendations),
      partial,
      unavailableModules,
    };
  }

  private matchesFilters(
    payload: ReportSourcePayload,
    filters: ReportFilters
  ): boolean {
    if (!matchesList(payload.stock, filters.stock)) return false;
    if (!matchesList(payload.sector, filters.sector)) return false;
    if (!matchesList(payload.exchange, filters.exchange)) return false;
    if (!matchesList(payload.module ?? payload.sourceId, filters.module)) {
      return false;
    }
    if (!matchesList(payload.severity, filters.severity)) return false;
    if (!matchesList(payload.recommendation, filters.recommendation)) {
      return false;
    }
    if (
      !matchesList(payload.trustClassification, filters.trustClassification)
    ) {
      return false;
    }
    if (!matchesList(payload.validationType, filters.validationType)) {
      return false;
    }
    if (!isInDateRange(payload.timestamp, filters)) return false;
    return true;
  }

  private toModuleRow(
    module: string,
    rows: ReportSourcePayload[]
  ): ReportModuleBreakdownRow {
    const validationCount = sum(rows.map((r) => r.validationCount ?? 0));
    const passed = sum(rows.map((r) => r.passed ?? 0));
    const failed = sum(rows.map((r) => r.failed ?? 0));
    const total = validationCount || passed + failed;
    const successPercent =
      total === 0 ? 100 : clamp((passed / total) * 100);
    const failurePercent =
      total === 0 ? 0 : clamp((failed / total) * 100);
    const averageScore = clamp(
      avg(
        rows
          .map(
            (r) =>
              r.averageScore ??
              r.trustScore ??
              r.integrityScore ??
              r.recommendationQuality ??
              r.tradeQuality
          )
          .filter((v): v is number => typeof v === "number")
      )
    );
    const warnings = sum(rows.map((r) => r.warnings ?? 0));
    const status =
      rows.find((r) => r.status)?.status ??
      (failurePercent >= 40 || warnings > 10
        ? "DEGRADED"
        : total > 0
          ? "ACTIVE"
          : "IDLE");
    const trend =
      rows.find((r) => r.trend)?.trend ??
      (failurePercent > 20 ? "DOWN" : failurePercent === 0 ? "UP" : "FLAT");

    return {
      module,
      status,
      validationCount: total,
      successPercent,
      failurePercent,
      averageRuntime: round2(avg(rows.map((r) => r.averageRuntime))),
      averageScore,
      trend,
      warnings,
    };
  }

  private mergeAnalytics(
    payloads: ReportSourcePayload[]
  ): ReportAnalyticsSection {
    const withAnalytics = payloads.filter((p) => p.analytics);
    if (withAnalytics.length === 0) {
      return emptyAnalytics();
    }
    const last = withAnalytics[withAnalytics.length - 1]!.analytics!;
    return {
      trendAnalysis: { ...(last.trendAnalysis ?? {}) },
      ruleEffectiveness: { ...(last.ruleEffectiveness ?? {}) },
      failureAnalytics: { ...(last.failureAnalytics ?? {}) },
      distributionAnalytics: { ...(last.distributionAnalytics ?? {}) },
      predictionAnalytics: { ...(last.predictionAnalytics ?? {}) },
      healthScore: clamp(
        last.healthScore ??
          avg(payloads.map((p) => p.overallHealth).filter(isNum))
      ),
    };
  }

  private mergeAudit(payloads: ReportSourcePayload[]): ReportAuditSection {
    const audit: ReportAuditSection = {
      validationHistory: [],
      recentEvents: [],
      criticalFailures: [],
      ruleViolations: [],
      trustChanges: [],
      configurationVersion: this.config.engineVersion,
      engineVersion: this.config.engineVersion,
    };
    for (const p of payloads) {
      if (!p.audit) continue;
      audit.validationHistory.push(...(p.audit.validationHistory ?? []));
      audit.recentEvents.push(...(p.audit.recentEvents ?? []));
      audit.criticalFailures.push(...(p.audit.criticalFailures ?? []));
      audit.ruleViolations.push(...(p.audit.ruleViolations ?? []));
      audit.trustChanges.push(...(p.audit.trustChanges ?? []));
      if (p.audit.configurationVersion) {
        audit.configurationVersion = p.audit.configurationVersion;
      }
      if (p.audit.engineVersion) {
        audit.engineVersion = p.audit.engineVersion;
      }
    }
    return audit;
  }
}

function emptyAnalytics(): ReportAnalyticsSection {
  return {
    trendAnalysis: {},
    ruleEffectiveness: {},
    failureAnalytics: {},
    distributionAnalytics: {},
    predictionAnalytics: {},
    healthScore: 0,
  };
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

function avg(values: Array<number | undefined>): number {
  const nums = values.filter(isNum);
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function averageOf(values: number[]): number {
  const nums = values.filter((v) => v > 0);
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function isNum(v: number | undefined): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function clamp(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n * 100) / 100));
}

function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
