/**
 * Institutional Validation Reporting & Export Engine — master façade (Prompt 9F.15).
 * Transforms validation/trust/analytics outputs into structured reports.
 * Read-only integration; no PDF/Excel rendering in this module.
 */

import {
  DEFAULT_REPORTING_CONFIGURATION,
  resolveReportingConfiguration,
  type ExportFormat,
  type ReportDetailLevel,
  type ReportType,
  type ReportingConfiguration,
  type ReportingConfigurationInput,
} from "./ReportConfiguration";
import {
  normalizeReportFilters,
  type ReportFilters,
} from "./ReportFilters";
import { ReportTemplates } from "./ReportTemplates";
import {
  ReportAggregator,
  type ReportSourcePayload,
} from "./ReportAggregator";
import {
  ReportBuilder,
  type InstitutionalReport,
} from "./ReportBuilder";
import { ReportFormatter } from "./ReportFormatter";
import {
  ReportExportModels,
  type ReportExportModel,
} from "./ReportExportModels";
import {
  areBuiltinReportSourcesRegistered,
  collectAllReportPayloads,
  getRegisteredReportSources,
  markBuiltinReportSourcesRegistered,
  registerReportSource,
  resetReportSourceRegistrationState,
  type ReportSourceDefinition,
} from "./ReportRegistry";
import { ReportMetricsTracker } from "./ReportMetrics";
import { ReportAuditLogger } from "./ReportAuditLogger";
import {
  compareReportSnapshots,
  ReportSnapshotStore,
  type ReportSnapshot,
  type ReportSnapshotComparison,
} from "./ReportSnapshot";
import { safePublishEvent } from "../events/ValidationEventBus";

export interface GenerateReportOptions {
  reportType?: ReportType;
  filters?: ReportFilters;
  detailLevel?: ReportDetailLevel;
  /** Inject payloads for tests / offline generation. */
  payloads?: ReportSourcePayload[];
  includeLiveCollectors?: boolean;
  reportingPeriodHours?: number;
  label?: string;
}

let defaultEngine: ValidationReportingEngine | null = null;
let engineRegistered = false;

export class ValidationReportingEngine {
  private config: ReportingConfiguration;
  private templates: ReportTemplates;
  private aggregator: ReportAggregator;
  private builder: ReportBuilder;
  private formatter: ReportFormatter;
  private exportModels: ReportExportModels;
  private metrics: ReportMetricsTracker;
  private audit: ReportAuditLogger;
  private snapshots: ReportSnapshotStore;
  private readonly history: InstitutionalReport[] = [];
  private lastReport: InstitutionalReport | null = null;

  constructor(configInput?: ReportingConfigurationInput) {
    this.config = resolveReportingConfiguration(configInput);
    this.templates = new ReportTemplates(this.config);
    this.aggregator = new ReportAggregator(this.config);
    this.builder = new ReportBuilder();
    this.formatter = new ReportFormatter();
    this.exportModels = new ReportExportModels();
    this.metrics = new ReportMetricsTracker();
    this.audit = new ReportAuditLogger(this.config.maxAuditEntries);
    this.snapshots = new ReportSnapshotStore(this.config.snapshotRetention);
  }

  getConfiguration(): ReportingConfiguration {
    return resolveReportingConfiguration(this.config);
  }

  getTemplates(): ReportTemplates {
    return this.templates;
  }

  registerSource(
    definition: ReportSourceDefinition,
    options?: { force?: boolean }
  ): { registered: boolean; skipped: boolean } {
    return registerReportSource(definition, options);
  }

