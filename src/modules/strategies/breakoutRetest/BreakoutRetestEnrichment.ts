/**
 * Breakout Retest Trade Setup enrichment — Sprint 11B.3I.
 */

import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import {
  buildBreakoutRetestExplainability,
  createEmptyBreakoutRetestExplainability,
} from "./BreakoutRetestExplainability";
import { buildBreakoutRetestInstitutionalScore } from "./BreakoutRetestScoring";
import type { BreakoutRetestStrategyInput } from "./BreakoutRetestTypes";
import type { BreakoutRetestTradeSetup } from "./BreakoutRetestTradeTypes";

export function enrichBreakoutRetestTradeSetup(input: {
  setup: BreakoutRetestTradeSetup;
  marketContext: InstitutionalMarketContext;
  retestInput: BreakoutRetestStrategyInput;
}): BreakoutRetestTradeSetup {
  const base = input.setup;
  try {
    const institutionalScore = buildBreakoutRetestInstitutionalScore({
      detection: base.detection,
      setup: base,
      marketContext: input.marketContext,
      retestInput: input.retestInput,
    });

    let explainability = createEmptyBreakoutRetestExplainability(
      base.warnings
    );
    try {
      explainability = buildBreakoutRetestExplainability({
        detection: base.detection,
        setup: { ...base, institutionalScore, explainability },
        marketContext: input.marketContext,
        retestInput: input.retestInput,
        institutionalScore,
      });
    } catch {
      explainability = createEmptyBreakoutRetestExplainability([
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
      explainability: createEmptyBreakoutRetestExplainability([
        ...base.warnings,
        "Breakout retest enrichment failed.",
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
