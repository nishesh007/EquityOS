/**
 * Capital allocation scoring — returns, growth reinvestment, and leverage discipline.
 */

import { normalizeScore } from "@/lib/fundamentals/registry";

export interface CapitalAllocationInput {
  roe: number | null;
  roce: number | null;
  profitGrowth: number | null;
  debtEquity: number | null;
  fcfMargin: number | null;
  cashConversion: number | null;
}

function scoreReturn(value: number | null, excellent = 20, good = 15): number {
  if (value === null) return 50;
  if (value >= excellent) return normalizeScore(82 + (value - excellent) * 1.2);
  if (value >= good) return normalizeScore(58 + (value - good) * 4.8);
  if (value >= 10) return normalizeScore(38 + (value - 10) * 4);
  return normalizeScore(22 + value * 1.6);
}

export function computeCapitalAllocationScore(input: CapitalAllocationInput): number {
  const { roe, roce, profitGrowth, debtEquity, fcfMargin, cashConversion } = input;

  const returnScore = normalizeScore(
    (scoreReturn(roe) + scoreReturn(roce)) / 2
  );
  const growthBonus =
    profitGrowth !== null
      ? profitGrowth > 15
        ? 12
        : profitGrowth > 8
          ? 8
          : profitGrowth > 0
            ? 4
            : -6
      : 0;
  const debtPenalty =
    debtEquity !== null ? (debtEquity > 1.5 ? 14 : debtEquity > 0.8 ? 6 : 0) : 0;
  const cashBonus =
    cashConversion !== null
      ? cashConversion >= 80
        ? 10
        : cashConversion >= 50
          ? 5
          : 0
      : fcfMargin !== null && fcfMargin > 10
        ? 6
        : 0;

  return normalizeScore(returnScore * 0.55 + growthBonus + cashBonus + 22 - debtPenalty);
}