  /** Core report generation — never throws to callers. */
  generateReport(options: GenerateReportOptions = {}): InstitutionalReport {
    const started = Date.now();
    const reportType = options.reportType ?? "ValidationReport";
    const filters = normalizeReportFilters(options.filters);
    const detailLevel =
      options.detailLevel ?? this.config.defaultDetailLevel;
    const template = this.templates.getTemplate(reportType, detailLevel);
    const periodHours =
      options.reportingPeriodHours ??
      this.config.defaultReportingPeriodHours;
    const to = new Date();
    const from = new Date(to.getTime() - periodHours * 3_600_000);

    try {
      const live =
        options.includeLiveCollectors === false
          ? []
          : collectAllReportPayloads();
      const payloads = [...live, ...(options.payloads ?? [])];
      const aggregated = this.aggregator.aggregate(payloads, filters);

      let report = this.builder.build({
        reportType,
        title: template.title,
        detailLevel: template.detailLevel,
        sectionsIncluded: template.sections,
        filters,
        reportingPeriod: {
          from: from.toISOString(),
          to: to.toISOString(),
        },
        summary: aggregated.summary,
        moduleScores: aggregated.moduleScores,
        validationMetrics: aggregated.validationMetrics,
        trustMetrics: aggregated.trustMetrics,
        analyticsSummary: aggregated.analyticsSummary,
        audit: aggregated.audit,
        warnings: aggregated.warnings,
        errors: aggregated.errors,
        recommendations: aggregated.recommendations,
        engineVersion: this.config.engineVersion,
        partial: aggregated.partial,
      });

      report = this.formatter.applyDetailLevel(report, detailLevel);
      this.finalize(report, started, aggregated.warnings, aggregated.errors);
      return report;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const fallback = this.builder.build({
        reportType,
        title: template.title,
        detailLevel,
        sectionsIncluded: template.sections,
        filters,
        reportingPeriod: {
          from: from.toISOString(),
          to: to.toISOString(),
        },
        summary: {
          overallValidationScore: 0,
          integrityScore: 0,
          trustScore: 0,
          hallucinationScore: 0,
          historicalScore: 0,
          recommendationQuality: 0,
          tradeQuality: 0,
          overallHealth: 0,
        },
        moduleScores: [],
        validationMetrics: {
          totalValidations: 0,
          passed: 0,
          failed: 0,
          warnings: 0,
          critical: 0,
          averageRuntime: 0,
        },
        trustMetrics: {
          averageTrustScore: 0,
          rejectedObjects: 0,
          trustDistribution: {},
        },
        analyticsSummary: {
          trendAnalysis: {},
          ruleEffectiveness: {},
          failureAnalytics: {},
          distributionAnalytics: {},
          predictionAnalytics: {},
          healthScore: 0,
        },
        audit: {
          validationHistory: [],
          recentEvents: [],
          criticalFailures: [],
          ruleViolations: [],
          trustChanges: [],
          configurationVersion: this.config.engineVersion,
          engineVersion: this.config.engineVersion,
        },
        warnings: ["Report generation recovered from internal error."],
        errors: [message],
        recommendations: [
          "Retry report generation after verifying source module availability.",
        ],
        engineVersion: this.config.engineVersion,
        partial: true,
      });
      this.finalize(fallback, started, fallback.warnings, fallback.errors);
      return fallback;
    }
  }

  generateValidationReport(
    options?: Omit<GenerateReportOptions, "reportType">
  ): InstitutionalReport {
    return this.generateReport({ ...options, reportType: "ValidationReport" });
  }

  generateTrustReport(
    options?: Omit<GenerateReportOptions, "reportType">
  ): InstitutionalReport {
    return this.generateReport({ ...options, reportType: "TrustReport" });
  }

  generateAnalyticsReport(
    options?: Omit<GenerateReportOptions, "reportType">
  ): InstitutionalReport {
    return this.generateReport({ ...options, reportType: "AnalyticsReport" });
  }

  generateAuditReport(
    options?: Omit<GenerateReportOptions, "reportType">
  ): InstitutionalReport {
    return this.generateReport({ ...options, reportType: "AuditReport" });
  }

