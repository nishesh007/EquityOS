/**
 * Liquidity Sweep Trade Setup enrichment — Sprint 11B.3E.
 * Attaches explainability + institutional scoring. Never throws.
 */

import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import {
  buildLiquiditySweepExplainability,
  createEmptyLiquiditySweepExplainability,
} from "./LiquiditySweepExplainability";
import { buildLiquiditySweepInstitutionalScore } from "./LiquiditySweepScoring";
import type { LiquiditySweepStrategyInput } from "./LiquiditySweepTypes";
import type { LiquiditySweepTradeSetup } from "./LiquiditySweepTradeTypes";

export function enrichLiquiditySweepTradeSetup(input: {
  setup: LiquiditySweepTradeSetup;
  marketContext: InstitutionalMarketContext;
  lsInput: LiquiditySweepStrategyInput;
}): LiquiditySweepTradeSetup {
  const base = input.setup;
  try {
    const institutionalScore = buildLiquiditySweepInstitutionalScore({
      detection: base.detection,
      setup: base,
      marketContext: input.marketContext,
      lsInput: input.lsInput,
    });

    let explainability = createEmptyLiquiditySweepExplainability(base.warnings);
    try {
      explainability = buildLiquiditySweepExplainability({
        detection: base.detection,
        setup: { ...base, institutionalScore, explainability },
        marketContext: input.marketContext,
        lsInput: input.lsInput,
        institutionalScore,
      });
    } catch {
      explainability = createEmptyLiquiditySweepExplainability([
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
      explainability: createEmptyLiquiditySweepExplainability([
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
