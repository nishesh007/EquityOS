/**
 * Accrual quality analyzer — advisory detection of high accruals / earnings-cash gap.
 */

import type { QualityThresholds } from "./QualityConfiguration";
import {
  clampScore,
  netIncomeOf,
  num,
  signal,
  type DimensionAnalysisResult,
  type EarningsQualityInput,
  type QualitySignal,
} from "./qualityTypes";

export class AccrualAnalyzer {
  analyze(
    input: EarningsQualityInput,
    thresholds: QualityThresholds
  ): DimensionAnalysisResult {
    const warnings: string[] = [];
    const signals: QualitySignal[] = [];
    let score = 100;

    try {
      const ni = netIncomeOf(input.current);
      const ocf = num(input.current.operatingCashFlow);

      if (ni === null || ocf === null) {
        warnings.push("Insufficient data for accrual analysis");
        return {
          dimension: "accrualQuality",
          score: 55,
          signals,
          warnings,
        };
      }

      const accruals = ni - ocf;
      const accrualRatio = Math.abs(ni) > 0 ? accruals / Math.abs(ni) : null;

      if (accrualRatio !== null && accrualRatio > thresholds.highAccrualRatio) {
        const impact = Math.min(40, Math.round(accrualRatio * 50));
        score -= impact;
        signals.push(
          signal({
            checkId: "high_accruals",
            dimension: "accrualQuality",
            severity: accrualRatio > thresholds.highAccrualRatio * 1.5 ? "critical" : "warning",
            title: "High Accruals",
            message: `Accruals are elevated versus net income (ratio ${round2(accrualRatio)}).`,
            scoreImpact: -impact,
            metrics: { accruals, accrualRatio, netIncome: ni, operatingCashFlow: ocf },
          })
        );
      }

      if (ni > 0 && ocf < ni * thresholds.weakCashConversion) {
        const impact = 15;
        score -= impact;
        signals.push(
          signal({
            checkId: "ocf_vs_ni",
            dimension: "accrualQuality",
            severity: "warning",
            title: "Earnings ahead of cash",
            message: "Operating cash flow is materially below net income.",
            scoreImpact: -impact,
            metrics: { netIncome: ni, operatingCashFlow: ocf },
          })
        );
      }

      return {
        dimension: "accrualQuality",
        score: clampScore(score),
        signals,
        warnings,
      };
    } catch (err) {
      warnings.push(`Accrual analysis error: ${String(err)}`);
      return { dimension: "accrualQuality", score: 50, signals, warnings };
    }
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