  exportReportModel(
    reportOrOptions: InstitutionalReport | GenerateReportOptions,
    format: ExportFormat = "JSON"
  ): ReportExportModel {
    try {
      const report =
        "reportId" in reportOrOptions
          ? reportOrOptions
          : this.generateReport(reportOrOptions);
      if (!this.config.enabledExportFormats.includes(format)) {
        format = "JSON";
      }
      const model = this.exportModels.build(report, format);
      this.metrics.recordExport();
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "ExportModelBuilt",
        reportId: report.reportId,
        reportType: report.reportType,
        warnings: [],
        errors: [],
        executionTimeMs: 0,
        engineVersion: this.config.engineVersion,
      });
      return model;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const empty = this.generateReport({
        reportType: "CustomReport",
        includeLiveCollectors: false,
        payloads: [],
      });
      return {
        format: "JSON",
        reportId: empty.reportId,
        generatedAt: empty.generatedTime,
        data: {
          ...empty,
          errors: [...empty.errors, message],
          partial: true,
        },
      };
    }
  }

  createReportSnapshot(label?: string): ReportSnapshot {
    try {
      const report = this.lastReport ?? this.generateReport();
      const snapshot = this.snapshots.save(report, label);
      this.metrics.setSnapshotCount(this.snapshots.size);
      this.audit.append({
        timestamp: snapshot.timestamp,
        event: "SnapshotCreated",
        reportId: report.reportId,
        reportType: report.reportType,
        warnings: [],
        errors: [],
        executionTimeMs: 0,
        engineVersion: this.config.engineVersion,
      });
      return snapshot;
    } catch {
      const report = this.generateReport({
        includeLiveCollectors: false,
        payloads: [],
      });
      return this.snapshots.save(report, label ?? "recovery");
    }
  }

  loadReportSnapshot(snapshotId: string): ReportSnapshot | null {
    return this.snapshots.load(snapshotId);
  }

  compareReportSnapshots(
    baselineId: string,
    compareId: string
  ): ReportSnapshotComparison | null {
    const baseline = this.snapshots.load(baselineId);
    const compare = this.snapshots.load(compareId);
    if (!baseline || !compare) return null;
    return compareReportSnapshots(baseline, compare);
  }

  listSnapshots(): ReportSnapshot[] {
    return this.snapshots.list();
  }

  getMetrics() {
    return this.metrics.getMetrics();
  }

  getAuditLog(limit?: number) {
    return this.audit.getLog(limit);
  }

  getReportHistory(): InstitutionalReport[] {
    return [...this.history];
  }

  resetOperationalState(): void {
    this.metrics.reset();
    this.audit.reset();
    this.snapshots.clear();
    this.history.length = 0;
    this.lastReport = null;
  }

  private finalize(
    report: InstitutionalReport,
    started: number,
    warnings: string[],
    errors: string[]
  ): void {
    const runtimeMs = Date.now() - started;
    this.lastReport = report;
    this.history.push(report);
    while (this.history.length > this.config.maxReportHistory) {
      this.history.shift();
    }
    this.metrics.recordGeneration({
      runtimeMs,
      sizeBytes: this.formatter.estimateSizeBytes(report),
      reportType: report.reportType,
    });
    this.metrics.setSnapshotCount(this.snapshots.size);
    this.audit.append({
      timestamp: new Date().toISOString(),
      event: "ReportGenerated",
      reportId: report.reportId,
      reportType: report.reportType,
      filters: report.filters,
      warnings,
      errors,
      executionTimeMs: runtimeMs,
      engineVersion: this.config.engineVersion,
    });
    safePublishEvent({
      eventType: "SnapshotCreated",
      module: "reporting",
      entityId: report.reportId,
      payload: {
        reportType: report.reportType,
        overallValidationScore: report.summary.overallValidationScore,
        partial: report.partial,
      },
      executionTimeMs: runtimeMs,
      source: "reporting-engine",
    });
  }
}

function safeCollect(
  sourceId: string,
  collect: () => ReportSourcePayload[]
): ReportSourcePayload[] {
  try {
    return collect();
  } catch {
    return [
      {
        sourceId,
        module: sourceId,
        timestamp: new Date().toISOString(),
        validationCount: 0,
        warningsList: [`Source ${sourceId} unavailable`],
      },
    ];
  }
}

