/**
 * Financial Intelligence Engine — institutional financial analysis layer.
 * Orchestrates statements, TTM, CAGR, ratios, and composite scores.
 */

import { clamp, round } from "@/lib/engine/utils";
import { computeFinancialFundamentals } from "@/lib/fundamentals/fundamentals-engine";
import { findStatementValue } from "@/lib/fundamentals/normalize";
import { normalizeScore, safeMetric } from "@/lib/fundamentals/registry";
import {
  computeInstitutionalRatios,
  type InstitutionalRatios,
} from "@/lib/financials/ratioEngine";
import type {
  EnrichedQuarterlyResult,
  FinancialFundamentals,
  FinancialStatementPeriod,
  FundamentalsBundle,
} from "@/lib/fundamentals/types";
import type { AnnualFinancial, CompanyProfile } from "@/types";

export interface StatementSnapshot {
  period: string;
  periodType: "annual" | "quarterly";
  date: string;
  fiscalYear?: string;
  fiscalQuarter?: string;
  lines: FinancialStatementPeriod["lines"];
}

export interface FinancialStatementsSnapshot {
  incomeStatement: {
    annual: StatementSnapshot[];
    quarterly: StatementSnapshot[];
  };
  balanceSheet: {
    annual: StatementSnapshot[];
  };
  cashFlow: {
    annual: StatementSnapshot[];
  };
}

export interface TTMMetrics {
  revenue: number | null;
  netProfit: number | null;
  ebitda: number | null;
  eps: number | null;
  operatingCashFlow: number | null;
  freeCashFlow: number | null;
}

export interface CAGRSnapshot {
  cagr3Y: number | null;
  cagr5Y: number | null;
  cagr10Y: number | null;
}

export interface CAGRSeries {
  revenue: CAGRSnapshot;
  profit: CAGRSnapshot;
  eps: CAGRSnapshot;
}

export interface WorkingCapitalMetrics {
  workingCapital: number | null;
  inventoryDays: number | null;
  debtorDays: number | null;
  creditorDays: number | null;
  cashConversionCycle: number | null;
}

export interface FinancialScores {
  financialHealthScore: number;
  qualityScore: number;
  riskScore: number;
  growthScore: number;
  profitabilityScore: number;
  solvencyScore: number;
  valuationScore: number;
}

export interface FinancialIntelligence {
  symbol: string;
  computedAt: string;
  statements: FinancialStatementsSnapshot;
  ttm: TTMMetrics;
  cagr: CAGRSeries;
  workingCapital: WorkingCapitalMetrics;
  ratios: InstitutionalRatios;
  ratioCount: number;
  scores: FinancialScores;
  fundamentals: FinancialFundamentals;
  quarterlyFinancials: EnrichedQuarterlyResult[];
  annualFinancials: AnnualFinancial[];
}

function toSnapshot(period: FinancialStatementPeriod): StatementSnapshot {
  return {
    period: period.period,
    periodType: period.periodType,
    date: period.date,
    fiscalYear: period.fiscalYear,
    fiscalQuarter: period.fiscalQuarter,
    lines: period.lines,
  };
}

function sortByDate(periods: FinancialStatementPeriod[]): FinancialStatementPeriod[] {
  return [...periods].sort((a, b) => a.date.localeCompare(b.date));
}

function annualSeries(
  periods: FinancialStatementPeriod[],
  labels: string[]
): number[] {
  return sortByDate(periods)
    .filter((period) => period.periodType === "annual")
    .map((period) => findStatementValue(period, ...labels));
}

function cagr(start: number, end: number, years: number): number | null {
  if (!start || !end || years <= 0 || start <= 0) return null;
  return round((Math.pow(end / start, 1 / years) - 1) * 100);
}

function cagrFromSeries(series: number[], years: number): number | null {
  if (series.length < 2) return null;
  const end = series.at(-1)!;
  const startIndex = Math.max(0, series.length - 1 - years);
  const start = series[startIndex] ?? series[0];
  const span = series.length - 1 - startIndex;
  return cagr(start, end, span > 0 ? span : years);
}

function buildCagrSnapshot(series: number[]): CAGRSnapshot {
  return {
    cagr3Y: cagrFromSeries(series, 3),
    cagr5Y: cagrFromSeries(series, 5),
    cagr10Y: cagrFromSeries(series, 10),
  };
}

function sumQuarterlyValues(
  quarters: FinancialStatementPeriod[],
  labels: string[]
): number | null {
  if (quarters.length === 0) return null;
  const total = quarters.reduce(
    (sum, quarter) => sum + findStatementValue(quarter, ...labels),
    0
  );
  return total !== 0 ? round(total) : null;
}

