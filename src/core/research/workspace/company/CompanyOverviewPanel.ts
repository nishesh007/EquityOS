/**
 * Company Overview panel (Sprint 10A.R3) — compose snapshot only.
 */

import {
  COMPANY_WORKSPACE_EMPTY,
  formatMetric,
  metricRow,
  sectionBlock,
  type CompanyOverviewView,
  type CompanyPanelView,
  type CompanyWorkspaceSnapshot,
} from "./CompanyWorkspaceModels";

export function buildCompanyOverview(
  snapshot: CompanyWorkspaceSnapshot,
  expanded = true
): CompanyOverviewView {
  if (!snapshot.ticker) {
    return {
      ticker: "",
      name: COMPANY_WORKSPACE_EMPTY.noCompanySelected,
      sector: "—",
      industry: "—",
      priceLabel: "—",
      changeLabel: "—",
      marketCap: "—",
      businessSummary: COMPANY_WORKSPACE_EMPTY.noCompanySelected,
      investmentThesis: COMPANY_WORKSPACE_EMPTY.noCompanySelected,
      aiRecommendation: COMPANY_WORKSPACE_EMPTY.noCompanySelected,
      confidenceLabel: COMPANY_WORKSPACE_EMPTY.noCompanySelected,
      badges: [],
      stickySummary: COMPANY_WORKSPACE_EMPTY.noCompanySelected,
      empty: true,
      emptyMessage: COMPANY_WORKSPACE_EMPTY.noCompanySelected,
    };
  }

  const changeLabel = `${snapshot.changePercent >= 0 ? "+" : ""}${formatMetric(snapshot.changePercent, "percent")}`;

  return {
    ticker: snapshot.ticker,
    name: snapshot.name,
    sector: snapshot.sector,
    industry: snapshot.industry,
    priceLabel: formatMetric(snapshot.price, "currency"),
    changeLabel,
    marketCap: snapshot.marketCap,
    businessSummary: snapshot.insights.businessSummary,
    investmentThesis: snapshot.insights.investmentThesis,
    aiRecommendation: snapshot.insights.aiRecommendation,
    confidenceLabel: snapshot.insights.confidenceLabel,
    badges: [
      { id: "confidence", label: snapshot.badges.confidence, tone: "confidence" },
      { id: "trust", label: snapshot.badges.trust, tone: "trust" },
      { id: "validation", label: snapshot.badges.validation, tone: "validation" },
    ],
    stickySummary: `${snapshot.ticker} · ${snapshot.insights.aiRecommendation} · ${snapshot.insights.confidenceLabel}`,
    empty: false,
    emptyMessage: COMPANY_WORKSPACE_EMPTY.awaitingAnalysis,
  };
}

export function buildOverviewPanel(
  snapshot: CompanyWorkspaceSnapshot,
  expanded = true
): CompanyPanelView {
  const overview = buildCompanyOverview(snapshot, expanded);
  if (overview.empty) {
    return {
      id: "overview",
      title: "Overview",
      expandable: true,
      expanded,
      sticky: true,
      rows: [],
      sections: [],
      badges: [],
      empty: true,
      emptyMessage: COMPANY_WORKSPACE_EMPTY.noCompanySelected,
    };
  }

  return {
    id: "overview",
    title: "Overview",
    expandable: true,
    expanded,
    sticky: true,
    rows: [
      metricRow("price", "Price", overview.priceLabel, COMPANY_WORKSPACE_EMPTY.awaitingAnalysis),
      metricRow("change", "Change", overview.changeLabel, COMPANY_WORKSPACE_EMPTY.awaitingAnalysis),
      metricRow("mcap", "Market Cap", overview.marketCap, COMPANY_WORKSPACE_EMPTY.awaitingAnalysis),
      metricRow(
        "confidence",
        "Confidence",
        overview.confidenceLabel,
        COMPANY_WORKSPACE_EMPTY.awaitingAnalysis
      ),
    ],
    sections: [
      sectionBlock(
        "business",
        "Business Summary",
        overview.businessSummary,
        [],
        COMPANY_WORKSPACE_EMPTY.noResearchAvailable
      ),
      sectionBlock(
        "thesis",
        "Investment Thesis",
        overview.investmentThesis,
        [],
        COMPANY_WORKSPACE_EMPTY.noResearchAvailable
      ),
      sectionBlock(
        "recommendation",
        "AI Recommendation",
        overview.aiRecommendation,
        [],
        COMPANY_WORKSPACE_EMPTY.noResearchAvailable
      ),
    ],
    badges: overview.badges,
    empty: false,
    emptyMessage: COMPANY_WORKSPACE_EMPTY.awaitingAnalysis,
  };
}

export class CompanyOverviewPanel {
  build = buildOverviewPanel;
  buildOverview = buildCompanyOverview;
}