/** Built-in read-only collectors for reporting. */
export function buildBuiltinReportSources(): ReportSourceDefinition[] {
  return [
    {
      id: "dataIntegrity",
      name: "Data Integrity Engine",
      collect: () =>
        safeCollect("dataIntegrity", () => {
          const { getMetrics } = require("../DataIntegrityEngine") as {
            getMetrics: () => {
              datasetsValidated: number;
              datasetsApproved: number;
              datasetsRejected: number;
              warningCount: number;
              criticalErrors: number;
              averageExecutionTime: number;
              averageIntegrityScore: number;
            };
          };
          const m = getMetrics();
          return [
            {
              sourceId: "dataIntegrity",
              module: "dataIntegrity",
              timestamp: new Date().toISOString(),
              validationCount: m.datasetsValidated,
              passed: m.datasetsApproved,
              failed: m.datasetsRejected,
              warnings: m.warningCount,
              critical: m.criticalErrors,
              averageRuntime: m.averageExecutionTime,
              integrityScore: m.averageIntegrityScore,
              averageScore: m.averageIntegrityScore,
            },
          ];
        }),
    },
    {
      id: "trust",
      name: "Trust Engine",
      collect: () =>
        safeCollect("trust", () => {
          const { getTrustMetrics } = require("../trust") as {
            getTrustMetrics: () => {
              totalCalculations: number;
              averageTrustScore: number;
              rejectedObjects: number;
              averageValidationRuntime: number;
              trustDistribution: Record<string, number>;
            };
          };
          const m = getTrustMetrics();
          return [
            {
              sourceId: "trust",
              module: "trust",
              timestamp: new Date().toISOString(),
              validationCount: m.totalCalculations,
              passed: Math.max(0, m.totalCalculations - m.rejectedObjects),
              failed: m.rejectedObjects,
              averageRuntime: m.averageValidationRuntime,
              trustScore: m.averageTrustScore,
              averageScore: m.averageTrustScore,
              rejectedObjects: m.rejectedObjects,
              trustDistribution: m.trustDistribution,
            },
          ];
        }),
    },
    {
      id: "analytics",
      name: "Analytics Engine",
      collect: () =>
        safeCollect("analytics", () => {
          const {
            getAnalyticsSummary,
            getTrendAnalytics,
            getRuleEffectiveness,
            getFailureAnalytics,
            getDistributionAnalytics,
            getPredictionAnalytics,
            getValidationAnalyticsEngine,
          } = require("../analytics") as {
            getAnalyticsSummary: () => {
              totalValidations: number;
              passed: number;
              failed: number;
              warnings: number;
              criticalFailures: number;
              averageRuntime: number;
              averageIntegrityScore: number;
              averageTrustScore: number;
              averageHallucinationScore: number;
              historicalScore: number;
              recommendationQuality: number;
              tradeQuality: number;
            };
            getTrendAnalytics: () => Record<string, unknown>;
            getRuleEffectiveness: () => Record<string, unknown>;
            getFailureAnalytics: () => Record<string, unknown>;
            getDistributionAnalytics: () => Record<string, unknown>;
            getPredictionAnalytics: () => Record<string, unknown>;
            getValidationAnalyticsEngine: () => {
              getMetrics: () => { healthScore: number };
            };
          };
          const s = getAnalyticsSummary();
          const health = getValidationAnalyticsEngine().getMetrics().healthScore;
          return [
            {
              sourceId: "analytics",
              module: "analytics",
              timestamp: new Date().toISOString(),
              validationCount: s.totalValidations,
              passed: s.passed,
              failed: s.failed,
              warnings: s.warnings,
              critical: s.criticalFailures,
              averageRuntime: s.averageRuntime,
              integrityScore: s.averageIntegrityScore,
              trustScore: s.averageTrustScore,
              hallucinationScore: s.averageHallucinationScore,
              historicalScore: s.historicalScore,
              recommendationQuality: s.recommendationQuality,
              tradeQuality: s.tradeQuality,
              overallHealth: health,
              averageScore: health,
              analytics: {
                trendAnalysis: getTrendAnalytics() as Record<string, unknown>,
                ruleEffectiveness: getRuleEffectiveness() as Record<
                  string,
                  unknown
                >,
                failureAnalytics: getFailureAnalytics() as Record<
                  string,
                  unknown
                >,
                distributionAnalytics: getDistributionAnalytics() as Record<
                  string,
                  unknown
                >,
                predictionAnalytics: getPredictionAnalytics() as Record<
                  string,
                  unknown
                >,
                healthScore: health,
              },
            },
          ];
        }),
    },
    {
      id: "dashboard",
      name: "Dashboard Backend",
      collect: () =>
        safeCollect("dashboard", () => {
          const { getDashboardSummary } = require("../dashboard") as {
            getDashboardSummary: () => {
              summary: {
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
              };
              health: { overallHealthScore: number };
              modules: Array<{
                moduleId: string;
                currentStatus: string;
                validationCount: number;
                successPercent: number;
                failurePercent: number;
                averageRuntime: number;
                averageScore: number;
                warningCount: number;
              }>;
            };
          };
          const d = getDashboardSummary();
          const rows: ReportSourcePayload[] = [
            {
              sourceId: "dashboard",
              module: "dashboard",
              timestamp: new Date().toISOString(),
              validationCount: d.summary.totalValidations,
              passed: d.summary.passedValidations,
              failed: d.summary.failedValidations,
              warnings: d.summary.warningCount,
              critical: d.summary.criticalCount,
              integrityScore: d.summary.averageIntegrityScore,
              trustScore: d.summary.averageTrustScore,
              hallucinationScore: d.summary.averageHallucinationScore,
              historicalScore: d.summary.historicalPerformanceScore,
              recommendationQuality: d.summary.recommendationQuality,
              tradeQuality: d.summary.tradeSetupQuality,
              overallHealth: d.health.overallHealthScore,
              averageScore: d.health.overallHealthScore,
            },
          ];
          for (const m of d.modules ?? []) {
            rows.push({
              sourceId: "dashboard",
              module: m.moduleId,
              timestamp: new Date().toISOString(),
              validationCount: m.validationCount,
              averageRuntime: m.averageRuntime,
              averageScore: m.averageScore,
              warnings: m.warningCount,
              status:
                m.currentStatus === "ACTIVE" ||
                m.currentStatus === "IDLE" ||
                m.currentStatus === "DEGRADED" ||
                m.currentStatus === "OFFLINE"
                  ? m.currentStatus
                  : "UNKNOWN",
              passed: Math.round(
                (m.successPercent / 100) * m.validationCount
              ),
              failed: Math.round(
                (m.failurePercent / 100) * m.validationCount
              ),
            });
          }
          return rows;
        }),
    },
    {
      id: "eventBus",
      name: "Validation Event Bus",
      collect: () =>
        safeCollect("eventBus", () => {
          const { getEventHistory, getEventMetrics } = require("../events") as {
            getEventHistory: () => Array<{
              eventType: string;
              severity: string;
              timestamp: string;
              module: string;
              payload: unknown;
            }>;
            getEventMetrics: () => {
              totalEvents: number;
              criticalEvents: number;
              failureCount: number;
              averageDispatchTimeMs: number;
            };
          };
          const m = getEventMetrics();
          const history = getEventHistory().slice(-20);
          return [
            {
              sourceId: "eventBus",
              module: "eventBus",
              timestamp: new Date().toISOString(),
              validationCount: m.totalEvents,
              critical: m.criticalEvents,
              failed: m.failureCount,
              averageRuntime: m.averageDispatchTimeMs,
              audit: {
                recentEvents: history.map((e) => ({
                  eventType: e.eventType,
                  severity: e.severity,
                  timestamp: e.timestamp,
                  module: e.module,
                })),
                criticalFailures: history
                  .filter((e) => e.severity === "CRITICAL")
                  .map((e) => ({
                    eventType: e.eventType,
                    timestamp: e.timestamp,
                  })),
                validationHistory: [],
                ruleViolations: [],
                trustChanges: history
                  .filter((e) => e.eventType === "TrustScoreUpdated")
                  .map((e) => ({
                    timestamp: e.timestamp,
                    payload: e.payload,
                  })),
                configurationVersion: "9F.13.0",
                engineVersion: "9F.13.0",
              },
            },
          ];
        }),
    },
    {
      id: "orchestrator",
      name: "Validation Orchestrator",
      collect: () =>
        safeCollect("orchestrator", () => {
          const { getValidationOrchestrator } = require("../orchestrator") as {
            getValidationOrchestrator: () => {
              getMetrics: () => {
                requests: number;
                completed: number;
                failed: number;
                averageExecutionTime: number;
              };
            };
          };
          const m = getValidationOrchestrator().getMetrics();
          return [
            {
              sourceId: "orchestrator",
              module: "orchestrator",
              timestamp: new Date().toISOString(),
              validationCount: m.requests,
              passed: m.completed,
              failed: m.failed,
              averageRuntime: m.averageExecutionTime,
              averageScore:
                m.requests === 0
                  ? 100
                  : Math.max(
                      0,
                      100 - (m.failed / Math.max(m.requests, 1)) * 100
                    ),
            },
          ];
        }),
    },
    {
      id: "hallucination",
      name: "Hallucination Engine",
      collect: () =>
        safeCollect("hallucination", () => {
          const {
            getHallucinationValidationMetrics,
          } = require("../rules/hallucination") as {
            getHallucinationValidationMetrics: () => {
              aiOutputsValidated: number;
              hallucinationsDetected: number;
              averageHallucinationScore: number;
              averageValidationRuntime: number;
            };
          };
          const m = getHallucinationValidationMetrics();
          return [
            {
              sourceId: "hallucination",
              module: "hallucination",
              timestamp: new Date().toISOString(),
              validationCount: m.aiOutputsValidated,
              failed: m.hallucinationsDetected,
              passed: Math.max(
                0,
                m.aiOutputsValidated - m.hallucinationsDetected
              ),
              hallucinationScore: m.averageHallucinationScore,
              averageScore: m.averageHallucinationScore,
              averageRuntime: m.averageValidationRuntime,
            },
          ];
        }),
    },
    {
      id: "historical",
      name: "Historical Engine",
      collect: () =>
        safeCollect("historical", () => {
          const {
            getHistoricalValidationMetrics,
          } = require("../rules/historical") as {
            getHistoricalValidationMetrics: () => {
              recommendationsAnalysed: number;
              tradesAnalysed: number;
              historicalScore: number;
              averageValidationRuntime: number;
            };
          };
          const m = getHistoricalValidationMetrics();
          const total = m.recommendationsAnalysed + m.tradesAnalysed;
          return [
            {
              sourceId: "historical",
              module: "historical",
              timestamp: new Date().toISOString(),
              validationCount: total,
              passed: total,
              historicalScore: m.historicalScore,
              averageScore: m.historicalScore,
              averageRuntime: m.averageValidationRuntime,
            },
          ];
        }),
    },
    {
      id: "recommendation",
      name: "Recommendation Validation",
      collect: () =>
        safeCollect("recommendation", () => {
          const {
            getRecommendationValidationMetrics,
          } = require("../rules/recommendation") as {
            getRecommendationValidationMetrics: () => {
              recommendationsValidated: number;
              rejected: number;
              warnings: number;
              averageQualityScore: number;
              averageValidationTime: number;
            };
          };
          const m = getRecommendationValidationMetrics();
          return [
            {
              sourceId: "recommendation",
              module: "recommendation",
              timestamp: new Date().toISOString(),
              validationCount: m.recommendationsValidated,
              failed: m.rejected,
              passed: Math.max(0, m.recommendationsValidated - m.rejected),
              warnings: m.warnings,
              recommendationQuality: m.averageQualityScore,
              averageScore: m.averageQualityScore,
              averageRuntime: m.averageValidationTime,
            },
          ];
        }),
    },
    {
      id: "tradeSetup",
      name: "Trade Setup Validation",
      collect: () =>
        safeCollect("tradeSetup", () => {
          const {
            getTradeSetupValidationMetrics,
          } = require("../rules/tradeSetup") as {
            getTradeSetupValidationMetrics: () => {
              tradeSetupsValidated: number;
              rejectedSetups: number;
              averageQualityScore: number;
              averageValidationRuntime: number;
            };
          };
          const m = getTradeSetupValidationMetrics();
          return [
            {
              sourceId: "tradeSetup",
              module: "tradeSetup",
              timestamp: new Date().toISOString(),
              validationCount: m.tradeSetupsValidated,
              failed: m.rejectedSetups,
              passed: Math.max(0, m.tradeSetupsValidated - m.rejectedSetups),
              tradeQuality: m.averageQualityScore,
              averageScore: m.averageQualityScore,
              averageRuntime: m.averageValidationRuntime,
            },
          ];
        }),
    },
    {
      id: "market",
      name: "Market Validation",
      collect: () =>
        safeCollect("market", () => {
          const { getMarketValidationMetrics } = require("../rules/market") as {
            getMarketValidationMetrics: () => {
              marketDatasetsValidated: number;
              rejectedDatasets: number;
              warningCount: number;
              criticalFailures: number;
              averageExecutionTime: number;
            };
          };
          const m = getMarketValidationMetrics();
          return [
            {
              sourceId: "market",
              module: "market",
              timestamp: new Date().toISOString(),
              validationCount: m.marketDatasetsValidated,
              failed: m.rejectedDatasets,
              passed: Math.max(
                0,
                m.marketDatasetsValidated - m.rejectedDatasets
              ),
              warnings: m.warningCount,
              critical: m.criticalFailures,
              averageRuntime: m.averageExecutionTime,
            },
          ];
        }),
    },
    {
      id: "technical",
      name: "Technical Validation",
      collect: () =>
        safeCollect("technical", () => {
          const {
            getTechnicalValidationMetrics,
          } = require("../rules/technical") as {
            getTechnicalValidationMetrics: () => {
              indicatorsValidated: number;
              failedIndicators: number;
              warnings: number;
              criticalFailures: number;
              averageRuntime: number;
            };
          };
          const m = getTechnicalValidationMetrics();
          return [
            {
              sourceId: "technical",
              module: "technical",
              timestamp: new Date().toISOString(),
              validationCount: m.indicatorsValidated,
              failed: m.failedIndicators,
              passed: Math.max(0, m.indicatorsValidated - m.failedIndicators),
              warnings: m.warnings,
              critical: m.criticalFailures,
              averageRuntime: m.averageRuntime,
            },
          ];
        }),
    },
    {
      id: "fundamental",
      name: "Fundamental Validation",
      collect: () =>
        safeCollect("fundamental", () => {
          const {
            getFundamentalValidationMetrics,
          } = require("../rules/fundamental") as {
            getFundamentalValidationMetrics: () => {
              companiesValidated: number;
              ratioFailures: number;
              accountingAnomalies: number;
              averageExecutionTime: number;
            };
          };
          const m = getFundamentalValidationMetrics();
          const failed = m.ratioFailures + m.accountingAnomalies;
          return [
            {
              sourceId: "fundamental",
              module: "fundamental",
              timestamp: new Date().toISOString(),
              validationCount: m.companiesValidated,
              failed,
              passed: Math.max(0, m.companiesValidated - failed),
              averageRuntime: m.averageExecutionTime,
            },
          ];
        }),
    },
    {
      id: "ruleEngine",
      name: "Rule Engine",
      collect: () =>
        safeCollect("ruleEngine", () => {
          const { getDataIntegrityEngine } = require("../DataIntegrityEngine") as {
            getDataIntegrityEngine: () => {
              getRuleEngine: () => {
                getAggregateMetrics: () => {
                  totalExecutions: number;
                  successRate: number;
                  failureRate: number;
                  averageRuntime: number;
                };
              };
            };
          };
          const agg = getDataIntegrityEngine()
            .getRuleEngine()
            .getAggregateMetrics();
          return [
            {
              sourceId: "ruleEngine",
              module: "ruleEngine",
              timestamp: new Date().toISOString(),
              validationCount: agg.totalExecutions,
              passed: Math.round((agg.successRate / 100) * agg.totalExecutions),
              failed: Math.round((agg.failureRate / 100) * agg.totalExecutions),
              averageRuntime: agg.averageRuntime,
              averageScore: agg.successRate,
            },
          ];
        }),
    },
  ];
}

