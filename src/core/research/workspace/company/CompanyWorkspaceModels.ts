/**
 * Company Research Workspace — models (Sprint 10A.R3).
 * Presentation + sync context only. Never recalculate engine scores.
 */

import {
  safeWorkspaceNumber,
  safeWorkspaceText,
} from "../WorkspaceModels";

export const COMPANY_WORKSPACE_EMPTY = {
  noCompanySelected: "No Company Selected",
  awaitingAnalysis: "Awaiting Analysis",
  noFinancialData: "No Financial Data",
  noTechnicalData: "No Technical Data",
  noResearchAvailable: "No Research Available",
} as const;

export type CompanyWorkspaceEmptyMessage =
  (typeof COMPANY_WORKSPACE_EMPTY)[keyof typeof COMPANY_WORKSPACE_EMPTY];

export const COMPANY_PANEL_IDS = [
  "overview",
  "financials",
  "technical",
  "valuation",
  "quality",
  "risk",
  "insights",
] as const;

export type CompanyPanelId = (typeof COMPANY_PANEL_IDS)[number];

export const COMPANY_PANEL_LABELS: Record<CompanyPanelId, string> = {
  overview: "Overview",
  financials: "Financial Analysis",
  technical: "Technical Analysis",
  valuation: "Valuation",
  quality: "Business Quality",
  risk: "Risk Analysis",
  insights: "Research Insights",
};

export const COMPANY_TIMEFRAMES = [
  "1D",
  "1W",
  "1M",
  "3M",
  "1Y",
  "5Y",
] as const;

export type CompanyTimeframe = (typeof COMPANY_TIMEFRAMES)[number];

export const COMPANY_PERIODS = ["quarterly", "annual", "ttm"] as const;
export type CompanyPeriod = (typeof COMPANY_PERIODS)[number];

export const QUICK_ACTION_IDS = [
  "open_earnings",
  "open_alerts",
  "open_screener",
  "open_portfolio",
  "open_watchlist",
  "generate_report",
  "compare_company",
  "pin_company",
  "favorite",
] as const;

export type CompanyQuickActionId = (typeof QUICK_ACTION_IDS)[number];

/** Injected metric bag — compose existing module outputs, never recalc. */
export interface CompanyWorkspaceSnapshot {
  ticker: string;
  name: string;
  sector: string;
  industry: string;
  price: number;
  changePercent: number;
  marketCap: string;
  description: string;
  /** Precomputed / profile financials */
  financials: {
    revenue: number;
    revenueGrowth: number;
    netProfit: number;
    netProfitGrowth: number;
    operatingMargin: number;
    netMargin: number;
    cashFlow: number;
    pe: number;
    pb: number;
    evEbitda: number;
    roe: number;
    roce: number;
    debtToEquity: number;
  };
  technicals: {
    trend: string;
    momentum: string;
    support: number;
    resistance: number;
    rsi: number;
    macd: string;
    score: number;
  };
  valuation: {
    pe: number;
    pb: number;
    evEbitda: number;
    dcfFairValue: number | null;
    dcfAvailable: boolean;
    dcfNote: string;
    relativeSummary: string;
    fairValue: number;
    upsidePercent: number;
  };
  quality: {
    moatVerdict: string;
    moatScore: number;
    capitalAllocation: string;
    roce: number;
    roe: number;
    managementQuality: string;
    summary: string;
  };
  risk: {
    business: string[];
    financial: string[];
    valuation: string[];
    sector: string[];
    aggregateScore: number;
    summary: string;
  };
  insights: {
    businessSummary: string;
    investmentThesis: string;
    aiRecommendation: string;
    confidence: number;
    confidenceLabel: string;
    bullCase: string[];
    bearCase: string[];
    catalysts: string[];
    headwinds: string[];
    keyTakeaways: string[];
  };
  badges: {
    confidence: string;
    trust: string;
    validation: string;
  };
}

export interface CompanySyncContext {
  ticker: string;
  timeframe: CompanyTimeframe;
  period: CompanyPeriod;
  filters: Record<string, string>;
  researchContext: string;
  updatedAt: string;
}

