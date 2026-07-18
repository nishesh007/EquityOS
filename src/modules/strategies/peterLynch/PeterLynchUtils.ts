/**
 * Peter Lynch GARP utilities — Sprint 11B.3W.
 * Pure helpers (no analyzer imports).
 */

import { clamp, round } from "@/lib/engine/utils";
import {
  DEFAULT_PETER_LYNCH_CONFIG,
  resolvePeterLynchConfig,
  type PeterLynchConfig,
} from "./PeterLynchConstants";
import type {
  PeterLynchBusinessAnalysis,
  PeterLynchDetection,
  PeterLynchFinancialAnalysis,
  PeterLynchGrowthAnalysis,
  PeterLynchGrowthGrade,
  PeterLynchPegAnalysis,
  PeterLynchPegBand,
  PeterLynchPositionSize,
  PeterLynchRecommendation,
  PeterLynchValuationAnalysis,
  PeterLynchYearlyFinancials,
} from "./PeterLynchTypes";

export { resolvePeterLynchConfig, DEFAULT_PETER_LYNCH_CONFIG };

export function average(values: readonly number[]): number {
  const clean = values.filter((v) => Number.isFinite(v));
  if (clean.length === 0) return 0;
  return clean.reduce((s, v) => s + v, 0) / clean.length;
}

export function compoundAnnualGrowthRate(
  start: number,
  end: number,
  years: number
): number {
  if (!(years > 0) || !(start > 0) || !(end > 0)) return 0;
  return Math.pow(end / start, 1 / years) - 1;
}

export function sortFinancialHistory(
  history: readonly PeterLynchYearlyFinancials[]
): PeterLynchYearlyFinancials[] {
  return [...history].sort((a, b) => a.year - b.year);
}

export function classifyGrowthGrade(
  growthRate: number,
  config: PeterLynchConfig
): PeterLynchGrowthGrade {
  if (growthRate >= config.excellentGrowthCagr) return "Excellent";
  if (growthRate >= config.goodGrowthCagr) return "Good";
  if (growthRate >= config.averageGrowthCagr) return "Average";
  return "Weak";
}

export function classifyPegBand(
  peg: number,
  config: PeterLynchConfig
): PeterLynchPegBand {
  if (!(peg > 0) || !Number.isFinite(peg)) return "PEG > 2";
  if (peg < config.pegAttractiveMax) return "PEG < 1";
  if (peg <= config.pegAcceptableMax) return "PEG 1–1.5";
  if (peg <= config.pegWatchMax) return "PEG 1.5–2";
  return "PEG > 2";
}

export function createEmptyGrowthAnalysis(
  warnings: string[] = []
): PeterLynchGrowthAnalysis {
  return {
    score: 0,
    grade: "Weak",
    revenueCagr: 0,
    epsCagr: 0,
    profitCagr: 0,
    cashFlowCagr: 0,
    marginExpansion: 0,
    marketShareGrowth: 0,
    businessScalability: 0,
    growthConsistency: 0,
    growthRate: 0,
    reasons: [],
    warnings,
  };
}

export function createEmptyPegAnalysis(
  warnings: string[] = []
): PeterLynchPegAnalysis {
  return {
    score: 0,
    pegRatio: 0,
    forwardPeg: 0,
    historicalPeg: 0,
    growthAdjustedPe: 0,
    band: "PEG > 2",
    reasons: [],
    warnings,
  };
}

export function createEmptyBusinessAnalysis(
  warnings: string[] = []
): PeterLynchBusinessAnalysis {
  return {
    score: 0,
    scalableBusiness: 0,
    marketOpportunity: 0,
    competitivePosition: 0,
    brandStrength: 0,
    productLeadership: 0,
    innovation: 0,
    customerRetention: 0,
    recurringRevenue: 0,
    reasons: [],
    warnings,
  };
}

export function createEmptyFinancialAnalysis(
  warnings: string[] = []
): PeterLynchFinancialAnalysis {
  return {
    score: 0,
    positiveFcf: false,
    positiveOcf: false,
    roeOk: false,
    roceOk: false,
    debtOk: false,
    growingMargins: false,
    healthyBalanceSheet: false,
    earningsQuality: 0,
    cashFlowQuality: 0,
    reasons: [],
    warnings,
  };
}

export function createEmptyValuationAnalysis(
  warnings: string[] = []
): PeterLynchValuationAnalysis {
  return {
    score: 0,
    status: "Overvalued",
    intrinsicValue: 0,
    currentPrice: 0,
    marginOfSafety: 0,
    peOk: false,
    pegOk: false,
    growthPremium: 0,
    reasons: [],
    warnings,
  };
}

export function createEmptyPeterLynchDetection(
  warnings: string[] = [],
  reasons: string[] = []
): PeterLynchDetection {
  return {
    detected: false,
    recommendation: "AVOID",
    growth: createEmptyGrowthAnalysis(warnings),
    peg: createEmptyPegAnalysis(warnings),
    business: createEmptyBusinessAnalysis(warnings),
    financial: createEmptyFinancialAnalysis(warnings),
    valuation: createEmptyValuationAnalysis(warnings),
    qualityScore: 0,
    confidence: 0,
    reasons,
    warnings,
  };
}

