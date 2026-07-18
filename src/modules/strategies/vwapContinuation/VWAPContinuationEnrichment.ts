/**
 * VWAP Continuation Trade Setup enrichment — Sprint 11B.3C.3.
 * Attaches explainability + institutional scoring. Never throws.
 */

import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import {
  buildVWAPContinuationExplainability,
  createEmptyVWAPContinuationExplainability,
} from "./VWAPContinuationExplainability";
import { buildVWAPContinuationInstitutionalScore } from "./VWAPContinuationScoring";
import type { VWAPContinuationStrategyInput } from "./VWAPContinuationTypes";
import type { VWAPContinuationTradeSetup } from "./VWAPContinuationTradeTypes";

export function enrichVWAPContinuationTradeSetup(input: {
  setup: VWAPContinuationTradeSetup;
  marketContext: InstitutionalMarketContext;
  vwapInput: VWAPContinuationStrategyInput;
}): VWAPContinuationTradeSetup {
  const base = input.setup;
  try {
    const institutionalScore = buildVWAPContinuationInstitutionalScore({
      detection: base.detection,
      setup: base,
      marketContext: input.marketContext,
      vwapInput: input.vwapInput,
    });

    let explainability = createEmptyVWAPContinuationExplainability(
      base.warnings
    );
    try {
      explainability = buildVWAPContinuationExplainability({
        detection: base.detection,
        setup: { ...base, institutionalScore, explainability },
        marketContext: input.marketContext,
        vwapInput: input.vwapInput,
        institutionalScore,
      });
    } catch {
      explainability = createEmptyVWAPContinuationExplainability([
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
      explainability: createEmptyVWAPContinuationExplainability([
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
