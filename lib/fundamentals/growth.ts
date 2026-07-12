/**
 * Growth analysis — CAGR metrics and growth score (Sprint 8C).
 * Distinct from growth-engine.ts which computes raw growth from statements.
 */

import { round } from "@/lib/engine/utils";
import { findStatementValue } from "@/lib/fundamentals/normalize";
import { normalizeScore, safeMetric } from "@/lib/fundamentals/registry";
import type { GrowthMetrics, FinancialStatementPeriod } from "@/lib/fundamentals/types";

export interface GrowthAnalysis {
  revenueCagr: number | null;
  profitCagr: number | null;
  revenueGrowth: number | null;
  profitGrowth: number | null;
  growthScore: number;
}

function cagr(start: number, end: number, years: number): number | null {
  if (!start || !end || years <= 0 || start <= 0) return null;
  return round((Math.pow(end / start, 1 / years) - 1) * 100);
}

function extractAnnualSeries(
  periods: FinancialStatementPeriod[],
  labels: string[]
): number[] {
  return periods
    .filter((period) => period.periodType === "annual")
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((period) => findStatementValue(period, ...labels));
}

function scoreGrowth(value: number | null, excellent = 20, good = 10): number {
  if (value === null) return 50;
  if (value >= excellent) return normalizeScore(86 + value * 0.4);
  if (value >= good) return normalizeScore(62 + (value - good) * 2.4);
  if (value >= 0) return normalizeScore(42 + value * 2);
  return normalizeScore(38 + value * 1.5);
}

export function computeGrowthAnalysis(input: {
  income: FinancialStatementPeriod[];
  growth: GrowthMetrics;
  fallbackRevenueGrowth: number;
  fallbackProfitGrowth: number;
}): GrowthAnalysis {
  const { income, growth, fallbackRevenueGrowth, fallbackProfitGrowth } = input;

  const revenues = extractAnnualSeries(income, ["revenue", "totalRevenue", "Revenue"]);
  const profits = extractAnnualSeries(income, ["netIncome", "netProfit", "Net Income"]);

  const revenueGrowth = safeMetric(growth.revenueGrowth) ?? fallbackRevenueGrowth;
  const profitGrowth = safeMetric(growth.profitGrowth) ?? fallbackProfitGrowth;

  const revCagrFromStatements =
    revenues.length >= 4
      ? cagr(revenues.at(-4)!, revenues.at(-1)!, 3)
      : revenues.length >= 2
        ? cagr(revenues[0], revenues.at(-1)!, revenues.length - 1)
        : null;

  const profitCagrFromStatements =
    profits.length >= 4
      ? cagr(profits.at(-4)!, profits.at(-1)!, 3)
      : profits.length >= 2
        ? cagr(profits[0], profits.at(-1)!, profits.length - 1)
        : null;

  const revenueCagr = safeMetric(growth.cagr3Year) ?? revCagrFromStatements;
  const profitCagr = profitCagrFromStatements;

  const growthScore = normalizeScore(
    scoreGrowth(revenueCagr ?? revenueGrowth) * 0.35 +
      scoreGrowth(profitCagr ?? profitGrowth) * 0.35 +
      scoreGrowth(revenueGrowth) * 0.15 +
      scoreGrowth(profitGrowth) * 0.15
  );

  return {
    revenueCagr,
    profitCagr,
    revenueGrowth,
    profitGrowth,
    growthScore,
  };
}
