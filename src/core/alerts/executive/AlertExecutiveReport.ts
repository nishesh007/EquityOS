/**
 * Alert Executive Report — report viewer + Markdown via Sprint 9F export (9C.R8).
 */

import { ReportBuilder } from "../../dataIntegrity/reporting/ReportBuilder";
import { DEFAULT_EXPORT_CONFIGURATION } from "../../dataIntegrity/reporting/export/ExportConfiguration";
import { MarkdownExporter } from "../../dataIntegrity/reporting/export/MarkdownExporter";
import { ExportAccessControl } from "../../dataIntegrity/reporting/export/ExportAccessControl";
import type { ExportAccessSubject } from "../../dataIntegrity/reporting/export/ExportAccessControl";
import type { CenterAlert } from "../center/AlertCenterModels";
import {
  EXECUTIVE_EMPTY,
  safeExecutiveText,
  type AlertHealthView,
  type ExecutiveAnalytics,
  type ExecutiveOverview,
  type ExecutiveReportView,
  type ReportSectionView,
} from "./AlertExecutiveModels";
import type { AlertExecutiveMetricBundle } from "./AlertExecutiveMetrics";

export interface ExecutiveExportResult {
  ok: boolean;
  format: "MARKDOWN" | "PDF" | "EXCEL" | "PRINT";
  content: string;
  filename: string;
  deniedReason: string;
}

export class AlertExecutiveReport {
  private readonly builder = new ReportBuilder();
  private readonly markdown = new MarkdownExporter(DEFAULT_EXPORT_CONFIGURATION);
  private readonly acl = new ExportAccessControl(DEFAULT_EXPORT_CONFIGURATION);

  buildView(
    overview: ExecutiveOverview,
    health: AlertHealthView,
    analytics: ExecutiveAnalytics,
    metrics: AlertExecutiveMetricBundle,
    options?: { now?: Date }
  ): ExecutiveReportView {
    const now = options?.now ?? new Date();
    if (overview.empty) {
      return {
        title: "Executive Alert Report",
        generatedAt: now.toISOString(),
        tableOfContents: [],
        sections: [],
        markdown: EXECUTIVE_EMPTY.noExecutiveSummary,
        printLayout: EXECUTIVE_EMPTY.noExecutiveSummary,
        empty: true,
        emptyMessage: EXECUTIVE_EMPTY.noExecutiveSummary,
      };
    }

    const sections: ReportSectionView[] = [
      {
        id: "overview",
        title: "Executive Overview",
        collapsed: false,
        body: overview.cards.map((c) => `${c.label}: ${c.value}`),
      },
      {
        id: "health",
        title: "Alert Health",
        collapsed: false,
        body: [
          `Overall Health: ${health.overallHealthLabel}`,
          `Resolution Rate: ${health.resolutionRateLabel}`,
          `Alert Velocity: ${health.alertVelocityLabel}`,
          `False Positive Rate: ${health.falsePositiveRateLabel}`,
          `Historical Success: ${health.historicalSuccessRateLabel}`,
        ],
      },
      {
        id: "analytics",
        title: "Executive Analytics",
        collapsed: false,
        body: analytics.empty
          ? [EXECUTIVE_EMPTY.noAnalytics]
          : [
              `Trend: ${analytics.trendLabel}`,
              ...analytics.topCompanies
                .slice(0, 5)
                .map((r) => `Company ${r.label}: ${r.count}`),
              ...analytics.mostFrequentCategories
                .slice(0, 5)
                .map((r) => `Category ${r.label}: ${r.count}`),
            ],
      },
      {
        id: "workspace",
        title: "Workspace Automation",
        collapsed: true,
        body: [
          `Rules Created: ${metrics.rulesCreated}`,
          `Rules Triggered: ${metrics.rulesTriggered}`,
          `Favorites: ${metrics.favorites}`,
          `Saved Views: ${metrics.savedViews}`,
        ],
      },
    ];

    const toc = sections.map((s) => s.title);
    const markdownBody = [
      `# Executive Alert Report`,
      ``,
      `Generated: ${now.toISOString()}`,
      ``,
      ...sections.flatMap((s) => [
        `## ${s.title}`,
        ``,
        ...s.body.map((line) => `- ${line}`),
        ``,
      ]),
    ].join("\n");

    const printLayout = [
      "EXECUTIVE ALERT REPORT",
      "======================",
      "",
      ...sections.flatMap((s) => [s.title.toUpperCase(), ...s.body, ""]),
    ].join("\n");

    return {
      title: "Executive Alert Report",
      generatedAt: now.toISOString(),
      tableOfContents: toc,
      sections,
      markdown: markdownBody,
      printLayout,
      empty: false,
      emptyMessage: EXECUTIVE_EMPTY.noExecutiveSummary,
    };
  }

