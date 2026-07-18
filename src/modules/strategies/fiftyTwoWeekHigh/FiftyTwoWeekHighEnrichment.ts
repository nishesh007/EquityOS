/**
 * 52-Week High Trade Setup enrichment — Sprint 11B.3S.
 */

import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import {
  buildFiftyTwoWeekHighExplainability,
  createEmptyFiftyTwoWeekHighExplainability,
} from "./FiftyTwoWeekHighExplainability";
import { buildFiftyTwoWeekHighInstitutionalScore } from "./FiftyTwoWeekHighScoring";
import type { FiftyTwoWeekHighStrategyInput } from "./FiftyTwoWeekHighTypes";
import type { FiftyTwoWeekHighTradeSetup } from "./FiftyTwoWeekHighTradeTypes";

export function enrichFiftyTwoWeekHighTradeSetup(input: {
  setup: FiftyTwoWeekHighTradeSetup;
  marketContext: InstitutionalMarketContext;
  ftwInput: FiftyTwoWeekHighStrategyInput;
}): FiftyTwoWeekHighTradeSetup {
  const base = input.setup;
  try {
    const institutionalScore = buildFiftyTwoWeekHighInstitutionalScore({
      detection: base.detection,
      setup: base,
      marketContext: input.marketContext,
      ftwInput: input.ftwInput,
    });

    let explainability = createEmptyFiftyTwoWeekHighExplainability(
      base.warnings
    );
    try {
      explainability = buildFiftyTwoWeekHighExplainability({
        detection: base.detection,
        setup: { ...base, institutionalScore, explainability },
        marketContext: input.marketContext,
        ftwInput: input.ftwInput,
        institutionalScore,
      });
    } catch {
      explainability = createEmptyFiftyTwoWeekHighExplainability([
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
      institutionalSummary: ["52-Week High enrichment unavailable."],
      explainability: createEmptyFiftyTwoWeekHighExplainability([
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
