/**
 * Institutional AI Screener — explainability engine (Sprint 9D.R2).
 */

import { safeScreenText } from "../ScreenModels";
import {
  SCREEN_INTELLIGENCE_EMPTY,
  emptyExplainability,
  type ScreenExplainability,
  type ScreenScoreFactors,
} from "./ScreenPresentationModels";

export interface ExplainabilityInput {
  ticker: string;
  company?: string | null;
  matchedRules: string[];
  failedRules: string[];
  factors: ScreenScoreFactors;
  reasonSummary?: string | null;
  evidence?: string[] | null;
}

export function buildScreenExplainability(
  input: ExplainabilityInput
): ScreenExplainability {
  const ticker = safeScreenText(input.ticker, "—").toUpperCase();
  const matched = (input.matchedRules ?? [])
    .map((r) => safeScreenText(r, ""))
    .filter(Boolean);
  const failed = (input.failedRules ?? [])
    .map((r) => safeScreenText(r, ""))
    .filter(Boolean);
  const f = input.factors;

  if (matched.length === 0 && failed.length === 0 && f.finalAiScreenerScore === 0) {
    return emptyExplainability(SCREEN_INTELLIGENCE_EMPTY.awaitingScreening);
  }

  const positive: string[] = [];
  const negative: string[] = [];
  if (f.technicalStrength >= 65) positive.push(`Technical strength ${f.technicalStrength}`);
  else if (f.technicalStrength < 45) negative.push(`Weak technical strength ${f.technicalStrength}`);
  if (f.fundamentalStrength >= 65) positive.push(`Fundamental strength ${f.fundamentalStrength}`);
  else if (f.fundamentalStrength < 45) negative.push(`Weak fundamentals ${f.fundamentalStrength}`);
  if (f.trustScore >= 60) positive.push(`Trust score ${f.trustScore}`);
  else if (f.trustScore > 0 && f.trustScore < 45) negative.push(`Low trust ${f.trustScore}`);
  if (f.validationScore >= 60) positive.push(`Validation score ${f.validationScore}`);
  else if (f.validationScore > 0 && f.validationScore < 45) negative.push(`Validation weak ${f.validationScore}`);
  if (f.momentumStrength >= 65) positive.push(`Momentum ${f.momentumStrength}`);
  if (f.aiConfidence < 40 && f.aiConfidence > 0) negative.push(`Low AI confidence ${f.aiConfidence}`);

  for (const rule of matched.slice(0, 5)) positive.push(`Matched: ${rule}`);
  for (const rule of failed.slice(0, 3)) negative.push(`Failed: ${rule}`);

  const why =
    matched.length > 0
      ? `${ticker} matched ${matched.length} screen rule${matched.length === 1 ? "" : "s"}`
      : safeScreenText(
          input.reasonSummary,
          `${ticker} evaluated with AI score ${f.finalAiScreenerScore}`
        );

  const evidence =
    Array.isArray(input.evidence) && input.evidence.length > 0
      ? input.evidence.map((e) => safeScreenText(e, "")).filter(Boolean)
      : [
          ...matched.slice(0, 4),
          `AI Screener score ${f.finalAiScreenerScore}`,
          `Opportunity ${f.opportunityScore}`,
          `Trust ${f.trustScore}`,
          `Validation ${f.validationScore}`,
        ].filter(Boolean);

  return {
    whyMatched: why,
    matchedRules: matched,
    failedRules: failed,
    aiReasoning: safeScreenText(
      input.reasonSummary,
      `Composite score ${f.finalAiScreenerScore}/100 from opportunity, trust, validation, technical and fundamental strengths`
    ),
    positiveFactors: positive.length ? positive : ["Baseline institutional screen evaluation"],
    negativeFactors: negative.length ? negative : ["No material negative factors"],
    confidenceBreakdown: `AI confidence ${f.aiConfidence} · Technical ${f.technicalStrength} · Fundamental ${f.fundamentalStrength} · Momentum ${f.momentumStrength}`,
    supportingEvidence: evidence,
    empty: false,
    emptyMessage: SCREEN_INTELLIGENCE_EMPTY.awaitingScreening,
  };
}

export class ScreenExplainabilityEngine {
  build(input: ExplainabilityInput): ScreenExplainability {
    try {
      return buildScreenExplainability(input);
    } catch {
      return emptyExplainability();
    }
  }
}

export function buildExplainability(
  input: ExplainabilityInput
): ScreenExplainability {
  return new ScreenExplainabilityEngine().build(input);
}
