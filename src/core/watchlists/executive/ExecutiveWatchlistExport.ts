/**
 * Executive Watchlist Export — Sprint 9F report pipeline (Sprint 10B.R8).
 */

import { ReportBuilder } from "@/src/core/dataIntegrity/reporting/ReportBuilder";
import { DEFAULT_EXPORT_CONFIGURATION } from "@/src/core/dataIntegrity/reporting/export/ExportConfiguration";
import { MarkdownExporter } from "@/src/core/dataIntegrity/reporting/export/MarkdownExporter";
import { ExportAccessControl } from "@/src/core/dataIntegrity/reporting/export/ExportAccessControl";
import type { ExportAccessSubject } from "@/src/core/dataIntegrity/reporting/export/ExportAccessControl";
import type { ExportableFormat } from "@/src/core/dataIntegrity/reporting/export/ExportConfiguration";
import {
  EXECUTIVE_WATCHLIST_EMPTY,
  WATCHLIST_PLATFORM_STATUS,
  safeExecutiveText,
  type ExecutiveReportSection,
  type ExecutiveWatchlistDashboardView,
  type ExecutiveWatchlistReportView,
} from "./ExecutiveWatchlistModels";

export interface ExecutiveWatchlistExportResult {
  ok: boolean;
  format: ExportableFormat | "PRINT";
  content: string;
  filename: string;
  deniedReason: string;
  previewOnly: boolean;
  upgradeRequired: boolean;
}

export class ExecutiveWatchlistExport {
  private readonly builder = new ReportBuilder();
  private readonly markdown = new MarkdownExporter(DEFAULT_EXPORT_CONFIGURATION);
  private readonly acl = new ExportAccessControl(DEFAULT_EXPORT_CONFIGURATION);

  buildReport(view: ExecutiveWatchlistDashboardView): ExecutiveWatchlistReportView {
    const now = new Date();
    if (view.empty) {
      return {
        title: "Executive Watchlist Report",
        generatedAt: now.toISOString(),
        executiveSummary: EXECUTIVE_WATCHLIST_EMPTY.noReports,
        sections: [],
        markdown: EXECUTIVE_WATCHLIST_EMPTY.noReports,
        printLayout: EXECUTIVE_WATCHLIST_EMPTY.noReports,
        empty: true,
        emptyMessage: EXECUTIVE_WATCHLIST_EMPTY.noReports,
      };
    }

    const sections: ExecutiveReportSection[] = [
      {
        id: "overview",
        title: "Executive Overview",
        body: view.overview.cards.map((c) => `${c.label}: ${c.value}`),
      },
      {
        id: "health",
        title: "Executive Health",
        body: [
          `Average Conviction: ${view.health.averageConviction}`,
          `Average Trust: ${view.health.averageTrust}`,
          `Average Validation: ${view.health.averageValidation}`,
          `Diversification: ${view.health.averageDiversification}`,
          `Overall: ${view.health.overallHealthLabel}`,
        ],
      },
      {
        id: "metrics",
        title: "Executive Metrics",
        body: Object.entries(view.metrics.labels).map(([k, v]) => `${k}: ${v}`),
      },
      {
        id: "panels",
        title: "Executive Panels",
        body: [
          ...view.panels.topOpportunities.map((p) => `Opportunity · ${p.label}: ${p.detail}`),
          ...view.panels.alertActivity.map((p) => `Alert · ${p.label}: ${p.detail}`),
        ],
      },
      {
        id: "timeline",
        title: "Executive Timeline",
        body: view.timeline.entries.slice(0, 10).map((e) => `${e.kind}: ${e.summary}`),
      },
    ];

    const executiveSummary = view.overview.cards
      .slice(0, 4)
      .map((c) => `${c.label} ${c.value}`)
      .join(" · ");

    const markdown = [
      "# Executive Watchlist Report",
      `Generated: ${now.toISOString()}`,
      `Sprint: ${WATCHLIST_PLATFORM_STATUS.version}`,
      "",
      executiveSummary,
      "",
      ...sections.flatMap((s) => [`## ${s.title}`, ...s.body.map((l) => `- ${l}`), ""]),
    ].join("\n");

    return {
      title: "Executive Watchlist Report",
      generatedAt: now.toISOString(),
      executiveSummary,
      sections,
      markdown,
      printLayout: markdown,
      empty: false,
      emptyMessage: EXECUTIVE_WATCHLIST_EMPTY.noReports,
    };
  }

