/**
 * Executive Screener Presentation — report viewer + Sprint 9F export (9D.R8).
 * Supports Executive Report, Markdown, Print, PDF, ACL, Subscriber, Preview.
 */

import { ReportBuilder } from "../../dataIntegrity/reporting/ReportBuilder";
import { DEFAULT_EXPORT_CONFIGURATION } from "../../dataIntegrity/reporting/export/ExportConfiguration";
import { MarkdownExporter } from "../../dataIntegrity/reporting/export/MarkdownExporter";
import { ExportAccessControl } from "../../dataIntegrity/reporting/export/ExportAccessControl";
import type { ExportAccessSubject } from "../../dataIntegrity/reporting/export/ExportAccessControl";
import type { ExportableFormat } from "../../dataIntegrity/reporting/export/ExportConfiguration";
import {
  EXECUTIVE_SCREENER_EMPTY,
  SPRINT_9D_STATUS,
  safeExecutiveScreenerText,
  type ExecutiveScreenerOverview,
  type ExecutiveScreenerReportView,
  type ExecutiveReportSection,
  type RankedScreenerItem,
  type ScreenerHealthView,
  type SectorRotationSummary,
} from "./ExecutiveScreenerModels";
import type { ExecutiveScreenerMetricBundle } from "./ExecutiveMetrics";

export interface ExecutiveScreenerExportResult {
  ok: boolean;
  format: ExportableFormat | "PRINT";
  content: string;
  filename: string;
  deniedReason: string;
  previewOnly: boolean;
  upgradeRequired: boolean;
}

export interface ExecutivePresentationInput {
  overview: ExecutiveScreenerOverview;
  health: ScreenerHealthView;
  metrics: ExecutiveScreenerMetricBundle;
  topInstitutionalIdeas: RankedScreenerItem[];
  topStrategies: RankedScreenerItem[];
  topSavedScreens: RankedScreenerItem[];
  recentDiscoveries: RankedScreenerItem[];
  sectorRotation: SectorRotationSummary;
  now?: Date;
  previewMode?: boolean;
}

export class ExecutivePresentation {
  private readonly builder = new ReportBuilder();
  private readonly markdown = new MarkdownExporter(DEFAULT_EXPORT_CONFIGURATION);
  private readonly acl = new ExportAccessControl(DEFAULT_EXPORT_CONFIGURATION);

