/**
 * Executive Research Presentation — report viewer + Sprint 9F export (10A.R8).
 */

import { ReportBuilder } from "../../../dataIntegrity/reporting/ReportBuilder";
import { DEFAULT_EXPORT_CONFIGURATION } from "../../../dataIntegrity/reporting/export/ExportConfiguration";
import { MarkdownExporter } from "../../../dataIntegrity/reporting/export/MarkdownExporter";
import { ExportAccessControl } from "../../../dataIntegrity/reporting/export/ExportAccessControl";
import type { ExportAccessSubject } from "../../../dataIntegrity/reporting/export/ExportAccessControl";
import type { ExportableFormat } from "../../../dataIntegrity/reporting/export/ExportConfiguration";
import {
  EXECUTIVE_RESEARCH_EMPTY,
  RESEARCH_WORKSPACE_STATUS,
  safeExecutiveResearchText,
  type ExecutiveResearchDashboardSummary,
  type ExecutiveResearchHealthView,
  type ExecutiveResearchOverview,
  type ExecutiveResearchReportView,
  type ExecutiveReportSection,
  type RankedResearchItem,
} from "./ExecutiveResearchModels";
import type { ExecutiveResearchMetricBundle } from "./ExecutiveResearchModels";

export interface ExecutiveResearchExportResult {
  ok: boolean;
  format: ExportableFormat | "PRINT";
  content: string;
  filename: string;
  deniedReason: string;
  previewOnly: boolean;
  upgradeRequired: boolean;
}

export interface ExecutivePresentationInput {
  overview: ExecutiveResearchOverview;
  health: ExecutiveResearchHealthView;
  metrics: ExecutiveResearchMetricBundle;
  dashboard: ExecutiveResearchDashboardSummary;
  recentCompanies: RankedResearchItem[];
  recentDecisions: RankedResearchItem[];
  pendingActions: RankedResearchItem[];
  now?: Date;
  previewMode?: boolean;
}

export class ExecutiveResearchPresentation {
  private readonly builder = new ReportBuilder();
  private readonly markdown = new MarkdownExporter(DEFAULT_EXPORT_CONFIGURATION);
  private readonly acl = new ExportAccessControl(DEFAULT_EXPORT_CONFIGURATION);

  buildReport(input: ExecutivePresentationInput): ExecutiveResearchReportView {
    const now = input.now ?? new Date();
    const previewMode = Boolean(input.previewMode);

    if (input.overview.empty) {
      return {
        title: "Executive Research Report",
        generatedAt: now.toISOString(),
        tableOfContents: [],
        sections: [],
        markdown: EXECUTIVE_RESEARCH_EMPTY.awaitingResearch,
        printLayout: EXECUTIVE_RESEARCH_EMPTY.awaitingResearch,
        previewMode,
        empty: true,
        emptyMessage: EXECUTIVE_RESEARCH_EMPTY.awaitingResearch,
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
        title: "Research Workspace Health",
        collapsed: false,
        body: input.health.layers.map(
          (l) => `${l.label}: ${l.scoreLabel} (${l.ready ? "ready" : "idle"})`
        ),
      },
      {
        id: "metrics",
        title: "Executive Metrics",
        collapsed: false,
        body: [
          `Companies Researched: ${input.metrics.labels.companiesResearched}`,
          `Reports Generated: ${input.metrics.labels.reportsGenerated}`,
          `Research Completion: ${input.metrics.labels.researchCompletion}`,
          `Average Conviction: ${input.metrics.labels.averageConviction}`,
          `Research Quality: ${input.metrics.labels.researchQuality}`,
          `Evidence Coverage: ${input.metrics.labels.evidenceCoverage}`,
          `Validation Coverage: ${input.metrics.labels.validationCoverage}`,
          `Trust Coverage: ${input.metrics.labels.trustCoverage}`,
        ],
      },
      {
        id: "dashboard",
        title: "Executive Dashboard",
        collapsed: true,
        body: [
          input.dashboard.timelineSummary,
          input.dashboard.recentAlerts,
          input.dashboard.recentEarnings,
          input.dashboard.recentScreens,
          input.dashboard.pendingTasks,
          input.dashboard.researchMemory,
          input.dashboard.knowledgeSummary,
        ],
      },
      {
        id: "companies",
        title: "Recent Companies",
        collapsed: true,
        body:
          input.recentCompanies.length === 0
            ? [EXECUTIVE_RESEARCH_EMPTY.noRecentCompanies]
            : input.recentCompanies
                .slice(0, 8)
                .map((r) => `${r.label}: ${r.scoreLabel} — ${r.detail}`),
      },
      {
        id: "decisions",
        title: "Recent Decisions",
        collapsed: true,
        body:
          input.recentDecisions.length === 0
            ? [EXECUTIVE_RESEARCH_EMPTY.noPendingActions]
            : input.recentDecisions
                .slice(0, 8)
                .map((r) => `${r.label}: ${r.detail}`),
      },
    ];

    const toc = sections.map((s) => s.title);
    const markdownBody = [
      `# Executive Research Report`,
      `Generated: ${now.toISOString()}`,
      `Sprint: ${RESEARCH_WORKSPACE_STATUS.version}`,
      "",
      ...sections.flatMap((s) => [
        `## ${s.title}`,
        ...s.body.map((line) => `- ${line}`),
        "",
      ]),
    ].join("\n");

    return {
      title: "Executive Research Report",
      generatedAt: now.toISOString(),
      tableOfContents: toc,
      sections,
      markdown: markdownBody,
      printLayout: markdownBody,
      previewMode,
      empty: false,
      emptyMessage: EXECUTIVE_RESEARCH_EMPTY.noCoverage,
    };
  }

