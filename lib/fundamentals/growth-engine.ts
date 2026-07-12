/**
 * Growth engine — revenue, profit, EPS, cash flow growth and CAGR.
 */

import { round } from "@/lib/engine/utils";
import type { FinancialStatementPeriod, GrowthMetrics } from "@/lib/fundamentals/types";
import type { AnnualFinancial } from "@/types";
import { findStatementValue } from "@/lib/fundamentals/normalize";

function yoyGrowth(current: number, previous: number): number {
  if (!previous || !Number.isFinite(previous)) return 0;
  return round(((current - previous) / Math.abs(previous)) * 100);
}

function cagr(start: number, end: number, years: number): number {
  if (!start || !end || years <= 0) return 0;
  if (start <= 0) return 0;
  return round((Math.pow(end / start, 1 / years) - 1) * 100);
}

function extractAnnualRevenue(statements: FinancialStatementPeriod[]): number[] {
  return statements
    .filter((s) => s.periodType === "annual")
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => findStatementValue(s, "revenue", "totalRevenue", "Revenue"));
}

function extractAnnualProfit(statements: FinancialStatementPeriod[]): number[] {
  return statements
    .filter((s) => s.periodType === "annual")
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) =>
      findStatementValue(
        s,
        "netIncome",
        "netProfit",
        "Net Income",
        "profitAfterTax"
      )
    );
}

function extractAnnualEps(statements: FinancialStatementPeriod[]): number[] {
  return statements
    .filter((s) => s.periodType === "annual")
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => findStatementValue(s, "eps", "EPS", "epsDiluted"));
}

function extractOperatingCashFlow(statements: FinancialStatementPeriod[]): number[] {
  return statements
    .filter((s) => s.periodType === "annual")
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) =>
      findStatementValue(
        s,
        "operatingCashFlow",
        "netCashProvidedByOperatingActivities",
        "Operating Cash Flow"
      )
    );
}

function extractFreeCashFlow(statements: FinancialStatementPeriod[]): number[] {
  return statements
    .filter((s) => s.periodType === "annual")
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) =>
      findStatementValue(s, "freeCashFlow", "Free Cash Flow", "fcf")
    );
}

export function calculateGrowthFromStatements(
  income: FinancialStatementPeriod[],
  cashflow: FinancialStatementPeriod[],
  annualFinancials: AnnualFinancial[]
): GrowthMetrics {
  const revenues = extractAnnualRevenue(income);
  const profits = extractAnnualProfit(income);
  const epsSeries = extractAnnualEps(income);
  const ocfSeries = extractOperatingCashFlow(cashflow);
  const fcfSeries = extractFreeCashFlow(cashflow);

  const revFromAnnual = annualFinancials.map((a) => {
    const val = a.revenue.replace(/[₹,\s]/g, "");
    const num = Number.parseFloat(val);
    return a.revenue.includes("L Cr") ? num * 100_000 : num;
  });

  const profitFromAnnual = annualFinancials.map((a) => {
    const val = a.netProfit.replace(/[₹,\s]/g, "");
    const num = Number.parseFloat(val);
    return a.netProfit.includes("L Cr") ? num * 100_000 : num;
  });

  const epsFromAnnual = annualFinancials.map((a) => a.eps);

  const rev = revenues.length >= 2 ? revenues : revFromAnnual.reverse();
  const prof = profits.length >= 2 ? profits : profitFromAnnual.reverse();
  const eps = epsSeries.length >= 2 ? epsSeries : epsFromAnnual.reverse();
  const ocf = ocfSeries;
  const fcf = fcfSeries;

  const latestRev = rev.at(-1) ?? 0;
  const prevRev = rev.at(-2) ?? latestRev;
  const latestProf = prof.at(-1) ?? 0;
  const prevProf = prof.at(-2) ?? latestProf;
  const latestEps = eps.at(-1) ?? 0;
  const prevEps = eps.at(-2) ?? latestEps;
  const latestOcf = ocf.at(-1) ?? 0;
  const prevOcf = ocf.at(-2) ?? latestOcf;
  const latestFcf = fcf.at(-1) ?? 0;
  const prevFcf = fcf.at(-2) ?? latestFcf;

  const rev3Start = rev.at(-4) ?? rev[0] ?? latestRev;
  const rev5Start = rev.at(-6) ?? rev[0] ?? latestRev;

  return {
    revenueGrowth: yoyGrowth(latestRev, prevRev),
    profitGrowth: yoyGrowth(latestProf, prevProf),
    epsGrowth: yoyGrowth(latestEps, prevEps),
    operatingCashFlowGrowth: yoyGrowth(latestOcf, prevOcf),
    freeCashFlowGrowth: yoyGrowth(latestFcf, prevFcf),
    cagr3Year: cagr(rev3Start, latestRev, 3),
    cagr5Year: cagr(rev5Start, latestRev, 5),
  };
}

export function enrichGrowthOnFinancials(
  financials: { revenueGrowth: number; netProfitGrowth: number },
  growth: GrowthMetrics
): void {
  financials.revenueGrowth = growth.revenueGrowth;
  financials.netProfitGrowth = growth.profitGrowth;
}
