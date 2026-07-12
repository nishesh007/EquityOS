/**
 * Fundamentals provider architecture — Sprint 7B.
 * Normalized internal types + provider interface.
 */

import type {
  AnnualFinancial,
  CompanyFinancials,
  CompanyNews,
  CompanyNote,
  CompanyTimelineEvent,
  PeerCompany,
  QuarterlyResult,
  ShareholdingPattern,
  ValuationMetric,
} from "@/types";
import type { DataSource, ProviderTier } from "@/lib/providers/types";

export type StatementPeriod = "annual" | "quarterly";
export type StatementType = "income" | "balance" | "cashflow";

export interface StatementLineItem {
  label: string;
  value: number;
  unit: "INR_CR" | "INR" | "ratio" | "percent";
}

export interface FinancialStatementPeriod {
  period: string;
  periodType: StatementPeriod;
  fiscalYear?: string;
  fiscalQuarter?: string;
  date: string;
  currency: string;
  lines: StatementLineItem[];
}

export interface FinancialStatements {
  income: FinancialStatementPeriod[];
  balance: FinancialStatementPeriod[];
  cashflow: FinancialStatementPeriod[];
}

export interface FinancialRatios {
  marketCap?: number;
  enterpriseValue?: number;
  pe?: number;
  forwardPe?: number;
  peg?: number;
  pb?: number;
  ps?: number;
  evToEbitda?: number;
  dividendYield?: number;
  roe?: number;
  roce?: number;
  roa?: number;
  debtToEquity?: number;
  currentRatio?: number;
  interestCoverage?: number;
  operatingMargin?: number;
  netMargin?: number;
  grossMargin?: number;
  eps?: number;
  bookValue?: number;
  freeCashFlow?: number;
}

export interface GrowthMetrics {
  revenueGrowth: number;
  profitGrowth: number;
  epsGrowth: number;
  operatingCashFlowGrowth: number;
  freeCashFlowGrowth: number;
  cagr3Year: number;
  cagr5Year: number;
}

export interface ShareholdingSnapshot {
  promoter: number;
  fii: number;
  dii: number;
  public: number;
  lastUpdated: string;
}

export interface ShareholdingChange {
  promoter: number;
  fii: number;
  dii: number;
  public: number;
}

export interface EnrichedShareholding extends ShareholdingPattern {
  previous?: ShareholdingSnapshot;
  changes?: ShareholdingChange;
}

export type CorporateActionType =
  | "Dividend"
  | "Bonus"
  | "Split"
  | "Rights"
  | "Buyback"
  | "Merger"
  | "Demerger";

export interface CorporateAction {
  id: string;
  type: CorporateActionType;
  date: string;
  title: string;
  description: string;
  value?: string;
}

export type SurpriseDirection = "positive" | "negative" | "neutral";

export interface EnrichedQuarterlyResult extends QuarterlyResult {
  ebitda?: string;
  revenueQoQ?: number;
  revenueYoY?: number;
  profitQoQ?: number;
  profitYoY?: number;
  epsQoQ?: number;
  epsYoY?: number;
  surprise?: SurpriseDirection;
}

export interface FundamentalsBundle {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  description: string;
  website: string;
  founded: string;
  employees: string;
  marketCap: string;
  price: number;
  change: number;
  changePercent: number;
  financials: CompanyFinancials;
  statements: FinancialStatements;
  ratios: FinancialRatios;
  growth: GrowthMetrics;
  quarterlyResults: EnrichedQuarterlyResult[];
  annualFinancials: AnnualFinancial[];
  shareholding: EnrichedShareholding;
  corporateActions: CorporateAction[];
  timeline: CompanyTimelineEvent[];
  valuation: ValuationMetric[];
  peers: PeerCompany[];
  news: CompanyNews[];
  notes: CompanyNote[];
  provider: string;
  source: DataSource;
  fetchedAt: string;
}

export interface FundamentalsProvider {
  readonly name: string;
  readonly tier: ProviderTier;
  isAvailable(): boolean;
  fetchFundamentals(symbol: string): Promise<FundamentalsBundle>;
}

export interface FundamentalsFailoverResult {
  data: FundamentalsBundle;
  provider: string;
  source: DataSource;
  attempted: string[];
}

/** Sprint 8C — institutional-grade fundamentals engine output. */
export interface FinancialFundamentals {
  symbol: string;
  computedAt: string;
  source: DataSource;

  revenue: string;
  revenueCagr: number | null;
  profitCagr: number | null;
  eps: number | null;
  dilutedEps: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  grossMargin: number | null;
  roe: number | null;
  roce: number | null;
  roa: number | null;
  debtEquity: number | null;
  interestCoverage: number | null;
  currentRatio: number | null;
  quickRatio: number | null;
  cashConversion: number | null;
  fcf: string;
  fcfMargin: number | null;
  dividendYield: number | null;
  bookValue: number | null;
  pe: number | null;
  forwardPe: number | null;
  pb: number | null;
  evEbitda: number | null;
  peg: number | null;
  enterpriseValue: string;
  marketCap: string;

  capitalAllocationScore: number;
  qualityScore: number;
  growthScore: number;
  profitabilityScore: number;
  financialStrength: number;
  valuationScore: number;

  piotroskiFScore: number | null;
  altmanZScore: number | null;
  beneishMScore: number | null;
}
