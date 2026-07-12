/**
 * Financial ratios engine — computes and normalizes ratio set.
 */

import { round } from "@/lib/engine/utils";
import type { FinancialRatios, FinancialStatementPeriod } from "@/lib/fundamentals/types";
import { findStatementValue, safeNumber } from "@/lib/fundamentals/normalize";

export function mergeRatios(
  base: FinancialRatios,
  overlay: Partial<FinancialRatios>
): FinancialRatios {
  const merged: FinancialRatios = { ...base };
  for (const [key, value] of Object.entries(overlay)) {
    if (value !== undefined && Number.isFinite(value as number)) {
      (merged as Record<string, number>)[key] = value as number;
    }
  }
  return merged;
}

export function computeRatiosFromStatements(
  income: FinancialStatementPeriod[],
  balance: FinancialStatementPeriod[],
  cashflow: FinancialStatementPeriod[],
  marketPrice?: number
): FinancialRatios {
  const latestIncome = income.filter((s) => s.periodType === "annual").at(-1);
  const latestBalance = balance.filter((s) => s.periodType === "annual").at(-1);
  const latestCash = cashflow.filter((s) => s.periodType === "annual").at(-1);

  if (!latestIncome) return {};

  const revenue = findStatementValue(latestIncome, "revenue", "totalRevenue", "Revenue");
  const netIncome = findStatementValue(
    latestIncome,
    "netIncome",
    "netProfit",
    "Net Income"
  );
  const grossProfit = findStatementValue(
    latestIncome,
    "grossProfit",
    "Gross Profit"
  );
  const operatingIncome = findStatementValue(
    latestIncome,
    "operatingIncome",
    "ebitda",
    "EBITDA"
  );
  const eps = findStatementValue(latestIncome, "eps", "EPS", "epsDiluted");

  const totalEquity = latestBalance
    ? findStatementValue(latestBalance, "totalEquity", "totalStockholdersEquity")
    : 0;
  const totalDebt = latestBalance
    ? findStatementValue(latestBalance, "totalDebt", "longTermDebt")
    : 0;
  const totalAssets = latestBalance
    ? findStatementValue(latestBalance, "totalAssets")
    : 0;
  const currentAssets = latestBalance
    ? findStatementValue(latestBalance, "totalCurrentAssets")
    : 0;
  const currentLiabilities = latestBalance
    ? findStatementValue(latestBalance, "totalCurrentLiabilities")
    : 0;

  const fcf = latestCash
    ? findStatementValue(latestCash, "freeCashFlow", "Free Cash Flow")
    : 0;

  const pe = marketPrice && eps ? round(marketPrice / eps, 1) : undefined;
  const pb =
    marketPrice && totalEquity && revenue
      ? round((marketPrice * revenue) / totalEquity, 1)
      : undefined;

  return {
    pe,
    pb,
    ps: revenue ? round((marketPrice ?? 0) / (revenue / 100), 1) : undefined,
    eps: eps || undefined,
    roe: totalEquity ? round((netIncome / totalEquity) * 100, 1) : undefined,
    roa: totalAssets ? round((netIncome / totalAssets) * 100, 1) : undefined,
    debtToEquity: totalEquity ? round(totalDebt / totalEquity, 2) : undefined,
    currentRatio:
      currentLiabilities ? round(currentAssets / currentLiabilities, 2) : undefined,
    operatingMargin: revenue ? round((operatingIncome / revenue) * 100, 1) : undefined,
    netMargin: revenue ? round((netIncome / revenue) * 100, 1) : undefined,
    grossMargin: revenue && grossProfit ? round((grossProfit / revenue) * 100, 1) : undefined,
    freeCashFlow: fcf || undefined,
    bookValue: totalEquity || undefined,
  };
}

export function ratiosFromFmpKeyMetrics(raw: Record<string, unknown>): FinancialRatios {
  return {
    marketCap: safeNumber(raw.marketCap),
    enterpriseValue: safeNumber(raw.enterpriseValue),
    pe: safeNumber(raw.peRatio),
    forwardPe: safeNumber(raw.peRatio),
    peg: safeNumber(raw.pegRatio),
    pb: safeNumber(raw.pbRatio),
    ps: safeNumber(raw.priceToSalesRatio),
    evToEbitda: safeNumber(raw.enterpriseValueOverEBITDA),
    dividendYield: safeNumber(raw.dividendYield),
    roe: safeNumber(raw.roe),
    roa: safeNumber(raw.returnOnAssets),
    debtToEquity: safeNumber(raw.debtToEquity),
    currentRatio: safeNumber(raw.currentRatio),
    interestCoverage: safeNumber(raw.interestCoverage),
    operatingMargin: safeNumber(raw.operatingProfitMargin),
    netMargin: safeNumber(raw.netProfitMargin),
    grossMargin: safeNumber(raw.grossProfitMargin),
    eps: safeNumber(raw.netIncomePerShare),
    bookValue: safeNumber(raw.bookValuePerShare),
    freeCashFlow: safeNumber(raw.freeCashFlowPerShare),
  };
}

export function ratiosFromAlphaOverview(raw: Record<string, unknown>): FinancialRatios {
  return {
    marketCap: safeNumber(raw.MarketCapitalization),
    pe: safeNumber(raw.PERatio),
    forwardPe: safeNumber(raw.ForwardPE),
    peg: safeNumber(raw.PEGRatio),
    pb: safeNumber(raw.PriceToBookRatio),
    ps: safeNumber(raw.PriceToSalesRatioTTM),
    evToEbitda: safeNumber(raw.EVToEBITDA),
    dividendYield: safeNumber(raw.DividendYield) * 100,
    eps: safeNumber(raw.EPS),
    bookValue: safeNumber(raw.BookValue),
    roe: safeNumber(raw.ReturnOnEquityTTM),
    roa: safeNumber(raw.ReturnOnAssetsTTM),
    netMargin: safeNumber(raw.ProfitMargin) * 100,
  };
}