export function registerBuiltinReportSources(options?: {
  force?: boolean;
}): { registered: number; skipped: number; total: number } {
  if (areBuiltinReportSourcesRegistered() && !options?.force) {
    return {
      registered: 0,
      skipped: getRegisteredReportSources().length,
      total: getRegisteredReportSources().length,
    };
  }
  let added = 0;
  let skipped = 0;
  for (const def of buildBuiltinReportSources()) {
    const result = registerReportSource(def, options);
    if (result.registered) added += 1;
    else skipped += 1;
  }
  markBuiltinReportSourcesRegistered();
  return {
    registered: added,
    skipped,
    total: getRegisteredReportSources().length,
  };
}

export interface ReportingRegistrationResult {
  registered: boolean;
  skipped: boolean;
  sourcesRegistered: number;
}

export function registerValidationReportingEngine(options?: {
  engine?: ValidationReportingEngine;
  config?: ReportingConfigurationInput;
  force?: boolean;
}): ReportingRegistrationResult {
  if (engineRegistered && !options?.force) {
    return {
      registered: false,
      skipped: true,
      sourcesRegistered: getRegisteredReportSources().length,
    };
  }

  const sources = registerBuiltinReportSources({ force: options?.force });
  if (options?.engine) {
    defaultEngine = options.engine;
  } else if (!defaultEngine || options?.config || options?.force) {
    defaultEngine = new ValidationReportingEngine(options?.config);
  }

  engineRegistered = true;
  return {
    registered: true,
    skipped: false,
    sourcesRegistered: sources.total,
  };
}

