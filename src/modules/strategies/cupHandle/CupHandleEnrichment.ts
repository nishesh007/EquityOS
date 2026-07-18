/**
 * Cup & Handle Trade Setup enrichment — Sprint 11B.3Q.
 */

import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import {
  buildCupHandleExplainability,
  createEmptyCupHandleExplainability,
} from "./CupHandleExplainability";
import { buildCupHandleInstitutionalScore } from "./CupHandleScoring";
import type { CupHandleStrategyInput } from "./CupHandleTypes";
import type { CupHandleTradeSetup } from "./CupHandleTradeTypes";

export function enrichCupHandleTradeSetup(input: {
  setup: CupHandleTradeSetup;
  marketContext: InstitutionalMarketContext;
  chInput: CupHandleStrategyInput;
}): CupHandleTradeSetup {
  const base = input.setup;
  try {
    const institutionalScore = buildCupHandleInstitutionalScore({
      detection: base.detection,
      setup: base,
      marketContext: input.marketContext,
      chInput: input.chInput,
    });

    let explainability = createEmptyCupHandleExplainability(base.warnings);
    try {
      explainability = buildCupHandleExplainability({
        detection: base.detection,
        setup: { ...base, institutionalScore, explainability },
        marketContext: input.marketContext,
        chInput: input.chInput,
        institutionalScore,
      });
    } catch {
      explainability = createEmptyCupHandleExplainability([
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
      institutionalSummary: ["Cup & Handle enrichment unavailable."],
      explainability: createEmptyCupHandleExplainability([
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
