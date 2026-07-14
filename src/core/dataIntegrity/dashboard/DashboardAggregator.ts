/**
 * Aggregates metrics from every registered validation module into dashboard views.
 * Does not modify existing validation engines — read-only collectors only.
 */

import type { DashboardConfiguration } from "./DashboardConfiguration";
import type { DashboardFilters } from "./DashboardFilters";
import {
  filterMatchesModules,
  filterMatchesRecommendation,
  filterMatchesTrustClassification,
  matchesMetaFilters,
  normalizeFilters,
} from "./DashboardFilters";
import {
  classifyHealth,
  clampScore,
  toModuleHealthStatus,
  type DashboardSummary,
  type DashboardSummaryMetrics,
  type DashboardSystemHealth,
} from "./DashboardSummary";
import {
  collectAllModuleMetrics,
  type DashboardModuleRawMetrics,
  type DashboardModuleStatus,
} from "./DashboardRegistry";

export interface ValidationDistribution {
  byModule: Record<string, number>;
  byRuleCategory: Record<string, number>;
  bySeverity: Record<string, number>;
  byDatasetType: Record<string, number>;
  byTimeframe: Record<string, number>;
  byRecommendationType: Record<string, number>;
}

export interface TopFailuresReport {
  mostFailingRules: Array<{ ruleId: string; failures: number }>;
  mostRejectedDatasets: Array<{ key: string; count: number }>;
  highestHallucinationRisk: Array<{ key: string; score: number }>;
  lowestTrustScores: Array<{ key: string; score: number }>;
  lowestIntegrityScores: Array<{ key: string; score: number }>;
  worstRecommendationQuality: Array<{ key: string; score: number }>;
  worstTradeSetups: Array<{ key: string; score: number }>;
}

export interface AggregationExtras {
  ruleFailureFrequency?: Record<string, number>;
  rejectedDatasets?: Record<string, number>;
  hallucinationRisks?: Array<{ key: string; score: number }>;
  trustScores?: Array<{ key: string; score: number; classification?: string }>;
  integrityScores?: Array<{ key: string; score: number }>;
  recommendationScores?: Array<{
    key: string;
    score: number;
    recommendation?: string;
  }>;
  tradeSetupScores?: Array<{ key: string; score: number }>;
  ruleCategories?: Record<string, number>;
  severities?: Record<string, number>;
  datasetTypes?: Record<string, number>;
  timeframes?: Record<string, number>;
  recommendationTypes?: Record<string, number>;
  previousOverallHealth?: number | null;
}

export interface AggregationInput {
  modules?: DashboardModuleRawMetrics[];
  extras?: AggregationExtras;
  filters?: DashboardFilters;
  generatedAt?: string;
}

export interface AggregationResult {
  summary: DashboardSummary;
  distribution: ValidationDistribution;
  topFailures: TopFailuresReport;
  aggregationTimeMs: number;
  warnings: string[];
}

export class DashboardAggregator {
  constructor(private readonly config: DashboardConfiguration) {}

  aggregate(input: AggregationInput = {}): AggregationResult {
    const started = Date.now();
    const filters = normalizeFilters(input.filters);
    const warnings: string[] = [];

    let rawModules = input.modules ?? collectAllModuleMetrics();
    rawModules = rawModules.filter((m) =>
      filterMatchesModules(filters, m.moduleId)
    );

    if (rawModules.length === 0) {
      warnings.push("No dashboard modules contributed metrics.");
    }

    const moduleStatuses = rawModules.map((m) =>
      this.toModuleStatus(m)
    );

    const summaryMetrics = this.buildSummaryMetrics(
      rawModules,
      input.generatedAt ?? new Date().toISOString()
    );

    const health = this.buildSystemHealth(
      moduleStatuses,
      summaryMetrics,
      input.extras?.previousOverallHealth ?? null
    );

    const summary: DashboardSummary = {
      summary: summaryMetrics,
      modules: moduleStatuses,
      health,
      engineVersion: this.config.engineVersion,
    };

    const distribution = this.buildDistribution(
      rawModules,
      input.extras,
      filters
    );
    const topFailures = this.buildTopFailures(input.extras, filters);

    return {
      summary,
      distribution,
      topFailures,
      aggregationTimeMs: Date.now() - started,
      warnings,
    };
  }

