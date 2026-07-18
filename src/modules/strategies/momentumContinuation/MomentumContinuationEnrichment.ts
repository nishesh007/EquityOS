/**
 * Momentum Continuation Trade Setup enrichment — Sprint 11B.3F.
 */

import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import {
  buildMomentumContinuationExplainability,
  createEmptyMomentumContinuationExplainability,
} from "./MomentumContinuationExplainability";
import { buildMomentumContinuationInstitutionalScore } from "./MomentumContinuationScoring";
import type { MomentumContinuationStrategyInput } from "./MomentumContinuationTypes";
import type { MomentumContinuationTradeSetup } from "./MomentumContinuationTradeTypes";

export function enrichMomentumContinuationTradeSetup(input: {
  setup: MomentumContinuationTradeSetup;
  marketContext: InstitutionalMarketContext;
  mcInput: MomentumContinuationStrategyInput;
}): MomentumContinuationTradeSetup {
  const base = input.setup;
  try {
    const institutionalScore = buildMomentumContinuationInstitutionalScore({
      detection: base.detection,
      setup: base,
      marketContext: input.marketContext,
      mcInput: input.mcInput,
    });

    let explainability = createEmptyMomentumContinuationExplainability(
      base.warnings
    );
    try {
      explainability = buildMomentumContinuationExplainability({
        detection: base.detection,
        setup: { ...base, institutionalScore, explainability },
        marketContext: input.marketContext,
        mcInput: input.mcInput,
        institutionalScore,
      });
    } catch {
      explainability = createEmptyMomentumContinuationExplainability([
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
      explainability: createEmptyMomentumContinuationExplainability([
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