function computeTTM(
  income: FinancialStatementPeriod[],
  cashflow: FinancialStatementPeriod[]
): TTMMetrics {
  const quarterlyIncome = sortByDate(income)
    .filter((period) => period.periodType === "quarterly")
    .slice(-4);

  const quarterlyCashflow = sortByDate(cashflow)
    .filter((period) => period.periodType === "quarterly")
    .slice(-4);

  if (quarterlyIncome.length === 4) {
    return {
      revenue: sumQuarterlyValues(quarterlyIncome, ["revenue", "totalRevenue", "Revenue"]),
      netProfit: sumQuarterlyValues(quarterlyIncome, [
        "netIncome",
        "netProfit",
        "Net Income",
      ]),
      ebitda: sumQuarterlyValues(quarterlyIncome, ["ebitda", "EBITDA", "operatingIncome"]),
      eps: sumQuarterlyValues(quarterlyIncome, ["eps", "EPS", "epsDiluted"]),
      operatingCashFlow:
        quarterlyCashflow.length === 4
          ? sumQuarterlyValues(quarterlyCashflow, [
              "operatingCashFlow",
              "netCashProvidedByOperatingActivities",
              "Operating Cash Flow",
            ])
          : null,
      freeCashFlow:
        quarterlyCashflow.length === 4
          ? sumQuarterlyValues(quarterlyCashflow, ["freeCashFlow", "Free Cash Flow", "fcf"])
          : null,
    };
  }

  const latestIncome = sortByDate(income)
    .filter((period) => period.periodType === "annual")
    .at(-1);
  const latestCashflow = sortByDate(cashflow)
    .filter((period) => period.periodType === "annual")
    .at(-1);

  if (!latestIncome) {
    return {
      revenue: null,
      netProfit: null,
      ebitda: null,
      eps: null,
      operatingCashFlow: null,
      freeCashFlow: null,
    };
  }

  return {
    revenue: findStatementValue(latestIncome, "revenue", "totalRevenue", "Revenue") || null,
    netProfit:
      findStatementValue(latestIncome, "netIncome", "netProfit", "Net Income") || null,
    ebitda:
      findStatementValue(latestIncome, "ebitda", "EBITDA", "operatingIncome") || null,
    eps: findStatementValue(latestIncome, "eps", "EPS", "epsDiluted") || null,
    operatingCashFlow: latestCashflow
      ? findStatementValue(
          latestCashflow,
          "operatingCashFlow",
          "netCashProvidedByOperatingActivities",
          "Operating Cash Flow"
        ) || null
      : null,
    freeCashFlow: latestCashflow
      ? findStatementValue(latestCashflow, "freeCashFlow", "Free Cash Flow", "fcf") || null
      : null,
  };
}

function computeRiskScore(input: {
  debtEquity: number | null;
  interestCoverage: number | null;
  profitGrowth: number | null;
  revenueGrowth: number | null;
  altmanZ: number | null;
  beneishM: number | null;
  financialStrength: number;
}): number {
  let risk = 0;

  if (input.debtEquity !== null) {
    if (input.debtEquity > 2) risk += 24;
    else if (input.debtEquity > 1) risk += 14;
    else if (input.debtEquity > 0.6) risk += 8;
  }

  if (input.interestCoverage !== null) {
    if (input.interestCoverage < 1.5) risk += 22;
    else if (input.interestCoverage < 3) risk += 12;
    else if (input.interestCoverage < 5) risk += 6;
  }

  if (input.profitGrowth !== null && input.profitGrowth < 0) risk += 14;
  if (input.revenueGrowth !== null && input.revenueGrowth < 0) risk += 10;

  if (input.altmanZ !== null) {
    if (input.altmanZ < 1.8) risk += 20;
    else if (input.altmanZ < 2.6) risk += 10;
  }

  if (input.beneishM !== null && input.beneishM > -1.78) risk += 12;

  risk += Math.round((100 - input.financialStrength) * 0.22);

  return clamp(Math.round(risk), 0, 100);
}

function computeFinancialHealthScore(input: {
  profitabilityScore: number;
  solvencyScore: number;
  growthScore: number;
  qualityScore: number;
  cashConversion: number | null;
}): number {
  const cashQuality =
    input.cashConversion === null
      ? 50
      : input.cashConversion >= 90
        ? 90
        : input.cashConversion >= 70
          ? 78
          : input.cashConversion >= 50
            ? 62
            : normalizeScore(35 + input.cashConversion * 0.5);

  return normalizeScore(
    input.profitabilityScore * 0.25 +
      input.solvencyScore * 0.25 +
      input.growthScore * 0.2 +
      input.qualityScore * 0.2 +
      cashQuality * 0.1
  );
}

