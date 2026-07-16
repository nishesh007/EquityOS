/**
 * Research Copilot engine (Sprint 10A.R6).
 * Explainability composition — reuses Sprint 9E bags, no recalculation.
 */

import { safeWorkspaceText } from "../WorkspaceModels";
import { getKnowledge } from "../knowledge/KnowledgeBaseEngine";
import { getCompanyWorkspaceView } from "../company/CompanyWorkspaceEngine";
import {
  COPILOT_EMPTY,
  emptyExplainabilityView,
  normalizeLines,
  type CopilotExplainabilityView,
  type ExplainabilityContext,
} from "./CopilotPresentationModels";

export interface BuildExplainabilityInput {
  workspaceId?: string | null;
  ticker?: string | null;
  explainability?: ExplainabilityContext | null;
}

export function buildCopilotExplainability(
  input?: BuildExplainabilityInput | null
): CopilotExplainabilityView {
  try {
    const ticker = input?.ticker
      ? safeWorkspaceText(input.ticker, "").toUpperCase()
      : null;
    const wid = input?.workspaceId
      ? safeWorkspaceText(input.workspaceId, "").toLowerCase()
      : null;
    const bag = input?.explainability ?? {};
    const knowledge = getKnowledge({ workspaceId: wid ?? undefined, ticker });
    const company = getCompanyWorkspaceView(ticker);
    const evidence = knowledge.evidence;

    const factorContributions = normalizeLines([
      ...(bag.factorContributions ?? []),
      ...evidence.bull.map((e) => `Bull · ${e.summary}`),
      ...evidence.bear.map((e) => `Bear · ${e.summary}`),
    ]);

    const confidenceDrivers = normalizeLines([
      ...(bag.confidenceDrivers ?? []),
      ...evidence.byKind.confidence.map((e) => e.summary),
      company.empty ? "" : company.overview.confidenceLabel,
    ]);

    const validationStatus = safeWorkspaceText(
      bag.validationStatus,
      company.empty
        ? COPILOT_EMPTY.awaitingAnalysis
        : company.overview.badges.find((b) => b.tone === "validation")?.label ??
            "Validation attached"
    );

    const trustScore = safeWorkspaceText(
      String(bag.trustScore ?? ""),
      company.empty
        ? COPILOT_EMPTY.awaitingAnalysis
        : company.overview.badges.find((b) => b.tone === "trust")?.label ?? "Trust attached"
    );

    const historicalEvidence = normalizeLines([
      ...(bag.historicalEvidence ?? []),
      ...evidence.items.map((e) => e.summary),
      ...knowledge.memory.map((m) => m.detail),
    ]);

    const decisionTrace = normalizeLines([
      ...(bag.decisionTrace ?? []),
      ...knowledge.memory
        .filter((m) => m.kind === "decision" || m.kind === "conclusion")
        .map((m) => m.detail),
    ]);

    const empty =
      factorContributions.length === 0 &&
      confidenceDrivers.length === 0 &&
      historicalEvidence.length === 0 &&
      decisionTrace.length === 0;

    if (empty) {
      return emptyExplainabilityView(COPILOT_EMPTY.awaitingAnalysis);
    }

    return {
      factorContributions,
      confidenceDrivers,
      validationStatus,
      trustScore,
      historicalEvidence,
      decisionTrace,
      empty: false,
      emptyMessage: COPILOT_EMPTY.awaitingAnalysis,
    };
  } catch {
    return emptyExplainabilityView(COPILOT_EMPTY.awaitingAnalysis);
  }
}

export class ResearchCopilotEngine {
  buildExplainability = buildCopilotExplainability;
}
