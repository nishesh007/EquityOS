/**
 * Graham Value Investing utilities — Sprint 11B.3V.
 * Pure helpers (no analyzer imports).
 */

import { clamp, round } from "@/lib/engine/utils";
import {
  DEFAULT_GRAHAM_CONFIG,
  resolveGrahamConfig,
  type GrahamConfig,
} from "./GrahamConstants";
import type {
  GrahamBalanceSheetAnalysis,
  GrahamDetection,
  GrahamFinancialAnalysis,
  GrahamIntrinsicValueAnalysis,
  GrahamMarginSafetyAnalysis,
  GrahamPositionSize,
  GrahamRecommendation,
  GrahamScreenResult,
  GrahamYearlyFinancials,
} from "./GrahamTypes";

export { resolveGrahamConfig, DEFAULT_GRAHAM_CONFIG };

export function average(values: readonly number[]): number {
  const clean = values.filter((v) => Number.isFinite(v));
  if (clean.length === 0) return 0;
  return clean.reduce((s, v) => s + v, 0) / clean.length;
}

export function coefficientOfVariation(values: readonly number[]): number {
  const clean = values.filter((v) => Number.isFinite(v));
  if (clean.length < 2) return 1;
  const mean = clean.reduce((s, v) => s + v, 0) / clean.length;
  if (Math.abs(mean) < 1e-9) return 1;
  const variance =
    clean.reduce((s, v) => s + (v - mean) ** 2, 0) / clean.length;
  return Math.sqrt(variance) / Math.abs(mean);
}

export function sortFinancialHistory(
  history: readonly GrahamYearlyFinancials[]
): GrahamYearlyFinancials[] {
  return [...history].sort((a, b) => a.year - b.year);
}

export function classifyScreen(
  pass: boolean,
  borderline: boolean,
  config: GrahamConfig
): { result: GrahamScreenResult; score: number } {
  if (pass) return { result: "Pass", score: config.passScore };
  if (borderline) return { result: "Borderline", score: config.borderlineScore };
  return { result: "Fail", score: config.failScore };
}

export function screenToScore(
  result: GrahamScreenResult,
  config: GrahamConfig
): number {
  if (result === "Pass") return config.passScore;
  if (result === "Borderline") return config.borderlineScore;
  return config.failScore;
}

export function createEmptyFinancialAnalysis(
  warnings: string[] = []
): GrahamFinancialAnalysis {
  return {
    score: 0,
    screens: {
      financialStrength: "Fail",
      currentRatio: "Fail",
      quickRatio: "Fail",
      debtEquity: "Fail",
      interestCoverage: "Fail",
      positiveEarnings: "Fail",
      positiveCashFlow: "Fail",
      dividendConsistency: "Fail",
      bookValueGrowth: "Fail",
      workingCapital: "Fail",
    },
    positiveEarnings: false,
    positiveFcf: false,
    positiveOcf: false,
    earningsStability: 0,
    cashFlowQuality: 0,
    reasons: [],
    warnings,
  };
}

export function createEmptyBalanceSheetAnalysis(
  warnings: string[] = []
): GrahamBalanceSheetAnalysis {
  return {
    score: 0,
    currentRatioOk: false,
    quickRatioOk: false,
    debtOk: false,
    interestCoverageOk: false,
    workingCapitalOk: false,
    liquidityScore: 0,
    leverageScore: 0,
    reasons: [],
    warnings,
  };
}

export function createEmptyIntrinsicAnalysis(
  warnings: string[] = []
): GrahamIntrinsicValueAnalysis {
  return {
    score: 0,
    intrinsicValue: 0,
    grahamNumber: 0,
    bookBasedValue: 0,
    normalizedEarningsValue: 0,
    conservativeFairValue: 0,
    confidence: 0,
    reasons: [],
    warnings,
  };
}

export function createEmptyMarginSafetyAnalysis(
  warnings: string[] = []
): GrahamMarginSafetyAnalysis {
  return {
    score: 0,
    marginOfSafety: 0,
    discountPercent: 0,
    upsidePercent: 0,
    status: "Overvalued",
    peOk: false,
    pbOk: false,
    reasons: [],
    warnings,
  };
}

export function createEmptyGrahamDetection(
  warnings: string[] = [],
  reasons: string[] = []
): GrahamDetection {
  return {
    detected: false,
    recommendation: "AVOID",
    financial: createEmptyFinancialAnalysis(warnings),
    balanceSheet: createEmptyBalanceSheetAnalysis(warnings),
    intrinsic: createEmptyIntrinsicAnalysis(warnings),
    marginSafety: createEmptyMarginSafetyAnalysis(warnings),
    qualityScore: 0,
    confidence: 0,
    reasons,
    warnings,
  };
}