  private toModuleStatus(
    raw: DashboardModuleRawMetrics
  ): DashboardModuleStatus {
    const total = raw.validationCount;
    const successPercent =
      total === 0 ? 100 : clampScore((raw.passedCount / total) * 100);
    const failurePercent =
      total === 0 ? 0 : clampScore((raw.failedCount / total) * 100);

    let score = clampScore(raw.averageScore);
    if (successPercent < this.config.moduleHealthySuccessRate) {
      score = Math.min(score, successPercent);
    }
    if (raw.averageRuntime > this.config.moduleSlowRuntimeMs) {
      score = Math.min(score, score - 5);
    }
    if (raw.criticalCount > 0) {
      score = Math.min(score, 69);
    }
    score = clampScore(score);

    const classification = classifyHealth(
      score,
      this.config.healthThresholds
    );

    let currentStatus: DashboardModuleStatus["currentStatus"] = "IDLE";
    if (total > 0) {
      if (classification === "CRITICAL") currentStatus = "DEGRADED";
      else currentStatus = "ACTIVE";
    }

    return {
      moduleId: raw.moduleId,
      moduleName: raw.moduleName,
      currentStatus,
      validationCount: total,
      successPercent,
      failurePercent,
      averageScore: clampScore(raw.averageScore),
      averageRuntime: raw.averageRuntime,
      lastValidation: raw.lastValidation,
      healthStatus: toModuleHealthStatus(classification),
      warningCount: raw.warningCount,
      criticalCount: raw.criticalCount,
    };
  }

  private buildSummaryMetrics(
    modules: DashboardModuleRawMetrics[],
    generatedAt: string
  ): DashboardSummaryMetrics {
    const byId = Object.fromEntries(modules.map((m) => [m.moduleId, m]));

    const totalValidations = modules.reduce(
      (a, m) => a + m.validationCount,
      0
    );
    const passedValidations = modules.reduce(
      (a, m) => a + m.passedCount,
      0
    );
    const failedValidations = modules.reduce(
      (a, m) => a + m.failedCount,
      0
    );
    const warningCount = modules.reduce((a, m) => a + m.warningCount, 0);
    const criticalCount = modules.reduce((a, m) => a + m.criticalCount, 0);

    const scoreOf = (id: string, fallbackKey?: string) => {
      const m = byId[id];
      if (!m) return 0;
      if (fallbackKey && m.extras && m.extras[fallbackKey] !== undefined) {
        return clampScore(m.extras[fallbackKey]!);
      }
      return clampScore(m.averageScore);
    };

    return {
      totalValidations,
      passedValidations,
      failedValidations,
      warningCount,
      criticalCount,
      averageIntegrityScore: scoreOf("dataIntegrity"),
      averageTrustScore: scoreOf("trust"),
      averageHallucinationScore: scoreOf("hallucination"),
      historicalPerformanceScore: scoreOf("historical"),
      recommendationQuality: scoreOf("recommendation"),
      tradeSetupQuality: scoreOf("tradeSetup"),
      generatedAt,
    };
  }

  private buildSystemHealth(
    modules: DashboardModuleStatus[],
    summary: DashboardSummaryMetrics,
    previousOverall: number | null
  ): DashboardSystemHealth {
    const scoreById = (id: string, fallback = 0) => {
      const m = modules.find((x) => x.moduleId === id);
      if (!m) return fallback;
      return clampScore(
        m.averageScore * 0.6 + m.successPercent * 0.4
      );
    };

    const validationEngineHealth = scoreById(
      "dataIntegrity",
      summary.averageIntegrityScore
    );
    const ruleEngineHealth = scoreById("ruleEngine", 100);
    const trustEngineHealth = scoreById("trust", summary.averageTrustScore);
    const historicalEngineHealth = scoreById(
      "historical",
      summary.historicalPerformanceScore
    );
    const recommendationHealth = scoreById(
      "recommendation",
      summary.recommendationQuality
    );
    const marketHealth = scoreById("market");
    const technicalHealth = scoreById("technical");
    const fundamentalHealth = scoreById("fundamental");

    const w = this.config.healthWeights;
    const weightSum =
      w.validationEngine +
      w.ruleEngine +
      w.trustEngine +
      w.historicalEngine +
      w.recommendation +
      w.market +
      w.technical +
      w.fundamental;

    const overallHealthScore =
      weightSum <= 0
        ? 0
        : clampScore(
            (validationEngineHealth * w.validationEngine +
              ruleEngineHealth * w.ruleEngine +
              trustEngineHealth * w.trustEngine +
              historicalEngineHealth * w.historicalEngine +
              recommendationHealth * w.recommendation +
              marketHealth * w.market +
              technicalHealth * w.technical +
              fundamentalHealth * w.fundamental) /
              weightSum
          );

    const deteriorating =
      previousOverall !== null &&
      previousOverall - overallHealthScore >=
        this.config.deteriorationDropThreshold;

    return {
      overallHealthScore,
      overallClassification: classifyHealth(
        overallHealthScore,
        this.config.healthThresholds
      ),
      validationEngineHealth,
      ruleEngineHealth,
      trustEngineHealth,
      historicalEngineHealth,
      recommendationHealth,
      marketHealth,
      technicalHealth,
      fundamentalHealth,
      deteriorating,
    };
  }