  /** Export via Sprint 9F MarkdownExporter — ACL unchanged. */
  exportMarkdown(
    overview: ExecutiveOverview,
    health: AlertHealthView,
    analytics: ExecutiveAnalytics,
    metrics: AlertExecutiveMetricBundle,
    subject?: ExportAccessSubject,
    options?: { now?: Date }
  ): ExecutiveExportResult {
    const access = this.acl.canUserExport(
      subject ?? {
        userId: "executive-hub",
        role: "administrator",
        subscriptionTier: "enterprise",
      },
      "MARKDOWN"
    );
    if (!access.allowed) {
      return {
        ok: false,
        format: "MARKDOWN",
        content: "",
        filename: "",
        deniedReason: safeExecutiveText(access.reason, "Export denied"),
      };
    }

    const view = this.buildView(overview, health, analytics, metrics, options);
    const report = this.builder.build({
      reportType: "DashboardReport",
      title: "Executive Alert Report",
      detailLevel: "STANDARD",
      sectionsIncluded: ["summary", "analytics", "recommendations", "audit"],
      filters: { module: "alerts" },
      reportingPeriod: {
        from: view.generatedAt,
        to: view.generatedAt,
      },
      summary: {
        overallValidationScore: health.overallHealthScore,
        integrityScore: health.resolutionRate,
        trustScore: metrics.averageConfidence,
        hallucinationScore: Math.max(0, 100 - health.falsePositiveRate),
        historicalScore: health.historicalSuccessRate,
        recommendationQuality: metrics.averageConfidence,
        tradeQuality: metrics.highPriority,
        overallHealth: health.overallHealthScore,
      },
      moduleScores: [
        {
          module: "Alert Engine",
          status: overview.empty ? "IDLE" : "ACTIVE",
          validationCount: metrics.totalAlerts,
          successPercent: health.historicalSuccessRate,
          failurePercent: health.falsePositiveRate,
          averageRuntime: 0,
          averageScore: metrics.averageConfidence,
          trend: analytics.trendLabel.includes("Up")
            ? "UP"
            : analytics.trendLabel.includes("Down")
              ? "DOWN"
              : "FLAT",
          warnings: 0,
        },
      ],
      validationMetrics: {
        totalValidations: metrics.totalAlerts,
        passed: metrics.resolvedToday + metrics.archived,
        failed: metrics.critical,
        warnings: metrics.highPriority,
        critical: metrics.critical,
        averageRuntime: 0,
      },
      trustMetrics: {
        averageTrustScore: metrics.averageConfidence,
        rejectedObjects: 0,
        trustDistribution: {},
      },
      analyticsSummary: {
        trendAnalysis: { label: analytics.trendLabel },
        ruleEffectiveness: { triggered: metrics.rulesTriggered },
        failureAnalytics: { falsePositiveRate: health.falsePositiveRate },
        distributionAnalytics: {
          priority: health.priorityDistribution,
          category: health.categoryDistribution,
        },
        predictionAnalytics: {},
        healthScore: health.overallHealthScore,
      },
      audit: {
        validationHistory: [],
        recentEvents: [],
        criticalFailures: [],
        ruleViolations: [],
        trustChanges: [],
        configurationVersion: "9C.R8",
        engineVersion: "9C.R8.0",
      },
      warnings: [],
      errors: [],
      recommendations: analytics.highestConfidenceAlerts
        .slice(0, 3)
        .map((r) => r.label),
      engineVersion: "9C.R8.0",
    });

    const exported = this.markdown.export(report, {
      generatedBy: "Alert Executive Hub",
    });

    return {
      ok: true,
      format: "MARKDOWN",
      content: exported.content || view.markdown,
      filename: safeExecutiveText(exported.filename, "executive-alert-report.md"),
      deniedReason: "",
    };
  }

  exportPrintLayout(view: ExecutiveReportView): ExecutiveExportResult {
    return {
      ok: !view.empty,
      format: "PRINT",
      content: view.printLayout,
      filename: "executive-alert-report.txt",
      deniedReason: view.empty ? EXECUTIVE_EMPTY.noExecutiveSummary : "",
    };
  }

  summarizeAlerts(items: readonly CenterAlert[]): string[] {
    return items.slice(0, 10).map((item) => {
      const company = safeExecutiveText(
        item.alert.company,
        item.alert.ticker || "Unknown"
      );
      const title = safeExecutiveText(item.alert.title, "Alert");
      return `${company}: ${title} (${item.alert.priority})`;
    });
  }
}
