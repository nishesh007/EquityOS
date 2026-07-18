/**
 * Quality Compounder utilities — Sprint 11B.3Y.
 * Pure helpers (no analyzer imports).
 */

import { clamp, round } from "@/lib/engine/utils";
import {
  DEFAULT_QUALITY_COMPOUNDER_CONFIG,
  resolveQualityCompounderConfig,
  type QualityCompounderConfig,
} from "./QualityCompounderConstants";
import type {
  QualityCompounderBusinessAnalysis,
  QualityCompounderBusinessGrade,
  QualityCompounderCapitalAllocationAnalysis,
  QualityCompounderDetection,
  QualityCompounderFinancialAnalysis,
  QualityCompounderGrowthAnalysis,
  QualityCompounderManagementAnalysis,
  QualityCompounderMoatAnalysis,
  QualityCompounderPositionSize,
  QualityCompounderRecommendation,
  QualityCompounderValuationAnalysis,
  QualityCompounderYearlyFinancials,
} from "./QualityCompounderTypes";

export {
  resolveQualityCompounderConfig,
  DEFAULT_QUALITY_COMPOUNDER_CONFIG,
};

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

export function compoundAnnualGrowthRate(
  start: number,
  end: number,
  years: number
): number {
  if (!(years > 0) || !(start > 0) || !(end > 0)) return 0;
  return Math.pow(end / start, 1 / years) - 1;
}

export function seriesCagr(values: readonly number[]): number {
  const clean = values.filter((v) => Number.isFinite(v));
  if (clean.length < 2) return 0;
  return compoundAnnualGrowthRate(
    clean[0]!,
    clean[clean.length - 1]!,
    clean.length - 1
  );
}

export function consistencyScoreFromCv(cv: number, maxCv: number): number {
  if (!(maxCv > 0)) return 50;
  return clamp(round(100 - (cv / maxCv) * 70, 1), 0, 100);
}

export function sortFinancialHistory(
  history: readonly QualityCompounderYearlyFinancials[]
): QualityCompounderYearlyFinancials[] {
  return [...history].sort((a, b) => a.year - b.year);
}

export function classifyBusinessGrade(
  score: number,
  config: QualityCompounderConfig
): QualityCompounderBusinessGrade {
  if (score >= config.exceptionalBusinessMin) return "Exceptional";
  if (score >= config.excellentBusinessMin) return "Excellent";
  if (score >= config.goodBusinessMin) return "Good";
  if (score >= config.averageBusinessMin) return "Average";
  return "Weak";
}

export function createEmptyBusinessAnalysis(
  warnings: string[] = []
): QualityCompounderBusinessAnalysis {
  return {
    score: 0,
    grade: "Weak",
    predictability: 0,
    reasons: [],
    warnings,
  };
}

export function createEmptyMoatAnalysis(
  warnings: string[] = []
): QualityCompounderMoatAnalysis {
  return {
    score: 0,
    classification: "No Moat",
    reasons: [],
    warnings,
  };
}

export function createEmptyGrowthAnalysis(
  warnings: string[] = []
): QualityCompounderGrowthAnalysis {
  return {
    score: 0,
    revenueCagr: 0,
    epsCagr: 0,
    fcfCagr: 0,
    bookValueCagr: 0,
    roeStability: 0,
    roceStability: 0,
    marginStability: 0,
    capitalEfficiency: 0,
    reinvestmentAbility: 0,
    growthSustainability: 0,
    reasons: [],
    warnings,
  };
}

export function createEmptyCapitalAnalysis(
  warnings: string[] = []
): QualityCompounderCapitalAllocationAnalysis {
  return {
    score: 0,
    roic: 0,
    reinvestmentRate: 0,
    reasons: [],
    warnings,
  };
}

export function createEmptyFinancialAnalysis(
  warnings: string[] = []
): QualityCompounderFinancialAnalysis {
  return {
    score: 0,
    consistentRoe: false,
    consistentRoce: false,
    positiveRoic: false,
    positiveFcf: false,
    healthyBalanceSheet: false,
    lowDebt: false,
    healthyLiquidity: false,
    stableMargins: false,
    cashFlowQuality: 0,
    reasons: [],
    warnings,
  };
}

