/**
 * Accounting red-flag detector — one-time income, capitalization, sustainability.
 * Advisory only.
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

export class AccountingRedFlagDetector {
  /** Accounting quality dimension (one-time income, capitalization). */
  analyzeAccountingQuality(
    input: EarningsQualityInput,
    _thresholds: QualityThresholds
  ): DimensionAnalysisResult {
    const warnings: string[] = [];
    const signals: QualitySignal[] = [];
    let score = 100;

    try {
      const revenue = num(input.current.revenue);
      const otherIncome =
        num(input.current.oneTimeIncome) ?? num(input.current.otherIncome);
      const ni = netIncomeOf(input.current);

      if (revenue !== null && otherIncome !== null && revenue > 0) {
        const otherShare = otherIncome / revenue;
        if (otherShare > 0.15) {
          const impact = Math.min(30, Math.round(otherShare * 80));
          score -= impact;
          signals.push(
            signal({
              checkId: "one_time_income",
              dimension: "accountingQuality",
              severity: otherShare > 0.25 ? "warning" : "watch",
              title: "Frequent One-time / Other Income",
              message:
                "Other / one-time income is elevated relative to revenue.",
              scoreImpact: -impact,
              metrics: { otherIncome, revenue, otherIncomeShare: otherShare },
            })
          );
        }
      }

      if (ni !== null && otherIncome !== null && ni > 0 && otherIncome > ni * 0.4) {
        const impact = 20;
        score -= impact;
        signals.push(
          signal({
            checkId: "one_time_income",
            dimension: "accountingQuality",
            severity: "warning",
            title: "Earnings Dependence on Other Income",
            message: "A large share of profits appears driven by other income.",
            scoreImpact: -impact,
            metrics: { otherIncome, netIncome: ni },
          })
        );
      }

      const totalAssets = num(input.current.totalAssets);
      const cwip = num(input.current.cwip) ?? 0;
      const intangibles = num(input.current.intangibleAssets) ?? 0;
      if (totalAssets !== null && totalAssets > 0) {
        const capitalizedShare = (cwip + intangibles) / totalAssets;
        if (capitalizedShare > 0.2) {
          const impact = Math.min(25, Math.round(capitalizedShare * 60));
          score -= impact;
          signals.push(
            signal({
              checkId: "capitalized_expenses",
              dimension: "accountingQuality",
              severity: capitalizedShare > 0.35 ? "warning" : "watch",
              title: "Large Capitalized Expenses",
              message:
                "CWIP and/or intangibles are elevated versus total assets.",
              scoreImpact: -impact,
              metrics: {
                cwip,
                intangibleAssets: intangibles,
                totalAssets,
                capitalizedShare,
              },
            })
          );
        }
      }

      return {
        dimension: "accountingQuality",
        score: clampScore(score),
        signals,
        warnings,
      };
    } catch (err) {
      warnings.push(`Accounting quality error: ${String(err)}`);
      return { dimension: "accountingQuality", score: 50, signals, warnings };
    }
  }

  /** Aggregate red-flag dimension from the most severe cross-cutting signals. */
  analyzeRedFlags(
    input: EarningsQualityInput,
    thresholds: QualityThresholds,
    collected: QualitySignal[]
  ): DimensionAnalysisResult {
    const warnings: string[] = [];
    const signals: QualitySignal[] = [];
    let score = 100;

    try {
      const critical = collected.filter((s) => s.severity === "critical");
      const warningsSignals = collected.filter((s) => s.severity === "warning");

      score -= critical.length * 20;
      score -= warningsSignals.length * 8;

      if (critical.length > 0) {
        signals.push(
          signal({
            checkId: "wc_stress",
            dimension: "redFlags",
            severity: "critical",
            title: "Financial Red Flags Present",
            message: `${critical.length} critical accounting / quality red flag(s) detected.`,
            scoreImpact: -(critical.length * 20),
            metrics: { criticalCount: critical.length },
          })
        );
      }

      // Profit sustainability: NI positive but OCF and FCF both negative
      const ni = netIncomeOf(input.current);
      const ocf = num(input.current.operatingCashFlow);
      const fcf = num(input.current.freeCashFlow);
      if (ni !== null && ni > 0 && ocf !== null && ocf < 0 && fcf !== null && fcf < 0) {
        score -= 25;
        signals.push(
          signal({
            checkId: "ocf_vs_ni",
            dimension: "redFlags",
            severity: "critical",
            title: "Unsustainable Profit Signal",
            message:
              "Profitable on earnings but both operating and free cash flow are negative.",
            scoreImpact: -25,
            metrics: { netIncome: ni, operatingCashFlow: ocf, freeCashFlow: fcf },
          })
        );
      }

      // Accrual intensity extreme
      if (ni !== null && ocf !== null && Math.abs(ni) > 0) {
        const accrualRatio = (ni - ocf) / Math.abs(ni);
        if (accrualRatio > thresholds.highAccrualRatio * 2) {
          score -= 15;
          signals.push(
            signal({
              checkId: "high_accruals",
              dimension: "redFlags",
              severity: "warning",
              title: "Extreme Accrual Intensity",
              message: "Accrual intensity is extreme versus net income.",
              scoreImpact: -15,
              metrics: { accrualRatio },
            })
          );
        }
      }

      return {
        dimension: "redFlags",
        score: clampScore(score),
        signals,
        warnings,
      };
    } catch (err) {
      warnings.push(`Red flag analysis error: ${String(err)}`);
      return { dimension: "redFlags", score: 50, signals, warnings };
    }
  }

  detectAccountingIssues(
    input: EarningsQualityInput,
    thresholds: QualityThresholds
  ): QualitySignal[] {
    return this.analyzeAccountingQuality(input, thresholds).signals;
  }
}