  private buildDistribution(
    modules: DashboardModuleRawMetrics[],
    extras: AggregationExtras | undefined,
    filters: DashboardFilters
  ): ValidationDistribution {
    const byModule: Record<string, number> = {};
    for (const m of modules) {
      byModule[m.moduleId] = m.validationCount;
    }

    return {
      byModule,
      byRuleCategory: filterRecord(extras?.ruleCategories ?? {}, filters),
      bySeverity: filterRecord(extras?.severities ?? {}, filters),
      byDatasetType: filterRecord(extras?.datasetTypes ?? {}, filters),
      byTimeframe: extras?.timeframes ?? {},
      byRecommendationType: filterRecommendationTypes(
        extras?.recommendationTypes ?? {},
        filters
      ),
    };
  }

  private buildTopFailures(
    extras: AggregationExtras | undefined,
    filters: DashboardFilters
  ): TopFailuresReport {
    const limit = this.config.maxTopFailures;
    const e = extras ?? {};

    const failingRules = Object.entries(e.ruleFailureFrequency ?? {})
      .map(([ruleId, failures]) => ({ ruleId, failures }))
      .filter((r) =>
        matchesMetaFilters(filters, { ruleCategory: r.ruleId.split(".")[0] })
      )
      .sort((a, b) => b.failures - a.failures)
      .slice(0, limit);

    const rejected = Object.entries(e.rejectedDatasets ?? {})
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    const sortAsc = <T extends { score: number; key: string }>(arr: T[]) =>
      [...arr].sort((a, b) => a.score - b.score).slice(0, limit);

    const sortDesc = <T extends { score: number; key: string }>(arr: T[]) =>
      [...arr].sort((a, b) => b.score - a.score).slice(0, limit);

    const trustFiltered = (e.trustScores ?? []).filter((t) =>
      filterMatchesTrustClassification(filters, t.classification ?? "")
    );

    const recFiltered = (e.recommendationScores ?? []).filter((r) =>
      filterMatchesRecommendation(filters, r.recommendation ?? "")
    );

    return {
      mostFailingRules: failingRules,
      mostRejectedDatasets: rejected,
      highestHallucinationRisk: sortDesc(e.hallucinationRisks ?? []).map(
        (x) => ({ key: x.key, score: x.score })
      ),
      lowestTrustScores: sortAsc(trustFiltered).map((x) => ({
        key: x.key,
        score: x.score,
      })),
      lowestIntegrityScores: sortAsc(e.integrityScores ?? []).map((x) => ({
        key: x.key,
        score: x.score,
      })),
      worstRecommendationQuality: sortAsc(recFiltered).map((x) => ({
        key: x.key,
        score: x.score,
      })),
      worstTradeSetups: sortAsc(e.tradeSetupScores ?? []).map((x) => ({
        key: x.key,
        score: x.score,
      })),
    };
  }
}

function filterRecord(
  record: Record<string, number>,
  _filters: DashboardFilters
): Record<string, number> {
  return { ...record };
}

function filterRecommendationTypes(
  record: Record<string, number>,
  filters: DashboardFilters
): Record<string, number> {
  if (!filters.recommendation) return { ...record };
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(record)) {
    if (filterMatchesRecommendation(filters, key)) out[key] = value;
  }
  return out;
}

/** Safe helpers for live engine collectors (never throw into aggregation). */
export function safeNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function safeCollect(
  collect: () => DashboardModuleRawMetrics
): DashboardModuleRawMetrics {
  try {
    return collect();
  } catch {
    return {
      moduleId: "unknown",
      moduleName: "Unknown",
      validationCount: 0,
      passedCount: 0,
      failedCount: 0,
      warningCount: 0,
      criticalCount: 0,
      averageScore: 0,
      averageRuntime: 0,
      lastValidation: null,
    };
  }
}
