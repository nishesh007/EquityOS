import { toneForScore } from "@/lib/engine/utils";
import type { ScoreResult } from "@/lib/engine/types";
import type { CompanyScoreBundle } from "@/lib/engine/types";
import type { EquityScore, EquityScoreFactor } from "@/types";

/** Maps engine ScoreResult to legacy EquityScoreFactor for existing UI. */
export function toEquityScoreFactor(result: ScoreResult): EquityScoreFactor {
  return {
    key: result.key,
    label: result.label,
    score: result.normalizedScore,
    explanation: result.explanation,
    tone: toneForScore(result.normalizedScore),
  };
}

/** Maps CompanyScoreBundle to legacy EquityScore for existing UI components. */
export function toEquityScore(bundle: CompanyScoreBundle): EquityScore {
  const factorResults = [
    bundle.businessQuality,
    bundle.financialStrength,
    bundle.growth,
    bundle.valuation,
    bundle.momentum,
    bundle.risk,
  ];

  return {
    overall: bundle.overall.normalizedScore,
    explanation: bundle.overall.explanation,
    factors: factorResults.map(toEquityScoreFactor),
  };
}

/** Extracts a numeric score from ScoreResult for legacy consumers. */
export function toLegacyScore(result: ScoreResult): number {
  return result.normalizedScore;
}
