/**
 * Darvas Box Trade Setup enrichment — Sprint 11B.3N.
 */

import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import {
  buildDarvasBoxExplainability,
  createEmptyDarvasBoxExplainability,
} from "./DarvasBoxExplainability";
import { buildDarvasBoxInstitutionalScore } from "./DarvasBoxScoring";
import type { DarvasBoxStrategyInput } from "./DarvasBoxTypes";
import type { DarvasBoxTradeSetup } from "./DarvasBoxTradeTypes";

export function enrichDarvasBoxTradeSetup(input: {
  setup: DarvasBoxTradeSetup;
  marketContext: InstitutionalMarketContext;
  dbInput: DarvasBoxStrategyInput;
}): DarvasBoxTradeSetup {
  const base = input.setup;
  try {
    const institutionalScore = buildDarvasBoxInstitutionalScore({
      detection: base.detection,
      setup: base,
      marketContext: input.marketContext,
      dbInput: input.dbInput,
    });

    let explainability = createEmptyDarvasBoxExplainability(base.warnings);
    try {
      explainability = buildDarvasBoxExplainability({
        detection: base.detection,
        setup: { ...base, institutionalScore, explainability },
        marketContext: input.marketContext,
        dbInput: input.dbInput,
        institutionalScore,
      });
    } catch {
      explainability = createEmptyDarvasBoxExplainability([
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
      institutionalSummary: ["Darvas Box enrichment unavailable."],
      explainability: createEmptyDarvasBoxExplainability([
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
