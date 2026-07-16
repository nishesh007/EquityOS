/**
 * Research recommendation engine (Sprint 10A.R6).
 * Immediate actions, monitor list, earnings/alerts/portfolio impact.
 */

import { safeWorkspaceText } from "../WorkspaceModels";
import { getCompanyWorkspaceView } from "../company/CompanyWorkspaceEngine";
import { getKnowledge } from "../knowledge/KnowledgeBaseEngine";
import { getWorkspaceInsights } from "../integration/WorkspaceInsightAggregator";
import { getResearchTimeline } from "../integration/ResearchTimelineEngine";
import {
  COPILOT_EMPTY,
  emptyRecommendations,
  normalizeLines,
  type ResearchRecommendationView,
} from "./CopilotPresentationModels";

export interface RecommendationInput {
  workspaceId?: string | null;
  ticker?: string | null;
  earningsLines?: string[] | null;
  alertLines?: string[] | null;
  portfolioLines?: string[] | null;
}

export function getResearchRecommendations(
  input?: RecommendationInput | null
): ResearchRecommendationView {
  try {
    const wid = input?.workspaceId
      ? safeWorkspaceText(input.workspaceId, "").toLowerCase()
      : null;
    const ticker = input?.ticker
      ? safeWorkspaceText(input.ticker, "").toUpperCase()
      : null;

    const company = getCompanyWorkspaceView(ticker);
    const insights = getWorkspaceInsights({ workspaceId: wid, ticker });
    const knowledge = getKnowledge({ workspaceId: wid ?? undefined, ticker });
    const timeline = getResearchTimeline({ workspaceId: wid ?? undefined, ticker });

    const immediateActions = normalizeLines([
      ...insights.recommendedActions,
      company.empty ? "" : `Review ${company.overview.aiRecommendation} stance`,
      knowledge.evidence.bull.length > knowledge.evidence.bear.length
        ? "Validate bull thesis with next earnings"
        : "Stress-test bear case assumptions",
    ]);

    const monitorList = normalizeLines([
      ...knowledge.evidence.catalysts.map((e) => e.summary),
      ...knowledge.evidence.risks.map((e) => e.summary),
      ...timeline.entries
        .filter((e) => e.kind === "alert_triggered")
        .map((e) => e.label),
    ]);

    const researchNext = normalizeLines([
      "Review decision journal entries",
      "Compare peer set valuation",
      ...knowledge.notes.map((n) => n.title),
      ...company.quickActions.map((a) => a.label),
    ]);

    const upcomingEarnings = normalizeLines([
      ...(input?.earningsLines ?? []),
      ...timeline.entries
        .filter((e) => e.kind === "earnings_released")
        .map((e) => e.label),
      ticker ? `Monitor earnings calendar · ${ticker}` : "",
    ]);

    const upcomingAlerts = normalizeLines([
      ...(input?.alertLines ?? []),
      ...timeline.entries
        .filter((e) => e.kind === "alert_triggered")
        .map((e) => e.label),
    ]);

    const portfolioImpact = normalizeLines([
      ...(input?.portfolioLines ?? []),
      ticker ? `Portfolio exposure review · ${ticker}` : "",
      "Check position sizing vs conviction",
    ]);

    const empty =
      immediateActions.length === 0 &&
      monitorList.length === 0 &&
      researchNext.length === 0;

    if (empty) {
      return emptyRecommendations(COPILOT_EMPTY.awaitingAnalysis);
    }

    return {
      immediateActions,
      monitorList,
      researchNext,
      upcomingEarnings,
      upcomingAlerts,
      portfolioImpact,
      empty: false,
      emptyMessage: COPILOT_EMPTY.awaitingAnalysis,
    };
  } catch {
    return emptyRecommendations(COPILOT_EMPTY.awaitingAnalysis);
  }
}
