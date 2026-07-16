/**
 * Research comparison engine (Sprint 10A.R6).
 * Compare companies/sectors using composed snapshots — no recalculation.
 */

import { safeWorkspaceText } from "../WorkspaceModels";
import { getCompanyWorkspaceView } from "../company/CompanyWorkspaceEngine";
import { getKnowledge } from "../knowledge/KnowledgeBaseEngine";
import {
  COPILOT_EMPTY,
  emptyComparisonView,
  type ComparisonDimension,
  type ResearchComparisonView,
} from "./CopilotPresentationModels";

export interface CompareResearchInput {
  workspaceId?: string | null;
  leftTicker: string;
  rightTicker: string;
}

function readMetric(
  ticker: string,
  selector: (view: ReturnType<typeof getCompanyWorkspaceView>) => string
): string {
  const view = getCompanyWorkspaceView(ticker);
  if (view.empty) return COPILOT_EMPTY.awaitingAnalysis;
  return safeWorkspaceText(selector(view), COPILOT_EMPTY.awaitingAnalysis);
}

export function compareResearch(input: CompareResearchInput): ResearchComparisonView {
  try {
    const left = safeWorkspaceText(input.leftTicker, "").toUpperCase();
    const right = safeWorkspaceText(input.rightTicker, "").toUpperCase();
    if (!left || !right) return emptyComparisonView(COPILOT_EMPTY.noComparison);

    const leftView = getCompanyWorkspaceView(left);
    const rightView = getCompanyWorkspaceView(right);
    const wid = input.workspaceId
      ? safeWorkspaceText(input.workspaceId, "").toLowerCase()
      : null;
    const leftEvidence = getKnowledge({ workspaceId: wid ?? undefined, ticker: left }).evidence;
    const rightEvidence = getKnowledge({ workspaceId: wid ?? undefined, ticker: right }).evidence;

    const dimensions: ComparisonDimension[] = [
      {
        id: "valuation",
        label: "Valuation",
        left: readMetric(left, (v) => v.overview.priceLabel),
        right: readMetric(right, (v) => v.overview.priceLabel),
        highlight: leftView.overview.priceLabel !== rightView.overview.priceLabel ? "Price differs" : "Similar pricing context",
      },
      {
        id: "growth",
        label: "Growth",
        left: readMetric(left, (v) => v.overview.changeLabel),
        right: readMetric(right, (v) => v.overview.changeLabel),
        highlight: "Momentum comparison",
      },
      {
        id: "quality",
        label: "Quality",
        left: leftView.empty ? COPILOT_EMPTY.awaitingAnalysis : leftView.overview.aiRecommendation,
        right: rightView.empty ? COPILOT_EMPTY.awaitingAnalysis : rightView.overview.aiRecommendation,
        highlight: "AI recommendation contrast",
      },
      {
        id: "momentum",
        label: "Momentum",
        left: `${leftEvidence.bull.length} bull / ${leftEvidence.bear.length} bear`,
        right: `${rightEvidence.bull.length} bull / ${rightEvidence.bear.length} bear`,
        highlight:
          leftEvidence.bull.length !== rightEvidence.bull.length
            ? "Evidence balance differs"
            : "Similar evidence balance",
      },
    ];

    const differences: string[] = [];
    if (leftView.overview.sector !== rightView.overview.sector) {
      differences.push(
        `Sector: ${leftView.overview.sector} vs ${rightView.overview.sector}`
      );
    }
    if (leftView.overview.aiRecommendation !== rightView.overview.aiRecommendation) {
      differences.push(
        `Recommendation: ${leftView.overview.aiRecommendation} vs ${rightView.overview.aiRecommendation}`
      );
    }
    if (leftEvidence.bull.length !== rightEvidence.bull.length) {
      differences.push("Bull evidence count differs");
    }

    if (leftView.empty && rightView.empty && differences.length === 0) {
      return emptyComparisonView(COPILOT_EMPTY.noComparison);
    }

    return {
      leftTicker: left,
      rightTicker: right,
      dimensions,
      differences,
      empty: false,
      emptyMessage: COPILOT_EMPTY.awaitingAnalysis,
    };
  } catch {
    return emptyComparisonView(COPILOT_EMPTY.noComparison);
  }
}
