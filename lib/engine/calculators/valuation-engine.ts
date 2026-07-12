/**
 * Valuation Engine — delegates to Sprint 8D intrinsic valuation module.
 */

import type { AnalysisContext } from "@/lib/engine/analysis-context";
import { clamp } from "@/lib/engine/utils";
import {
  buildValuationSummary,
  computeIntrinsicValuation,
  extractValuationInputs,
  fairPeg,
  fairPbFromRoe,
  fairPeFromGrowth,
  historicalPercentile,
  verdictFromRatio,
} from "@/lib/valuation";
import type { ValuationAnalysis } from "@/types";

export function calculateValuation(ctx: AnalysisContext): ValuationAnalysis {
  const input = extractValuationInputs(ctx);
  const intrinsic = computeIntrinsicValuation(ctx);

  const fairPeValue = fairPeFromGrowth(input.profitGrowth, input.sectorPe);
  const fairPbValue = fairPbFromRoe(input.roe);
  const fairEvValue = input.sectorEvEbitda;
  const fairPegValue = fairPeg(input.profitGrowth);

  const peVerdict = verdictFromRatio(input.pe, fairPeValue);
  const pbVerdict = verdictFromRatio(input.pb, fairPbValue);
  const evVerdict = verdictFromRatio(input.evEbitda, fairEvValue);
  const pegVerdict = verdictFromRatio(input.peg, fairPegValue);
  const relativeVsPeers = verdictFromRatio(input.pe, input.peerPe);

  const percentile = historicalPercentile(input.pe, input.profitGrowth);
  const historicalVerdict =
    percentile >= 65 ? "Undervalued" : percentile <= 35 ? "Overvalued" : "Fairly Valued";

  const summary = buildValuationSummary(ctx, intrinsic);

  return {
    pe: { value: input.pe, fairValue: fairPeValue, verdict: peVerdict },
    pb: { value: input.pb, fairValue: fairPbValue, verdict: pbVerdict },
    evEbitda: { value: input.evEbitda, fairValue: fairEvValue, verdict: evVerdict },
    peg: { value: input.peg, fairValue: fairPegValue, verdict: pegVerdict },
    relativeVsPeers,
    historicalRange: { percentile, verdict: historicalVerdict },
    overallVerdict: intrinsic.overallVerdict,
    estimatedFairValue: intrinsic.fairValue,
    intrinsicValue: intrinsic.intrinsicValue,
    marginOfSafety: intrinsic.marginOfSafety,
    upsidePercent: intrinsic.upsidePercent,
    expectedCagr: intrinsic.expectedCagr,
    confidence: clamp(intrinsic.blendedConfidence),
    summary,
    models: intrinsic.models,
    available: intrinsic.available,
  };
}
