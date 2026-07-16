/**
 * Executive Research Overview — summary cards from metrics + health (10A.R8).
 */

import {
  EXECUTIVE_RESEARCH_EMPTY,
  formatCount,
  formatPct,
  formatScore,
  safeNumeric,
  type ExecutiveResearchOverview,
  type ExecutiveResearchHealthView,
  type ExecutiveResearchMetricBundle,
  type ExecutiveSummaryCard,
} from "./ExecutiveResearchModels";

function presentHealthCard(
  id: string,
  label: string,
  value: number
): ExecutiveSummaryCard {
  const numeric = safeNumeric(value, 0);
  return {
    id,
    label,
    value: numeric > 0 ? formatScore(numeric) : "—",
    numeric,
  };
}

function presentCountCard(
  id: string,
  label: string,
  value: number
): ExecutiveSummaryCard {
  const numeric = safeNumeric(value, 0);
  return {
    id,
    label,
    value: formatCount(numeric),
    numeric,
  };
}

function presentPctCard(
  id: string,
  label: string,
  value: number
): ExecutiveSummaryCard {
  const numeric = safeNumeric(value, 0);
  return {
    id,
    label,
    value: numeric > 0 ? formatPct(numeric) : "—",
    numeric,
  };
}

export class ExecutiveResearchOverview {
  build(
    metrics: ExecutiveResearchMetricBundle,
    health: ExecutiveResearchHealthView
  ): ExecutiveResearchOverview {
    const empty = health.empty;
    const researchProgress = Math.min(
      100,
      Math.round(
        metrics.researchCompletion * 0.4 +
          metrics.researchQuality * 0.35 +
          health.overallHealthScore * 0.25
      )
    );
    const coverage = Math.min(
      100,
      Math.round(
        (metrics.evidenceCoverage +
          metrics.validationCoverage +
          metrics.trustCoverage) /
          3
      )
    );

    const cards = [
      presentHealthCard("workspace_health", "Workspace Health", health.overallHealthScore),
      presentPctCard("research_progress", "Research Progress", researchProgress),
      presentPctCard("coverage", "Coverage", coverage),
      presentCountCard("open_research", "Open Research", metrics.openTabs),
      presentCountCard("companies_researched", "Companies Researched", metrics.companiesResearched),
      presentCountCard("reports_generated", "Reports Generated", metrics.reportsGenerated),
      presentPctCard("research_completion", "Research Completion", metrics.researchCompletion),
      presentHealthCard("average_conviction", "Average Conviction", metrics.averageConviction),
      presentHealthCard("research_quality", "Research Quality", metrics.researchQuality),
      presentPctCard("evidence_coverage", "Evidence Coverage", metrics.evidenceCoverage),
      presentPctCard("validation_coverage", "Validation Coverage", metrics.validationCoverage),
      presentPctCard("trust_coverage", "Trust Coverage", metrics.trustCoverage),
      presentCountCard("pending_actions", "Pending Actions", metrics.taskPending),
      presentCountCard("recent_decisions", "Recent Decisions", metrics.decisionCount),
    ];

    return {
      workspaceHealth: health.overallHealthScore,
      researchProgress,
      coverage,
      openResearch: metrics.openTabs,
      recentCompanyCount: metrics.companiesResearched,
      recentDecisionCount: metrics.decisionCount,
      pendingActionCount: metrics.taskPending,
      cards,
      empty,
      emptyMessage: empty
        ? EXECUTIVE_RESEARCH_EMPTY.awaitingResearch
        : EXECUTIVE_RESEARCH_EMPTY.noCoverage,
    };
  }
}

export function getExecutiveResearchOverview(
  metrics: ExecutiveResearchMetricBundle,
  health: ExecutiveResearchHealthView
): ExecutiveResearchOverview {
  return new ExecutiveResearchOverview().build(metrics, health);
}