export function getValidationReportingEngine(
  options?: ReportingConfigurationInput
): ValidationReportingEngine {
  if (!defaultEngine || options) {
    defaultEngine = new ValidationReportingEngine(options);
    registerBuiltinReportSources();
  }
  return defaultEngine;
}

export function resetValidationReportingEngine(): void {
  if (defaultEngine) defaultEngine.resetOperationalState();
  defaultEngine = null;
  engineRegistered = false;
  resetReportSourceRegistrationState();
}

/** Public API convenience wrappers. */
export function generateReport(
  options?: GenerateReportOptions
): InstitutionalReport {
  registerValidationReportingEngine();
  return getValidationReportingEngine().generateReport(options);
}

export function generateValidationReport(
  options?: Omit<GenerateReportOptions, "reportType">
): InstitutionalReport {
  registerValidationReportingEngine();
  return getValidationReportingEngine().generateValidationReport(options);
}

export function generateTrustReport(
  options?: Omit<GenerateReportOptions, "reportType">
): InstitutionalReport {
  registerValidationReportingEngine();
  return getValidationReportingEngine().generateTrustReport(options);
}

export function generateAnalyticsReport(
  options?: Omit<GenerateReportOptions, "reportType">
): InstitutionalReport {
  registerValidationReportingEngine();
  return getValidationReportingEngine().generateAnalyticsReport(options);
}

export function generateAuditReport(
  options?: Omit<GenerateReportOptions, "reportType">
): InstitutionalReport {
  registerValidationReportingEngine();
  return getValidationReportingEngine().generateAuditReport(options);
}

export function exportReportModel(
  reportOrOptions: InstitutionalReport | GenerateReportOptions,
  format?: ExportFormat
): ReportExportModel {
  registerValidationReportingEngine();
  return getValidationReportingEngine().exportReportModel(
    reportOrOptions,
    format
  );
}

export function createReportSnapshot(label?: string): ReportSnapshot {
  registerValidationReportingEngine();
  return getValidationReportingEngine().createReportSnapshot(label);
}

export {
  DEFAULT_REPORTING_CONFIGURATION,
  resolveReportingConfiguration,
  registerReportSource,
};
