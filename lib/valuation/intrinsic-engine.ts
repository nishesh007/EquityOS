/**
 * Intrinsic Valuation Engine — orchestrates all valuation models.
 */

import type { AnalysisContext } from "@/lib/engine/analysis-context";
import { clamp, round } from "@/lib/engine/utils";
import { computeDcfValuation } from "@/lib/valuation/dcf";
import { computeEpvValuation } from "@/lib/valuation/epv";
import { computeEvEbitdaValuation } from "@/lib/valuation/ev-ebitda";
import { computeGrahamValuation } from "@/lib/valuation/graham";
import { computeRelativePbValuation } from "@/lib/valuation/relative-pb";
import { computeRelativePeValuation } from "@/lib/valuation/relative-pe";
import { computeSectorComparisonValuation } from "@/lib/valuation/sector-comparison";
import type { IntrinsicValuationResult } from "@/lib/valuation/types";
import {
  expectedCagr,
  extractValuationInputs,
  isCalculablePrice,
  isValuationAvailable,
  marginOfSafety,
  overallVerdictFromModels,
  sanitizePerSharePrice,
  upsidePercent,
  weightedFairValue,
} from "@/lib/valuation/utils";

export function computeIntrinsicValuation(ctx: AnalysisContext): IntrinsicValuationResult {
  const input = extractValuationInputs(ctx);

  const allModels = [
    computeDcfValuation(input),
    computeGrahamValuation(input),
    computeEpvValuation(input),
    computeRelativePeValuation(input),
    computeRelativePbValuation(input),
    computeEvEbitdaValuation(input),
    computeSectorComparisonValuation(input),
  ];

  const models = allModels.filter((m) => m.fairValue > 0 && Number.isFinite(m.fairValue));
  const blended = weightedFairValue(models);

  const intrinsicValue = isCalculablePrice(input.price) && blended > 0
    ? sanitizePerSharePrice(blended, input.price)
    : 0;

  const mos = intrinsicValue > 0 ? marginOfSafety(intrinsicValue, input.price) : 0;
  const upside = intrinsicValue > 0 ? upsidePercent(intrinsicValue, input.price) : 0;
  const cagr = intrinsicValue > 0
    ? expectedCagr(input.profitGrowth, input.revenueGrowth, Math.max(0, mos))
    : 0;

  const blendedConfidence = models.length > 0
    ? Math.round(
        models.reduce((s, m) => s + m.confidence * m.weight, 0) /
          Math.max(models.reduce((s, m) => s + m.weight, 0), 1)
      )
    : 0;

  const overallVerdict = models.length > 0
    ? overallVerdictFromModels(models.map((m) => m.verdict))
    : "Fairly Valued";

  return {
    intrinsicValue,
    fairValue: intrinsicValue,
    marginOfSafety: mos,
    upsidePercent: upside,
    expectedCagr: cagr,
    models: allModels,
    blendedConfidence: clamp(blendedConfidence),
    overallVerdict,
    available: isValuationAvailable(input.price, models),
  };
}

export function buildValuationSummary(
  ctx: AnalysisContext,
  result: IntrinsicValuationResult
): string {
  const input = extractValuationInputs(ctx);

  if (!result.available || result.intrinsicValue <= 0) {
    return isCalculablePrice(input.price)
      ? `${input.name} — valuation models require additional financial data. Current price ₹${input.price.toLocaleString("en-IN")}.`
      : `${input.name} — valuation unavailable without a valid market price.`;
  }

  const avgPeerPe = round(input.peerPe, 1);

  if (result.overallVerdict === "Undervalued") {
    return `${input.name} trades at ${input.pe}x P/E vs sector avg ${avgPeerPe}x. Intrinsic value ₹${result.intrinsicValue.toLocaleString("en-IN")}/share implies ${result.marginOfSafety}% margin of safety and ${result.upsidePercent}% upside.`;
  }
  if (result.overallVerdict === "Overvalued") {
    return `${input.name} at ${input.pe}x P/E prices in strong execution. Fair value ₹${result.intrinsicValue.toLocaleString("en-IN")}/share implies limited upside.`;
  }
  return `${input.name} valuation is broadly in line at ${input.pe}x P/E. Blended fair value ₹${result.intrinsicValue.toLocaleString("en-IN")}/share with ${result.expectedCagr}% expected CAGR.`;
}
