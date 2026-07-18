/**
 * Earnings Momentum Trade Setup enrichment — Sprint 11B.3T.
 */

import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import {
  buildEarningsMomentumExplainability,
  createEmptyEarningsMomentumExplainability,
} from "./EarningsMomentumExplainability";
import { buildEarningsMomentumInstitutionalScore } from "./EarningsMomentumScoring";
import type { EarningsMomentumStrategyInput } from "./EarningsMomentumTypes";
import type { EarningsMomentumTradeSetup } from "./EarningsMomentumTradeTypes";

export function enrichEarningsMomentumTradeSetup(input: {
  setup: EarningsMomentumTradeSetup;
  marketContext: InstitutionalMarketContext;
  emInput: EarningsMomentumStrategyInput;
}): EarningsMomentumTradeSetup {
  const base = input.setup;
  try {
    const institutionalScore = buildEarningsMomentumInstitutionalScore({
      detection: base.detection,
      setup: base,
      marketContext: input.marketContext,
      emInput: input.emInput,
    });

    let explainability = createEmptyEarningsMomentumExplainability(
      base.warnings
    );
    try {
      explainability = buildEarningsMomentumExplainability({
        detection: base.detection,
        setup: { ...base, institutionalScore, explainability },
        marketContext: input.marketContext,
        emInput: input.emInput,
        institutionalScore,
      });
    } catch {
      explainability = createEmptyEarningsMomentumExplainability([
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
      institutionalSummary: ["Earnings Momentum enrichment unavailable."],
      explainability: createEmptyEarningsMomentumExplainability([
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