  buildReport(input: ExecutivePresentationInput): ExecutiveScreenerReportView {
    const now = input.now ?? new Date();
    const previewMode = Boolean(input.previewMode);

    if (input.overview.empty) {
      return {
        title: "Executive Screener Report",
        generatedAt: now.toISOString(),
        tableOfContents: [],
        sections: [],
        markdown: EXECUTIVE_SCREENER_EMPTY.awaitingScan,
        printLayout: EXECUTIVE_SCREENER_EMPTY.awaitingScan,
        previewMode,
        empty: true,
        emptyMessage: EXECUTIVE_SCREENER_EMPTY.awaitingScan,
      };
    }

    const sections: ExecutiveReportSection[] = [
      {
        id: "overview",
        title: "Executive Overview",
        collapsed: false,
        body: input.overview.cards.map((c) => `${c.label}: ${c.value}`),
      },
      {
        id: "health",
        title: "Overall Screener Health",
        collapsed: false,
        body: [
          `Overall Health: ${input.health.overallHealthLabel}`,
          `Institutional Score: ${input.health.institutionalScoreLabel}`,
          `Universe Coverage: ${input.health.universeCoverageLabel}`,
          `Screen Success Rate: ${input.health.screenSuccessRateLabel}`,
          `Average Trust: ${input.health.averageTrustLabel}`,
          `Average Validation: ${input.health.averageValidationLabel}`,
          `AI Confidence: ${input.health.aiConfidenceLabel}`,
        ],
      },
      {
        id: "ideas",
        title: "Top Institutional Ideas",
        collapsed: false,
        body:
          input.topInstitutionalIdeas.length === 0
            ? [EXECUTIVE_SCREENER_EMPTY.noOpportunities]
            : input.topInstitutionalIdeas
                .slice(0, 8)
                .map((r) => `${r.label}: ${r.scoreLabel} — ${r.detail}`),
      },
      {
        id: "strategies",
        title: "Top Strategies",
        collapsed: true,
        body:
          input.topStrategies.length === 0
            ? [EXECUTIVE_SCREENER_EMPTY.noSavedStrategies]
            : input.topStrategies
                .slice(0, 8)
                .map((r) => `${r.label}: ${r.scoreLabel}`),
      },
      {
        id: "saved",
        title: "Top Saved Screens",
        collapsed: true,
        body:
          input.topSavedScreens.length === 0
            ? [EXECUTIVE_SCREENER_EMPTY.noScreeningResults]
            : input.topSavedScreens
                .slice(0, 8)
                .map((r) => `${r.label}: ${r.scoreLabel}`),
      },
      {
        id: "sectors",
        title: "Sector Rotation Summary",
        collapsed: true,
        body: input.sectorRotation.empty
          ? [input.sectorRotation.emptyMessage]
          : [
              input.sectorRotation.summary,
              ...input.sectorRotation.leaders
                .slice(0, 5)
                .map((r) => `Leader ${r.label}: ${r.scoreLabel}`),
            ],
      },
      {
        id: "metrics",
        title: "Platform Metrics",
        collapsed: true,
        body: [
          `Runs: ${input.metrics.labels.runs}`,
          `Matches: ${input.metrics.labels.matches}`,
          `History: ${input.metrics.historyCount}`,
          `Research bridges: ${input.metrics.researchCount}`,
          `Sprint: ${SPRINT_9D_STATUS.version} · frozen=${SPRINT_9D_STATUS.frozen}`,
        ],
      },
    ];

    const toc = sections.map((s) => s.title);
    const title = previewMode
      ? "Executive Screener Report (Preview)"
      : "Executive Screener Report";

    const markdownBody = [
      `# ${title}`,
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
      title.toUpperCase(),
      "===========================",
      "",
      ...sections.flatMap((s) => [s.title.toUpperCase(), ...s.body, ""]),
    ].join("\n");

    return {
      title,
      generatedAt: now.toISOString(),
      tableOfContents: toc,
      sections,
      markdown: markdownBody,
      printLayout,
      previewMode,
      empty: false,
      emptyMessage: EXECUTIVE_SCREENER_EMPTY.noScreeningResults,
    };
  }

  /** ACL-aware markdown export via Sprint 9F. */
  exportMarkdown(
    input: ExecutivePresentationInput,
    subject?: ExportAccessSubject
  ): ExecutiveScreenerExportResult {
    return this.exportFormat("MARKDOWN", input, subject);
  }

  exportPrint(view: ExecutiveScreenerReportView): ExecutiveScreenerExportResult {
    return {
      ok: !view.empty,
      format: "PRINT",
      content: view.printLayout,
      filename: "executive-screener-report.txt",
      deniedReason: view.empty ? EXECUTIVE_SCREENER_EMPTY.awaitingScan : "",
      previewOnly: view.previewMode,
      upgradeRequired: false,
    };
  }

  exportPdf(
    input: ExecutivePresentationInput,
    subject?: ExportAccessSubject
  ): ExecutiveScreenerExportResult {
    return this.exportFormat("PDF", input, subject);
  }

