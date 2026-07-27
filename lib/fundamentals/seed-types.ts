/**
 * Fundamentals seed shape — company identity + fundamentals only.
 * Never includes LTP / OHLC / volume / change%.
 */

import type {
  AnnualFinancial,
  CompanyFinancials,
  CompanyNews,
  CompanyNote,
  PeerCompany,
  QuarterlyResult,
  ShareholdingPattern,
  ValuationMetric,
} from "@/types";

/** Peer row from fundamentals — ratios + identity; price filled by market-data later. */
export type FundamentalsPeerSeed = Omit<PeerCompany, "price" | "changePercent" | "quote"> & {
  pe: number;
  marketCap: string;
};

export interface FundamentalsSeedProfile {
  symbol: string;
  name: string;
  /** Static enrichment label only — not computed from mock LTP. */
  marketCap: string;
  sector: string;
  industry: string;
  description: string;
  website: string;
  founded: string;
  employees: string;
  financials: CompanyFinancials;
  quarterlyResults: QuarterlyResult[];
  annualFinancials: AnnualFinancial[];
  shareholding: ShareholdingPattern;
  peers: FundamentalsPeerSeed[];
  valuation: ValuationMetric[];
  news: CompanyNews[];
  notes: CompanyNote[];
}
