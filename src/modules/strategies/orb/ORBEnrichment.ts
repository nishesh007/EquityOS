/**
 * ORB Trade Setup enrichment — Sprint 11B.3B.3.
 * Attaches explainability + institutional scoring. Never throws.
 */

import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import {
  buildORBExplainability,
  createEmptyORBExplainability,
} from "./ORBExplainability";
import { buildORBInstitutionalScore } from "./ORBScoring";
import type { ORBStrategyInput } from "./ORBTypes";
import type { ORBTradeSetup } from "./ORBTradeTypes";

export function enrichORBTradeSetup(input: {
  setup: ORBTradeSetup;
  marketContext: InstitutionalMarketContext;
  orbInput: ORBStrategyInput;
}): ORBTradeSetup {
  const base = input.setup;
  try {
    const institutionalScore = buildORBInstitutionalScore({
      detection: base.detection,
      setup: base,
      marketContext: input.marketContext,
      orbInput: input.orbInput,
    });

    let explainability = createEmptyORBExplainability(base.warnings);
    try {
      explainability = buildORBExplainability({
        detection: base.detection,
        setup: { ...base, institutionalScore, explainability },
        marketContext: input.marketContext,
        orbInput: input.orbInput,
        institutionalScore,
      });
    } catch {
      explainability = createEmptyORBExplainability([
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
      explainability: createEmptyORBExplainability([
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
