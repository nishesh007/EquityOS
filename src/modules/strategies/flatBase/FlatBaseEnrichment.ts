/**
 * Flat Base Trade Setup enrichment — Sprint 11B.3R.
 */

import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import {
  buildFlatBaseExplainability,
  createEmptyFlatBaseExplainability,
} from "./FlatBaseExplainability";
import { buildFlatBaseInstitutionalScore } from "./FlatBaseScoring";
import type { FlatBaseStrategyInput } from "./FlatBaseTypes";
import type { FlatBaseTradeSetup } from "./FlatBaseTradeTypes";

export function enrichFlatBaseTradeSetup(input: {
  setup: FlatBaseTradeSetup;
  marketContext: InstitutionalMarketContext;
  fbInput: FlatBaseStrategyInput;
}): FlatBaseTradeSetup {
  const base = input.setup;
  try {
    const institutionalScore = buildFlatBaseInstitutionalScore({
      detection: base.detection,
      setup: base,
      marketContext: input.marketContext,
      fbInput: input.fbInput,
    });

    let explainability = createEmptyFlatBaseExplainability(base.warnings);
    try {
      explainability = buildFlatBaseExplainability({
        detection: base.detection,
        setup: { ...base, institutionalScore, explainability },
        marketContext: input.marketContext,
        fbInput: input.fbInput,
        institutionalScore,
      });
    } catch {
      explainability = createEmptyFlatBaseExplainability([
        ...base.warnings,
        "Explainability degraded — conviction may be reduced.",
      ]);
      institutionalScore.conviction = Math.max(
        20,
        institutionalScore.conviction - 10
      );
      institutionalScore.grade = "Weak";
    }

    return {
      ...base,
      conviction: institutionalScore.conviction,
      signalGrade: institutionalScore.signalGrade,
      confidence: institutionalScore.confidence,
      positiveReasons: explainability.positiveReasons,
      negativeReasons: explainability.negativeReasons,
      neutralReasons: explainability.neutralFactors,
      institutionalSummary: explainability.summary,
      warnings: explainability.warnings,
      explainability,
      institutionalScore,
    };
  } catch {
    return {
      ...base,
      conviction: 20,
      signalGrade: "F",
      confidence: base.detection.confidence || 0,
      positiveReasons: [],
      negativeReasons: ["Institutional enrichment failed."],
      neutralReasons: [],
      institutionalSummary: ["Flat Base enrichment unavailable."],
      explainability: createEmptyFlatBaseExplainability([
        ...base.warnings,
        "Institutional enrichment failed.",
      ]),
      institutionalScore: {
        conviction: 20,
        grade: "Weak",
        signalGrade: "F",
        confidence: base.detection.confidence || 0,
      },
    };
  }
}
