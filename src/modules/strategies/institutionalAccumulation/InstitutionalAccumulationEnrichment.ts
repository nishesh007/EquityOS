/**
 * Institutional Accumulation Trade Setup enrichment — Sprint 11B.3H.
 */

import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import {
  buildInstitutionalAccumulationExplainability,
  createEmptyInstitutionalAccumulationExplainability,
} from "./InstitutionalAccumulationExplainability";
import { buildInstitutionalAccumulationInstitutionalScore } from "./InstitutionalAccumulationScoring";
import type { InstitutionalAccumulationStrategyInput } from "./InstitutionalAccumulationTypes";
import type { InstitutionalAccumulationTradeSetup } from "./InstitutionalAccumulationTradeTypes";

export function enrichInstitutionalAccumulationTradeSetup(input: {
  setup: InstitutionalAccumulationTradeSetup;
  marketContext: InstitutionalMarketContext;
  accumulationInput: InstitutionalAccumulationStrategyInput;
}): InstitutionalAccumulationTradeSetup {
  const base = input.setup;
  try {
    const institutionalScore = buildInstitutionalAccumulationInstitutionalScore({
      detection: base.detection,
      setup: base,
      marketContext: input.marketContext,
      accumulationInput: input.accumulationInput,
    });

    let explainability = createEmptyInstitutionalAccumulationExplainability(
      base.warnings
    );
    try {
      explainability = buildInstitutionalAccumulationExplainability({
        detection: base.detection,
        setup: { ...base, institutionalScore, explainability },
        marketContext: input.marketContext,
        accumulationInput: input.accumulationInput,
        institutionalScore,
      });
    } catch {
      explainability = createEmptyInstitutionalAccumulationExplainability([
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
      warnings: explainability.warnings,
      explainability,
      institutionalScore,
    };
  } catch {
    return {
      ...base,
      explainability: createEmptyInstitutionalAccumulationExplainability([
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
