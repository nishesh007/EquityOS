/**
 * Quality Compounder Capital Allocation Analyzer — Sprint 11B.3Y.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { QualityCompounderConfig } from "./QualityCompounderConstants";
import type {
  QualityCompounderCapitalAllocationAnalysis,
  QualityCompounderCapitalInputs,
  QualityCompounderCurrentSnapshot,
} from "./QualityCompounderTypes";

export function analyzeCapitalAllocation(
  capital: QualityCompounderCapitalInputs,
  current: QualityCompounderCurrentSnapshot,
  config: QualityCompounderConfig
): QualityCompounderCapitalAllocationAnalysis {
  const reasons: string[] = [];
  const warnings: string[] = [];

  const roic = current.roic > 0 ? current.roic : capital.roic;
  const positiveScores = [
    capital.buybackQuality,
    capital.dividendPolicy,
    capital.acquisitionHistory,
    capital.debtManagement,
    capital.cashAllocation,
  ].map((v) => clamp(v, 0, 100));
  const dilutionPenalty = clamp(capital.shareDilutionRisk, 0, 100);

  const score = clamp(
    round(
      (positiveScores.reduce((s, v) => s + v, 0) / positiveScores.length) *
        0.7 +
        clamp(roic * 200, 0, 100) * 0.2 +
        clamp(capital.reinvestmentRate * 100, 0, 100) * 0.1 -
        dilutionPenalty * 0.15,
      1
    ),
    config.scoreFloor,
    config.scoreCeiling
  );

  if (score >= config.minCapitalAllocationBuy) {
    reasons.push(
      "Management has an outstanding capital allocation track record."
    );
    reasons.push("ROIC has remained consistently above the cost of capital.");
  }
  if (score < config.minCapitalAllocationHold) {
    warnings.push("Weak Capital Allocation.");
  }

  return {
    score,
    roic: round(roic, 4),
    reinvestmentRate: round(capital.reinvestmentRate, 4),
    reasons,
    warnings,
  };
}
