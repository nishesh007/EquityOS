/**
 * Magic Formula Return on Capital Analyzer — Sprint 11B.3X.
 * ROC = EBIT / (Net Working Capital + Net Fixed Assets).
 */

import { clamp, round } from "@/lib/engine/utils";
import type { MagicFormulaConfig } from "./MagicFormulaConstants";
import type {
  MagicFormulaCurrentSnapshot,
  MagicFormulaRocAnalysis,
} from "./MagicFormulaTypes";

export function analyzeReturnOnCapital(
  current: MagicFormulaCurrentSnapshot,
  config: MagicFormulaConfig
): MagicFormulaRocAnalysis {
  const reasons: string[] = [];
  const warnings: string[] = [];

  const ebit = current.ebit > 0 ? current.ebit : current.operatingIncome;
  const netWorkingCapital =
    current.workingCapital > 0
      ? current.workingCapital
      : Math.max(current.currentAssets - current.currentLiabilities, 0);
  const netFixedAssets = Math.max(current.fixedAssets, 0);
  const capitalBase = netWorkingCapital + netFixedAssets;
  const returnOnCapital =
    capitalBase > 0 && ebit > 0 ? ebit / capitalBase : 0;

  let score = 25;
  if (returnOnCapital >= config.minRocBuy * 1.5) score = 95;
  else if (returnOnCapital >= config.minRocBuy) score = 82;
  else if (returnOnCapital >= config.minRocWatch) score = 65;
  else if (returnOnCapital > 0) score = 45;
  score = clamp(score, config.scoreFloor, config.scoreCeiling);

  if (returnOnCapital >= config.minRocWatch) {
    reasons.push(
      "Return on capital demonstrates efficient capital allocation."
    );
  }
  if (!(capitalBase > 0)) warnings.push("Capital base unavailable.");
  if (!(ebit > 0)) warnings.push("Negative EBIT.");

  return {
    score,
    returnOnCapital: round(returnOnCapital, 6),
    netWorkingCapital: round(netWorkingCapital, 4),
    netFixedAssets: round(netFixedAssets, 4),
    capitalBase: round(capitalBase, 4),
    reasons,
    warnings,
  };
}
