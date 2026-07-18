/**
 * Buffett Quality Investing utilities — Sprint 11B.3U.
 * Pure helpers (no analyzer imports).
 */

import { clamp, round } from "@/lib/engine/utils";
import {
  DEFAULT_BUFFETT_CONFIG,
  resolveBuffettConfig,
  type BuffettConfig,
} from "./BuffettConstants";
import type {
  BuffettBusinessAnalysis,
  BuffettDetection,
  BuffettFinancialAnalysis,
  BuffettManagementAnalysis,
  BuffettMoatAnalysis,
  BuffettPositionSize,
  BuffettRecommendation,
  BuffettValuationAnalysis,
  BuffettYearlyFinancials,
} from "./BuffettTypes";

export { resolveBuffettConfig, DEFAULT_BUFFETT_CONFIG };

export function coefficientOfVariation(values: readonly number[]): number {
  const clean = values.filter((v) => Number.isFinite(v));
  if (clean.length < 2) return 1;
  const mean = clean.reduce((s, v) => s + v, 0) / clean.length;
  if (Math.abs(mean) < 1e-9) return 1;
  const variance =
    clean.reduce((s, v) => s + (v - mean) ** 2, 0) / clean.length;
  return Math.sqrt(variance) / Math.abs(mean);
}

export function growthSeries(values: readonly number[]): number[] {
  const growth: number[] = [];
  for (let i = 1; i < values.length; i += 1) {
    const prev = values[i - 1]!;
    const cur = values[i]!;
    if (Math.abs(prev) < 1e-9) continue;
    growth.push((cur - prev) / Math.abs(prev));
  }
  return growth;
}

export function average(values: readonly number[]): number {
  const clean = values.filter((v) => Number.isFinite(v));
  if (clean.length === 0) return 0;
  return clean.reduce((s, v) => s + v, 0) / clean.length;
}

export function consistencyScoreFromCv(cv: number, maxCv: number): number {
  if (!(maxCv > 0)) return 50;
  return clamp(round(100 - (cv / maxCv) * 70, 1), 0, 100);
}

export function sortFinancialHistory(
  history: readonly BuffettYearlyFinancials[]
): BuffettYearlyFinancials[] {
  return [...history].sort((a, b) => a.year - b.year);
}

export function createEmptyBusinessAnalysis(
  warnings: string[] = []
): BuffettBusinessAnalysis {
  return {
    score: 0,
    revenueConsistency: 0,
    epsConsistency: 0,
    cashFlowConsistency: 0,
    profitConsistency: 0,
    marginStability: 0,
    capitalAllocation: 0,
    predictability: 0,
    businessSimplicity: 50,
    reasons: [],
    warnings,
  };
}

export function createEmptyMoatAnalysis(
  warnings: string[] = []
): BuffettMoatAnalysis {
  return {
    score: 0,
    classification: "No Moat",
    brandStrength: 0,
    networkEffects: 0,
    switchingCosts: 0,
    costLeadership: 0,
    patents: 0,
    distributionAdvantage: 0,
    marketShare: 0,
    pricingPower: 0,
    recurringRevenue: 0,
    industryLeadership: 0,
    reasons: [],
    warnings,
  };
}

export function createEmptyFinancialAnalysis(
  warnings: string[] = []
): BuffettFinancialAnalysis {
  return {
    score: 0,
    balanceSheetScore: 0,
    roeOk: false,
    roceOk: false,
    roicOk: false,
    debtOk: false,
    positiveFcf: false,
    consistentEarnings: false,
    healthyMargins: false,
    positiveOcf: false,
    reasons: [],
    warnings,
  };
}

export function createEmptyManagementAnalysis(
  warnings: string[] = []
): BuffettManagementAnalysis {
  return {
    score: 0,
    capitalAllocation: 0,
    corporateGovernance: 0,
    promoterIntegrity: 0,
    shareholderFriendliness: 0,
    dividendPolicy: 0,
    buybackQuality: 0,
    accountingQuality: 0,
    relatedPartyRisk: 0,
    governanceRedFlags: true,
    reasons: [],
    warnings,
  };
}

export function createEmptyValuationAnalysis(
  warnings: string[] = []
): BuffettValuationAnalysis {
  return {
    score: 0,
    status: "Overvalued",
    intrinsicValue: 0,
    currentPrice: 0,
    marginOfSafety: 0,
    dcfSupportive: false,
    peOk: false,
    fcfYieldOk: false,
    reasons: [],
    warnings,
  };
}

export function createEmptyBuffettDetection(
  warnings: string[] = [],
  reasons: string[] = []
): BuffettDetection {
  return {
    detected: false,
    recommendation: "AVOID",
    business: createEmptyBusinessAnalysis(warnings),
    moat: createEmptyMoatAnalysis(warnings),
    financial: createEmptyFinancialAnalysis(warnings),
    management: createEmptyManagementAnalysis(warnings),
    valuation: createEmptyValuationAnalysis(warnings),
    qualityScore: 0,
    confidence: 0,
    reasons,
    warnings,
  };
}

