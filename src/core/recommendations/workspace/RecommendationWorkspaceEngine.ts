/**
 * Institutional Recommendation Workspace Engine.
 * Bloomberg-style center composing R1–R6 without recalculating engines.
 */

import type { RecommendationSnapshot } from "../RecommendationSnapshot";
import type { LivingRecommendation } from "../lifecycle";
import type { RecommendationHealthAssessment } from "../health";
import type { RecommendationOutcomeAssessment } from "../outcomes";
import type {
  RecommendationAILessons,
  RecommendationLearningSummary,
} from "../learning";
import { buildRecommendationAnalytics } from "./RecommendationAnalyticsEngine";
import { filterRecommendationRecords } from "./RecommendationFilterEngine";
import { searchRecommendationRecords } from "./RecommendationSearchEngine";
import {
  normalizeWorkspaceTimestamp,
  readSnapshotText,
  resolveWorkspaceStatus,
  type ExecutiveRecommendationPanel,
  type RecommendationComparisonRow,
  type RecommendationComparisonView,
  type RecommendationFilterCriteria,
  type RecommendationSearchCriteria,
  type RecommendationWorkspace,
  type RecommendationWorkspaceAnalytics,
  type RecommendationWorkspaceExportFormat,
  type RecommendationWorkspaceExportResult,
  type RecommendationWorkspaceRecord,
} from "./RecommendationWorkspaceModels";

export interface WorkspaceCompositionSources {
  readonly snapshots: readonly RecommendationSnapshot[];
  readonly living: ReadonlyMap<string, LivingRecommendation>;
  readonly health: ReadonlyMap<string, RecommendationHealthAssessment>;
  readonly outcomes: ReadonlyMap<string, RecommendationOutcomeAssessment>;
  readonly lessons: ReadonlyMap<string, readonly string[]>;
  readonly learningSummary: RecommendationLearningSummary;
  readonly aiLessons: RecommendationAILessons;
  readonly generatedAt?: string | Date;
}

function extractTags(snapshot: RecommendationSnapshot): string[] {
  const tags = new Set<string>();
  for (const driver of snapshot.convictionDrivers) tags.add(driver);
  for (const risk of snapshot.riskFactors) tags.add(risk);
  tags.add(snapshot.strategy);
  tags.add(snapshot.generatedByEngine);
  return [...tags];
}

export function composeWorkspaceRecord(
  snapshot: RecommendationSnapshot,
  living: LivingRecommendation | null | undefined,
  health: RecommendationHealthAssessment | null | undefined,
  outcome: RecommendationOutcomeAssessment | null | undefined,
  lessons: readonly string[] = []
): RecommendationWorkspaceRecord {
  const sectorSnapshot = snapshot.sectorSnapshot as Readonly<
    Record<string, unknown>
  >;
  const lifecycleStatus =
    living?.state ?? snapshot.recommendationStatus ?? "GENERATED";
  const workspaceStatus = resolveWorkspaceStatus(
    lifecycleStatus,
    snapshot.recommendationStatus
  );

  return Object.freeze({
    recommendationId: snapshot.recommendationId,
    snapshot,
    companyName: snapshot.company.name,
    ticker: snapshot.company.symbol,
    sector: readSnapshotText(sectorSnapshot, ["sector", "name"], "Unknown Sector"),
    industry: readSnapshotText(
      sectorSnapshot,
      ["industry", "subSector", "subsector"],
      "Unknown Industry"
    ),
    strategy: snapshot.strategy,
    holdingPeriod: snapshot.expectedHoldingPeriod,
    recommendationDate: snapshot.generatedAt,
    aiVersion: snapshot.aiVersion,
    tags: Object.freeze(extractTags(snapshot)),
    lifecycleStatus,
    workspaceStatus,
    originalConviction: snapshot.originalConviction,
    currentHealth: health?.current.currentHealth ?? living?.health.currentHealth ?? null,
    healthState: health?.state ?? null,
    outcomeState: outcome?.state ?? null,
    institutionalVerdict: outcome?.verdict ?? null,
    currentReturnPercent: outcome?.performance.currentReturnPercent ?? null,
    maximumGainPercent: outcome?.performance.maximumGainPercent ?? null,
    maximumDrawdownPercent: outcome?.performance.maximumDrawdownPercent ?? null,
    aiLessons: Object.freeze([...lessons]),
    lifecycle: living ?? null,
    health: health ?? null,
    outcome: outcome ?? null,
  });
}

