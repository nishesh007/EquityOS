/**
 * Sector Rotation Trade Setup enrichment — Sprint 11B.3J.
 */

import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import {
  buildSectorRotationExplainability,
  createEmptySectorRotationExplainability,
} from "./SectorRotationExplainability";
import { buildSectorRotationInstitutionalScore } from "./SectorRotationScoring";
import type { SectorRotationStrategyInput } from "./SectorRotationTypes";
import type { SectorRotationTradeSetup } from "./SectorRotationTradeTypes";

export function enrichSectorRotationTradeSetup(input: {
  setup: SectorRotationTradeSetup;
  marketContext: InstitutionalMarketContext;
  srInput: SectorRotationStrategyInput;
}): SectorRotationTradeSetup {
  const base = input.setup;
  try {
    const institutionalScore = buildSectorRotationInstitutionalScore({
      detection: base.detection,
      setup: base,
      marketContext: input.marketContext,
      srInput: input.srInput,
    });

    let explainability = createEmptySectorRotationExplainability(
      base.warnings
    );
    try {
      explainability = buildSectorRotationExplainability({
        detection: base.detection,
        setup: { ...base, institutionalScore, explainability },
        marketContext: input.marketContext,
        srInput: input.srInput,
        institutionalScore,
      });
    } catch {
      explainability = createEmptySectorRotationExplainability([
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
      explainability: createEmptySectorRotationExplainability([
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