export function calculatePeterLynchQualityScore(input: {
  growthScore: number;
  businessScore: number;
  financialScore: number;
  pegScore: number;
  valuationScore: number;
  governanceScore: number;
  config: PeterLynchConfig;
}): number {
  const w = input.config.qualityWeights;
  const total =
    w.growthQuality +
    w.businessQuality +
    w.financialStrength +
    w.pegAnalysis +
    w.valuation +
    w.governance;
  const composite =
    (input.growthScore * w.growthQuality +
      input.businessScore * w.businessQuality +
      input.financialScore * w.financialStrength +
      input.pegScore * w.pegAnalysis +
      input.valuationScore * w.valuation +
      input.governanceScore * w.governance) /
    Math.max(total, 0.0001);
  return clamp(
    round(composite, 1),
    input.config.scoreFloor,
    input.config.scoreCeiling
  );
}

export function resolveRecommendation(input: {
  growth: PeterLynchGrowthAnalysis;
  peg: PeterLynchPegAnalysis;
  business: PeterLynchBusinessAnalysis;
  financial: PeterLynchFinancialAnalysis;
  valuation: PeterLynchValuationAnalysis;
  institutionalHolding: number;
  promoterPledge: number;
  governanceRedFlags: boolean;
  accountingConcerns: boolean;
  governanceScore: number;
  config: PeterLynchConfig;
}): {
  recommendation: PeterLynchRecommendation;
  reasons: string[];
  warnings: string[];
} {
  const {
    growth,
    peg,
    business,
    financial,
    valuation,
    config,
  } = input;
  const reasons: string[] = [];
  const warnings: string[] = [];

  const hardAvoid =
    peg.pegRatio > config.maxPegReject ||
    growth.grade === "Weak" ||
    !financial.positiveFcf ||
    !financial.debtOk ||
    input.governanceRedFlags ||
    input.accountingConcerns ||
    input.promoterPledge > config.maxPromoterPledge ||
    !financial.growingMargins;

  if (hardAvoid) {
    if (peg.pegRatio > config.maxPegReject) {
      warnings.push("PEG above configurable threshold.");
    }
    if (growth.grade === "Weak") warnings.push("Weak Growth.");
    if (!financial.positiveFcf) warnings.push("Negative Cash Flow.");
    if (!financial.debtOk) warnings.push("High Debt.");
    if (input.governanceRedFlags || input.accountingConcerns) {
      warnings.push("Poor Governance / Accounting Concerns.");
    }
    if (input.promoterPledge > config.maxPromoterPledge) {
      warnings.push("Promoter Pledge above threshold.");
    }
    if (!financial.growingMargins) warnings.push("Declining Margins.");
    return {
      recommendation: "AVOID",
      reasons: ["Company fails Peter Lynch GARP screens."],
      warnings,
    };
  }

  const buyReady =
    (growth.grade === "Excellent" || growth.grade === "Good") &&
    growth.growthRate >= config.minGrowthCagrBuy &&
    peg.pegRatio > 0 &&
    peg.pegRatio <= config.maxPegForBuy &&
    financial.positiveFcf &&
    financial.healthyBalanceSheet &&
    financial.roeOk &&
    growth.growthConsistency >= 55 &&
    input.governanceScore >= config.minGovernanceScore &&
    !input.governanceRedFlags &&
    input.institutionalHolding >= config.minInstitutionalHolding &&
    business.score >= config.minBusinessQualityBuy &&
    financial.score >= config.minFinancialStrengthBuy &&
    valuation.status !== "Overvalued";

  if (buyReady) {
    reasons.push(
      "Revenue and EPS have compounded consistently over multiple years."
    );
    reasons.push(
      "PEG ratio indicates attractive growth-adjusted valuation."
    );
    reasons.push(
      "Business continues to scale while maintaining profitability."
    );
    reasons.push("Balance sheet supports future expansion.");
    reasons.push("Growth quality remains above industry average.");
    return { recommendation: "BUY", reasons, warnings };
  }

  const watchReady =
    growth.growthRate >= config.minGrowthCagrWatch &&
    peg.pegRatio > 0 &&
    peg.pegRatio <= config.pegWatchMax &&
    financial.positiveFcf &&
    business.score >= config.minBusinessQualityWatch &&
    financial.score >= config.minFinancialStrengthWatch &&
    !input.governanceRedFlags;

  if (watchReady) {
    reasons.push(
      "Decent GARP profile — growth or PEG not yet ideal for BUY."
    );
    return { recommendation: "WATCH", reasons, warnings };
  }

  return {
    recommendation: "AVOID",
    reasons: ["Does not meet Peter Lynch BUY or WATCH criteria."],
    warnings,
  };
}

export function resolvePositionSize(input: {
  recommendation: PeterLynchRecommendation;
  qualityScore: number;
  conviction: number;
  growth: PeterLynchGrowthAnalysis;
  peg: PeterLynchPegAnalysis;
  business: PeterLynchBusinessAnalysis;
  financial: PeterLynchFinancialAnalysis;
  config: PeterLynchConfig;
}): PeterLynchPositionSize {
  if (input.recommendation === "AVOID") return "None";
  if (input.recommendation === "WATCH") return "Starter Position";

  if (
    input.growth.grade === "Excellent" &&
    input.peg.band === "PEG < 1" &&
    input.business.score >= 80 &&
    input.financial.score >= 80 &&
    input.conviction >= 85 &&
    input.qualityScore >= 85
  ) {
    return "Maximum Allocation";
  }
  if (
    input.qualityScore >= 80 &&
    input.conviction >= 75 &&
    input.peg.pegRatio <= input.config.maxPegForBuy
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
