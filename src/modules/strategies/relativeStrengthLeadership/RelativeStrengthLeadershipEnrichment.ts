/**
 * Relative Strength Leadership Trade Setup enrichment — Sprint 11B.3O.
 */

import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import {
  buildRelativeStrengthLeadershipExplainability,
  createEmptyRelativeStrengthLeadershipExplainability,
} from "./RelativeStrengthLeadershipExplainability";
import { buildRelativeStrengthLeadershipInstitutionalScore } from "./RelativeStrengthLeadershipScoring";
import type { RelativeStrengthLeadershipStrategyInput } from "./RelativeStrengthLeadershipTypes";
import type { RelativeStrengthLeadershipTradeSetup } from "./RelativeStrengthLeadershipTradeTypes";

export function enrichRelativeStrengthLeadershipTradeSetup(input: {
  setup: RelativeStrengthLeadershipTradeSetup;
  marketContext: InstitutionalMarketContext;
  rsInput: RelativeStrengthLeadershipStrategyInput;
}): RelativeStrengthLeadershipTradeSetup {
  const base = input.setup;
  try {
    const institutionalScore =
      buildRelativeStrengthLeadershipInstitutionalScore({
        detection: base.detection,
        setup: base,
        marketContext: input.marketContext,
        rsInput: input.rsInput,
      });

    let explainability =
      createEmptyRelativeStrengthLeadershipExplainability(base.warnings);
    try {
      explainability = buildRelativeStrengthLeadershipExplainability({
        detection: base.detection,
        setup: { ...base, institutionalScore, explainability },
        marketContext: input.marketContext,
        rsInput: input.rsInput,
        institutionalScore,
      });
    } catch {
      explainability = createEmptyRelativeStrengthLeadershipExplainability([
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
      institutionalSummary: [
        "Relative Strength Leadership enrichment unavailable.",
      ],
      explainability: createEmptyRelativeStrengthLeadershipExplainability([
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
