/**
 * Executive Research Metrics — composed from R1–R7 surfaces (Sprint 10A.R8).
 * No research engine logic — aggregates façade metrics only.
 */

import { getWorkspaceMetrics } from "../WorkspaceMetrics";
import { getActiveWorkspace } from "../WorkspaceRegistry";
import { listOpenTabs } from "../layout/WorkspaceTabEngine";
import { getKnowledge } from "../knowledge/KnowledgeBaseEngine";
import { getResearchTimeline } from "../integration/ResearchTimelineEngine";
import { getDecisionJournal } from "../integration/DecisionJournalEngine";
import { getWorkspaceInsights } from "../integration/WorkspaceInsightAggregator";
import { generateResearchSummary } from "../copilot/ResearchSummaryEngine";
import { getWorkspaceAnalytics, getTasksView } from "../automation";
import { getTemplateView } from "../automation/WorkspaceTemplateEngine";
import { safeWorkspaceText } from "../WorkspaceModels";
import {
  formatCount,
  formatPct,
  formatScore,
  safeNumeric,
  safePct,
  type ExecutiveResearchMetricBundle,
} from "./ExecutiveResearchModels";

export interface ExecutiveMetricsComposeInput {
  workspaceId?: string | null;
  ticker?: string | null;
}

export class ExecutiveResearchMetrics {
  compute(input: ExecutiveMetricsComposeInput = {}): ExecutiveResearchMetricBundle {
    const active = getActiveWorkspace();
    const wid = input.workspaceId
      ? safeWorkspaceText(input.workspaceId, "").toLowerCase()
      : active?.id ?? null;
    const ticker = input.ticker
      ? safeWorkspaceText(input.ticker, "").toUpperCase()
      : null;

    const metrics = getWorkspaceMetrics();
    const tabs = wid ? listOpenTabs(wid) : [];
    const knowledge = getKnowledge({ workspaceId: wid ?? undefined, ticker });
    const timeline = getResearchTimeline({ workspaceId: wid, ticker });
    const decisions = getDecisionJournal({ workspaceId: wid, ticker });
    const insights = getWorkspaceInsights({ workspaceId: wid, ticker });
    const summary = generateResearchSummary({ workspaceId: wid, ticker });
    const analytics = getWorkspaceAnalytics({ workspaceId: wid });
    const tasks = getTasksView({ workspaceId: wid });
    const templates = getTemplateView({ workspaceId: wid });

    const companiesResearched = analytics.companiesResearched;
    const reportsGenerated = analytics.reportsGenerated || metrics.researchCount;
    const researchCompletion = analytics.completionRate;

    const decisionConfidences = decisions.entries
      .map((d) => d.confidence)
      .filter((c) => Number.isFinite(c) && c > 0);
    const averageConviction =
      decisionConfidences.length > 0
        ? Math.round(
            decisionConfidences.reduce((a, b) => a + b, 0) /
              decisionConfidences.length
          )
        : summary.empty
          ? 0
          : 65;

    const evidenceTotal = knowledge.evidence.items.length;
    const evidenceCoverage = Math.min(
      100,
      evidenceTotal * 12 + knowledge.notes.length * 4
    );

    const validationLines = timeline.entries.filter((e) =>
      e.kind.includes("validation")
    ).length;
    const trustLines = timeline.entries.filter((e) =>
      e.kind.includes("trust")
    ).length;
    const validationCoverage = Math.min(
      100,
      validationLines * 15 + (insights.topPositiveFactors.length > 0 ? 20 : 0)
    );
    const trustCoverage = Math.min(
      100,
      trustLines * 15 + (insights.recommendedActions.length > 0 ? 15 : 0)
    );

    const researchQuality = Math.min(
      100,
      Math.round(
        analytics.researchProductivity * 0.35 +
          evidenceCoverage * 0.25 +
          validationCoverage * 0.2 +
          trustCoverage * 0.2
      )
    );

    return {
      companiesResearched,
      reportsGenerated,
      researchCompletion,
      averageConviction,
      researchQuality,
      evidenceCoverage,
      validationCoverage,
      trustCoverage,
      openTabs: tabs.length,
      noteCount: knowledge.notes.length,
      evidenceCount: evidenceTotal,
      timelineCount: timeline.entries.length,
      decisionCount: decisions.entries.length,
      taskPending: tasks.pending.length,
      taskCompleted: tasks.completed.length,
      templateCount: templates.templates.length,
      labels: {
        companiesResearched: formatCount(companiesResearched),
        reportsGenerated: formatCount(reportsGenerated),
        researchCompletion: formatPct(researchCompletion),
        averageConviction: formatScore(averageConviction),
        researchQuality: formatScore(researchQuality),
        evidenceCoverage: formatPct(evidenceCoverage),
        validationCoverage: formatPct(validationCoverage),
        trustCoverage: formatPct(trustCoverage),
      },
    };
  }
}

export function getExecutiveResearchMetrics(
  input?: ExecutiveMetricsComposeInput | null
): ExecutiveResearchMetricBundle {
  return new ExecutiveResearchMetrics().compute(input ?? {});
}
