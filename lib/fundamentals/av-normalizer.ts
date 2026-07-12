/**
 * Alpha Vantage fundamentals normalizer.
 */

import { round } from "@/lib/engine/utils";
import {
  formatInrCrores,
  safeNumber,
  statementLine,
  usdMillionsToInrCrores,
} from "@/lib/fundamentals/normalize";
import type { FinancialStatementPeriod, FinancialStatements } from "@/lib/fundamentals/types";
import type { AnnualFinancial, QuarterlyResult } from "@/types";

interface AVIncomeReport {
  fiscalDateEnding?: string;
  reportedCurrency?: string;
  totalRevenue?: string;
  grossProfit?: string;
  operatingIncome?: string;
  netIncome?: string;
  ebitda?: string;
}

export function normalizeAvOverview(overview: Record<string, unknown>) {
  return {
    name: String(overview.Name ?? ""),
    sector: String(overview.Sector ?? ""),
    industry: String(overview.Industry ?? ""),
    description: String(overview.Description ?? ""),
    marketCap: safeNumber(overview.MarketCapitalization),
    eps: safeNumber(overview.EPS),
    pe: safeNumber(overview.PERatio),
    pb: safeNumber(overview.PriceToBookRatio),
    roe: safeNumber(overview.ReturnOnEquityTTM),
    dividendYield: safeNumber(overview.DividendYield) * 100,
  };
}

function avReportToPeriod(
  report: AVIncomeReport,
  periodType: "annual" | "quarterly"
): FinancialStatementPeriod {
  const revenue = safeNumber(report.totalRevenue);
  const netIncome = safeNumber(report.netIncome);
  const revenueCr = usdMillionsToInrCrores(revenue / 1_000_000);

  return {
    period: report.fiscalDateEnding ?? "Unknown",
    periodType,
    date: report.fiscalDateEnding ?? "",
    currency: report.reportedCurrency ?? "INR",
    lines: [
      statementLine("revenue", revenueCr),
      statementLine("netIncome", usdMillionsToInrCrores(netIncome / 1_000_000)),
      statementLine("grossProfit", usdMillionsToInrCrores(safeNumber(report.grossProfit) / 1_000_000)),
      statementLine("operatingIncome", usdMillionsToInrCrores(safeNumber(report.operatingIncome) / 1_000_000)),
      statementLine("ebitda", usdMillionsToInrCrores(safeNumber(report.ebitda) / 1_000_000)),
    ],
  };
}

export function normalizeAvIncomeStatement(data: Record<string, unknown>): FinancialStatements {
  const annual = (data.annualReports as AVIncomeReport[] | undefined) ?? [];
  const quarterly = (data.quarterlyReports as AVIncomeReport[] | undefined) ?? [];

  return {
    income: [
      ...annual.map((r) => avReportToPeriod(r, "annual")),
      ...quarterly.map((r) => avReportToPeriod(r, "quarterly")),
    ],
    balance: [],
    cashflow: [],
  };
}

export function avIncomeToAnnualFinancials(data: Record<string, unknown>): AnnualFinancial[] {
  const annual = (data.annualReports as AVIncomeReport[] | undefined) ?? [];
  return annual.slice(0, 5).map((row) => {
    const revenueCr = usdMillionsToInrCrores(safeNumber(row.totalRevenue) / 1_000_000);
    const profitCr = usdMillionsToInrCrores(safeNumber(row.netIncome) / 1_000_000);
    const year = row.fiscalDateEnding?.slice(0, 4) ?? "FY";
    return {
      year: `FY${year.slice(-2)}`,
      revenue: formatInrCrores(revenueCr),
      netProfit: formatInrCrores(profitCr),
      eps: 0,
      roe: 0,
    };
  });
}

export function avIncomeToQuarterly(data: Record<string, unknown>): QuarterlyResult[] {
  const quarterly = (data.quarterlyReports as AVIncomeReport[] | undefined) ?? [];
  return quarterly.slice(0, 4).map((row) => {
    const revenue = safeNumber(row.totalRevenue);
    const netIncome = safeNumber(row.netIncome);
    const revenueCr = usdMillionsToInrCrores(revenue / 1_000_000);
    const profitCr = usdMillionsToInrCrores(netIncome / 1_000_000);
    const margin = revenue ? round((netIncome / revenue) * 100, 1) : 0;
    const date = row.fiscalDateEnding ?? "";
    const month = date.slice(5, 7);
    const q = month >= "01" && month <= "03" ? "Q4" : month <= "06" ? "Q1" : month <= "09" ? "Q2" : "Q3";

    return {
      quarter: `${q} FY${date.slice(2, 4)}`,
      revenue: formatInrCrores(revenueCr),
      netProfit: formatInrCrores(profitCr),
      eps: 0,
      margin,
    };
  });
}
