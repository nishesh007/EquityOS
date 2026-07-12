/**
 * Altman Z-Score — bankruptcy/distress probability model.
 */

import { round } from "@/lib/engine/utils";
import { findStatementValue } from "@/lib/fundamentals/normalize";
import type { FinancialStatementPeriod } from "@/lib/fundamentals/types";

export interface AltmanResult {
  zScore: number | null;
  zone: "safe" | "grey" | "distress" | "unknown";
  interpretation: string;
}

function latestAnnual(periods: FinancialStatementPeriod[]): FinancialStatementPeriod | undefined {
  return periods.filter((period) => period.periodType === "annual").at(-1);
}

export function computeAltmanZScore(input: {
  income: FinancialStatementPeriod[];
  balance: FinancialStatementPeriod[];
  marketCapCr?: number;
  fallbackZ?: number;
}): AltmanResult {
  const latestIncome = latestAnnual(input.income);
  const latestBalance = latestAnnual(input.balance);

  if (!latestIncome || !latestBalance) {
    if (input.fallbackZ !== undefined) {
      const z = input.fallbackZ;
      return {
        zScore: z,
        zone: z >= 2.99 ? "safe" : z >= 1.81 ? "grey" : "distress",
        interpretation: "Estimated from available financial ratios",
      };
    }
    return { zScore: null, zone: "unknown", interpretation: "Insufficient balance sheet data" };
  }

  const totalAssets = findStatementValue(latestBalance, "totalAssets");
  if (totalAssets <= 0) {
    return { zScore: null, zone: "unknown", interpretation: "Total assets unavailable" };
  }

  const currentAssets = findStatementValue(latestBalance, "totalCurrentAssets");
  const currentLiabilities = findStatementValue(latestBalance, "totalCurrentLiabilities");
  const totalLiabilities = findStatementValue(
    latestBalance,
    "totalLiabilities",
    "totalDebt"
  );
  const retainedEarnings = findStatementValue(
    latestBalance,
    "retainedEarnings",
    "accumulatedRetainedEarnings"
  );
  const revenue = findStatementValue(latestIncome, "revenue", "totalRevenue", "Revenue");
  const ebit = findStatementValue(latestIncome, "operatingIncome", "ebit", "EBIT");

  const workingCapital = currentAssets - currentLiabilities;
  const wcTa = workingCapital / totalAssets;
  const reTa = retainedEarnings / totalAssets;
  const ebitTa = ebit / totalAssets;
  const salesTa = revenue / totalAssets;

  const marketValueEquity =
    input.marketCapCr !== undefined ? input.marketCapCr * 10_000_000 : 0;
  const mveTl =
    totalLiabilities > 0 && marketValueEquity > 0
      ? marketValueEquity / totalLiabilities
      : 0.5;

  const z = round(
    1.2 * wcTa + 1.4 * reTa + 3.3 * ebitTa + 0.6 * mveTl + 1.0 * salesTa,
    2
  );

  const zone: AltmanResult["zone"] =
    z >= 2.99 ? "safe" : z >= 1.81 ? "grey" : "distress";

  const interpretation =
    zone === "safe"
      ? "Low bankruptcy risk — financially stable"
      : zone === "grey"
        ? "Moderate distress risk — monitor leverage and earnings"
        : "Elevated distress risk — balance sheet stress";

  return { zScore: z, zone, interpretation };
}
