/**
 * Risk Analysis panel (Sprint 10A.R3) — categorized risks pass-through.
 */

import {
  COMPANY_WORKSPACE_EMPTY,
  formatMetric,
  metricRow,
  sectionBlock,
  type CompanyPanelView,
  type CompanyWorkspaceSnapshot,
} from "./CompanyWorkspaceModels";

export function buildRiskAnalysisPanel(
  snapshot: CompanyWorkspaceSnapshot,
  expanded = true
): CompanyPanelView {
  if (!snapshot.ticker) {
    return {
      id: "risk",
      title: "Risk Analysis",
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

  const r = snapshot.risk;
  return {
    id: "risk",
    title: "Risk Analysis",
    expandable: true,
    expanded,
    sticky: false,
    rows: [
      metricRow(
        "score",
        "Aggregate Risk",
        formatMetric(r.aggregateScore, "ratio"),
        COMPANY_WORKSPACE_EMPTY.awaitingAnalysis
      ),
    ],
    sections: [
      sectionBlock(
        "business",
        "Business Risks",
        r.summary,
        r.business,
        COMPANY_WORKSPACE_EMPTY.awaitingAnalysis,
        r.business.length === 0
      ),
      sectionBlock(
        "financial",
        "Financial Risks",
        "",
        r.financial,
        COMPANY_WORKSPACE_EMPTY.awaitingAnalysis,
        r.financial.length === 0
      ),
      sectionBlock(
        "valuation",
        "Valuation Risks",
        "",
        r.valuation,
        COMPANY_WORKSPACE_EMPTY.awaitingAnalysis,
        r.valuation.length === 0
      ),
      sectionBlock(
        "sector",
        "Sector Risks",
        "",
        r.sector,
        COMPANY_WORKSPACE_EMPTY.awaitingAnalysis,
        r.sector.length === 0
      ),
    ],
    badges: [],
    empty: false,
    emptyMessage: COMPANY_WORKSPACE_EMPTY.awaitingAnalysis,
  };
}

export class RiskAnalysisPanel {
  build = buildRiskAnalysisPanel;
}
