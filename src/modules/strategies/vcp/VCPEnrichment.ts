/**
 * VCP Trade Setup enrichment — Sprint 11B.3L.
 */

import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import {
  buildVCPExplainability,
  createEmptyVCPExplainability,
} from "./VCPExplainability";
import { buildVCPInstitutionalScore } from "./VCPScoring";
import type { VCPStrategyInput } from "./VCPTypes";
import type { VCPTradeSetup } from "./VCPTradeTypes";

export function enrichVCPTradeSetup(input: {
  setup: VCPTradeSetup;
  marketContext: InstitutionalMarketContext;
  vcpInput: VCPStrategyInput;
}): VCPTradeSetup {
  const base = input.setup;
  try {
    const institutionalScore = buildVCPInstitutionalScore({
      detection: base.detection,
      setup: base,
      marketContext: input.marketContext,
      vcpInput: input.vcpInput,
    });

    let explainability = createEmptyVCPExplainability(base.warnings);
    try {
      explainability = buildVCPExplainability({
        detection: base.detection,
        setup: { ...base, institutionalScore, explainability },
        marketContext: input.marketContext,
        vcpInput: input.vcpInput,
        institutionalScore,
      });
    } catch {
      explainability = createEmptyVCPExplainability([
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
      institutionalSummary: ["VCP enrichment unavailable."],
      explainability: createEmptyVCPExplainability([
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
