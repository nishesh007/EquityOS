/**
 * Quality Compounder types — Sprint 11B.3Y.
 * BUY / HOLD / WATCH / AVOID recommendations.
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
import type { QualityCompounderConfig } from "./QualityCompounderConstants";
import type { QualityCompounderExplainability } from "./QualityCompounderExplainability";
import type { QualityCompounderInstitutionalScore } from "./QualityCompounderScoring";

export type QualityCompounderRecommendation =
  | "BUY"
  | "HOLD"
  | "WATCH"
  | "AVOID";

export type QualityCompounderBusinessGrade =
  | "Exceptional"
  | "Excellent"
  | "Good"
  | "Average"
  | "Weak";

export type QualityCompounderMoatClassification =
  | "Wide Moat"
  | "Narrow Moat"
  | "No Moat";

export type QualityCompounderValuationStatus =
  | "Undervalued"
  | "Fair Value"
  | "Premium Quality"
  | "Overvalued";

export type QualityCompounderPositionSize =
  | "Starter Position"
  | "Core Position"
  | "High Conviction Position"
  | "Maximum Allocation"
  | "None";

export interface QualityCompounderYearlyFinancials {
  year: number;
  revenue: number;
  eps: number;
  operatingProfit: number;
  operatingCashFlow: number;
  freeCashFlow: number;
  bookValue?: number | null;
  grossMargin?: number | null;
  operatingMargin?: number | null;
  netMargin?: number | null;
  roe?: number | null;
  roce?: number | null;
  roic?: number | null;
}

export interface QualityCompounderMoatInputs {
  brand: number;
  networkEffects: number;
  switchingCosts: number;
  costAdvantage: number;
  patents: number;
  distribution: number;
  technology: number;
  regulatoryAdvantage: number;
  scaleAdvantage: number;
  recurringCustomers: number;
}

export interface QualityCompounderBusinessInputs {
  businessSimplicity: number;
  businessPredictability: number;
  recurringRevenue: number;
  pricingPower: number;
  brandStrength: number;
  distributionNetwork: number;
  customerStickiness: number;
  marketLeadership: number;
  scalability: number;
  industryPosition: number;
}

export interface QualityCompounderManagementInputs {
  integrity: number;
  capitalAllocation: number;
  governance: number;
  promoterQuality: number;
  accountingQuality: number;
  shareholderAlignment: number;
  communication: number;
  executionTrackRecord: number;
}

export interface QualityCompounderCapitalInputs {
  roic: number;
  reinvestmentRate: number;
  buybackQuality: number;
  dividendPolicy: number;
  acquisitionHistory: number;
  debtManagement: number;
  cashAllocation: number;
  shareDilutionRisk: number;
}

export interface QualityCompounderCurrentSnapshot {
  currentPrice: number;
  intrinsicValueEstimate: number;
  revenueCagr?: number | null;
  epsCagr?: number | null;
  pe: number | null;
  pb: number | null;
  peg: number | null;
  evEbitda: number | null;
  fcfYield: number;
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
  freeCashFlow: number;
  operatingCashFlow: number;
  dividendHistoryYears: number;
  shareBuybacks: boolean;
  promoterHolding: number;
  promoterPledge: number;
  institutionalHolding: number;
  sector: string;
  industry: string;
  corporateGovernanceScore: number;
  creditRating?: string | null;
  marketShare: number;
  analystGrowthEstimate: number;
  governanceRedFlags: boolean;
  accountingConcerns: boolean;
  businessDisruption: boolean;
}

export interface QualityCompounderMarketData {
  financialHistory: QualityCompounderYearlyFinancials[];
  current: QualityCompounderCurrentSnapshot;
  business: QualityCompounderBusinessInputs;
  moat: QualityCompounderMoatInputs;
  management: QualityCompounderManagementInputs;
  capital: QualityCompounderCapitalInputs;
}

export interface QualityCompounderBusinessAnalysis {
  score: number;
  grade: QualityCompounderBusinessGrade;
  predictability: number;
  reasons: string[];
  warnings: string[];
}

export interface QualityCompounderMoatAnalysis {
  score: number;
  classification: QualityCompounderMoatClassification;
  reasons: string[];
  warnings: string[];
}

export interface QualityCompounderGrowthAnalysis {
  score: number;
  revenueCagr: number;
  epsCagr: number;
  fcfCagr: number;
  bookValueCagr: number;
  roeStability: number;
  roceStability: number;
  marginStability: number;
  capitalEfficiency: number;
  reinvestmentAbility: number;
  growthSustainability: number;
  reasons: string[];
  warnings: string[];
}

export interface QualityCompounderCapitalAllocationAnalysis {
  score: number;
  roic: number;
  reinvestmentRate: number;
  reasons: string[];
  warnings: string[];
}

export interface QualityCompounderFinancialAnalysis {
  score: number;
  consistentRoe: boolean;
  consistentRoce: boolean;
  positiveRoic: boolean;
  positiveFcf: boolean;
  healthyBalanceSheet: boolean;
  lowDebt: boolean;
  healthyLiquidity: boolean;
  stableMargins: boolean;
  cashFlowQuality: number;
  reasons: string[];
  warnings: string[];
}

export interface QualityCompounderManagementAnalysis {
  score: number;
  governanceRedFlags: boolean;
  accountingQuality: number;
  reasons: string[];
  warnings: string[];
}

export interface QualityCompounderValuationAnalysis {
  score: number;
  status: QualityCompounderValuationStatus;
  intrinsicValue: number;
  currentPrice: number;
  marginOfSafety: number;
  reasons: string[];
  warnings: string[];
}

export interface QualityCompounderDetection {
  detected: boolean;
  recommendation: QualityCompounderRecommendation;
  business: QualityCompounderBusinessAnalysis;
  moat: QualityCompounderMoatAnalysis;
  growth: QualityCompounderGrowthAnalysis;
  capital: QualityCompounderCapitalAllocationAnalysis;
  financial: QualityCompounderFinancialAnalysis;
  management: QualityCompounderManagementAnalysis;
  valuation: QualityCompounderValuationAnalysis;
  qualityScore: number;
  confidence: number;
  reasons: string[];
  warnings: string[];
}

export interface QualityCompounderInvestmentSetup {
  detection: QualityCompounderDetection;
  recommendation: QualityCompounderRecommendation;
  intrinsicValue: number;
  currentPrice: number;
  marginOfSafety: number;
  economicMoat: QualityCompounderMoatClassification;
  businessQuality: number;
  managementQuality: number;
  financialStrength: number;
  capitalAllocation: number;
  growthSustainability: number;
  valuationStatus: QualityCompounderValuationStatus;
  expectedCagr: number;
  suggestedHoldingPeriod: string;
  positionSize: QualityCompounderPositionSize;
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
  explainability: QualityCompounderExplainability;
  institutionalScore: QualityCompounderInstitutionalScore;
}

export interface QualityCompounderStrategyInput extends StrategyMarketInput {
  qualityCompounder: QualityCompounderMarketData;
}

export interface QualityCompounderDetectionContext {
  input: QualityCompounderStrategyInput;
  marketContext: InstitutionalMarketContext;
  regime: MarketRegime;
  confidence: RegimeConfidenceAnalysis;
  eligibleStrategies: readonly EligibleStrategy[];
  config?: Partial<QualityCompounderConfig>;
  timestamp?: Date;
}

export interface QualityCompounderValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function isQualityCompounderStrategyInput(
  input:
    | StrategyMarketInput
    | QualityCompounderStrategyInput
    | null
    | undefined
): input is QualityCompounderStrategyInput {
  if (!input || !("qualityCompounder" in input) || !input.qualityCompounder) {
    return false;
  }
  const d = input.qualityCompounder;
  return (
    Array.isArray(d.financialHistory) &&
    !!d.current &&
    !!d.business &&
    !!d.moat &&
    !!d.management &&
    !!d.capital
  );
}

export function toQualityCompounderDetectionContext(
  context: StrategyExecutionContext
): QualityCompounderDetectionContext | null {
  if (!isQualityCompounderStrategyInput(context.input)) return null;
  return {
    input: context.input,
    marketContext: context.marketContext,
    regime: context.regime,
    confidence: context.confidence,
    eligibleStrategies: context.eligibleStrategies,
    timestamp: context.timestamp,
  };
}