  exportFormat(
    format: ExportableFormat,
    input: ExecutivePresentationInput,
    subject?: ExportAccessSubject
  ): ExecutiveScreenerExportResult {
    const access = this.acl.canUserExport(
      subject ?? {
        userId: "executive-screener-hub",
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
        deniedReason: safeExecutiveScreenerText(access.reason, "Export denied"),
        previewOnly: access.previewOnly,
        upgradeRequired: access.upgradeRequired,
      };
    }

    const view = this.buildReport({
      ...input,
      previewMode: input.previewMode ?? access.previewOnly,
    });

    if (format === "PRINT") {
      return this.exportPrint(view);
    }

    if (format === "MARKDOWN") {
      const report = this.builder.build({
        reportType: "DashboardReport",
        title: view.title,
        detailLevel: "STANDARD",
        sectionsIncluded: ["summary", "analytics", "recommendations", "audit"],
        filters: { module: "screener" },
        reportingPeriod: {
          from: view.generatedAt,
          to: view.generatedAt,
        },
        summary: {
          overallValidationScore: input.health.averageValidation,
          integrityScore: input.health.screenSuccessRate,
          trustScore: input.health.averageTrust,
          hallucinationScore: Math.max(0, 100 - input.health.aiConfidence),
          historicalScore: input.health.overallHealthScore,
          recommendationQuality: input.metrics.institutionalScore,
          tradeQuality: input.metrics.highConvictionCount,
          overallHealth: input.health.overallHealthScore,
        },
        moduleScores: [
          {
            module: "AI Screener",
            status: input.overview.empty ? "IDLE" : "ACTIVE",
            validationCount: input.metrics.runs,
            successPercent: input.health.screenSuccessRate,
            failurePercent: Math.max(
              0,
              100 - input.health.screenSuccessRate
            ),
            averageRuntime: 0,
            averageScore: input.metrics.institutionalScore,
            trend:
              input.metrics.opportunityCount > 0
                ? "UP"
                : input.metrics.runs > 0
                  ? "FLAT"
                  : "DOWN",
            warnings: 0,
          },
        ],
        validationMetrics: {
          totalValidations: input.metrics.runs,
          passed: input.metrics.matches,
          failed: Math.max(0, input.metrics.symbolsScanned - input.metrics.matches),
          warnings: 0,
          critical: 0,
          averageRuntime: 0,
        },
        trustMetrics: {
          averageTrustScore: input.health.averageTrust,
          rejectedObjects: 0,
          trustDistribution: {},
        },
        analyticsSummary: {
          trendAnalysis: { opportunities: input.metrics.opportunityCount },
          ruleEffectiveness: { strategies: input.metrics.strategyCount },
          failureAnalytics: {},
          distributionAnalytics: {
            themes: input.metrics.themeCount,
            coverage: input.health.universeCoverage,
          },
          predictionAnalytics: {},
          healthScore: input.health.overallHealthScore,
        },
        audit: {
          validationHistory: [],
          recentEvents: [],
          criticalFailures: [],
          ruleViolations: [],
          trustChanges: [],
          configurationVersion: SPRINT_9D_STATUS.version,
          engineVersion: SPRINT_9D_STATUS.version,
        },
        warnings: [],
        errors: [],
        recommendations: input.topInstitutionalIdeas
          .slice(0, 3)
          .map((r) => r.label),
        engineVersion: SPRINT_9D_STATUS.version,
      });

      const exported = this.markdown.export(report, {
        generatedBy: "Executive AI Screener Hub",
      });

      return {
        ok: true,
        format: "MARKDOWN",
        content: exported.content || view.markdown,
        filename: safeExecutiveScreenerText(
          exported.filename,
          "executive-screener-report.md"
        ),
        deniedReason: "",
        previewOnly: access.previewOnly || view.previewMode,
        upgradeRequired: access.upgradeRequired,
      };
    }

    // PDF / EXCEL — ACL-gated; serve print/markdown body as institutional preview payload
    return {
      ok: true,
      format,
      content: view.printLayout || view.markdown,
      filename:
        format === "PDF"
          ? "executive-screener-report.pdf"
          : "executive-screener-report.xlsx",
      deniedReason: "",
      previewOnly: access.previewOnly || view.previewMode,
      upgradeRequired: access.upgradeRequired,
    };
  }
}