export interface CompanyMetricRow {
  id: string;
  label: string;
  value: string;
  hint: string;
  empty: boolean;
  emptyMessage: CompanyWorkspaceEmptyMessage;
}

export interface CompanySectionBlock {
  id: string;
  title: string;
  body: string;
  items: string[];
  collapsed: boolean;
  empty: boolean;
  emptyMessage: CompanyWorkspaceEmptyMessage;
}

export interface CompanyPanelView {
  id: CompanyPanelId;
  title: string;
  expandable: boolean;
  expanded: boolean;
  sticky: boolean;
  rows: CompanyMetricRow[];
  sections: CompanySectionBlock[];
  badges: Array<{ id: string; label: string; tone: "confidence" | "trust" | "validation" | "neutral" }>;
  empty: boolean;
  emptyMessage: CompanyWorkspaceEmptyMessage;
}

export interface CompanyQuickAction {
  id: CompanyQuickActionId;
  label: string;
  href: string;
  enabled: boolean;
}

export interface CompanyOverviewView {
  ticker: string;
  name: string;
  sector: string;
  industry: string;
  priceLabel: string;
  changeLabel: string;
  marketCap: string;
  businessSummary: string;
  investmentThesis: string;
  aiRecommendation: string;
  confidenceLabel: string;
  badges: Array<{ id: string; label: string; tone: "confidence" | "trust" | "validation" | "neutral" }>;
  stickySummary: string;
  empty: boolean;
  emptyMessage: CompanyWorkspaceEmptyMessage;
}

export interface CompanyWorkspaceView {
  sync: CompanySyncContext;
  overview: CompanyOverviewView;
  panels: CompanyPanelView[];
  quickActions: CompanyQuickAction[];
  pinned: boolean;
  favorite: boolean;
  empty: boolean;
  emptyMessage: CompanyWorkspaceEmptyMessage;
  surfaceHints: {
    research: string;
    dashboard: string;
    company: string;
    results: string;
    portfolio: string;
    watchlist: string;
  };
}

export function emptySnapshot(
  message: CompanyWorkspaceEmptyMessage = COMPANY_WORKSPACE_EMPTY.noCompanySelected
): CompanyWorkspaceSnapshot {
  return {
    ticker: "",
    name: message,
    sector: "—",
    industry: "—",
    price: 0,
    changePercent: 0,
    marketCap: "—",
    description: message,
    financials: {
      revenue: 0,
      revenueGrowth: 0,
      netProfit: 0,
      netProfitGrowth: 0,
      operatingMargin: 0,
      netMargin: 0,
      cashFlow: 0,
      pe: 0,
      pb: 0,
      evEbitda: 0,
      roe: 0,
      roce: 0,
      debtToEquity: 0,
    },
    technicals: {
      trend: message,
      momentum: message,
      support: 0,
      resistance: 0,
      rsi: 0,
      macd: "—",
      score: 0,
    },
    valuation: {
      pe: 0,
      pb: 0,
      evEbitda: 0,
      dcfFairValue: null,
      dcfAvailable: false,
      dcfNote: message,
      relativeSummary: message,
      fairValue: 0,
      upsidePercent: 0,
    },
    quality: {
      moatVerdict: "—",
      moatScore: 0,
      capitalAllocation: message,
      roce: 0,
      roe: 0,
      managementQuality: message,
      summary: message,
    },
    risk: {
      business: [],
      financial: [],
      valuation: [],
      sector: [],
      aggregateScore: 0,
      summary: message,
    },
    insights: {
      businessSummary: message,
      investmentThesis: message,
      aiRecommendation: message,
      confidence: 0,
      confidenceLabel: message,
      bullCase: [],
      bearCase: [],
      catalysts: [],
      headwinds: [],
      keyTakeaways: [],
    },
    badges: {
      confidence: message,
      trust: message,
      validation: message,
    },
  };
}

