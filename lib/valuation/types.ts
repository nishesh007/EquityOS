/**
 * Sprint 8D — AI Research & Valuation Engine types.
 */

import type {
  RecommendationLevel,
  ValuationVerdict,
} from "@/types";

export interface ValuationInputs {
  symbol: string;
  name: string;
  price: number;
  sector: string;
  industry: string;
  pe: number;
  pb: number;
  evEbitda: number;
  peg: number;
  eps: number;
  bookValuePerShare: number;
  revenueCr: number;
  netProfitCr: number;
  revenueGrowth: number;
  profitGrowth: number;
  roe: number;
  roce: number;
  debtEquity: number;
  operatingMargin: number;
  fcfCr: number;
  marketCapCr: number;
  enterpriseValueCr: number;
  sharesOutstanding: number;
  beta: number;
  sectorPe: number;
  sectorPb: number;
  sectorEvEbitda: number;
  peerPe: number;
  peerPb: number;
  peerEvEbitda: number;
}

export interface ValuationModelResult {
  key: string;
  label: string;
  fairValue: number;
  weight: number;
  verdict: ValuationVerdict;
  confidence: number;
  explanation: string;
}

export interface IntrinsicValuationResult {
  intrinsicValue: number;
  fairValue: number;
  marginOfSafety: number;
  upsidePercent: number;
  expectedCagr: number;
  models: ValuationModelResult[];
  blendedConfidence: number;
  overallVerdict: ValuationVerdict;
  available: boolean;
}

export interface RecommendationInput {
  valuation: IntrinsicValuationResult;
  qualityScore: number;
  financialScore: number;
  technicalScore: number;
  growthScore: number;
  riskScore: number;
  cashFlowScore: number;
  balanceSheetScore: number;
  redFlagCount: number;
  highSeverityFlags: number;
}

export interface ResearchNarrativeInput {
  profile: {
    name: string;
    sector: string;
    industry: string;
    price: number;
  };
  financials: {
    roe: number;
    roce: number;
    revenueGrowth: number;
    profitGrowth: number;
    debtEquity: number;
    pe: number;
    pb: number;
  };
  valuation: IntrinsicValuationResult;
  qualityScore: number;
  financialQualityScore: number;
  technicalScore: number;
  technicalSummary: string;
  recommendation: RecommendationLevel;
  equityScore: number;
  redFlags: { label: string; description: string; severity: string }[];
  opportunities: { label: string; description: string }[];
  promoterHolding: number;
  fiiHolding: number;
  diiHolding: number;
}

export interface ResearchNarrative {
  sections: { title: string; content: string }[];
  bullCase: string;
  bearCase: string;
  keyRisks: string[];
  keyCatalysts: string[];
  managementQuality: string;
  moat: string;
  valuationOpinion: string;
}

export interface ConfidenceInput {
  businessScore: number;
  financialScore: number;
  technicalScore: number;
  valuationConfidence: number;
  riskScore: number;
  profile: { sector: string; industry: string; changePercent: number };
  valuation: IntrinsicValuationResult;
}

export interface ConfidenceResult {
  overall: number;
  factors: {
    key: string;
    label: string;
    score: number;
    explanation: string;
  }[];
}

export interface PriceTargetInput {
  price: number;
  intrinsicValue: number;
  fairValue: number;
  technicalScore: number;
  support: number;
  resistance: number;
  marginOfSafety: number;
  upsidePercent: number;
  riskMeter: number;
  swingEntryLow?: number;
  swingEntryHigh?: number;
  swingStopLoss?: number;
  swingTarget1?: number;
  swingTarget3?: number;
  swingPositionSize?: number;
  swingCapitalAllocation?: number;
}

export interface PriceTargetResult {
  target1: number;
  target2: number;
  target3: number;
  stopLoss: number;
  trailingStop: number;
  invalidationLevel: number;
  idealBuyZone: string;
  breakoutBuy: number;
  swingBuy: string;
  longTermBuy: string;
  positionSize: number;
  capitalAllocationPercent: number;
  riskReward: number;
}

export interface DecisionTimelineItem {
  id: string;
  phase: string;
  title: string;
  description: string;
  horizon: string;
}

export interface ResearchSummaryInput {
  profile: { name: string };
  financials: { roce: number; roe: number; revenueGrowth: number; pe: number; debtEquity: number };
  valuation: IntrinsicValuationResult;
  recommendation: RecommendationLevel;
  decisionScore: number;
  redFlags: { label: string; description: string }[];
  opportunities: { label: string; description: string }[];
  thesis: ResearchNarrative;
}

export interface ResearchSummary {
  institutionalSummary: string;
  whyBuy: string[];
  whyNotBuy: string[];
  majorRisks: string[];
  majorOpportunities: string[];
  catalysts: string[];
  redFlags: string[];
  greenFlags: string[];
}
