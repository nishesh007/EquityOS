/**
 * Greenblatt Magic Formula utilities — Sprint 11B.3X.
 * Pure helpers (no analyzer imports).
 */

import { clamp, round } from "@/lib/engine/utils";
import {
  DEFAULT_MAGIC_FORMULA_CONFIG,
  resolveMagicFormulaConfig,
  type MagicFormulaConfig,
} from "./MagicFormulaConstants";
import type {
  MagicFormulaDetection,
  MagicFormulaEarningsYieldAnalysis,
  MagicFormulaFinancialAnalysis,
  MagicFormulaPositionSize,
  MagicFormulaRankingResult,
  MagicFormulaRecommendation,
  MagicFormulaRocAnalysis,
  MagicFormulaYearlyFinancials,
} from "./MagicFormulaTypes";

export { resolveMagicFormulaConfig, DEFAULT_MAGIC_FORMULA_CONFIG };

export function average(values: readonly number[]): number {
  const clean = values.filter((v) => Number.isFinite(v));
  if (clean.length === 0) return 0;
  return clean.reduce((s, v) => s + v, 0) / clean.length;
}

export function sortFinancialHistory(
  history: readonly MagicFormulaYearlyFinancials[]
): MagicFormulaYearlyFinancials[] {
  return [...history].sort((a, b) => a.year - b.year);
}

/** Higher metric → better (lower) rank. Ties share average rank. */
export function rankDescending(values: readonly number[]): number[] {
  const indexed = values.map((value, index) => ({ value, index }));
  indexed.sort((a, b) => b.value - a.value);
  const ranks = new Array<number>(values.length).fill(0);
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    while (
      j + 1 < indexed.length &&
      indexed[j + 1]!.value === indexed[i]!.value
    ) {
      j += 1;
    }
    const avgRank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k += 1) {
      ranks[indexed[k]!.index] = avgRank;
    }
    i = j + 1;
  }
  return ranks;
}

export function percentileFromRank(rank: number, universeSize: number): number {
  if (!(universeSize > 0) || !(rank > 0)) return 1;
  return clamp(rank / universeSize, 0, 1);
}

export function scoreFromPercentile(
  percentile: number,
  config: MagicFormulaConfig
): number {
  return clamp(
    round(config.rankScoreCeiling * (1 - percentile), 1),
    config.scoreFloor,
    config.scoreCeiling
  );
}

export function createEmptyEarningsYieldAnalysis(
  warnings: string[] = []
): MagicFormulaEarningsYieldAnalysis {
  return {
    score: 0,
    earningsYield: 0,
    enterpriseValue: 0,
    ebit: 0,
    reasons: [],
    warnings,
  };
}

export function createEmptyRocAnalysis(
  warnings: string[] = []
): MagicFormulaRocAnalysis {
  return {
    score: 0,
    returnOnCapital: 0,
    netWorkingCapital: 0,
    netFixedAssets: 0,
    capitalBase: 0,
    reasons: [],
    warnings,
  };
}

export function createEmptyRankingResult(
  warnings: string[] = []
): MagicFormulaRankingResult {
  return {
    score: 0,
    magicFormulaRank: Number.MAX_SAFE_INTEGER,
    compositeRank: Number.MAX_SAFE_INTEGER,
    percentileRank: 1,
    sectorRank: null,
    industryRank: null,
    earningsYieldRank: Number.MAX_SAFE_INTEGER,
    rocRank: Number.MAX_SAFE_INTEGER,
    universeSize: 0,
    reasons: [],
    warnings,
  };
}

export function createEmptyFinancialAnalysis(
  warnings: string[] = []
): MagicFormulaFinancialAnalysis {
  return {
    score: 0,
    positiveEbit: false,
    positiveOcf: false,
    positiveFcf: false,
    healthyBalanceSheet: false,
    reasonableDebt: false,
    workingCapitalOk: false,
    consistentProfitability: false,
    cashFlowQuality: 0,
    reasons: [],
    warnings,
  };
}

export function createEmptyMagicFormulaDetection(
  warnings: string[] = [],
  reasons: string[] = []
): MagicFormulaDetection {
  return {
    detected: false,
    recommendation: "AVOID",
    earningsYield: createEmptyEarningsYieldAnalysis(warnings),
    roc: createEmptyRocAnalysis(warnings),
    ranking: createEmptyRankingResult(warnings),
    financial: createEmptyFinancialAnalysis(warnings),
    qualityScore: 0,
    confidence: 0,
    reasons,
    warnings,
  };
}

