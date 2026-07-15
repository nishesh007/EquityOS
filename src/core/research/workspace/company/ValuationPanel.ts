/**
 * Valuation panel (Sprint 10A.R3) — reuses precomputed PE/PB/EV/DCF fields.
 */

import {
  COMPANY_WORKSPACE_EMPTY,
  formatMetric,
  metricRow,
  sectionBlock,
  type CompanyPanelView,
  type CompanyWorkspaceSnapshot,
} from "./CompanyWorkspaceModels";

export function buildValuationPanel(
  snapshot: CompanyWorkspaceSnapshot,
  expanded = true
): CompanyPanelView {
  if (!snapshot.ticker) {
    return emptyValuation(expanded);
  }

  const v = snapshot.valuation;
  const dcfLabel = v.dcfAvailable && v.dcfFairValue != null
    ? formatMetric(v.dcfFairValue, "currency")
    : v.dcfNote || COMPANY_WORKSPACE_EMPTY.awaitingAnalysis;

  return {
    id: "valuation",
    title: "Valuation",
    expandable: true,
    expanded,
    sticky: false,
    rows: [
      metricRow("pe", "PE", formatMetric(v.pe, "ratio"), COMPANY_WORKSPACE_EMPTY.awaitingAnalysis),
      metricRow("pb", "PB", formatMetric(v.pb, "ratio"), COMPANY_WORKSPACE_EMPTY.awaitingAnalysis),
      metricRow(
        "ev_ebitda",
        "EV/EBITDA",
        formatMetric(v.evEbitda, "ratio"),
        COMPANY_WORKSPACE_EMPTY.awaitingAnalysis
      ),
      metricRow("dcf", "DCF Fair Value", dcfLabel, COMPANY_WORKSPACE_EMPTY.awaitingAnalysis, !v.dcfAvailable),
      metricRow(
        "fair",
        "Fair Value",
        formatMetric(v.fairValue, "currency"),
        COMPANY_WORKSPACE_EMPTY.awaitingAnalysis
      ),
      metricRow(
        "upside",
        "Upside",
        formatMetric(v.upsidePercent, "percent"),
        COMPANY_WORKSPACE_EMPTY.awaitingAnalysis
      ),
    ],
    sections: [
      sectionBlock(
        "relative",
        "Relative Valuation",
        v.relativeSummary,
        [],
        COMPANY_WORKSPACE_EMPTY.awaitingAnalysis
      ),
      sectionBlock(
        "dcf",
        "DCF",
        v.dcfNote,
        v.dcfAvailable ? [`Fair value ${dcfLabel}`] : [],
        COMPANY_WORKSPACE_EMPTY.awaitingAnalysis,
        !v.dcfAvailable
      ),
    ],
    badges: [],
    empty: false,
    emptyMessage: COMPANY_WORKSPACE_EMPTY.awaitingAnalysis,
  };
}

function emptyValuation(expanded: boolean): CompanyPanelView {
  return {
    id: "valuation",
    title: "Valuation",
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

export class ValuationPanel {
  build = buildValuationPanel;
}
