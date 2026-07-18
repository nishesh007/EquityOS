/**
 * Relative Strength Intraday Trade Setup enrichment — Sprint 11B.3G.
 */

import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import {
  buildRelativeStrengthIntradayExplainability,
  createEmptyRelativeStrengthIntradayExplainability,
} from "./RelativeStrengthIntradayExplainability";
import { buildRelativeStrengthIntradayInstitutionalScore } from "./RelativeStrengthIntradayScoring";
import type { RelativeStrengthIntradayStrategyInput } from "./RelativeStrengthIntradayTypes";
import type { RelativeStrengthIntradayTradeSetup } from "./RelativeStrengthIntradayTradeTypes";

export function enrichRelativeStrengthIntradayTradeSetup(input: {
  setup: RelativeStrengthIntradayTradeSetup;
  marketContext: InstitutionalMarketContext;
  rsInput: RelativeStrengthIntradayStrategyInput;
}): RelativeStrengthIntradayTradeSetup {
  const base = input.setup;
  try {
    const institutionalScore = buildRelativeStrengthIntradayInstitutionalScore({
      detection: base.detection,
      setup: base,
      marketContext: input.marketContext,
      rsInput: input.rsInput,
    });

    let explainability = createEmptyRelativeStrengthIntradayExplainability(
      base.warnings
    );
    try {
      explainability = buildRelativeStrengthIntradayExplainability({
        detection: base.detection,
        setup: { ...base, institutionalScore, explainability },
        marketContext: input.marketContext,
        rsInput: input.rsInput,
        institutionalScore,
      });
    } catch {
      explainability = createEmptyRelativeStrengthIntradayExplainability([
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
      explainability: createEmptyRelativeStrengthIntradayExplainability([
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
