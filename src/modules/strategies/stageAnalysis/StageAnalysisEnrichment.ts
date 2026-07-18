/**
 * Stage Analysis Trade Setup enrichment — Sprint 11B.3M.
 */

import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import {
  buildStageAnalysisExplainability,
  createEmptyStageAnalysisExplainability,
} from "./StageAnalysisExplainability";
import { buildStageAnalysisInstitutionalScore } from "./StageAnalysisScoring";
import type { StageAnalysisStrategyInput } from "./StageAnalysisTypes";
import type { StageAnalysisTradeSetup } from "./StageAnalysisTradeTypes";

export function enrichStageAnalysisTradeSetup(input: {
  setup: StageAnalysisTradeSetup;
  marketContext: InstitutionalMarketContext;
  saInput: StageAnalysisStrategyInput;
}): StageAnalysisTradeSetup {
  const base = input.setup;
  try {
    const institutionalScore = buildStageAnalysisInstitutionalScore({
      detection: base.detection,
      setup: base,
      marketContext: input.marketContext,
      saInput: input.saInput,
    });

    let explainability = createEmptyStageAnalysisExplainability(base.warnings);
    try {
      explainability = buildStageAnalysisExplainability({
        detection: base.detection,
        setup: { ...base, institutionalScore, explainability },
        marketContext: input.marketContext,
        saInput: input.saInput,
        institutionalScore,
      });
    } catch {
      explainability = createEmptyStageAnalysisExplainability([
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
      institutionalSummary: ["Stage Analysis enrichment unavailable."],
      explainability: createEmptyStageAnalysisExplainability([
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
