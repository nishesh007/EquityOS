/**
 * News Momentum Trade Setup enrichment — Sprint 11B.3K.
 */

import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import {
  buildNewsMomentumExplainability,
  createEmptyNewsMomentumExplainability,
} from "./NewsMomentumExplainability";
import { buildNewsMomentumInstitutionalScore } from "./NewsMomentumScoring";
import type { NewsMomentumStrategyInput } from "./NewsMomentumTypes";
import type { NewsMomentumTradeSetup } from "./NewsMomentumTradeTypes";

export function enrichNewsMomentumTradeSetup(input: {
  setup: NewsMomentumTradeSetup;
  marketContext: InstitutionalMarketContext;
  nmInput: NewsMomentumStrategyInput;
}): NewsMomentumTradeSetup {
  const base = input.setup;
  try {
    const institutionalScore = buildNewsMomentumInstitutionalScore({
      detection: base.detection,
      setup: base,
      marketContext: input.marketContext,
      nmInput: input.nmInput,
    });

    let explainability = createEmptyNewsMomentumExplainability(
      base.warnings
    );
    try {
      explainability = buildNewsMomentumExplainability({
        detection: base.detection,
        setup: { ...base, institutionalScore, explainability },
        marketContext: input.marketContext,
        nmInput: input.nmInput,
        institutionalScore,
      });
    } catch {
      explainability = createEmptyNewsMomentumExplainability([
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
      explainability: createEmptyNewsMomentumExplainability([
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