export function normalizeSnapshot(
  input?: Partial<CompanyWorkspaceSnapshot> | null,
  message: CompanyWorkspaceEmptyMessage = COMPANY_WORKSPACE_EMPTY.noCompanySelected
): CompanyWorkspaceSnapshot {
  if (!input) return emptySnapshot(message);
  const ticker = safeWorkspaceText(input.ticker, "").toUpperCase();
  if (!ticker) return emptySnapshot(message);

  const f = input.financials ?? emptySnapshot().financials;
  const t = input.technicals ?? emptySnapshot().technicals;
  const v = input.valuation ?? emptySnapshot().valuation;
  const q = input.quality ?? emptySnapshot().quality;
  const r = input.risk ?? emptySnapshot().risk;
  const i = input.insights ?? emptySnapshot().insights;
  const b = input.badges ?? emptySnapshot().badges;

  return {
    ticker,
    name: safeWorkspaceText(input.name, ticker),
    sector: safeWorkspaceText(input.sector, "—"),
    industry: safeWorkspaceText(input.industry, "—"),
    price: safeWorkspaceNumber(input.price, 0),
    changePercent: safeWorkspaceNumber(input.changePercent, 0),
    marketCap: safeWorkspaceText(input.marketCap, "—"),
    description: safeWorkspaceText(input.description, COMPANY_WORKSPACE_EMPTY.awaitingAnalysis),
    financials: {
      revenue: safeWorkspaceNumber(f.revenue, 0),
      revenueGrowth: safeWorkspaceNumber(f.revenueGrowth, 0),
      netProfit: safeWorkspaceNumber(f.netProfit, 0),
      netProfitGrowth: safeWorkspaceNumber(f.netProfitGrowth, 0),
      operatingMargin: safeWorkspaceNumber(f.operatingMargin, 0),
      netMargin: safeWorkspaceNumber(f.netMargin, 0),
      cashFlow: safeWorkspaceNumber(f.cashFlow, 0),
      pe: safeWorkspaceNumber(f.pe, 0),
      pb: safeWorkspaceNumber(f.pb, 0),
      evEbitda: safeWorkspaceNumber(f.evEbitda, 0),
      roe: safeWorkspaceNumber(f.roe, 0),
      roce: safeWorkspaceNumber(f.roce, 0),
      debtToEquity: safeWorkspaceNumber(f.debtToEquity, 0),
    },
    technicals: {
      trend: safeWorkspaceText(t.trend, COMPANY_WORKSPACE_EMPTY.noTechnicalData),
      momentum: safeWorkspaceText(t.momentum, COMPANY_WORKSPACE_EMPTY.noTechnicalData),
      support: safeWorkspaceNumber(t.support, 0),
      resistance: safeWorkspaceNumber(t.resistance, 0),
      rsi: safeWorkspaceNumber(t.rsi, 0),
      macd: safeWorkspaceText(t.macd, "—"),
      score: safeWorkspaceNumber(t.score, 0),
    },
    valuation: {
      pe: safeWorkspaceNumber(v.pe, 0),
      pb: safeWorkspaceNumber(v.pb, 0),
      evEbitda: safeWorkspaceNumber(v.evEbitda, 0),
      dcfFairValue:
        v.dcfFairValue == null || !Number.isFinite(v.dcfFairValue)
          ? null
          : v.dcfFairValue,
      dcfAvailable: Boolean(v.dcfAvailable),
      dcfNote: safeWorkspaceText(v.dcfNote, COMPANY_WORKSPACE_EMPTY.awaitingAnalysis),
      relativeSummary: safeWorkspaceText(
        v.relativeSummary,
        COMPANY_WORKSPACE_EMPTY.awaitingAnalysis
      ),
      fairValue: safeWorkspaceNumber(v.fairValue, 0),
      upsidePercent: safeWorkspaceNumber(v.upsidePercent, 0),
    },
    quality: {
      moatVerdict: safeWorkspaceText(q.moatVerdict, "—"),
      moatScore: safeWorkspaceNumber(q.moatScore, 0),
      capitalAllocation: safeWorkspaceText(
        q.capitalAllocation,
        COMPANY_WORKSPACE_EMPTY.awaitingAnalysis
      ),
      roce: safeWorkspaceNumber(q.roce, 0),
      roe: safeWorkspaceNumber(q.roe, 0),
      managementQuality: safeWorkspaceText(
        q.managementQuality,
        COMPANY_WORKSPACE_EMPTY.awaitingAnalysis
      ),
      summary: safeWorkspaceText(q.summary, COMPANY_WORKSPACE_EMPTY.awaitingAnalysis),
    },
    risk: {
      business: normalizeStringList(r.business),
      financial: normalizeStringList(r.financial),
      valuation: normalizeStringList(r.valuation),
      sector: normalizeStringList(r.sector),
      aggregateScore: safeWorkspaceNumber(r.aggregateScore, 0),
      summary: safeWorkspaceText(r.summary, COMPANY_WORKSPACE_EMPTY.awaitingAnalysis),
    },
    insights: {
      businessSummary: safeWorkspaceText(
        i.businessSummary,
        COMPANY_WORKSPACE_EMPTY.noResearchAvailable
      ),
      investmentThesis: safeWorkspaceText(
        i.investmentThesis,
        COMPANY_WORKSPACE_EMPTY.noResearchAvailable
      ),
      aiRecommendation: safeWorkspaceText(
        i.aiRecommendation,
        COMPANY_WORKSPACE_EMPTY.noResearchAvailable
      ),
      confidence: safeWorkspaceNumber(i.confidence, 0),
      confidenceLabel: safeWorkspaceText(
        i.confidenceLabel,
        COMPANY_WORKSPACE_EMPTY.awaitingAnalysis
      ),
      bullCase: normalizeStringList(i.bullCase),
      bearCase: normalizeStringList(i.bearCase),
      catalysts: normalizeStringList(i.catalysts),
      headwinds: normalizeStringList(i.headwinds),
      keyTakeaways: normalizeStringList(i.keyTakeaways),
    },
    badges: {
      confidence: safeWorkspaceText(b.confidence, COMPANY_WORKSPACE_EMPTY.awaitingAnalysis),
      trust: safeWorkspaceText(b.trust, COMPANY_WORKSPACE_EMPTY.awaitingAnalysis),
      validation: safeWorkspaceText(
        b.validation,
        COMPANY_WORKSPACE_EMPTY.awaitingAnalysis
      ),
    },
  };
}