export function calculateGrahamQualityScore(input: {
  financialScore: number;
  marginOfSafetyScore: number;
  balanceSheetScore: number;
  valuationScore: number;
  cashFlowQuality: number;
  governanceScore: number;
  config: GrahamConfig;
}): number {
  const w = input.config.qualityWeights;
  const total =
    w.financialStrength +
    w.marginOfSafety +
    w.balanceSheet +
    w.valuation +
    w.cashFlowQuality +
    w.governance;
  const composite =
    (input.financialScore * w.financialStrength +
      input.marginOfSafetyScore * w.marginOfSafety +
      input.balanceSheetScore * w.balanceSheet +
      input.valuationScore * w.valuation +
      input.cashFlowQuality * w.cashFlowQuality +
      input.governanceScore * w.governance) /
    Math.max(total, 0.0001);
  return clamp(
    round(composite, 1),
    input.config.scoreFloor,
    input.config.scoreCeiling
  );
}

export function resolveRecommendation(input: {
  financial: GrahamFinancialAnalysis;
  balanceSheet: GrahamBalanceSheetAnalysis;
  marginSafety: GrahamMarginSafetyAnalysis;
  governanceRedFlags: boolean;
  accountingConcerns: boolean;
  config: GrahamConfig;
}): {
  recommendation: GrahamRecommendation;
  reasons: string[];
  warnings: string[];
} {
  const { financial, balanceSheet, marginSafety, config } = input;
  const reasons: string[] = [];
  const warnings: string[] = [];

  const hardAvoid =
    !financial.positiveEarnings ||
    !financial.positiveFcf ||
    !balanceSheet.debtOk ||
    !balanceSheet.currentRatioOk ||
    input.governanceRedFlags ||
    input.accountingConcerns ||
    marginSafety.status === "Overvalued";

  if (hardAvoid) {
    if (!financial.positiveEarnings) warnings.push("Negative Earnings.");
    if (!financial.positiveFcf) warnings.push("Negative Cash Flow.");
    if (!balanceSheet.debtOk) warnings.push("High Debt.");
    if (!balanceSheet.currentRatioOk || !balanceSheet.quickRatioOk) {
      warnings.push("Poor Liquidity.");
    }
    if (!balanceSheet.workingCapitalOk) warnings.push("Weak Balance Sheet.");
    if (input.accountingConcerns) warnings.push("Accounting Concerns.");
    if (input.governanceRedFlags) {
      warnings.push("Corporate Governance Issues.");
    }
    if (marginSafety.status === "Overvalued") {
      warnings.push("Extreme Overvaluation.");
    }
    return {
      recommendation: "AVOID",
      reasons: ["Company fails Graham deep-value screens."],
      warnings,
    };
  }

  const buyReady =
    marginSafety.marginOfSafety >= config.minMarginOfSafetyBuy &&
    financial.positiveEarnings &&
    financial.positiveFcf &&
    balanceSheet.debtOk &&
    balanceSheet.currentRatioOk &&
    balanceSheet.quickRatioOk &&
    marginSafety.peOk &&
    marginSafety.pbOk &&
    balanceSheet.score >= config.minBalanceSheetBuy &&
    financial.score >= config.minFinancialStrengthBuy &&
    !input.governanceRedFlags &&
    !input.accountingConcerns;

  if (buyReady) {
    reasons.push(
      "Current price trades significantly below estimated intrinsic value."
    );
    reasons.push(
      "Company maintains a strong balance sheet with conservative leverage."
    );
    reasons.push(
      "Current ratio and liquidity comfortably exceed Graham's thresholds."
    );
    reasons.push("Free cash flow remains consistently positive.");
    reasons.push("The investment offers a meaningful margin of safety.");
    return { recommendation: "BUY", reasons, warnings };
  }

  const watchReady =
    marginSafety.marginOfSafety >= config.minMarginOfSafetyWatch &&
    financial.score >= config.minFinancialStrengthWatch &&
    balanceSheet.score >= config.minBalanceSheetWatch &&
    financial.positiveEarnings &&
    financial.positiveFcf &&
    !input.governanceRedFlags;

  if (watchReady) {
    reasons.push(
      "Decent value profile — margin of safety not yet ideal for BUY."
    );
    return { recommendation: "WATCH", reasons, warnings };
  }

  return {
    recommendation: "AVOID",
    reasons: ["Does not meet Graham BUY or WATCH criteria."],
    warnings,
  };
}

export function resolvePositionSize(input: {
  recommendation: GrahamRecommendation;
  qualityScore: number;
  conviction: number;
  marginOfSafety: number;
  financialScore: number;
  balanceSheetScore: number;
  config: GrahamConfig;
}): GrahamPositionSize {
  if (input.recommendation === "AVOID") return "None";
  if (input.recommendation === "WATCH") return "Starter Position";

  const stability =
    (input.financialScore + input.balanceSheetScore) / 2;
  if (
    input.marginOfSafety >= input.config.minMarginOfSafetyBuy * 1.25 &&
    input.conviction >= 85 &&
    input.qualityScore >= 85 &&
    stability >= 80
  ) {
    return "Maximum Allocation";
  }
  if (
    input.qualityScore >= 80 &&
    input.conviction >= 75 &&
    input.marginOfSafety >= input.config.minMarginOfSafetyBuy
  ) {
    return "Full Position";
  }
  if (input.qualityScore >= 70) return "Half Position";
  return "Starter Position";
}

export function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = value.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}
