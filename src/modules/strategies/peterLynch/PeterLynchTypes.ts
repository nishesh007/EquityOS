/**
 * Peter Lynch GARP types — Sprint 11B.3W.
 * BUY / WATCH / AVOID recommendations.
 */

import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import type {
  MarketRegime,
  RegimeConfidenceAnalysis,
} from "@/src/modules/marketRegime";
import type { EligibleStrategy } from "@/src/modules/strategyEligibility";
import type {
  StrategyExecutionContext,
  StrategyMarketInput,
} from "../StrategyTypes";
import type { PeterLynchConfig } from "./PeterLynchConstants";
import type { PeterLynchExplainability } from "./PeterLynchExplainability";
import type { PeterLynchInstitutionalScore } from "./PeterLynchScoring";

export type PeterLynchRecommendation = "BUY" | "WATCH" | "AVOID";

export type PeterLynchGrowthGrade =
  | "Excellent"
  | "Good"
  | "Average"
  | "Weak";

export type PeterLynchPegBand =
  | "PEG < 1"
  | "PEG 1–1.5"
  | "PEG 1.5–2"
  | "PEG > 2";

export type PeterLynchValuationStatus =
  | "Undervalued"
  | "Fair Value"
  | "Overvalued";

export type PeterLynchPositionSize =
  | "Starter Position"
  | "Half Position"
  | "Full Position"
  | "Maximum Allocation"
  | "None";

export interface PeterLynchYearlyFinancials {
  year: number;
  revenue: number;
  eps: number;
  netProfit: number;
  operatingProfit: number;
  operatingCashFlow: number;
  freeCashFlow: number;
  operatingMargin?: number | null;
  netMargin?: number | null;
  grossMargin?: number | null;
}

export interface PeterLynchBusinessInputs {
  scalableBusiness: number;
  marketOpportunity: number;
  competitivePosition: number;
  brandStrength: number;
  productLeadership: number;
  innovation: number;
  customerRetention: number;
  recurringRevenue: number;
}

export interface PeterLynchCurrentSnapshot {
  currentPrice: number;
  intrinsicValueEstimate: number;
  revenueCagr?: number | null;
  epsCagr?: number | null;
  pe: number | null;
  peg: number | null;
  pb: number | null;
  evEbitda: number | null;
  dividendYield: number;
  roe: number;
  roce: number;
  roic: number;
  debtEquity: number;
  currentRatio: number;
  interestCoverage: number;
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
  freeCashFlow: number;
  operatingCashFlow: number;
  marketCap: number;
  institutionalHolding: number;
  promoterHolding: number;
  promoterPledge: number;
  sector: string;
  industry: string;
  corporateGovernanceScore: number;
  analystGrowthEstimate: number;
  governanceRedFlags: boolean;
  accountingConcerns: boolean;
}

export interface PeterLynchMarketData {
  financialHistory: PeterLynchYearlyFinancials[];
  current: PeterLynchCurrentSnapshot;
  business: PeterLynchBusinessInputs;
}

export interface PeterLynchGrowthAnalysis {
  score: number;
  grade: PeterLynchGrowthGrade;
  revenueCagr: number;
  epsCagr: number;
  profitCagr: number;
  cashFlowCagr: number;
  marginExpansion: number;
  marketShareGrowth: number;
  businessScalability: number;
  growthConsistency: number;
  growthRate: number;
  reasons: string[];
  warnings: string[];
}

export interface PeterLynchPegAnalysis {
  score: number;
  pegRatio: number;
  forwardPeg: number;
  historicalPeg: number;
  growthAdjustedPe: number;
  band: PeterLynchPegBand;
  reasons: string[];
  warnings: string[];
}

export interface PeterLynchBusinessAnalysis {
  score: number;
  scalableBusiness: number;
  marketOpportunity: number;
  competitivePosition: number;
  brandStrength: number;
  productLeadership: number;
  innovation: number;
  customerRetention: number;
  recurringRevenue: number;
  reasons: string[];
  warnings: string[];
}

export interface PeterLynchFinancialAnalysis {
  score: number;
  positiveFcf: boolean;
  positiveOcf: boolean;
  roeOk: boolean;
  roceOk: boolean;
  debtOk: boolean;
  growingMargins: boolean;
  healthyBalanceSheet: boolean;
  earningsQuality: number;
  cashFlowQuality: number;
  reasons: string[];
  warnings: string[];
}

export interface PeterLynchValuationAnalysis {
  score: number;
  status: PeterLynchValuationStatus;
  intrinsicValue: number;
  currentPrice: number;
  marginOfSafety: number;
  peOk: boolean;
  pegOk: boolean;
  growthPremium: number;
  reasons: string[];
  warnings: string[];
}

export interface PeterLynchDetection {
  detected: boolean;
  recommendation: PeterLynchRecommendation;
  growth: PeterLynchGrowthAnalysis;
  peg: PeterLynchPegAnalysis;
  business: PeterLynchBusinessAnalysis;
  financial: PeterLynchFinancialAnalysis;
  valuation: PeterLynchValuationAnalysis;
  qualityScore: number;
  confidence: number;
  reasons: string[];
  warnings: string[];
}

export interface PeterLynchInvestmentSetup {
  detection: PeterLynchDetection;
  recommendation: PeterLynchRecommendation;
  growthRate: number;
  revenueCagr: number;
  epsCagr: number;
  pegRatio: number;
  peRatio: number | null;
  intrinsicValue: number;
  valuationStatus: PeterLynchValuationStatus;
  businessQuality: number;
  financialStrength: number;
  positionSize: PeterLynchPositionSize;
  expectedHoldingPeriod: string;
  qualityScore: number;
  conviction: number;
  signalGrade: string;
  confidence: number;
  entry: number;
  stopLoss: number;
  target1: number;
  target2: number;
  finalTarget: number;
  risk: number;
  reward: number;
  riskReward: number;
  warnings: string[];
  positiveReasons: string[];
  negativeReasons: string[];
  neutralReasons: string[];
  institutionalSummary: string[];
  explainability: PeterLynchExplainability;
  institutionalScore: PeterLynchInstitutionalScore;
}

export interface PeterLynchStrategyInput extends StrategyMarketInput {
  peterLynch: PeterLynchMarketData;
}

export interface PeterLynchDetectionContext {
  input: PeterLynchStrategyInput;
  marketContext: InstitutionalMarketContext;
  regime: MarketRegime;
  confidence: RegimeConfidenceAnalysis;
  eligibleStrategies: readonly EligibleStrategy[];
  config?: Partial<PeterLynchConfig>;
  timestamp?: Date;
}

export interface PeterLynchValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function isPeterLynchStrategyInput(
  input: StrategyMarketInput | PeterLynchStrategyInput | null | undefined
): input is PeterLynchStrategyInput {
  if (!input || !("peterLynch" in input) || !input.peterLynch) {
    return false;
  }
  return (
    Array.isArray(input.peterLynch.financialHistory) &&
    !!input.peterLynch.current &&
    !!input.peterLynch.business
  );
}

export function toPeterLynchDetectionContext(
  context: StrategyExecutionContext
): PeterLynchDetectionContext | null {
  if (!isPeterLynchStrategyInput(context.input)) return null;
  return {
    input: context.input,
    marketContext: context.marketContext,
    regime: context.regime,
    confidence: context.confidence,
    eligibleStrategies: context.eligibleStrategies,
    timestamp: context.timestamp,
  };
}
