/**
 * Research Insights panel (Sprint 10A.R3) — bull/bear/catalysts pass-through.
 */

import {
  COMPANY_WORKSPACE_EMPTY,
  sectionBlock,
  type CompanyPanelView,
  type CompanyWorkspaceSnapshot,
} from "./CompanyWorkspaceModels";

export function buildResearchInsightsPanel(
  snapshot: CompanyWorkspaceSnapshot,
  expanded = true
): CompanyPanelView {
  if (!snapshot.ticker) {
    return {
      id: "insights",
      title: "Research Insights",
      expandable: true,
      expanded,
      sticky: false,
      rows: [],
      sections: [],
      badges: [],
      empty: true,
      emptyMessage: COMPANY_WORKSPACE_EMPTY.noCompanySelected,
    };
  }

  const i = snapshot.insights;
  const hasResearch =
    i.bullCase.length > 0 ||
    i.bearCase.length > 0 ||
    i.keyTakeaways.length > 0 ||
    (i.investmentThesis &&
      i.investmentThesis !== COMPANY_WORKSPACE_EMPTY.noResearchAvailable);

  if (!hasResearch) {
    return {
      id: "insights",
      title: "Research Insights",
      expandable: true,
      expanded,
      sticky: false,
      rows: [],
      sections: [],
      badges: [],
      empty: true,
      emptyMessage: COMPANY_WORKSPACE_EMPTY.noResearchAvailable,
    };
  }

  return {
    id: "insights",
    title: "Research Insights",
    expandable: true,
    expanded,
    sticky: false,
    rows: [],
    sections: [
      sectionBlock(
        "bull",
        "Bull Case",
        "",
        i.bullCase,
        COMPANY_WORKSPACE_EMPTY.noResearchAvailable,
        i.bullCase.length === 0
      ),
      sectionBlock(
        "bear",
        "Bear Case",
        "",
        i.bearCase,
        COMPANY_WORKSPACE_EMPTY.noResearchAvailable,
        i.bearCase.length === 0
      ),
      sectionBlock(
        "catalysts",
        "Catalysts",
        "",
        i.catalysts,
        COMPANY_WORKSPACE_EMPTY.noResearchAvailable,
        i.catalysts.length === 0
      ),
      sectionBlock(
        "headwinds",
        "Headwinds",
        "",
        i.headwinds,
        COMPANY_WORKSPACE_EMPTY.noResearchAvailable,
        i.headwinds.length === 0
      ),
      sectionBlock(
        "takeaways",
        "Key Takeaways",
        "",
        i.keyTakeaways,
        COMPANY_WORKSPACE_EMPTY.noResearchAvailable,
        i.keyTakeaways.length === 0
      ),
    ],
    badges: [
      { id: "confidence", label: snapshot.badges.confidence, tone: "confidence" },
      { id: "trust", label: snapshot.badges.trust, tone: "trust" },
      { id: "validation", label: snapshot.badges.validation, tone: "validation" },
    ],
    empty: false,
    emptyMessage: COMPANY_WORKSPACE_EMPTY.awaitingAnalysis,
  };
}

export class ResearchInsightsPanel {
  build = buildResearchInsightsPanel;
}
