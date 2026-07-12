/**
 * Normalize FMP API responses into EquityOS fundamentals structures.
 */

import { round } from "@/lib/engine/utils";
import {
  formatInrCrores,
  safeNumber,
  statementLine,
  usdMillionsToInrCrores,
} from "@/lib/fundamentals/normalize";
import type {
  FinancialStatementPeriod,
  FinancialStatements,
} from "@/lib/fundamentals/types";
import type { AnnualFinancial, QuarterlyResult } from "@/types";

interface FMPStatementRow {
  date?: string;
  calendarYear?: string;
  period?: string;
  revenue?: number;
  totalRevenue?: number;
  netIncome?: number;
  eps?: number;
  epsdiluted?: number;
  operatingIncome?: number;
  ebitda?: number;
  grossProfit?: number;
  totalAssets?: number;
  totalStockholdersEquity?: number;
  totalDebt?: number;
  totalCurrentAssets?: number;
  totalCurrentLiabilities?: number;
  operatingCashFlow?: number;
  freeCashFlow?: number;
  netCashProvidedByOperatingActivities?: number;
}

function normalizePeriod(row: FMPStatementRow, periodType: "annual" | "quarterly"): FinancialStatementPeriod {
  const revenue = safeNumber(row.revenue ?? row.totalRevenue);
  const netIncome = safeNumber(row.netIncome);
  const lines = [
    statementLine("revenue", usdMillionsToInrCrores(revenue / 1_000_000)),
    statementLine("netIncome", usdMillionsToInrCrores(netIncome / 1_000_000)),
    statementLine("eps", safeNumber(row.eps ?? row.epsdiluted), "INR"),
    statementLine("operatingIncome", usdMillionsToInrCrores(safeNumber(row.operatingIncome) / 1_000_000)),
    statementLine("ebitda", usdMillionsToInrCrores(safeNumber(row.ebitda) / 1_000_000)),
    statementLine("grossProfit", usdMillionsToInrCrores(safeNumber(row.grossProfit) / 1_000_000)),
    statementLine("totalAssets", usdMillionsToInrCrores(safeNumber(row.totalAssets) / 1_000_000)),
    statementLine("totalEquity", usdMillionsToInrCrores(safeNumber(row.totalStockholdersEquity) / 1_000_000)),
    statementLine("totalDebt", usdMillionsToInrCrores(safeNumber(row.totalDebt) / 1_000_000)),
    statementLine("operatingCashFlow", usdMillionsToInrCrores(safeNumber(row.operatingCashFlow ?? row.netCashProvidedByOperatingActivities) / 1_000_000)),
    statementLine("freeCashFlow", usdMillionsToInrCrores(safeNumber(row.freeCashFlow) / 1_000_000)),
  ];

  return {
    period: row.period ?? row.calendarYear ?? row.date ?? "Unknown",
    periodType,
    fiscalYear: row.calendarYear,
    fiscalQuarter: row.period,
    date: row.date ?? "",
    currency: "INR",
    lines,
  };
}

export function normalizeFmpStatements(
  incomeAnnual: unknown,
  incomeQuarterly: unknown,
  balanceAnnual: unknown,
  cashflowAnnual: unknown
): FinancialStatements {
  const toRows = (data: unknown) => (Array.isArray(data) ? (data as FMPStatementRow[]) : []);

  return {
    income: [
      ...toRows(incomeAnnual).map((r) => normalizePeriod(r, "annual")),
      ...toRows(incomeQuarterly).map((r) => normalizePeriod(r, "quarterly")),
    ],
    balance: toRows(balanceAnnual).map((r) => normalizePeriod(r, "annual")),
    cashflow: toRows(cashflowAnnual).map((r) => normalizePeriod(r, "annual")),
  };
}

export function fmpIncomeToAnnualFinancials(incomeAnnual: unknown): AnnualFinancial[] {
  const rows = (Array.isArray(incomeAnnual) ? incomeAnnual : []) as FMPStatementRow[];
  return rows.slice(0, 5).map((row) => {
    const revenueCr = usdMillionsToInrCrores(safeNumber(row.revenue ?? row.totalRevenue) / 1_000_000);
    const profitCr = usdMillionsToInrCrores(safeNumber(row.netIncome) / 1_000_000);
    return {
      year: row.calendarYear ?? row.date?.slice(0, 4) ?? "FY",
      revenue: formatInrCrores(revenueCr),
      netProfit: formatInrCrores(profitCr),
      eps: round(safeNumber(row.eps ?? row.epsdiluted), 1),
      roe: 0,
    };
  });
}

export function fmpIncomeToQuarterly(incomeQuarterly: unknown): QuarterlyResult[] {
  const rows = (Array.isArray(incomeQuarterly) ? incomeQuarterly : []) as FMPStatementRow[];
  return rows.slice(0, 4).map((row) => {
    const revenueCr = usdMillionsToInrCrores(safeNumber(row.revenue ?? row.totalRevenue) / 1_000_000);
    const profitCr = usdMillionsToInrCrores(safeNumber(row.netIncome) / 1_000_000);
    const revenue = safeNumber(row.revenue ?? row.totalRevenue);
    const margin = revenue ? round((safeNumber(row.netIncome) / revenue) * 100, 1) : 0;
    const period = row.period ?? row.date ?? "Q";
    const year = row.calendarYear ?? row.date?.slice(0, 4) ?? "";

    return {
      quarter: `${period} FY${year.slice(-2)}`,
      revenue: formatInrCrores(revenueCr),
      netProfit: formatInrCrores(profitCr),
      eps: round(safeNumber(row.eps ?? row.epsdiluted), 1),
      margin,
    };
  });
}

export function formatFmpMarketCap(mktCap?: number): string {
  if (!mktCap) return "—";
  const crores = (mktCap * 83.5) / 10_000_000;
  return formatInrCrores(crores);
}
