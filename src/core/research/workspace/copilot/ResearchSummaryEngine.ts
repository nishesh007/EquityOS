/**
 * Research summary engine (Sprint 10A.R6).
 * One-page executive summary from composed workspace bags.
 */

import { safeWorkspaceText } from "../WorkspaceModels";
import { getKnowledge } from "../knowledge/KnowledgeBaseEngine";
import { getCompanyWorkspaceView } from "../company/CompanyWorkspaceEngine";
import { getWorkspaceInsights } from "../integration/WorkspaceInsightAggregator";
import {
  COPILOT_EMPTY,
  emptyResearchSummary,
  normalizeLines,
  type ResearchSummaryView,
} from "./CopilotPresentationModels";

export interface GenerateSummaryInput {
  workspaceId?: string | null;
  ticker?: string | null;
  sector?: string | null;
}

export function generateResearchSummary(
  input?: GenerateSummaryInput | null
): ResearchSummaryView {
  try {
    const wid = input?.workspaceId
      ? safeWorkspaceText(input.workspaceId, "").toLowerCase()
      : null;
    const ticker = input?.ticker
      ? safeWorkspaceText(input.ticker, "").toUpperCase()
      : null;

    const knowledge = getKnowledge({ workspaceId: wid ?? undefined, ticker });
    const company = getCompanyWorkspaceView(ticker);
    const insights = getWorkspaceInsights({ workspaceId: wid, ticker });
    const evidence = knowledge.evidence;

    const bullCase = normalizeLines([
      ...evidence.bull.map((e) => e.summary),
      ...(company.empty ? [] : company.panels.flatMap((p) => p.sections.flatMap((s) => s.items)).slice(0, 3)),
    ]);
    const bearCase = normalizeLines([...evidence.bear.map((e) => e.summary)]);
    const catalysts = normalizeLines([...evidence.catalysts.map((e) => e.summary)]);
    const risks = normalizeLines([
      ...evidence.risks.map((e) => e.summary),
      ...insights.keyRisks,
    ]);

    const hasContent =
      !company.empty ||
      evidence.items.length > 0 ||
      knowledge.notes.length > 0 ||
      insights.topPositiveFactors.length > 0;

    if (!hasContent) {
      return emptyResearchSummary(COPILOT_EMPTY.noAiSummary);
    }

    const valuationPanel = company.panels.find((p) => p.id === "valuation");
    const technicalPanel = company.panels.find((p) => p.id === "technical");
    const financialPanel = company.panels.find((p) => p.id === "financials");

    const valuationSummary = valuationPanel?.sections[0]?.body ?? COPILOT_EMPTY.awaitingAnalysis;
    const technicalSummary = technicalPanel?.sections[0]?.body ?? COPILOT_EMPTY.awaitingAnalysis;
    const financialSummary = financialPanel?.sections[0]?.body ?? COPILOT_EMPTY.awaitingAnalysis;

    const executiveSummary = company.empty
      ? knowledge.notes[0]?.body ?? insights.aiSummary
      : `${company.overview.name} (${company.overview.ticker}) · ${company.overview.stickySummary}`;

    const finalConclusion = company.empty
      ? insights.aiSummary
      : `${company.overview.aiRecommendation} · confidence ${company.overview.confidenceLabel}`;

    return {
      executiveSummary: safeWorkspaceText(executiveSummary, COPILOT_EMPTY.awaitingAnalysis),
      bullCase,
      bearCase,
      catalysts,
      risks,
      valuationSummary: safeWorkspaceText(valuationSummary, COPILOT_EMPTY.awaitingAnalysis),
      technicalSummary: safeWorkspaceText(technicalSummary, COPILOT_EMPTY.awaitingAnalysis),
      financialSummary: safeWorkspaceText(financialSummary, COPILOT_EMPTY.awaitingAnalysis),
      finalConclusion: safeWorkspaceText(finalConclusion, COPILOT_EMPTY.awaitingAnalysis),
      empty: false,
      emptyMessage: COPILOT_EMPTY.awaitingAnalysis,
    };
  } catch {
    return emptyResearchSummary(COPILOT_EMPTY.noAiSummary);
  }
}
