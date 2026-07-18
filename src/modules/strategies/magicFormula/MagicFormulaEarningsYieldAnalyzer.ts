/**
 * Magic Formula Earnings Yield Analyzer — Sprint 11B.3X.
 * Earnings Yield = EBIT / Enterprise Value.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { MagicFormulaConfig } from "./MagicFormulaConstants";
import type {
  MagicFormulaCurrentSnapshot,
  MagicFormulaEarningsYieldAnalysis,
} from "./MagicFormulaTypes";

export function resolveEnterpriseValue(
  current: MagicFormulaCurrentSnapshot
): number {
  if (
    current.enterpriseValue != null &&
    Number.isFinite(current.enterpriseValue) &&
    current.enterpriseValue > 0
  ) {
    return current.enterpriseValue;
  }
  // EV ≈ Market Cap + Debt − Cash
  const implied = current.marketCap + current.debt - current.cash;
  return implied > 0 ? implied : current.marketCap;
}

export function analyzeEarningsYield(
  current: MagicFormulaCurrentSnapshot,
  config: MagicFormulaConfig
): MagicFormulaEarningsYieldAnalysis {
  const reasons: string[] = [];
  const warnings: string[] = [];

  const ebit = current.ebit > 0 ? current.ebit : current.operatingIncome;
  const enterpriseValue = resolveEnterpriseValue(current);
  const earningsYield =
    enterpriseValue > 0 && ebit > 0 ? ebit / enterpriseValue : 0;

  let score = 25;
  if (earningsYield >= config.minEarningsYieldBuy * 1.5) score = 95;
  else if (earningsYield >= config.minEarningsYieldBuy) score = 82;
  else if (earningsYield >= config.minEarningsYieldWatch) score = 65;
  else if (earningsYield > 0) score = 45;
  score = clamp(score, config.scoreFloor, config.scoreCeiling);

  if (earningsYield >= config.minEarningsYieldWatch) {
    reasons.push("High earnings yield indicates attractive valuation.");
  }
  if (!(ebit > 0)) warnings.push("Negative EBIT.");
  if (!(enterpriseValue > 0)) warnings.push("Invalid Enterprise Value.");

  return {
    score,
    earningsYield: round(earningsYield, 6),
    enterpriseValue: round(enterpriseValue, 4),
    ebit: round(ebit, 4),
    reasons,
    warnings,
  };
}
