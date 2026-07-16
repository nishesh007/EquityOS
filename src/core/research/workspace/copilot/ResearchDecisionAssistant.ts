/**
 * Research decision assistant (Sprint 10A.R6).
 * Buy / hold / reduce / exit / watch guidance from composed evidence.
 */

import { safeWorkspaceText } from "../WorkspaceModels";
import { getCompanyWorkspaceView } from "../company/CompanyWorkspaceEngine";
import { getKnowledge } from "../knowledge/KnowledgeBaseEngine";
import { getMemoryTimeline } from "../knowledge/ResearchMemoryEngine";
import { getResearchTimeline } from "../integration/ResearchTimelineEngine";
import {
  COPILOT_EMPTY,
  DECISION_GUIDANCE_IDS,
  emptyDecisionAssistant,
  normalizeLines,
  type DecisionAssistantView,
  type DecisionGuidance,
  type DecisionGuidanceId,
} from "./CopilotPresentationModels";

export interface BuildDecisionAssistantInput {
  workspaceId?: string | null;
  ticker?: string | null;
}

function guidanceLabel(id: DecisionGuidanceId): string {
  const labels: Record<DecisionGuidanceId, string> = {
    buy: "Should I Buy?",
    hold: "Should I Hold?",
    reduce: "Should I Reduce?",
    exit: "Should I Exit?",
    watch: "Should I Watch?",
  };
  return labels[id];
}

function scoreGuidance(
  id: DecisionGuidanceId,
  bull: number,
  bear: number,
  recommendation: string
): { recommendation: string; rationale: string; confidence: number } {
  const net = bull - bear;
  const rec = recommendation.toLowerCase();

  switch (id) {
    case "buy":
      return {
        recommendation: net > 0 && rec.includes("accum") ? "Favorable" : "Conditional",
        rationale:
          net > 0
            ? "Bull evidence outweighs bear; review sizing and risk limits"
            : "Insufficient bull evidence for aggressive entry",
        confidence: Math.min(90, 50 + net * 8),
      };
    case "hold":
      return {
        recommendation: net >= 0 ? "Hold supported" : "Hold with caution",
        rationale: "Maintain position while monitoring catalysts and risks",
        confidence: Math.min(85, 55 + Math.max(0, net) * 5),
      };
    case "reduce":
      return {
        recommendation: bear > bull ? "Consider trimming" : "Not primary action",
        rationale:
          bear > bull
            ? "Bear case strengthening relative to bull evidence"
            : "Risk-reward still balanced for core holders",
        confidence: Math.min(80, 45 + bear * 6),
      };
    case "exit":
      return {
        recommendation: bear >= bull + 2 ? "Review exit" : "Exit not indicated",
        rationale:
          bear >= bull + 2
            ? "Risk factors dominate thesis"
            : "Thesis intact; exit would be premature",
        confidence: Math.min(75, 40 + bear * 7),
      };
    case "watch":
      return {
        recommendation: "Suitable for watchlist",
        rationale: "Track upcoming earnings, alerts and validation updates",
        confidence: 60,
      };
    default:
      return {
        recommendation: COPILOT_EMPTY.awaitingAnalysis,
        rationale: COPILOT_EMPTY.awaitingAnalysis,
        confidence: 0,
      };
  }
}

export function buildDecisionAssistant(
  input?: BuildDecisionAssistantInput | null
): DecisionAssistantView {
  try {
    const wid = input?.workspaceId
      ? safeWorkspaceText(input.workspaceId, "").toLowerCase()
      : null;
    const ticker = input?.ticker
      ? safeWorkspaceText(input.ticker, "").toUpperCase()
      : null;

    const company = getCompanyWorkspaceView(ticker);
    const evidence = getKnowledge({ workspaceId: wid ?? undefined, ticker }).evidence;
    const bull = evidence.bull.length;
    const bear = evidence.bear.length;
    const recommendation = company.empty
      ? COPILOT_EMPTY.awaitingAnalysis
      : company.overview.aiRecommendation;

    if (!ticker && bull === 0 && bear === 0) {
      return emptyDecisionAssistant(COPILOT_EMPTY.awaitingAnalysis);
    }

    const guidance: DecisionGuidance[] = DECISION_GUIDANCE_IDS.map((id) => {
      const scored = scoreGuidance(id, bull, bear, recommendation);
      return {
        id,
        label: guidanceLabel(id),
        recommendation: scored.recommendation,
        rationale: scored.rationale,
        confidence: scored.confidence,
      };
    });

    const memory = getMemoryTimeline({ ticker: ticker ?? undefined, limit: 4 });
    const timeline = getResearchTimeline({ workspaceId: wid ?? undefined, ticker, limit: 4 });

    const whatChanged =
      timeline.entries[0]?.detail ??
      memory[0]?.detail ??
      COPILOT_EMPTY.awaitingAnalysis;

    const convictionLines = normalizeLines([
      ...memory.filter((m) => m.kind === "conclusion").map((m) => m.detail),
      ...memory.filter((m) => m.kind === "decision").map((m) => m.detail),
    ]);
    const convictionChange =
      convictionLines.length > 0
        ? convictionLines.join(" · ")
        : `Current stance: ${recommendation}`;

    return {
      ticker,
      guidance,
      whatChanged: safeWorkspaceText(whatChanged, COPILOT_EMPTY.awaitingAnalysis),
      convictionChange: safeWorkspaceText(convictionChange, COPILOT_EMPTY.awaitingAnalysis),
      empty: false,
      emptyMessage: COPILOT_EMPTY.awaitingAnalysis,
    };
  } catch {
    return emptyDecisionAssistant(COPILOT_EMPTY.awaitingAnalysis);
  }
}