export function buildFinancialIntelligence(
  bundle: FundamentalsBundle,
  profile?: CompanyProfile
): FinancialIntelligence {
  const fundamentals = computeFinancialFundamentals(bundle, profile);
  const { statements, ratios, growth, quarterlyResults, annualFinancials } = bundle;

  const income = statements.income;
  const balance = statements.balance;
  const cashflow = statements.cashflow;

  const revenues = annualSeries(income, ["revenue", "totalRevenue", "Revenue"]);
  const profits = annualSeries(income, ["netIncome", "netProfit", "Net Income"]);
  const epsSeries = annualSeries(income, ["eps", "EPS", "epsDiluted"]);

  const cagrSeries: CAGRSeries = {
    revenue: buildCagrSnapshot(revenues),
    profit: buildCagrSnapshot(profits),
    eps: buildCagrSnapshot(epsSeries),
  };

  const ttm = computeTTM(income, cashflow);

  const institutionalRatios = computeInstitutionalRatios({
    income,
    balance,
    cashflow,
    bundleRatios: ratios,
    growth,
    marketPrice: profile?.price ?? bundle.price,
    revenueCagr10Y: cagrSeries.revenue.cagr10Y,
    profitCagr10Y: cagrSeries.profit.cagr10Y,
    epsCagr3Y: cagrSeries.eps.cagr3Y,
    ttmRevenue: ttm.revenue,
    ttmNetProfit: ttm.netProfit,
    ttmOperatingCashFlow: ttm.operatingCashFlow,
    ttmFreeCashFlow: ttm.freeCashFlow,
  });

  const solvencyScore = fundamentals.financialStrength;
  const qualityScore = fundamentals.qualityScore;
  const growthScore = fundamentals.growthScore;
  const profitabilityScore = fundamentals.profitabilityScore;
  const valuationScore = fundamentals.valuationScore;

  const financialHealthScore = computeFinancialHealthScore({
    profitabilityScore,
    solvencyScore,
    growthScore,
    qualityScore,
    cashConversion: fundamentals.cashConversion,
  });

  const riskScore = computeRiskScore({
    debtEquity: fundamentals.debtEquity,
    interestCoverage: fundamentals.interestCoverage,
    profitGrowth: safeMetric(growth.profitGrowth),
    revenueGrowth: safeMetric(growth.revenueGrowth),
    altmanZ: fundamentals.altmanZScore,
    beneishM: fundamentals.beneishMScore,
    financialStrength: solvencyScore,
  });

  return {
    symbol: profile?.symbol ?? bundle.symbol,
    computedAt: new Date().toISOString(),
    statements: {
      incomeStatement: {
        annual: sortByDate(income)
          .filter((period) => period.periodType === "annual")
          .map(toSnapshot),
        quarterly: sortByDate(income)
          .filter((period) => period.periodType === "quarterly")
          .map(toSnapshot),
      },
      balanceSheet: {
        annual: sortByDate(balance)
          .filter((period) => period.periodType === "annual")
          .map(toSnapshot),
      },
      cashFlow: {
        annual: sortByDate(cashflow)
          .filter((period) => period.periodType === "annual")
          .map(toSnapshot),
      },
    },
    ttm,
    cagr: cagrSeries,
    workingCapital: {
      workingCapital: institutionalRatios.workingCapital,
      inventoryDays: institutionalRatios.inventoryDays,
      debtorDays: institutionalRatios.debtorDays,
      creditorDays: institutionalRatios.creditorDays,
      cashConversionCycle: institutionalRatios.cashConversionCycle,
    },
    ratios: institutionalRatios,
    ratioCount: Object.values(institutionalRatios).filter(
      (value) => value !== null && Number.isFinite(value)
    ).length,
    scores: {
      financialHealthScore,
      qualityScore,
      riskScore,
      growthScore,
      profitabilityScore,
      solvencyScore,
      valuationScore,
    },
    fundamentals,
    quarterlyFinancials: quarterlyResults,
    annualFinancials,
  };
}