  exportPrint(view: ExecutiveResearchReportView): ExecutiveResearchExportResult {
    return {
      ok: !view.empty,
      format: "PRINT",
      content: view.printLayout,
      filename: "executive-research-report.txt",
      deniedReason: view.empty ? EXECUTIVE_RESEARCH_EMPTY.awaitingResearch : "",
      previewOnly: view.previewMode,
      upgradeRequired: false,
    };
  }

  exportFormat(
    format: ExportableFormat,
    input: ExecutivePresentationInput,
    subject?: ExportAccessSubject
  ): ExecutiveResearchExportResult {
    const access = this.acl.canUserExport(
      subject ?? {
        userId: "executive-research-hub",
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
        deniedReason: safeExecutiveResearchText(access.reason, "Export denied"),
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
        filters: { module: "research" },
        reportingPeriod: {
          from: view.generatedAt,
          to: view.generatedAt,
        },
        summary: {
          overallValidationScore: input.metrics.validationCoverage,
          integrityScore: input.metrics.researchQuality,
          trustScore: input.metrics.trustCoverage,
          hallucinationScore: Math.max(0, 100 - input.metrics.averageConviction),
          historicalScore: input.health.overallHealthScore,
          recommendationQuality: input.metrics.researchQuality,
          tradeQuality: input.metrics.companiesResearched,
          overallHealth: input.health.overallHealthScore,
        },
        moduleScores: [
          {
            module: "Research Workspace",
            status: input.overview.empty ? "IDLE" : "ACTIVE",
            validationCount: input.metrics.timelineCount,
            successPercent: input.metrics.researchCompletion,
            failurePercent: Math.max(0, 100 - input.metrics.researchCompletion),
            averageRuntime: 0,
            averageScore: input.metrics.researchQuality,
            trend:
              input.metrics.companiesResearched > 0
                ? "UP"
                : input.metrics.openTabs > 0
                  ? "FLAT"
                  : "DOWN",
            warnings: 0,
          },
        ],
        validationMetrics: {
          totalValidations: input.metrics.timelineCount,
          passed: input.metrics.decisionCount,
          failed: Math.max(0, input.metrics.taskPending),
          warnings: 0,
          critical: 0,
          averageRuntime: 0,
        },
        trustMetrics: {
          averageTrustScore: input.metrics.trustCoverage,
          rejectedObjects: 0,
          trustDistribution: {},
        },
        analyticsSummary: {
          trendAnalysis: { companies: input.metrics.companiesResearched },
          ruleEffectiveness: { templates: input.metrics.templateCount },
          failureAnalytics: {},
          distributionAnalytics: {
            evidence: input.metrics.evidenceCount,
            coverage: input.metrics.evidenceCoverage,
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
          configurationVersion: RESEARCH_WORKSPACE_STATUS.version,
          engineVersion: RESEARCH_WORKSPACE_STATUS.version,
        },
        warnings: [],
        errors: [],
        recommendations: input.recentCompanies
          .slice(0, 3)
          .map((r) => r.label),
        engineVersion: RESEARCH_WORKSPACE_STATUS.version,
      });

      const exported = this.markdown.export(report, {
        generatedBy: "Executive Research Hub",
      });

      return {
        ok: true,
        format: "MARKDOWN",
        content: exported.content || view.markdown,
        filename: safeExecutiveResearchText(
          exported.filename,
          "executive-research-report.md"
        ),
        deniedReason: "",
        previewOnly: access.previewOnly || view.previewMode,
        upgradeRequired: access.upgradeRequired,
      };
    }

    return {
      ok: true,
      format,
      content: view.printLayout || view.markdown,
      filename:
        format === "PDF"
          ? "executive-research-report.pdf"
          : "executive-research-report.xlsx",
      deniedReason: "",
      previewOnly: access.previewOnly || view.previewMode,
      upgradeRequired: access.upgradeRequired,
    };
  }
}
