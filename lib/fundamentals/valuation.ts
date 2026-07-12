/**
 * Valuation analysis — multiples, market value, and valuation score.
 */

import { round } from "@/lib/engine/utils";
import { normalizeScore, safeMetric } from "@/lib/fundamentals/registry";
import type { FinancialRatios } from "@/lib/fundamentals/types";

export interface ValuationAnalysis {
  pe: number | null;
  forwardPe: number | null;
  pb: number | null;
  evEbitda: number | null;
  peg: number | null;
  dividendYield: number | null;
  bookValue: number | null;
  enterpriseValueCr: number | null;
  marketCapDisplay: string;
  enterpriseValueDisplay: string;
  valuationScore: number;
}

const CRORE = 10_000_000;

function scorePe(pe: number | null, profitGrowth: number): number {
  if (pe === null || pe <= 0) return 50;
  if (pe <= 12) return 88;
  if (pe <= 18) return normalizeScore(78 - (pe - 12) * 2);
  if (pe <= 25) return normalizeScore(66 - (pe - 18) * 2.5);
  if (pe <= 35) return normalizeScore(48 - (pe - 25) * 1.8);
  return normalizeScore(30 - (pe - 35) * 0.8 + Math.min(profitGrowth, 20) * 0.5);
}

function scorePb(pb: number | null): number {
  if (pb === null || pb <= 0) return 50;
  if (pb <= 1.5) return 90;
  if (pb <= 3) return normalizeScore(72 - (pb - 1.5) * 10);
  if (pb <= 5) return normalizeScore(57 - (pb - 3) * 8);
  return normalizeScore(41 - (pb - 5) * 5);
}

function scoreEvEbitda(evEbitda: number | null): number {
  if (evEbitda === null || evEbitda <= 0) return 52;
  if (evEbitda <= 8) return 88;
  if (evEbitda <= 12) return normalizeScore(76 - (evEbitda - 8) * 3);
  if (evEbitda <= 18) return normalizeScore(64 - (evEbitda - 12) * 2.5);
  return normalizeScore(49 - (evEbitda - 18) * 1.5);
}

function scorePeg(peg: number | null): number {
  if (peg === null || peg <= 0) return 55;
  if (peg <= 0.8) return 92;
  if (peg <= 1.2) return normalizeScore(82 - (peg - 0.8) * 20);
  if (peg <= 2) return normalizeScore(68 - (peg - 1.2) * 15);
  return normalizeScore(52 - (peg - 2) * 10);
}

export function computeValuationAnalysis(input: {
  ratios: FinancialRatios;
  marketCapDisplay: string;
  profitGrowth: number;
  fallbackPe: number;
  fallbackPb: number;
}): ValuationAnalysis {
  const { ratios, marketCapDisplay, profitGrowth, fallbackPe, fallbackPb } = input;

  const pe = safeMetric(ratios.pe) ?? (fallbackPe > 0 ? fallbackPe : null);
  const forwardPe = safeMetric(ratios.forwardPe) ?? pe;
  const pb = safeMetric(ratios.pb) ?? (fallbackPb > 0 ? fallbackPb : null);
  const evEbitda = safeMetric(ratios.evToEbitda);
  const peg = safeMetric(ratios.peg);
  const dividendYield = safeMetric(ratios.dividendYield);
  const bookValue = safeMetric(ratios.bookValue);

  const enterpriseValueCr =
    ratios.enterpriseValue !== undefined && Number.isFinite(ratios.enterpriseValue)
      ? round(ratios.enterpriseValue / CRORE)
      : null;

  const enterpriseValueDisplay =
    enterpriseValueCr !== null
      ? enterpriseValueCr >= 100_000
        ? `₹${round(enterpriseValueCr / 100_000, 2)}L Cr`
        : `₹${Math.round(enterpriseValueCr).toLocaleString("en-IN")} Cr`
      : marketCapDisplay;

  const peScore = scorePe(pe, profitGrowth);
  const pbScore = scorePb(pb);
  const evScore = scoreEvEbitda(evEbitda);
  const pegScore = scorePeg(peg);

  const valuationScore = normalizeScore(
    peScore * 0.35 + pbScore * 0.25 + evScore * 0.25 + pegScore * 0.15
  );

  return {
    pe,
    forwardPe,
    pb,
    evEbitda,
    peg,
    dividendYield,
    bookValue,
    enterpriseValueCr,
    marketCapDisplay,
    enterpriseValueDisplay,
    valuationScore,
  };
}
