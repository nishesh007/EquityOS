/**
 * Workspace insight aggregator (Sprint 10A.R5).
 * Composes positive/negative factors from existing bags — no recalculation.
 */

import { safeWorkspaceText } from "../WorkspaceModels";
import { getKnowledge } from "../knowledge/KnowledgeBaseEngine";
import { getCompanyWorkspaceView } from "../company/CompanyWorkspaceEngine";
import {
  INTEGRATION_EMPTY,
  emptyInsights,
  type WorkspaceInsights,
} from "./ResearchIntegrationModels";

export interface InsightAggregationInput {
  workspaceId?: string | null;
  ticker?: string | null;
  /** Optional pre-built lines from external modules (read-only). */
  positiveLines?: string[] | null;
  negativeLines?: string[] | null;
  riskLines?: string[] | null;
  catalystLines?: string[] | null;
  aiSummary?: string | null;
  recommendedActions?: string[] | null;
}

function uniqueLines(lines: string[], limit = 6): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const text = safeWorkspaceText(line, "");
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
    if (out.length >= limit) break;
  }
  return out;
}

export function getWorkspaceInsights(
  input?: InsightAggregationInput | null
): WorkspaceInsights {
  try {
    const wid = input?.workspaceId
      ? safeWorkspaceText(input.workspaceId, "").toLowerCase()
      : null;
    const ticker = input?.ticker
      ? safeWorkspaceText(input.ticker, "").toUpperCase()
      : null;

    const knowledge = getKnowledge({ workspaceId: wid ?? undefined, ticker });
    const company = getCompanyWorkspaceView(ticker);
    const evidence = knowledge.evidence;

    const topPositiveFactors = uniqueLines([
      ...(input?.positiveLines ?? []),
      ...evidence.bull.map((e) => e.summary),
      ...knowledge.knowledge.relatedThemes,
      company.empty ? "" : company.overview.aiRecommendation,
    ]);

    const topNegativeFactors = uniqueLines([
      ...(input?.negativeLines ?? []),
      ...evidence.bear.map((e) => e.summary),
    ]);

    const keyRisks = uniqueLines([
      ...(input?.riskLines ?? []),
      ...evidence.risks.map((e) => e.summary),
    ]);

    const catalysts = uniqueLines([
      ...(input?.catalystLines ?? []),
      ...evidence.catalysts.map((e) => e.summary),
    ]);

    const aiSummary = safeWorkspaceText(
      input?.aiSummary,
      company.empty
        ? knowledge.notes[0]?.body ?? INTEGRATION_EMPTY.awaitingResearchActivity
        : `${company.overview.aiRecommendation} · ${company.overview.investmentThesis}`
    );

    const recommendedActions = uniqueLines([
      ...(input?.recommendedActions ?? []),
      ...company.quickActions.map((a) => a.label),
      evidence.bull.length > evidence.bear.length
        ? "Review bull evidence and sizing"
        : "Review bear evidence and risk limits",
      catalysts.length ? "Monitor catalyst calendar" : "Awaiting catalyst data",
    ]);

    const empty =
      topPositiveFactors.length === 0 &&
      topNegativeFactors.length === 0 &&
      keyRisks.length === 0 &&
      catalysts.length === 0;

    if (empty) {
      return emptyInsights(INTEGRATION_EMPTY.awaitingResearchActivity);
    }

    return {
      topPositiveFactors,
      topNegativeFactors,
      keyRisks,
      catalysts,
      aiSummary,
      recommendedActions,
      empty: false,
      emptyMessage: INTEGRATION_EMPTY.awaitingResearchActivity,
    };
  } catch {
    return emptyInsights(INTEGRATION_EMPTY.awaitingResearchActivity);
  }
}

export function resetWorkspaceInsightAggregator(): void {
  /* stateless aggregator */
}

export class WorkspaceInsightAggregator {
  getWorkspaceInsights = getWorkspaceInsights;
}
