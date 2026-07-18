/**
 * Greenblatt Magic Formula types — Sprint 11B.3X.
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
import type { MagicFormulaConfig } from "./MagicFormulaConstants";
import type { MagicFormulaExplainability } from "./MagicFormulaExplainability";
import type { MagicFormulaInstitutionalScore } from "./MagicFormulaScoring";

export type MagicFormulaRecommendation = "BUY" | "WATCH" | "AVOID";

export type MagicFormulaPositionSize =
  | "Starter Position"
  | "Half Position"
  | "Full Position"
  | "Maximum Allocation"
  | "None";

export interface MagicFormulaYearlyFinancials {
  year: number;
  revenue: number;
  ebit: number;
  ebitda?: number | null;
  operatingIncome: number;
  netIncome: number;
  operatingCashFlow: number;
  freeCashFlow: number;
}

export interface MagicFormulaPeerSnapshot {
  symbol: string;
  earningsYield: number;
  returnOnCapital: number;
  sector?: string;
  industry?: string;
}

export interface MagicFormulaCurrentSnapshot {
  currentPrice: number;
  enterpriseValue: number | null;
  marketCap: number;
  ebit: number;
  ebitda: number | null;
  revenue: number;
  operatingIncome: number;
  netIncome: number;
  cash: number;
  debt: number;
  workingCapital: number;
  fixedAssets: number;
  currentAssets: number;
  currentLiabilities: number;
  operatingCashFlow: number;
  freeCashFlow: number;
  roe: number;
  roce: number;
  roic: number;
  pe: number | null;
  pb: number | null;
  evEbitda: number | null;
  dividendYield: number;
  debtEquity: number;
  currentRatio: number;
  institutionalHolding: number;
  promoterHolding: number;
  corporateGovernanceScore: number;
  sector: string;
  industry: string;
  governanceRedFlags: boolean;
  accountingConcerns: boolean;
  /** Optional precomputed ranks (1 = best). */
  magicFormulaRank?: number | null;
  compositeRank?: number | null;
  percentileRank?: number | null;
  sectorRank?: number | null;
  industryRank?: number | null;
}

export interface MagicFormulaMarketData {
  financialHistory: MagicFormulaYearlyFinancials[];
  current: MagicFormulaCurrentSnapshot;
  peers?: MagicFormulaPeerSnapshot[];
}

export interface MagicFormulaEarningsYieldAnalysis {
  score: number;
  earningsYield: number;
  enterpriseValue: number;
  ebit: number;
  reasons: string[];
  warnings: string[];
}

export interface MagicFormulaRocAnalysis {
  score: number;
  returnOnCapital: number;
  netWorkingCapital: number;
  netFixedAssets: number;
  capitalBase: number;
  reasons: string[];
  warnings: string[];
}

export interface MagicFormulaRankingResult {
  score: number;
  magicFormulaRank: number;
  compositeRank: number;
  percentileRank: number;
  sectorRank: number | null;
  industryRank: number | null;
  earningsYieldRank: number;
  rocRank: number;
  universeSize: number;
  reasons: string[];
  warnings: string[];
}

export interface MagicFormulaFinancialAnalysis {
  score: number;
  positiveEbit: boolean;
  positiveOcf: boolean;
  positiveFcf: boolean;
  healthyBalanceSheet: boolean;
  reasonableDebt: boolean;
  workingCapitalOk: boolean;
  consistentProfitability: boolean;
  cashFlowQuality: number;
  reasons: string[];
  warnings: string[];
}

export interface MagicFormulaDetection {
  detected: boolean;
  recommendation: MagicFormulaRecommendation;
  earningsYield: MagicFormulaEarningsYieldAnalysis;
  roc: MagicFormulaRocAnalysis;
  ranking: MagicFormulaRankingResult;
  financial: MagicFormulaFinancialAnalysis;
  qualityScore: number;
  confidence: number;
  reasons: string[];
  warnings: string[];
}

export interface MagicFormulaInvestmentSetup {
  detection: MagicFormulaDetection;
  recommendation: MagicFormulaRecommendation;
  magicFormulaRank: number;
  compositeRank: number;
  earningsYield: number;
  returnOnCapital: number;
  enterpriseValue: number;
  financialStrength: number;
  positionSize: MagicFormulaPositionSize;
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
  explainability: MagicFormulaExplainability;
  institutionalScore: MagicFormulaInstitutionalScore;
}

export interface MagicFormulaStrategyInput extends StrategyMarketInput {
  magicFormula: MagicFormulaMarketData;
}

export interface MagicFormulaDetectionContext {
  input: MagicFormulaStrategyInput;
  marketContext: InstitutionalMarketContext;
  regime: MarketRegime;
  confidence: RegimeConfidenceAnalysis;
  eligibleStrategies: readonly EligibleStrategy[];
  config?: Partial<MagicFormulaConfig>;
  timestamp?: Date;
}

export interface MagicFormulaValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function isMagicFormulaStrategyInput(
  input: StrategyMarketInput | MagicFormulaStrategyInput | null | undefined
): input is MagicFormulaStrategyInput {
  if (!input || !("magicFormula" in input) || !input.magicFormula) {
    return false;
  }
  return (
    Array.isArray(input.magicFormula.financialHistory) &&
    !!input.magicFormula.current
  );
}

export function toMagicFormulaDetectionContext(
  context: StrategyExecutionContext
): MagicFormulaDetectionContext | null {
  if (!isMagicFormulaStrategyInput(context.input)) return null;
  return {
    input: context.input,
    marketContext: context.marketContext,
    regime: context.regime,
    confidence: context.confidence,
    eligibleStrategies: context.eligibleStrategies,
    timestamp: context.timestamp,
  };
}