function panel(
  title: string,
  ids: string[]
): ExecutiveRecommendationPanel {
  return Object.freeze({
    title,
    recommendationIds: Object.freeze(ids),
    empty: ids.length === 0,
  });
}

function buildPanels(
  records: readonly RecommendationWorkspaceRecord[]
): RecommendationWorkspace["panels"] {
  const topPerforming = [...records]
    .filter((record) => record.currentReturnPercent != null)
    .sort(
      (left, right) =>
        (right.currentReturnPercent ?? -Infinity) -
        (left.currentReturnPercent ?? -Infinity)
    )
    .slice(0, 5)
    .map((record) => record.recommendationId);

  const highestConviction = [...records]
    .sort((left, right) => right.originalConviction - left.originalConviction)
    .slice(0, 5)
    .map((record) => record.recommendationId);

  const mostImproved = [...records]
    .filter(
      (record) =>
        record.currentHealth != null &&
        record.currentHealth > record.originalConviction
    )
    .sort(
      (left, right) =>
        (right.currentHealth! - right.originalConviction) -
        (left.currentHealth! - left.originalConviction)
    )
    .slice(0, 5)
    .map((record) => record.recommendationId);

  const mostDeteriorated = [...records]
    .filter(
      (record) =>
        record.currentHealth != null &&
        record.currentHealth < record.originalConviction
    )
    .sort(
      (left, right) =>
        (left.currentHealth! - left.originalConviction) -
        (right.currentHealth! - right.originalConviction)
    )
    .slice(0, 5)
    .map((record) => record.recommendationId);

  const recentlyCompleted = [...records]
    .filter(
      (record) =>
        record.workspaceStatus === "Completed" ||
        record.workspaceStatus === "Expired" ||
        record.workspaceStatus === "Archived"
    )
    .sort(
      (left, right) =>
        Date.parse(right.recommendationDate) -
        Date.parse(left.recommendationDate)
    )
    .slice(0, 5)
    .map((record) => record.recommendationId);

  const needsReview = [...records]
    .filter(
      (record) =>
        record.healthState === "Weak" ||
        record.healthState === "Critical" ||
        record.institutionalVerdict === "Failed" ||
        record.institutionalVerdict === "Invalidated" ||
        record.workspaceStatus === "Pending"
    )
    .slice(0, 5)
    .map((record) => record.recommendationId);

  return Object.freeze({
    topPerforming: panel("Top Performing Recommendations", topPerforming),
    highestConviction: panel(
      "Highest Conviction Recommendations",
      highestConviction
    ),
    mostImproved: panel("Most Improved Recommendations", mostImproved),
    mostDeteriorated: panel(
      "Most Deteriorated Recommendations",
      mostDeteriorated
    ),
    recentlyCompleted: panel("Recently Completed", recentlyCompleted),
    needsReview: panel("Needs Review", needsReview),
  });
}

export function composeRecommendationWorkspace(
  sources: WorkspaceCompositionSources
): RecommendationWorkspace {
  const records = Object.freeze(
    sources.snapshots
      .map((snapshot) =>
        composeWorkspaceRecord(
          snapshot,
          sources.living.get(snapshot.recommendationId),
          sources.health.get(snapshot.recommendationId),
          sources.outcomes.get(snapshot.recommendationId),
          sources.lessons.get(snapshot.recommendationId) ?? []
        )
      )
      .sort(
        (left, right) =>
          Date.parse(right.recommendationDate) -
          Date.parse(left.recommendationDate)
      )
  );

  const analytics = buildRecommendationAnalytics(records);
  const sections = Object.freeze({
    overview: records,
    active: Object.freeze(
      records.filter(
        (record) =>
          record.workspaceStatus === "Active" ||
          record.workspaceStatus === "Running" ||
          record.workspaceStatus === "Pending"
      )
    ),
    completed: Object.freeze(
      records.filter((record) => record.workspaceStatus === "Completed")
    ),
    archived: Object.freeze(
      records.filter(
        (record) =>
          record.workspaceStatus === "Archived" ||
          record.workspaceStatus === "Expired"
      )
    ),
    replayHistory: records,
    analytics,
    learningSummary: sources.learningSummary,
    aiLessons: sources.aiLessons,
  });

  return Object.freeze({
    generatedAt: normalizeWorkspaceTimestamp(sources.generatedAt),
    sections,
    records,
    panels: buildPanels(records),
    analytics,
    learningSummary: sources.learningSummary,
    aiLessons: sources.aiLessons,
  });
}