export function calculateMagicFormulaQualityScore(input: {
  rankScore: number;
  rocScore: number;
  earningsYieldScore: number;
  financialScore: number;
  cashFlowQuality: number;
  governanceScore: number;
  config: MagicFormulaConfig;
}): number {
  const w = input.config.qualityWeights;
  const total =
    w.magicFormulaRank +
    w.returnOnCapital +
    w.earningsYield +
    w.financialStrength +
    w.cashFlowQuality +
    w.governance;
  const composite =
    (input.rankScore * w.magicFormulaRank +
      input.rocScore * w.returnOnCapital +
      input.earningsYieldScore * w.earningsYield +
      input.financialScore * w.financialStrength +
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
  earningsYield: MagicFormulaEarningsYieldAnalysis;
  roc: MagicFormulaRocAnalysis;
  ranking: MagicFormulaRankingResult;
  financial: MagicFormulaFinancialAnalysis;
  institutionalHolding: number;
  governanceRedFlags: boolean;
  accountingConcerns: boolean;
  governanceScore: number;
  config: MagicFormulaConfig;
}): {
  recommendation: MagicFormulaRecommendation;
  reasons: string[];
  warnings: string[];
} {
  const {
    earningsYield,
    roc,
    ranking,
    financial,
    config,
  } = input;
  const reasons: string[] = [];
  const warnings: string[] = [];

  const hardAvoid =
    !financial.positiveEbit ||
    !financial.positiveFcf ||
    !financial.positiveOcf ||
    !financial.workingCapitalOk ||
    !financial.reasonableDebt ||
    input.governanceRedFlags ||
    input.accountingConcerns ||
    !financial.consistentProfitability;

  if (hardAvoid) {
    if (!financial.positiveEbit) warnings.push("Negative EBIT.");
    if (!financial.positiveFcf || !financial.positiveOcf) {
      warnings.push("Negative Cash Flow.");
    }
    if (!financial.workingCapitalOk) {
      warnings.push("Negative Working Capital.");
    }
    if (!financial.reasonableDebt) warnings.push("Extreme Debt.");
    if (input.governanceRedFlags || input.accountingConcerns) {
      warnings.push("Weak Governance.");
    }
    if (!financial.consistentProfitability) {
      warnings.push("Persistent Losses / Financial Distress.");
    }
    return {
      recommendation: "AVOID",
      reasons: ["Company fails Magic Formula quality filters."],
      warnings,
    };
  }

  const buyReady =
    ranking.percentileRank <= config.topPercentileBuy &&
    ranking.magicFormulaRank <= config.maxMagicFormulaRankBuy &&
    earningsYield.earningsYield >= config.minEarningsYieldBuy &&
    roc.returnOnCapital >= config.minRocBuy &&
    financial.positiveFcf &&
    financial.healthyBalanceSheet &&
    input.governanceScore >= config.minGovernanceScore &&
    !input.governanceRedFlags &&
    input.institutionalHolding >= config.minInstitutionalHolding &&
    financial.score >= config.minFinancialStrengthBuy;

  if (buyReady) {
    reasons.push(
      "Company ranks in the top percentile of the Magic Formula universe."
    );
    reasons.push("High earnings yield indicates attractive valuation.");
    reasons.push(
      "Return on capital demonstrates efficient capital allocation."
    );
    reasons.push("Strong operating cash flow supports earnings quality.");
    reasons.push(
      "Financial strength and governance satisfy institutional filters."
    );
    return { recommendation: "BUY", reasons, warnings };
  }

  const watchReady =
    ranking.percentileRank <= config.topPercentileWatch &&
    ranking.magicFormulaRank <= config.maxMagicFormulaRankWatch &&
    earningsYield.earningsYield >= config.minEarningsYieldWatch &&
    roc.returnOnCapital >= config.minRocWatch &&
    financial.positiveFcf &&
    financial.score >= config.minFinancialStrengthWatch &&
    !input.governanceRedFlags;

  if (watchReady) {
    reasons.push(
      "Decent Magic Formula profile — rank or yields not yet ideal for BUY."
    );
    return { recommendation: "WATCH", reasons, warnings };
  }

  return {
    recommendation: "AVOID",
    reasons: ["Does not meet Magic Formula BUY or WATCH criteria."],
    warnings,
  };
}

export function resolvePositionSize(input: {
  recommendation: MagicFormulaRecommendation;
  qualityScore: number;
  conviction: number;
  ranking: MagicFormulaRankingResult;
  financial: MagicFormulaFinancialAnalysis;
  config: MagicFormulaConfig;
}): MagicFormulaPositionSize {
  if (input.recommendation === "AVOID") return "None";
  if (input.recommendation === "WATCH") return "Starter Position";

  if (
    input.ranking.percentileRank <=
      input.config.topPercentileBuy *
        input.config.topPercentileMaxAllocationFactor &&
    input.financial.cashFlowQuality >= 80 &&
    input.financial.score >= 80 &&
    input.conviction >= 85 &&
    input.qualityScore >= 85
  ) {
    return "Maximum Allocation";
  }
  if (
    input.qualityScore >= 80 &&
    input.conviction >= 75 &&
    input.ranking.percentileRank <= input.config.topPercentileBuy
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
