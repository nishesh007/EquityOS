/**
 * Buffett Quality Investing types — Sprint 11B.3U.
 * BUY / HOLD / AVOID recommendations.
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
import type { BuffettConfig } from "./BuffettConstants";
import type { BuffettExplainability } from "./BuffettExplainability";
import type { BuffettInstitutionalScore } from "./BuffettScoring";

export type BuffettRecommendation = "BUY" | "HOLD" | "AVOID";

export type BuffettMoatClassification = "Wide Moat" | "Narrow Moat" | "No Moat";

export type BuffettValuationStatus =
  | "Undervalued"
  | "Fairly Valued"
  | "Overvalued";

export type BuffettPositionSize =
  | "Starter Position"
  | "Half Position"
  | "Full Position"
  | "Maximum Allocation"
  | "None";

export interface BuffettYearlyFinancials {
  year: number;
  revenue: number;
  eps: number;
  operatingProfit: number;
  netProfit: number;
  operatingCashFlow: number;
  freeCashFlow: number;
  grossMargin?: number | null;
  operatingMargin?: number | null;
  netMargin?: number | null;
  roe?: number | null;
  roce?: number | null;
  roic?: number | null;
  debt?: number | null;
  equity?: number | null;
  bookValue?: number | null;
}

export interface BuffettMoatInputs {
  brandStrength: number;
  networkEffects: number;
  switchingCosts: number;
  costLeadership: number;
  patents: number;
  distributionAdvantage: number;
  marketShare: number;
  pricingPower: number;
  recurringRevenue: number;
  industryLeadership: number;
}

export interface BuffettManagementInputs {
  capitalAllocation: number;
  corporateGovernance: number;
  promoterIntegrity: number;
  shareholderFriendliness: number;
  dividendPolicy: number;
  buybackQuality: number;
  accountingQuality: number;
  relatedPartyRisk: number;
}

export interface BuffettCurrentSnapshot {
  currentPrice: number;
  intrinsicValueEstimate: number;
  roe: number;
  roce: number;
  roic: number;
  debtEquity: number;
  currentRatio: number;
  interestCoverage: number;
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
  bookValue: number;
  pe: number | null;
  pb: number | null;
  evEbitda: number | null;
  fcfYield: number;
  promoterHolding: number;
  promoterPledge: number;
  institutionalHolding: number;
  sector: string;
  industry: string;
  creditRating?: string | null;
  dividendHistoryYears?: number | null;
  shareBuybacks?: boolean;
  governanceRedFlags?: boolean;
  accountingConcerns?: boolean;
}

export interface BuffettMarketData {
  financialHistory: readonly BuffettYearlyFinancials[];
  current: BuffettCurrentSnapshot;
  moat: BuffettMoatInputs;
  management: BuffettManagementInputs;
}

export interface BuffettBusinessAnalysis {
  score: number;
  revenueConsistency: number;
  epsConsistency: number;
  cashFlowConsistency: number;
  profitConsistency: number;
  marginStability: number;
  capitalAllocation: number;
  predictability: number;
  businessSimplicity: number;
  reasons: string[];
  warnings: string[];
}

export interface BuffettMoatAnalysis {
  score: number;
  classification: BuffettMoatClassification;
  brandStrength: number;
  networkEffects: number;
  switchingCosts: number;
  costLeadership: number;
  patents: number;
  distributionAdvantage: number;
  marketShare: number;
  pricingPower: number;
  recurringRevenue: number;
  industryLeadership: number;
  reasons: string[];
  warnings: string[];
}

export interface BuffettFinancialAnalysis {
  score: number;
  balanceSheetScore: number;
  roeOk: boolean;
  roceOk: boolean;
  roicOk: boolean;
  debtOk: boolean;
  positiveFcf: boolean;
  consistentEarnings: boolean;
  healthyMargins: boolean;
  positiveOcf: boolean;
  reasons: string[];
  warnings: string[];
}

export interface BuffettManagementAnalysis {
  score: number;
  capitalAllocation: number;
  corporateGovernance: number;
  promoterIntegrity: number;
  shareholderFriendliness: number;
  dividendPolicy: number;
  buybackQuality: number;
  accountingQuality: number;
  relatedPartyRisk: number;
  governanceRedFlags: boolean;
  reasons: string[];
  warnings: string[];
}

export interface BuffettValuationAnalysis {
  score: number;
  status: BuffettValuationStatus;
  intrinsicValue: number;
  currentPrice: number;
  marginOfSafety: number;
  dcfSupportive: boolean;
  peOk: boolean;
  fcfYieldOk: boolean;
  reasons: string[];
  warnings: string[];
}

export interface BuffettDetection {
  detected: boolean;
  recommendation: BuffettRecommendation;
  business: BuffettBusinessAnalysis;
  moat: BuffettMoatAnalysis;
  financial: BuffettFinancialAnalysis;
  management: BuffettManagementAnalysis;
  valuation: BuffettValuationAnalysis;
  qualityScore: number;
  confidence: number;
  reasons: string[];
  warnings: string[];
}

export interface BuffettInvestmentSetup {
  detection: BuffettDetection;
  recommendation: BuffettRecommendation;
  intrinsicValue: number;
  currentPrice: number;
  marginOfSafety: number;
  economicMoat: BuffettMoatClassification;
  businessQuality: number;
  managementQuality: number;
  financialStrength: number;
  valuationStatus: BuffettValuationStatus;
  positionSize: BuffettPositionSize;
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
  explainability: BuffettExplainability;
  institutionalScore: BuffettInstitutionalScore;
}

export interface BuffettStrategyInput extends StrategyMarketInput {
  buffett: BuffettMarketData;
}

export interface BuffettDetectionContext {
  input: BuffettStrategyInput;
  marketContext: InstitutionalMarketContext;
  regime: MarketRegime;
  confidence: RegimeConfidenceAnalysis;
  eligibleStrategies: readonly EligibleStrategy[];
  config?: Partial<BuffettConfig>;
  timestamp?: Date;
}

export interface BuffettValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function isBuffettStrategyInput(
  input: StrategyMarketInput | BuffettStrategyInput | null | undefined
): input is BuffettStrategyInput {
  if (!input || !("buffett" in input) || !input.buffett) {
    return false;
  }
  return (
    Array.isArray(input.buffett.financialHistory) &&
    !!input.buffett.current &&
    !!input.buffett.moat &&
    !!input.buffett.management
  );
}

export function toBuffettDetectionContext(
  context: StrategyExecutionContext
): BuffettDetectionContext | null {
  if (!isBuffettStrategyInput(context.input)) return null;
  return {
    input: context.input,
    marketContext: context.marketContext,
    regime: context.regime,
    confidence: context.confidence,
    eligibleStrategies: context.eligibleStrategies,
    timestamp: context.timestamp,
  };
}
