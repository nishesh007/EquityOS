/**
 * VWAP Mean Reversion Trade Setup enrichment — Sprint 11B.3D.3.
 * Attaches explainability + institutional scoring. Never throws.
 */

import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import {
  buildVWAPMeanReversionExplainability,
  createEmptyVWAPMeanReversionExplainability,
} from "./VWAPMeanReversionExplainability";
import { buildVWAPMeanReversionInstitutionalScore } from "./VWAPMeanReversionScoring";
import type { VWAPMeanReversionStrategyInput } from "./VWAPMeanReversionTypes";
import type { VWAPMeanReversionTradeSetup } from "./VWAPMeanReversionTradeTypes";

export function enrichVWAPMeanReversionTradeSetup(input: {
  setup: VWAPMeanReversionTradeSetup;
  marketContext: InstitutionalMarketContext;
  mrInput: VWAPMeanReversionStrategyInput;
}): VWAPMeanReversionTradeSetup {
  const base = input.setup;
  try {
    const institutionalScore = buildVWAPMeanReversionInstitutionalScore({
      detection: base.detection,
      setup: base,
      marketContext: input.marketContext,
      mrInput: input.mrInput,
    });

    let explainability = createEmptyVWAPMeanReversionExplainability(
      base.warnings
    );
    try {
      explainability = buildVWAPMeanReversionExplainability({
        detection: base.detection,
        setup: { ...base, institutionalScore, explainability },
        marketContext: input.marketContext,
        mrInput: input.mrInput,
        institutionalScore,
      });
    } catch {
      explainability = createEmptyVWAPMeanReversionExplainability([
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
      explainability: createEmptyVWAPMeanReversionExplainability([
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