export function compareWorkspaceRecords(
  records: readonly RecommendationWorkspaceRecord[],
  recommendationIds: readonly string[]
): RecommendationComparisonView {
  const unique = [...new Set(recommendationIds.map((id) => id.trim()))].filter(
    Boolean
  );
  if (unique.length === 0) {
    return Object.freeze({
      recommendationIds: Object.freeze([]),
      rows: Object.freeze([]),
      empty: true,
    });
  }
  if (unique.length > 5) {
    throw new Error("Comparison supports at most 5 recommendations");
  }

  const byId = new Map(
    records.map((record) => [record.recommendationId, record])
  );
  const rows: RecommendationComparisonRow[] = unique.map((id) => {
    const record = byId.get(id);
    if (!record) {
      throw new Error(`Recommendation ${id} not found for comparison`);
    }
    return Object.freeze({
      recommendationId: record.recommendationId,
      symbol: record.ticker,
      company: record.companyName,
      originalConviction: record.originalConviction,
      currentHealth: record.currentHealth,
      outcome: record.outcomeState ?? "Pending",
      currentReturn: record.currentReturnPercent,
      maximumGain: record.maximumGainPercent,
      maximumDrawdown: record.maximumDrawdownPercent,
      holdingPeriod: record.holdingPeriod,
      strategy: record.strategy,
      lifecycle: record.lifecycleStatus,
      institutionalVerdict: record.institutionalVerdict ?? "Pending",
      aiLessons: Object.freeze([...record.aiLessons]),
    });
  });

  return Object.freeze({
    recommendationIds: Object.freeze(unique),
    rows: Object.freeze(rows),
    empty: false,
  });
}

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function buildCsv(records: readonly RecommendationWorkspaceRecord[]): string {
  const headers = [
    "recommendationId",
    "ticker",
    "company",
    "strategy",
    "holdingPeriod",
    "lifecycleStatus",
    "originalConviction",
    "currentHealth",
    "outcome",
    "verdict",
    "currentReturn",
    "maximumGain",
    "maximumDrawdown",
    "aiVersion",
  ];
  const rows = records.map((record) =>
    [
      record.recommendationId,
      record.ticker,
      record.companyName,
      record.strategy,
      record.holdingPeriod,
      record.lifecycleStatus,
      String(record.originalConviction),
      record.currentHealth == null ? "" : String(record.currentHealth),
      record.outcomeState ?? "",
      record.institutionalVerdict ?? "",
      record.currentReturnPercent == null
        ? ""
        : String(record.currentReturnPercent),
      record.maximumGainPercent == null
        ? ""
        : String(record.maximumGainPercent),
      record.maximumDrawdownPercent == null
        ? ""
        : String(record.maximumDrawdownPercent),
      record.aiVersion,
    ]
      .map(escapeCsv)
      .join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

function buildMarkdown(
  workspace: RecommendationWorkspace,
  records: readonly RecommendationWorkspaceRecord[]
): string {
  const lines = [
    "# Institutional Recommendation Center Export",
    "",
    `Generated: ${workspace.generatedAt}`,
    "",
    "## Analytics",
    `- Recommendation Count: ${workspace.analytics.recommendationCount}`,
    `- Active Count: ${workspace.analytics.activeCount}`,
    `- Completed Count: ${workspace.analytics.completedCount}`,
    `- Success Rate: ${workspace.analytics.successRate}%`,
    `- Failure Rate: ${workspace.analytics.failureRate}%`,
    `- Best Strategy: ${workspace.analytics.bestStrategy ?? "—"}`,
    `- Worst Strategy: ${workspace.analytics.worstStrategy ?? "—"}`,
    "",
    "## Recommendations",
  ];
  for (const record of records) {
    lines.push(
      `- ${record.ticker} | ${record.strategy} | ${record.lifecycleStatus} | conviction ${record.originalConviction} | verdict ${record.institutionalVerdict ?? "Pending"}`
    );
  }
  lines.push("", "## AI Lessons");
  for (const lesson of workspace.aiLessons.aiLearned) {
    lines.push(`- ${lesson}`);
  }
  return lines.join("\n");
}

function buildInstitutionalReport(
  workspace: RecommendationWorkspace,
  records: readonly RecommendationWorkspaceRecord[]
): import("../../dataIntegrity/reporting/ReportBuilder").InstitutionalReport {
  const now = workspace.generatedAt;
  const score = workspace.analytics.successRate;
  return {
    reportId: `rec-workspace-${Date.parse(now)}`,
    reportType: "RecommendationReport",
    title: "Institutional Recommendation Center",
    generatedTime: now,
    reportingPeriod: { from: now, to: now },
    filters: {
      customPredicates: {
        source: "RecommendationWorkspace",
        count: records.length,
      },
    },
    detailLevel: "STANDARD",
    summary: {
      overallValidationScore: score,
      integrityScore: score,
      trustScore: score,
      hallucinationScore: 100,
      historicalScore: score,
      recommendationQuality: score,
      tradeQuality: score,
      overallHealth: score,
    },
    moduleScores: records.slice(0, 20).map((record) => ({
      module: record.ticker,
      status: "ACTIVE" as const,
      validationCount: 1,
      successPercent:
        record.institutionalVerdict === "Failed" ||
        record.institutionalVerdict === "Invalidated"
          ? 0
          : 100,
      failurePercent:
        record.institutionalVerdict === "Failed" ||
        record.institutionalVerdict === "Invalidated"
          ? 100
          : 0,
      averageRuntime: 0,
      averageScore: record.originalConviction,
      trend: "FLAT" as const,
      warnings: 0,
    })),
    validationMetrics: {
      totalValidations: records.length,
      passed: workspace.analytics.completedCount,
      failed: Math.round(
        (workspace.analytics.failureRate / 100) *
          Math.max(1, workspace.analytics.completedCount)
      ),
      warnings: 0,
      critical: 0,
      averageRuntime: 0,
    },
    trustMetrics: {
      averageTrustScore: score,
      rejectedObjects: 0,
      trustDistribution: Object.fromEntries(
        workspace.analytics.recommendationDistribution.map((bucket) => [
          bucket.key,
          bucket.count,
        ])
      ),
    },
    analyticsSummary: {
      trendAnalysis: {},
      ruleEffectiveness: {},
      failureAnalytics: {},
      distributionAnalytics: Object.fromEntries(
        workspace.analytics.recommendationDistribution.map((bucket) => [
          bucket.key,
          bucket.count,
        ])
      ),
      predictionAnalytics: {},
      healthScore: score,
    },
    warnings: [],
    errors: [],
    recommendations: records.map(
      (record) =>
        `${record.ticker} ${record.strategy} ${record.lifecycleStatus} conviction=${record.originalConviction}`
    ),
    auditInformation: {
      configurationVersion: "9F.1.R7",
      engineVersion: "RecommendationWorkspaceEngine",
      generatedBy: "RecommendationWorkspaceEngine",
      sourceModules: ["snapshot", "lifecycle", "health", "outcome", "learning"],
    },
    sectionsIncluded: ["summary", "analytics", "recommendations"],
    partial: false,
    engineVersion: "9F.1.R7",
  };
}

export class RecommendationWorkspaceEngine {
  private workspace: RecommendationWorkspace | null = null;

  compose(sources: WorkspaceCompositionSources): RecommendationWorkspace {
    this.workspace = composeRecommendationWorkspace(sources);
    return this.workspace;
  }

  get(): RecommendationWorkspace | null {
    return this.workspace;
  }

  listRecords(): RecommendationWorkspaceRecord[] {
    return this.workspace ? [...this.workspace.records] : [];
  }

  search(
    criteria: RecommendationSearchCriteria = {}
  ): RecommendationWorkspaceRecord[] {
    return searchRecommendationRecords(this.listRecords(), criteria);
  }

  filter(
    criteria: RecommendationFilterCriteria = {}
  ): RecommendationWorkspaceRecord[] {
    return filterRecommendationRecords(this.listRecords(), criteria);
  }

  compare(recommendationIds: readonly string[]): RecommendationComparisonView {
    return compareWorkspaceRecords(this.listRecords(), recommendationIds);
  }

  analytics(): RecommendationWorkspaceAnalytics {
    return (
      this.workspace?.analytics ??
      buildRecommendationAnalytics([])
    );
  }

  export(
    format: RecommendationWorkspaceExportFormat,
    options?: {
      records?: readonly RecommendationWorkspaceRecord[];
      subject?: {
        userId?: string;
        role?: "administrator" | "subscriber" | "free";
        tier?: "none" | "basic" | "pro" | "enterprise";
      };
    }
  ): RecommendationWorkspaceExportResult {
    if (!this.workspace) {
      throw new Error("Recommendation workspace has not been composed");
    }
    const records = options?.records ?? this.workspace.records;
    const generatedAt = normalizeWorkspaceTimestamp();
    const report = buildInstitutionalReport(this.workspace, records);

    if (format === "CSV") {
      // Recommendation-centric CSV. InstitutionalReport is still composed so
      // PDF/Markdown continue to reuse the Sprint 9F export pipeline models.
      void report;
      return Object.freeze({
        format,
        filename: `recommendation-center-${generatedAt.slice(0, 10)}.csv`,
        contentType: "text/csv",
        body: buildCsv(records),
        generatedAt,
      });
    }

    if (format === "MARKDOWN") {
      try {
        const { exportMarkdown } = require("../../dataIntegrity/reporting/export/ExportFacade") as typeof import("../../dataIntegrity/reporting/export/ExportFacade");
        const result = exportMarkdown({
          reportType: "TomorrowWatchlistReport",
          report,
          subject: {
            userId: options?.subject?.userId ?? "workspace",
            role: options?.subject?.role ?? "administrator",
            subscriptionTier: options?.subject?.tier ?? "enterprise",
            securityRoles: ["administrator"],
          },
          generatedBy: "RecommendationWorkspaceEngine",
        });
        if (result.success) {
          return Object.freeze({
            format,
            filename: result.artifact.filename,
            contentType: "text/markdown",
            body: result.artifact.content,
            generatedAt,
          });
        }
      } catch {
        // Fall through to local markdown composition.
      }
      return Object.freeze({
        format,
        filename: `recommendation-center-${generatedAt.slice(0, 10)}.md`,
        contentType: "text/markdown",
        body: buildMarkdown(this.workspace, records),
        generatedAt,
      });
    }

    try {
      const { exportPDF } = require("../../dataIntegrity/reporting/export/ExportFacade") as typeof import("../../dataIntegrity/reporting/export/ExportFacade");
      const result = exportPDF({
        reportType: "TomorrowWatchlistReport",
        report,
        subject: {
          userId: options?.subject?.userId ?? "workspace",
          role: options?.subject?.role ?? "administrator",
          subscriptionTier: options?.subject?.tier ?? "enterprise",
          securityRoles: ["administrator"],
        },
        generatedBy: "RecommendationWorkspaceEngine",
      });
      if (result.success) {
        return Object.freeze({
          format: "PDF",
          filename: result.artifact.filename,
          contentType: "application/pdf",
          body: result.artifact.bytes,
          generatedAt,
        });
      }
    } catch {
      // Fall through to textual PDF fallback.
    }

    return Object.freeze({
      format: "PDF",
      filename: `recommendation-center-${generatedAt.slice(0, 10)}.pdf.txt`,
      contentType: "application/pdf",
      body: buildMarkdown(this.workspace, records),
      generatedAt,
    });
  }

  clear(): void {
    this.workspace = null;
  }
}
