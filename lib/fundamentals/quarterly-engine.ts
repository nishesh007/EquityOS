/**
 * Quarterly results engine — QoQ/YoY growth and earnings surprises.
 */

import { round } from "@/lib/engine/utils";
import { formatInrCrores, parseInrCrores } from "@/lib/fundamentals/normalize";
import type {
  EnrichedQuarterlyResult,
  SurpriseDirection,
} from "@/lib/fundamentals/types";
import type { QuarterlyResult } from "@/types";

function pctChange(current: number, previous: number): number {
  if (!previous) return 0;
  return round(((current - previous) / Math.abs(previous)) * 100);
}

function detectSurprise(
  revenueYoY: number,
  profitYoY: number,
  margin: number,
  prevMargin: number
): SurpriseDirection {
  const marginBeat = margin - prevMargin;
  const profitBeat = profitYoY > revenueYoY + 2;
  const profitMiss = profitYoY < revenueYoY - 5;

  if (profitBeat && marginBeat > 0.3) return "positive";
  if (profitMiss || marginBeat < -0.5) return "negative";
  return "neutral";
}

export function enrichQuarterlyResults(
  quarters: QuarterlyResult[]
): EnrichedQuarterlyResult[] {
  const chronological = [...quarters].reverse();

  return chronological.map((q, index) => {
    const prev = chronological[index - 1];
    const yoy = chronological[index - 4];

    const revenueCr = parseInrCrores(q.revenue);
    const profitCr = parseInrCrores(q.netProfit);
    const prevRevenueCr = prev ? parseInrCrores(prev.revenue) : revenueCr;
    const prevProfitCr = prev ? parseInrCrores(prev.netProfit) : profitCr;
    const yoyRevenueCr = yoy ? parseInrCrores(yoy.revenue) : revenueCr;
    const yoyProfitCr = yoy ? parseInrCrores(yoy.netProfit) : profitCr;

    const revenueQoQ = pctChange(revenueCr, prevRevenueCr);
    const profitQoQ = pctChange(profitCr, prevProfitCr);
    const revenueYoY = pctChange(revenueCr, yoyRevenueCr);
    const profitYoY = pctChange(profitCr, yoyProfitCr);
    const epsQoQ = prev ? pctChange(q.eps, prev.eps) : 0;
    const epsYoY = yoy ? pctChange(q.eps, yoy.eps) : 0;

    const ebitdaMargin = round(q.margin + 4, 1);
    const ebitdaCr = round(revenueCr * (ebitdaMargin / 100));

    return {
      ...q,
      ebitda: formatInrCrores(ebitdaCr),
      revenueQoQ,
      revenueYoY,
      profitQoQ,
      profitYoY,
      epsQoQ,
      epsYoY,
      surprise: detectSurprise(
        revenueYoY,
        profitYoY,
        q.margin,
        prev?.margin ?? q.margin
      ),
    };
  }).reverse();
}

export function toUiQuarterlyResults(
  enriched: EnrichedQuarterlyResult[]
): QuarterlyResult[] {
  return enriched.map(({ quarter, revenue, netProfit, eps, margin }) => ({
    quarter,
    revenue,
    netProfit,
    eps,
    margin,
  }));
}