export function buildFinancialIntelligenceFromProfile(
  profile: CompanyProfile
): FinancialIntelligence | null {
  if (!profile.fundamentals) return null;

  const ff = profile.fundamentals;

  const ratios: InstitutionalRatios = {
    grossMargin: ff.grossMargin,
    operatingMargin: ff.operatingMargin,
    ebitdaMargin: null,
    netMargin: ff.netMargin,
    pretaxMargin: null,
    roe: ff.roe,
    roce: ff.roce,
    roa: ff.roa,
    roic: null,
    eps: ff.eps,
    dividendPayoutRatio: null,
    earningsYield: ff.pe && ff.pe > 0 ? round(100 / ff.pe, 2) : null,
    currentRatio: ff.currentRatio,
    quickRatio: ff.quickRatio,
    cashRatio: null,
    workingCapital: null,
    netWorkingCapital: null,
    workingCapitalToSales: null,
    debtToEquity: ff.debtEquity,
    debtToAssets: null,
    netDebtToEquity: null,
    longTermDebtToEquity: null,
    interestCoverage: ff.interestCoverage,
    equityRatio: null,
    financialLeverage: null,
    assetTurnover: null,
    inventoryTurnover: null,
    receivablesTurnover: null,
    payablesTurnover: null,
    fixedAssetTurnover: null,
    capitalTurnover: null,
    inventoryDays: null,
    debtorDays: null,
    creditorDays: null,
    cashConversionCycle: null,
    freeCashFlow: null,
    operatingCashFlow: null,
    fcfMargin: ff.fcfMargin,
    cfoToPat: ff.cashConversion,
    cfoToRevenue: null,
    capexToRevenue: null,
    pe: ff.pe,
    forwardPe: ff.forwardPe,
    pb: ff.pb,
    ps: null,
    evToEbitda: ff.evEbitda,
    peg: ff.peg,
    dividendYield: ff.dividendYield,
    evToSales: null,
    priceToFreeCashFlow: null,
    revenueGrowthYoY: profile.financials.revenueGrowth,
    profitGrowthYoY: profile.financials.netProfitGrowth,
    epsGrowthYoY: profile.financials.netProfitGrowth,
    revenueCagr3Y: ff.revenueCagr,
    revenueCagr5Y: null,
    revenueCagr10Y: null,
    profitCagr3Y: ff.profitCagr,
    profitCagr5Y: null,
    profitCagr10Y: null,
    epsCagr3Y: null,
  };

  const solvencyScore = ff.financialStrength;
  const qualityScore = ff.qualityScore;
  const growthScore = ff.growthScore;
  const profitabilityScore = ff.profitabilityScore;
  const valuationScore = ff.valuationScore;

  const financialHealthScore = computeFinancialHealthScore({
    profitabilityScore,
    solvencyScore,
    growthScore,
    qualityScore,
    cashConversion: ff.cashConversion,
  });

  const riskScore = computeRiskScore({
    debtEquity: ff.debtEquity,
    interestCoverage: ff.interestCoverage,
    profitGrowth: profile.financials.netProfitGrowth,
    revenueGrowth: profile.financials.revenueGrowth,
    altmanZ: ff.altmanZScore,
    beneishM: ff.beneishMScore,
    financialStrength: solvencyScore,
  });

  return {
    symbol: profile.symbol,
    computedAt: ff.computedAt,
    statements: {
      incomeStatement: { annual: [], quarterly: [] },
      balanceSheet: { annual: [] },
      cashFlow: { annual: [] },
    },
    ttm: {
      revenue: null,
      netProfit: null,
      ebitda: null,
      eps: ff.eps,
      operatingCashFlow: null,
      freeCashFlow: null,
    },
    cagr: {
      revenue: {
        cagr3Y: ff.revenueCagr,
        cagr5Y: null,
        cagr10Y: null,
      },
      profit: {
        cagr3Y: ff.profitCagr,
        cagr5Y: null,
        cagr10Y: null,
      },
      eps: {
        cagr3Y: null,
        cagr5Y: null,
        cagr10Y: null,
      },
    },
    workingCapital: {
      workingCapital: null,
      inventoryDays: null,
      debtorDays: null,
      creditorDays: null,
      cashConversionCycle: null,
    },
    ratios,
    ratioCount: Object.values(ratios).filter(
      (value) => value !== null && Number.isFinite(value)
    ).length,
    scores: {
      financialHealthScore,
      qualityScore,
      riskScore,
      growthScore,
      profitabilityScore,
      solvencyScore,
      valuationScore,
    },
    fundamentals: ff,
    quarterlyFinancials: profile.quarterlyResults.map((result) => ({ ...result })),
    annualFinancials: profile.annualFinancials,
  };
}