export function createEmptyManagementAnalysis(
  warnings: string[] = []
): QualityCompounderManagementAnalysis {
  return {
    score: 0,
    governanceRedFlags: true,
    accountingQuality: 0,
    reasons: [],
    warnings,
  };
}

export function createEmptyValuationAnalysis(
  warnings: string[] = []
): QualityCompounderValuationAnalysis {
  return {
    score: 0,
    status: "Overvalued",
    intrinsicValue: 0,
    currentPrice: 0,
    marginOfSafety: 0,
    reasons: [],
    warnings,
  };
}

export function createEmptyQualityCompounderDetection(
  warnings: string[] = [],
  reasons: string[] = []
): QualityCompounderDetection {
  return {
    detected: false,
    recommendation: "AVOID",
    business: createEmptyBusinessAnalysis(warnings),
    moat: createEmptyMoatAnalysis(warnings),
    growth: createEmptyGrowthAnalysis(warnings),
    capital: createEmptyCapitalAnalysis(warnings),
    financial: createEmptyFinancialAnalysis(warnings),
    management: createEmptyManagementAnalysis(warnings),
    valuation: createEmptyValuationAnalysis(warnings),
    qualityScore: 0,
    confidence: 0,
    reasons,
    warnings,
  };
}

export function calculateQualityCompounderQualityScore(input: {
  businessScore: number;
  moatScore: number;
  financialScore: number;
  capitalScore: number;
  growthScore: number;
  managementScore: number;
  valuationScore: number;
  governanceScore: number;
  config: QualityCompounderConfig;
}): number {
  const w = input.config.qualityWeights;
  const total =
    w.businessQuality +
    w.economicMoat +
    w.financialStrength +
    w.capitalAllocation +
    w.growthSustainability +
    w.managementQuality +
    w.valuation +
    w.governance;
  const composite =
    (input.businessScore * w.businessQuality +
      input.moatScore * w.economicMoat +
      input.financialScore * w.financialStrength +
      input.capitalScore * w.capitalAllocation +
      input.growthScore * w.growthSustainability +
      input.managementScore * w.managementQuality +
      input.valuationScore * w.valuation +
      input.governanceScore * w.governance) /
    Math.max(total, 0.0001);
  return clamp(
    round(composite, 1),
    input.config.scoreFloor,
    input.config.scoreCeiling
  );
}

export function resolveExpectedCagr(input: {
  business: QualityCompounderBusinessAnalysis;
  growth: QualityCompounderGrowthAnalysis;
  config: QualityCompounderConfig;
}): number {
  if (
    input.business.grade === "Exceptional" ||
    input.business.grade === "Excellent"
  ) {
    return input.config.expectedCagrExcellent;
  }
  if (input.business.grade === "Good" || input.growth.score >= 70) {
    return input.config.expectedCagrGood;
  }
  return input.config.expectedCagrAverage;
}

