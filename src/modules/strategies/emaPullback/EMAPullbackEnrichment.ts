/**
 * EMA Pullback Trade Setup enrichment — Sprint 11B.3P.
 */

import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import {
  buildEMAPullbackExplainability,
  createEmptyEMAPullbackExplainability,
} from "./EMAPullbackExplainability";
import { buildEMAPullbackInstitutionalScore } from "./EMAPullbackScoring";
import type { EMAPullbackStrategyInput } from "./EMAPullbackTypes";
import type { EMAPullbackTradeSetup } from "./EMAPullbackTradeTypes";

export function enrichEMAPullbackTradeSetup(input: {
  setup: EMAPullbackTradeSetup;
  marketContext: InstitutionalMarketContext;
  epInput: EMAPullbackStrategyInput;
}): EMAPullbackTradeSetup {
  const base = input.setup;
  try {
    const institutionalScore = buildEMAPullbackInstitutionalScore({
      detection: base.detection,
      setup: base,
      marketContext: input.marketContext,
      epInput: input.epInput,
    });

    let explainability = createEmptyEMAPullbackExplainability(base.warnings);
    try {
      explainability = buildEMAPullbackExplainability({
        detection: base.detection,
        setup: { ...base, institutionalScore, explainability },
        marketContext: input.marketContext,
        epInput: input.epInput,
        institutionalScore,
      });
    } catch {
      explainability = createEmptyEMAPullbackExplainability([
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
      institutionalSummary: ["EMA Pullback enrichment unavailable."],
      explainability: createEmptyEMAPullbackExplainability([
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
