/**
 * Technical Analysis panel (Sprint 10A.R3) — research technicals pass-through.
 */

import {
  COMPANY_WORKSPACE_EMPTY,
  formatMetric,
  metricRow,
  sectionBlock,
  type CompanyPanelView,
  type CompanyWorkspaceSnapshot,
} from "./CompanyWorkspaceModels";

export function buildTechnicalAnalysisPanel(
  snapshot: CompanyWorkspaceSnapshot,
  expanded = true
): CompanyPanelView {
  if (!snapshot.ticker) {
    return emptyTechnicalPanel(expanded, COMPANY_WORKSPACE_EMPTY.noCompanySelected);
  }

  const t = snapshot.technicals;
  const hasData =
    (t.trend && t.trend !== COMPANY_WORKSPACE_EMPTY.noTechnicalData) ||
    t.support > 0 ||
    t.resistance > 0 ||
    t.score > 0;

  if (!hasData) {
    return emptyTechnicalPanel(expanded, COMPANY_WORKSPACE_EMPTY.noTechnicalData);
  }

  return {
    id: "technical",
    title: "Technical Analysis",
    expandable: true,
    expanded,
    sticky: false,
    rows: [
      metricRow("trend", "Trend", t.trend, COMPANY_WORKSPACE_EMPTY.noTechnicalData),
      metricRow("momentum", "Momentum", t.momentum, COMPANY_WORKSPACE_EMPTY.noTechnicalData),
      metricRow("support", "Support", formatMetric(t.support, "currency"), COMPANY_WORKSPACE_EMPTY.noTechnicalData),
      metricRow(
        "resistance",
        "Resistance",
        formatMetric(t.resistance, "currency"),
        COMPANY_WORKSPACE_EMPTY.noTechnicalData
      ),
      metricRow("rsi", "RSI", formatMetric(t.rsi, "ratio"), COMPANY_WORKSPACE_EMPTY.noTechnicalData),
      metricRow("macd", "MACD", t.macd, COMPANY_WORKSPACE_EMPTY.noTechnicalData),
      metricRow("score", "Technical Score", formatMetric(t.score, "ratio"), COMPANY_WORKSPACE_EMPTY.noTechnicalData),
    ],
    sections: [
      sectionBlock(
        "indicators",
        "Indicators",
        `RSI ${formatMetric(t.rsi, "ratio")} · MACD ${t.macd}`,
        [`Score ${formatMetric(t.score, "ratio")}`],
        COMPANY_WORKSPACE_EMPTY.noTechnicalData
      ),
    ],
    badges: [],
    empty: false,
    emptyMessage: COMPANY_WORKSPACE_EMPTY.awaitingAnalysis,
  };
}

function emptyTechnicalPanel(
  expanded: boolean,
  message: typeof COMPANY_WORKSPACE_EMPTY.noTechnicalData | typeof COMPANY_WORKSPACE_EMPTY.noCompanySelected
): CompanyPanelView {
  return {
    id: "technical",
    title: "Technical Analysis",
    expandable: true,
    expanded,
    sticky: false,
    rows: [],
    sections: [],
    badges: [],
    empty: true,
    emptyMessage: message,
  };
}

export class TechnicalAnalysisPanel {
  build = buildTechnicalAnalysisPanel;
}