export function resolveRecommendation(input: {
  business: QualityCompounderBusinessAnalysis;
  moat: QualityCompounderMoatAnalysis;
  growth: QualityCompounderGrowthAnalysis;
  capital: QualityCompounderCapitalAllocationAnalysis;
  financial: QualityCompounderFinancialAnalysis;
  management: QualityCompounderManagementAnalysis;
  valuation: QualityCompounderValuationAnalysis;
  institutionalHolding: number;
  promoterPledge: number;
  governanceScore: number;
  businessDisruption: boolean;
  config: QualityCompounderConfig;
}): {
  recommendation: QualityCompounderRecommendation;
  reasons: string[];
  warnings: string[];
} {
  const {
    business,
    moat,
    growth,
    capital,
    financial,
    management,
    valuation,
    config,
  } = input;
  const reasons: string[] = [];
  const warnings: string[] = [];

  const hardAvoid =
    input.management.governanceRedFlags ||
    management.accountingQuality < 50 ||
    !financial.positiveFcf ||
    !financial.lowDebt ||
    !financial.positiveRoic ||
    capital.score < 40 ||
    input.businessDisruption ||
    management.score < 40 ||
    input.promoterPledge > config.maxPromoterPledge;

  if (hardAvoid) {
    if (input.management.governanceRedFlags || management.accountingQuality < 50) {
      warnings.push("Weak Governance / Accounting Concerns.");
    }
    if (!financial.lowDebt) warnings.push("High Debt.");
    if (!financial.positiveFcf) warnings.push("Weak Cash Flow.");
    if (!financial.positiveRoic) warnings.push("Declining / Weak ROIC.");
    if (capital.score < 40) warnings.push("Weak Capital Allocation.");
    if (input.businessDisruption) warnings.push("Business Disruption.");
    if (management.score < 40) warnings.push("Poor Management.");
    return {
      recommendation: "AVOID",
      reasons: ["Company fails Quality Compounder screens."],
      warnings,
    };
  }

  const buyReady =
    moat.classification !== "No Moat" &&
    moat.score >= config.minMoatScoreBuy &&
    financial.positiveRoic &&
    financial.positiveFcf &&
    financial.consistentRoe &&
    financial.consistentRoce &&
    capital.score >= config.minCapitalAllocationBuy &&
    management.score >= config.minManagementBuy &&
    input.governanceScore >= config.minGovernanceScore &&
    growth.growthSustainability >= config.minGrowthSustainabilityBuy &&
    business.predictability >= 65 &&
    business.score >= config.minBusinessBuy &&
    financial.score >= config.minFinancialBuy &&
    input.institutionalHolding >= config.minInstitutionalHolding &&
    valuation.status !== "Overvalued";

  if (buyReady) {
    reasons.push(
      "Business has demonstrated exceptional long-term capital compounding."
    );
    reasons.push("ROIC has remained consistently above the cost of capital.");
    reasons.push(
      "Management has an outstanding capital allocation track record."
    );
    reasons.push("The company possesses a durable economic moat.");
    reasons.push(
      "Revenue, earnings and free cash flow have compounded consistently for more than a decade."
    );
    reasons.push("Balance sheet remains exceptionally strong.");
    return { recommendation: "BUY", reasons, warnings };
  }

  const holdReady =
    moat.classification !== "No Moat" &&
    business.score >= config.holdBusinessMin &&
    financial.positiveFcf &&
    capital.score >= config.minCapitalAllocationHold &&
    management.score >= config.minManagementHold &&
    !input.management.governanceRedFlags;

  if (holdReady) {
    reasons.push(
      "Quality compounder profile — valuation or growth not yet ideal for BUY."
    );
    return { recommendation: "HOLD", reasons, warnings };
  }

  const watchReady =
    business.score >= config.watchBusinessMin &&
    financial.positiveFcf &&
    moat.classification !== "No Moat";

  if (watchReady) {
    reasons.push(
      "Emerging compounder characteristics — continue monitoring."
    );
    return { recommendation: "WATCH", reasons, warnings };
  }

  return {
    recommendation: "AVOID",
    reasons: ["Does not meet Quality Compounder criteria."],
    warnings,
  };
}

export function resolvePositionSize(input: {
  recommendation: QualityCompounderRecommendation;
  qualityScore: number;
  conviction: number;
  moat: QualityCompounderMoatAnalysis;
  business: QualityCompounderBusinessAnalysis;
  valuation: QualityCompounderValuationAnalysis;
}): QualityCompounderPositionSize {
  if (input.recommendation === "AVOID") return "None";
  if (input.recommendation === "WATCH") return "Starter Position";
  if (input.recommendation === "HOLD") return "Core Position";

  if (
    input.moat.classification === "Wide Moat" &&
    (input.business.grade === "Exceptional" ||
      input.business.grade === "Excellent") &&
    input.conviction >= 90 &&
    input.qualityScore >= 90 &&
    input.valuation.status !== "Overvalued"
  ) {
    return "Maximum Allocation";
  }
  if (
    input.qualityScore >= 85 &&
    input.conviction >= 80 &&
    input.moat.classification !== "No Moat"
  ) {
    return "High Conviction Position";
  }
  if (input.qualityScore >= 75) return "Core Position";
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