export function calculateBuffettQualityScore(input: {
  businessScore: number;
  moatScore: number;
  financialScore: number;
  managementScore: number;
  valuationScore: number;
  balanceSheetScore: number;
  config: BuffettConfig;
}): number {
  const w = input.config.qualityWeights;
  const total =
    w.businessQuality +
    w.economicMoat +
    w.financialStrength +
    w.managementQuality +
    w.valuation +
    w.balanceSheet;
  const composite =
    (input.businessScore * w.businessQuality +
      input.moatScore * w.economicMoat +
      input.financialScore * w.financialStrength +
      input.managementScore * w.managementQuality +
      input.valuationScore * w.valuation +
      input.balanceSheetScore * w.balanceSheet) /
    Math.max(total, 0.0001);
  return clamp(
    round(composite, 1),
    input.config.scoreFloor,
    input.config.scoreCeiling
  );
}

export function resolveRecommendation(input: {
  moat: BuffettMoatAnalysis;
  business: BuffettBusinessAnalysis;
  financial: BuffettFinancialAnalysis;
  management: BuffettManagementAnalysis;
  valuation: BuffettValuationAnalysis;
  institutionalHolding: number;
  promoterPledge: number;
  config: BuffettConfig;
}): {
  recommendation: BuffettRecommendation;
  reasons: string[];
  warnings: string[];
} {
  const { moat, business, financial, management, valuation, config } = input;
  const reasons: string[] = [];
  const warnings: string[] = [];

  const hardAvoid =
    moat.classification === "No Moat" ||
    !financial.positiveFcf ||
    management.governanceRedFlags ||
    !financial.debtOk ||
    input.promoterPledge > config.maxPromoterPledge ||
    !financial.consistentEarnings ||
    !financial.healthyMargins ||
    management.accountingQuality < 50;

  if (hardAvoid) {
    if (moat.classification === "No Moat") warnings.push("Weak moat.");
    if (!financial.positiveFcf) warnings.push("Negative Free Cash Flow.");
    if (management.governanceRedFlags || management.accountingQuality < 50) {
      warnings.push("Accounting concerns / poor governance.");
    }
    if (!financial.debtOk) warnings.push("High debt.");
    if (input.promoterPledge > config.maxPromoterPledge) {
      warnings.push("Promoter pledge above threshold.");
    }
    if (!financial.consistentEarnings) warnings.push("Unpredictable earnings.");
    if (!financial.healthyMargins) warnings.push("Weak margins.");
    return {
      recommendation: "AVOID",
      reasons: ["Company fails Buffett quality screens."],
      warnings,
    };
  }

  const buyReady =
    (moat.classification === "Wide Moat" ||
      moat.classification === "Narrow Moat") &&
    moat.score >= config.minMoatScoreBuy &&
    business.score >= config.minBusinessQualityBuy &&
    financial.score >= config.minFinancialStrengthBuy &&
    management.score >= config.minManagementQualityBuy &&
    (valuation.status === "Undervalued" ||
      valuation.status === "Fairly Valued") &&
    financial.positiveFcf &&
    financial.debtOk &&
    input.institutionalHolding >= config.minInstitutionalHolding &&
    !management.governanceRedFlags;

  if (buyReady) {
    reasons.push("Business demonstrates a durable competitive advantage.");
    reasons.push("ROE and ROCE have remained consistently strong.");
    reasons.push("Free cash flow generation is highly predictable.");
    reasons.push(
      "Management has demonstrated disciplined capital allocation."
    );
    if (valuation.status === "Undervalued") {
      reasons.push(
        "Current valuation provides an adequate margin of safety."
      );
    }
    return { recommendation: "BUY", reasons, warnings };
  }

  if (
    business.score >= config.holdBusinessQualityMin &&
    moat.classification !== "No Moat" &&
    financial.positiveFcf
  ) {
    reasons.push(
      "Quality business — valuation or moat not yet ideal for BUY."
    );
    return { recommendation: "HOLD", reasons, warnings };
  }

  return {
    recommendation: "AVOID",
    reasons: ["Does not meet Buffett BUY or HOLD criteria."],
    warnings,
  };
}

export function resolvePositionSize(input: {
  recommendation: BuffettRecommendation;
  qualityScore: number;
  conviction: number;
  valuation: BuffettValuationAnalysis;
  moat: BuffettMoatAnalysis;
}): BuffettPositionSize {
  if (input.recommendation === "AVOID") return "None";
  if (input.recommendation === "HOLD") return "Starter Position";

  if (
    input.moat.classification === "Wide Moat" &&
    input.valuation.status === "Undervalued" &&
    input.conviction >= 85 &&
    input.qualityScore >= 85
  ) {
    return "Maximum Allocation";
  }
  if (
    input.qualityScore >= 80 &&
    input.conviction >= 75 &&
    input.valuation.status !== "Overvalued"
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