  exportReport(
    format: ExportableFormat | "PRINT",
    view: ExecutiveWatchlistDashboardView,
    subject?: ExportAccessSubject
  ): ExecutiveWatchlistExportResult {
    const report = this.buildReport(view);

    if (format === "PRINT") {
      return {
        ok: !report.empty,
        format: "PRINT",
        content: report.printLayout,
        filename: "executive-watchlist-report.txt",
        deniedReason: report.empty ? EXECUTIVE_WATCHLIST_EMPTY.noReports : "",
        previewOnly: false,
        upgradeRequired: false,
      };
    }

    const access = this.acl.canUserExport(
      subject ?? {
        userId: "executive-watchlist-hub",
        role: "administrator",
        subscriptionTier: "enterprise",
      },
      format
    );

    if (!access.allowed) {
      return {
        ok: false,
        format,
        content: "",
        filename: "",
        deniedReason: safeExecutiveText(access.reason, "Export denied"),
        previewOnly: access.previewOnly,
        upgradeRequired: access.upgradeRequired,
      };
    }

    if (format === "MARKDOWN") {
      const built = this.builder.build({
        reportType: "DashboardReport",
        title: report.title,
        detailLevel: "STANDARD",
        sectionsIncluded: ["summary", "analytics", "recommendations"],
        filters: { module: "watchlist" },
        reportingPeriod: { from: report.generatedAt, to: report.generatedAt },
        summary: {
          overallValidationScore: view.health.averageValidation,
          integrityScore: view.health.overallHealthScore,
          trustScore: view.health.averageTrust,
          hallucinationScore: 0,
          historicalScore: view.metrics.averageWinRate,
          recommendationQuality: view.health.averageConviction,
          tradeQuality: view.metrics.uniqueCompanies,
          overallHealth: view.health.overallHealthScore,
        },
        moduleScores: [],
        validationMetrics: {
          totalValidations: view.metrics.totalCompanies,
          passed: view.metrics.uniqueCompanies,
          failed: 0,
          warnings: 0,
          critical: 0,
          averageRuntime: 0,
        },
        trustMetrics: {
          averageTrustScore: view.health.averageTrust,
          rejectedObjects: 0,
          trustDistribution: {},
        },
        analyticsSummary: {
          trendAnalysis: {},
          ruleEffectiveness: {},
          failureAnalytics: {},
          distributionAnalytics: {},
          predictionAnalytics: {},
          healthScore: view.health.overallHealthScore,
        },
        audit: {
          validationHistory: [],
          recentEvents: [],
          criticalFailures: [],
          ruleViolations: [],
          trustChanges: [],
          configurationVersion: WATCHLIST_PLATFORM_STATUS.version,
          engineVersion: WATCHLIST_PLATFORM_STATUS.version,
        },
        warnings: [],
        errors: [],
        recommendations: view.panels.topOpportunities.map((p) => p.label),
        engineVersion: WATCHLIST_PLATFORM_STATUS.version,
      });

      const exported = this.markdown.export(built, { generatedBy: "Executive Watchlist Hub" });
      return {
        ok: true,
        format: "MARKDOWN",
        content: exported.content || report.markdown,
        filename: safeExecutiveText(exported.filename, "executive-watchlist-report.md"),
        deniedReason: "",
        previewOnly: access.previewOnly,
        upgradeRequired: access.upgradeRequired,
      };
    }

    return {
      ok: true,
      format,
      content: report.printLayout,
      filename:
        format === "PDF"
          ? "executive-watchlist-report.pdf"
          : "executive-watchlist-report.xlsx",
      deniedReason: "",
      previewOnly: access.previewOnly,
      upgradeRequired: access.upgradeRequired,
    };
  }
}

export function exportExecutiveWatchlistReport(
  format: ExportableFormat | "PRINT",
  view: ExecutiveWatchlistDashboardView,
  subject?: ExportAccessSubject
): ExecutiveWatchlistExportResult {
  return new ExecutiveWatchlistExport().exportReport(format, view, subject);
}