export function defaultSyncContext(
  ticker = "",
  now?: Date | null
): CompanySyncContext {
  return {
    ticker: safeWorkspaceText(ticker, "").toUpperCase(),
    timeframe: "1Y",
    period: "ttm",
    filters: {},
    researchContext: COMPANY_WORKSPACE_EMPTY.awaitingAnalysis,
    updatedAt: (now ?? new Date()).toISOString(),
  };
}

export function formatMetric(
  value: number,
  kind: "number" | "percent" | "currency" | "ratio" = "number"
): string {
  if (!Number.isFinite(value)) return "—";
  if (kind === "percent") return `${value.toFixed(1)}%`;
  if (kind === "currency") {
    if (Math.abs(value) >= 1e7) return `₹${(value / 1e7).toFixed(1)} Cr`;
    if (Math.abs(value) >= 1e5) return `₹${(value / 1e5).toFixed(1)} L`;
    return `₹${value.toFixed(2)}`;
  }
  if (kind === "ratio") return value.toFixed(2);
  return value.toFixed(2);
}

export function metricRow(
  id: string,
  label: string,
  value: string,
  emptyMessage: CompanyWorkspaceEmptyMessage,
  empty = false
): CompanyMetricRow {
  return {
    id,
    label,
    value: empty ? emptyMessage : safeWorkspaceText(value, emptyMessage),
    hint: label,
    empty,
    emptyMessage,
  };
}

export function sectionBlock(
  id: string,
  title: string,
  body: string,
  items: string[],
  emptyMessage: CompanyWorkspaceEmptyMessage,
  collapsed = false
): CompanySectionBlock {
  const cleanItems = normalizeStringList(items);
  const empty =
    cleanItems.length === 0 &&
    (!body ||
      body === emptyMessage ||
      body === COMPANY_WORKSPACE_EMPTY.awaitingAnalysis ||
      body === COMPANY_WORKSPACE_EMPTY.noResearchAvailable);
  return {
    id,
    title,
    body: safeWorkspaceText(body, emptyMessage),
    items: cleanItems,
    collapsed,
    empty,
    emptyMessage,
  };
}

function normalizeStringList(values?: string[] | null): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .map((v) => safeWorkspaceText(v, ""))
    .filter(Boolean);
}
