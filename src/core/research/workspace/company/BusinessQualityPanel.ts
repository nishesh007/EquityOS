/**
 * Business Quality panel (Sprint 10A.R3) — moat / ROE / ROCE pass-through.
 */

import {
  COMPANY_WORKSPACE_EMPTY,
  formatMetric,
  metricRow,
  sectionBlock,
  type CompanyPanelView,
  type CompanyWorkspaceSnapshot,
} from "./CompanyWorkspaceModels";

export function buildBusinessQualityPanel(
  snapshot: CompanyWorkspaceSnapshot,
  expanded = true
): CompanyPanelView {
  if (!snapshot.ticker) {
    return {
      id: "quality",
      title: "Business Quality",
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

  const q = snapshot.quality;
  return {
    id: "quality",
    title: "Business Quality",
    expandable: true,
    expanded,
    sticky: false,
    rows: [
      metricRow("moat", "Moat", q.moatVerdict, COMPANY_WORKSPACE_EMPTY.awaitingAnalysis),
      metricRow(
        "moat_score",
        "Moat Score",
        formatMetric(q.moatScore, "ratio"),
        COMPANY_WORKSPACE_EMPTY.awaitingAnalysis
      ),
      metricRow("roe", "ROE", formatMetric(q.roe, "percent"), COMPANY_WORKSPACE_EMPTY.awaitingAnalysis),
      metricRow("roce", "ROCE", formatMetric(q.roce, "percent"), COMPANY_WORKSPACE_EMPTY.awaitingAnalysis),
      metricRow(
        "mgmt",
        "Management Quality",
        q.managementQuality,
        COMPANY_WORKSPACE_EMPTY.awaitingAnalysis
      ),
    ],
    sections: [
      sectionBlock(
        "moat",
        "Moat",
        q.summary,
        [`Verdict ${q.moatVerdict}`],
        COMPANY_WORKSPACE_EMPTY.awaitingAnalysis
      ),
      sectionBlock(
        "capital",
        "Capital Allocation",
        q.capitalAllocation,
        [],
        COMPANY_WORKSPACE_EMPTY.awaitingAnalysis
      ),
    ],
    badges: [],
    empty: false,
    emptyMessage: COMPANY_WORKSPACE_EMPTY.awaitingAnalysis,
  };
}

export class BusinessQualityPanel {
  build = buildBusinessQualityPanel;
}
