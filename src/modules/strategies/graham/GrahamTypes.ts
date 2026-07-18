/**
 * Graham Value Investing types — Sprint 11B.3V.
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
import type { GrahamConfig } from "./GrahamConstants";
import type { GrahamExplainability } from "./GrahamExplainability";
import type { GrahamInstitutionalScore } from "./GrahamScoring";

export type GrahamRecommendation = "BUY" | "WATCH" | "AVOID";

export type GrahamScreenResult = "Pass" | "Borderline" | "Fail";

export type GrahamValuationStatus =
  | "Undervalued"
  | "Fairly Valued"
  | "Overvalued";

export type GrahamPositionSize =
  | "Starter Position"
  | "Half Position"
  | "Full Position"
  | "Maximum Allocation"
  | "None";

export interface GrahamYearlyFinancials {
  year: number;
  revenue: number;
  eps: number;
  bookValue: number;
  tangibleBookValue?: number | null;
  operatingCashFlow: number;
  freeCashFlow: number;
  dividendPerShare?: number | null;
}

export interface GrahamCurrentSnapshot {
  currentPrice: number;
  intrinsicValueEstimate: number;
  bookValue: number;
  tangibleBookValue: number;
  currentAssets: number;
  currentLiabilities: number;
  totalAssets: number;
  totalLiabilities: number;
  workingCapital: number;
  cash: number;
  debt: number;
  debtEquity: number;
  currentRatio: number;
  quickRatio: number;
  interestCoverage: number;
  operatingCashFlow: number;
  freeCashFlow: number;
  pe: number | null;
  pb: number | null;
  evEbitda: number | null;
  marketCap: number;
  promoterHolding: number;
  institutionalHolding: number;
  creditRating?: string | null;
  dividendHistoryYears: number;
  governanceRedFlags: boolean;
  accountingConcerns: boolean;
  corporateGovernanceScore: number;
}

export interface GrahamMarketData {
  financialHistory: GrahamYearlyFinancials[];
  current: GrahamCurrentSnapshot;
}

export interface GrahamScreenBreakdown {
  financialStrength: GrahamScreenResult;
  currentRatio: GrahamScreenResult;
  quickRatio: GrahamScreenResult;
  debtEquity: GrahamScreenResult;
  interestCoverage: GrahamScreenResult;
  positiveEarnings: GrahamScreenResult;
  positiveCashFlow: GrahamScreenResult;
  dividendConsistency: GrahamScreenResult;
  bookValueGrowth: GrahamScreenResult;
  workingCapital: GrahamScreenResult;
}

export interface GrahamFinancialAnalysis {
  score: number;
  screens: GrahamScreenBreakdown;
  positiveEarnings: boolean;
  positiveFcf: boolean;
  positiveOcf: boolean;
  earningsStability: number;
  cashFlowQuality: number;
  reasons: string[];
  warnings: string[];
}

export interface GrahamBalanceSheetAnalysis {
  score: number;
  currentRatioOk: boolean;
  quickRatioOk: boolean;
  debtOk: boolean;
  interestCoverageOk: boolean;
  workingCapitalOk: boolean;
  liquidityScore: number;
  leverageScore: number;
  reasons: string[];
  warnings: string[];
}

export interface GrahamIntrinsicValueAnalysis {
  score: number;
  intrinsicValue: number;
  grahamNumber: number;
  bookBasedValue: number;
  normalizedEarningsValue: number;
  conservativeFairValue: number;
  confidence: number;
  reasons: string[];
  warnings: string[];
}

export interface GrahamMarginSafetyAnalysis {
  score: number;
  marginOfSafety: number;
  discountPercent: number;
  upsidePercent: number;
  status: GrahamValuationStatus;
  peOk: boolean;
  pbOk: boolean;
  reasons: string[];
  warnings: string[];
}

export interface GrahamDetection {
  detected: boolean;
  recommendation: GrahamRecommendation;
  financial: GrahamFinancialAnalysis;
  balanceSheet: GrahamBalanceSheetAnalysis;
  intrinsic: GrahamIntrinsicValueAnalysis;
  marginSafety: GrahamMarginSafetyAnalysis;
  qualityScore: number;
  confidence: number;
  reasons: string[];
  warnings: string[];
}

export interface GrahamInvestmentSetup {
  detection: GrahamDetection;
  recommendation: GrahamRecommendation;
  intrinsicValue: number;
  currentPrice: number;
  marginOfSafety: number;
  discountPercent: number;
  upsidePotential: number;
  financialStrength: number;
  balanceSheetScore: number;
  valuationStatus: GrahamValuationStatus;
  positionSize: GrahamPositionSize;
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
  explainability: GrahamExplainability;
  institutionalScore: GrahamInstitutionalScore;
}

export interface GrahamStrategyInput extends StrategyMarketInput {
  graham: GrahamMarketData;
}

export interface GrahamDetectionContext {
  input: GrahamStrategyInput;
  marketContext: InstitutionalMarketContext;
  regime: MarketRegime;
  confidence: RegimeConfidenceAnalysis;
  eligibleStrategies: readonly EligibleStrategy[];
  config?: Partial<GrahamConfig>;
  timestamp?: Date;
}

export interface GrahamValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function isGrahamStrategyInput(
  input: StrategyMarketInput | GrahamStrategyInput | null | undefined
): input is GrahamStrategyInput {
  if (!input || !("graham" in input) || !input.graham) {
    return false;
  }
  return (
    Array.isArray(input.graham.financialHistory) && !!input.graham.current
  );
}

export function toGrahamDetectionContext(
  context: StrategyExecutionContext
): GrahamDetectionContext | null {
  if (!isGrahamStrategyInput(context.input)) return null;
  return {
    input: context.input,
    marketContext: context.marketContext,
    regime: context.regime,
    confidence: context.confidence,
    eligibleStrategies: context.eligibleStrategies,
    timestamp: context.timestamp,
  };
}
