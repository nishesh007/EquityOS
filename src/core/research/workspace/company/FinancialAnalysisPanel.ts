/**
 * Financial Analysis panel (Sprint 10A.R3) — profile financials pass-through.
 */

import {
  COMPANY_WORKSPACE_EMPTY,
  formatMetric,
  metricRow,
  sectionBlock,
  type CompanyPanelView,
  type CompanyWorkspaceSnapshot,
} from "./CompanyWorkspaceModels";

export function buildFinancialAnalysisPanel(
  snapshot: CompanyWorkspaceSnapshot,
  expanded = true
): CompanyPanelView {
  if (!snapshot.ticker) {
    return emptyFinancialPanel(expanded);
  }

  const f = snapshot.financials;
  const hasData =
    f.revenue !== 0 ||
    f.netProfit !== 0 ||
    f.pe !== 0 ||
    f.roe !== 0;

  if (!hasData) {
    return {
      ...emptyFinancialPanel(expanded),
      emptyMessage: COMPANY_WORKSPACE_EMPTY.noFinancialData,
      empty: true,
    };
  }

  return {
    id: "financials",
    title: "Financial Analysis",
    expandable: true,
    expanded,
    sticky: false,
    rows: [
      metricRow("revenue", "Revenue", formatMetric(f.revenue, "currency"), COMPANY_WORKSPACE_EMPTY.noFinancialData),
      metricRow(
        "revenue_growth",
        "Revenue Growth",
        formatMetric(f.revenueGrowth, "percent"),
        COMPANY_WORKSPACE_EMPTY.noFinancialData
      ),
      metricRow("profit", "Profit", formatMetric(f.netProfit, "currency"), COMPANY_WORKSPACE_EMPTY.noFinancialData),
      metricRow(
        "profit_growth",
        "Profit Growth",
        formatMetric(f.netProfitGrowth, "percent"),
        COMPANY_WORKSPACE_EMPTY.noFinancialData
      ),
      metricRow(
        "op_margin",
        "Operating Margin",
        formatMetric(f.operatingMargin, "percent"),
        COMPANY_WORKSPACE_EMPTY.noFinancialData
      ),
      metricRow(
        "net_margin",
        "Net Margin",
        formatMetric(f.netMargin, "percent"),
        COMPANY_WORKSPACE_EMPTY.noFinancialData
      ),
      metricRow(
        "cash_flow",
        "Cash Flow",
        formatMetric(f.cashFlow, "currency"),
        COMPANY_WORKSPACE_EMPTY.noFinancialData
      ),
      metricRow(
        "balance_de",
        "Debt / Equity",
        formatMetric(f.debtToEquity, "ratio"),
        COMPANY_WORKSPACE_EMPTY.noFinancialData
      ),
    ],
    sections: [
      sectionBlock(
        "income",
        "Income Statement Highlights",
        `Revenue ${formatMetric(f.revenue, "currency")} · Profit ${formatMetric(f.netProfit, "currency")}`,
        [
          `Margins ${formatMetric(f.operatingMargin, "percent")} op / ${formatMetric(f.netMargin, "percent")} net`,
        ],
        COMPANY_WORKSPACE_EMPTY.noFinancialData
      ),
      sectionBlock(
        "balance",
        "Balance Sheet",
        `Debt/Equity ${formatMetric(f.debtToEquity, "ratio")}`,
        [],
        COMPANY_WORKSPACE_EMPTY.noFinancialData
      ),
    ],
    badges: [],
    empty: false,
    emptyMessage: COMPANY_WORKSPACE_EMPTY.awaitingAnalysis,
  };
}

function emptyFinancialPanel(expanded: boolean): CompanyPanelView {
  return {
    id: "financials",
    title: "Financial Analysis",
    expandable: true,
    expanded,
    sticky: false,
    rows: [],
    sections: [],
    badges: [],
    empty: true,
    emptyMessage: COMPANY_WORKSPACE_EMPTY.noFinancialData,
  };
}

export class FinancialAnalysisPanel {
  build = buildFinancialAnalysisPanel;
}
