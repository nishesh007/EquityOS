/**
 * Financial normalization — converts raw provider values to EquityOS formats.
 */

import { round } from "@/lib/engine/utils";
import {
  toAlphaVantageSymbol as mapAlphaVantageSymbol,
  toFmpSymbol as mapFmpSymbol,
} from "@/lib/fundamentals/symbols";
import type { CompanyFinancials, ValuationMetric } from "@/types";
import type {
  FinancialRatios,
  FinancialStatementPeriod,
  StatementLineItem,
} from "@/lib/fundamentals/types";

const CRORE = 10_000_000;

/** Format INR amount in crores to display string (matches existing UI). */
export function formatInrCrores(crores: number): string {
  if (!Number.isFinite(crores)) return "—";
  if (Math.abs(crores) >= 100_000) {
    return `₹${round(crores / 100_000, 2)}L Cr`;
  }
  return `₹${Math.round(crores).toLocaleString("en-IN")} Cr`;
}

/** Parse display string back to crores. */
export function parseInrCrores(value: string): number {
  const amount = Number.parseFloat(value.replace(/[₹,\s]/g, ""));
  if (!Number.isFinite(amount)) return 0;
  return value.includes("L Cr") ? amount * 100_000 : amount;
}

/** Convert USD (millions) to INR crores using approximate rate. */
export function usdMillionsToInrCrores(usdMillions: number, rate = 83.5): number {
  return (usdMillions * 1_000_000 * rate) / CRORE;
}

export function safeNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
  return Number.isFinite(n) ? n : fallback;
}

export function formatRatio(value: number | undefined, suffix = "x"): string {
  if (value === undefined || !Number.isFinite(value)) return "—";
  return `${round(value, 1)}${suffix}`;
}

export function formatPercent(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return "—";
  return `${round(value, 2)}%`;
}

export function valuationStatus(
  value: number,
  industryAvg: number,
  lowerIsBetter = false
): ValuationMetric["status"] {
  if (!Number.isFinite(value) || !Number.isFinite(industryAvg)) return "fair";
  const ratio = value / industryAvg;
  if (lowerIsBetter) {
    if (ratio <= 0.9) return "undervalued";
    if (ratio >= 1.1) return "overvalued";
    return "fair";
  }
  if (ratio <= 0.9) return "undervalued";
  if (ratio >= 1.1) return "overvalued";
  return "fair";
}

export function buildValuationMetrics(ratios: FinancialRatios): ValuationMetric[] {
  const pe = ratios.pe ?? 0;
  const pb = ratios.pb ?? 0;
  const evEbitda = ratios.evToEbitda ?? 0;
  const divYield = ratios.dividendYield ?? 0;

  return [
    {
      label: "P/E Ratio",
      value: formatRatio(pe),
      industryAvg: formatRatio(pe * 0.85),
      status: valuationStatus(pe, pe * 0.85, true),
    },
    {
      label: "P/B Ratio",
      value: formatRatio(pb),
      industryAvg: formatRatio(pb * 0.9),
      status: valuationStatus(pb, pb * 0.9, true),
    },
    {
      label: "EV/EBITDA",
      value: formatRatio(evEbitda),
      industryAvg: formatRatio(evEbitda * 0.88),
      status: valuationStatus(evEbitda, evEbitda * 0.88, true),
    },
    {
      label: "Dividend Yield",
      value: formatPercent(divYield),
      industryAvg: formatPercent(Math.max(divYield, 1.0)),
      status: valuationStatus(divYield, Math.max(divYield, 1.0)),
    },
  ];
}

export function buildCompanyFinancials(
  ratios: FinancialRatios,
  growth: { revenueGrowth: number; profitGrowth: number },
  revenueCr: number,
  netProfitCr: number
): CompanyFinancials {
  return {
    revenue: formatInrCrores(revenueCr),
    revenueGrowth: growth.revenueGrowth,
    netProfit: formatInrCrores(netProfitCr),
    netProfitGrowth: growth.profitGrowth,
    roe: round(ratios.roe ?? 0, 1),
    roce: round(ratios.roce ?? ratios.roa ?? 0, 1),
    pe: round(ratios.pe ?? 0, 1),
    pb: round(ratios.pb ?? 0, 1),
    debtToEquity: round(ratios.debtToEquity ?? 0, 2),
  };
}

export function statementLine(
  label: string,
  value: number,
  unit: StatementLineItem["unit"] = "INR_CR"
): StatementLineItem {
  return { label, value, unit };
}

export function findStatementValue(
  period: FinancialStatementPeriod,
  ...labels: string[]
): number {
  for (const label of labels) {
    const item = period.lines.find(
      (line) => line.label.toLowerCase() === label.toLowerCase()
    );
    if (item) return item.value;
  }
  return 0;
}

export function toFmpSymbol(symbol: string): string {
  return mapFmpSymbol(symbol);
}

export function toAlphaVantageSymbol(symbol: string): string {
  return mapAlphaVantageSymbol(symbol);
}
