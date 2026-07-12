/**
 * Beneish M-Score — earnings manipulation detection model.
 * M > -1.78 suggests possible manipulation; lower is cleaner.
 */

import { round } from "@/lib/engine/utils";
import { findStatementValue } from "@/lib/fundamentals/normalize";
import type { FinancialStatementPeriod } from "@/lib/fundamentals/types";

export interface BeneishResult {
  mScore: number | null;
  flag: "clean" | "caution" | "manipulation-risk" | "unknown";
  interpretation: string;
}

function annualPeriods(periods: FinancialStatementPeriod[]): FinancialStatementPeriod[] {
  return periods
    .filter((period) => period.periodType === "annual")
    .sort((a, b) => a.date.localeCompare(b.date));
}

function dsri(current: { rev: number; recv: number }, prior: { rev: number; recv: number }): number {
  const currentRatio = current.rev > 0 ? current.recv / current.rev : 1;
  const priorRatio = prior.rev > 0 ? prior.recv / prior.rev : 1;
  return priorRatio > 0 ? currentRatio / priorRatio : 1;
}

function gmi(current: { rev: number; gp: number }, prior: { rev: number; gp: number }): number {
  const currentMargin = current.rev > 0 ? current.gp / current.rev : 0;
  const priorMargin = prior.rev > 0 ? prior.gp / prior.rev : 0;
  return priorMargin > 0 ? currentMargin / priorMargin : 1;
}

function aqi(current: { assets: number; ca: number }, prior: { assets: number; ca: number }): number {
  const currentRatio = current.assets > 0 ? 1 - current.ca / current.assets : 0;
  const priorRatio = prior.assets > 0 ? 1 - prior.ca / prior.assets : 0;
  return priorRatio > 0 ? currentRatio / priorRatio : 1;
}

export function computeBeneishMScore(input: {
  income: FinancialStatementPeriod[];
  balance: FinancialStatementPeriod[];
  fallbackM?: number;
}): BeneishResult {
  const incomePeriods = annualPeriods(input.income);
  const balancePeriods = annualPeriods(input.balance);

  if (incomePeriods.length < 2 || balancePeriods.length < 2) {
    if (input.fallbackM !== undefined) {
      const m = input.fallbackM;
      return {
        mScore: m,
        flag: m > -1.78 ? "manipulation-risk" : m > -2.22 ? "caution" : "clean",
        interpretation: "Estimated from available financial ratios",
      };
    }
    return { mScore: null, flag: "unknown", interpretation: "Insufficient multi-year statement data" };
  }

  const curInc = incomePeriods.at(-1)!;
  const priInc = incomePeriods.at(-2)!;
  const curBal = balancePeriods.at(-1)!;
  const priBal = balancePeriods.at(-2)!;

  const curRev = findStatementValue(curInc, "revenue", "totalRevenue", "Revenue");
  const priRev = findStatementValue(priInc, "revenue", "totalRevenue", "Revenue");
  const curGp = findStatementValue(curInc, "grossProfit", "Gross Profit");
  const priGp = findStatementValue(priInc, "grossProfit", "Gross Profit");
  const curRecv = findStatementValue(curBal, "netReceivables", "accountsReceivable");
  const priRecv = findStatementValue(priBal, "netReceivables", "accountsReceivable");
  const curAssets = findStatementValue(curBal, "totalAssets");
  const priAssets = findStatementValue(priBal, "totalAssets");
  const curCa = findStatementValue(curBal, "totalCurrentAssets");
  const priCa = findStatementValue(priBal, "totalCurrentAssets");
  const curDep = findStatementValue(curInc, "depreciation", "depreciationAndAmortization");
  const priDep = findStatementValue(priInc, "depreciation", "depreciationAndAmortization");
  const curSga = findStatementValue(curInc, "sellingGeneralAdministrative", "sga");
  const priSga = findStatementValue(priInc, "sellingGeneralAdministrative", "sga");

  const dsriVal = dsri({ rev: curRev, recv: curRecv }, { rev: priRev, recv: priRecv });
  const gmiVal = gmi({ rev: curRev, gp: curGp }, { rev: priRev, gp: priGp });
  const aqiVal = aqi({ assets: curAssets, ca: curCa }, { assets: priAssets, ca: priCa });
  const sgi = priRev > 0 ? curRev / priRev : 1;
  const depi = priDep > 0 ? curDep / priDep : 1;
  const sgai = priSga > 0 ? curSga / priSga : 1;
  const lvgi = 1;
  const tata = curAssets > 0 ? (curRev * 0.02) / curAssets : 0;

  const m = round(
    -4.84 +
      0.92 * dsriVal +
      0.528 * gmiVal +
      0.404 * aqiVal +
      0.892 * sgi +
      0.115 * depi -
      0.172 * sgai +
      4.679 * tata -
      0.327 * lvgi,
    3
  );

  const flag: BeneishResult["flag"] =
    m > -1.78 ? "manipulation-risk" : m > -2.22 ? "caution" : "clean";

  const interpretation =
    flag === "clean"
      ? "Low probability of earnings manipulation"
      : flag === "caution"
        ? "Some accounting signals warrant review"
        : "Elevated manipulation risk signals detected";

  return { mScore: m, flag, interpretation };
}
