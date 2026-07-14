/**
 * Capital allocation analyzer — ROCE, debt vs cash flow, dividend/capex balance.
 */

import type { QualityThresholds } from "./QualityConfiguration";
import {
  clampScore,
  growthRate,
  num,
  ratio,
  signal,
  type DimensionAnalysisResult,
  type EarningsQualityInput,
} from "./qualityTypes";

export class CapitalAllocationAnalyzer {
  analyze(
    input: EarningsQualityInput,
    thresholds: QualityThresholds
  ): DimensionAnalysisResult {
    const warnings: string[] = [];
    const signals = [];
    let score = 100;

    try {
      const roce = num(input.current.roce);
      const prevRoce = num(input.previous?.roce);
      if (
        roce !== null &&
        prevRoce !== null &&
        prevRoce - roce > thresholds.roceDeclinePp
      ) {
        const impact = 20;
        score -= impact;
        signals.push(
          signal({
            checkId: "declining_roce",
            dimension: "capitalAllocation",
            severity: "warning",
            title: "Declining ROCE",
            message: "Return on capital employed declined versus prior period.",
            scoreImpact: -impact,
            metrics: { roce, priorRoce: prevRoce },
          })
        );
      } else if (roce === null && prevRoce === null) {
        // Approximate ROCE = EBIT / (Debt + Net Worth - Cash) when available
        const approx = approximateRoce(input.current);
        const prevApprox = input.previous
          ? approximateRoce(input.previous)
          : null;
        if (
          approx !== null &&
          prevApprox !== null &&
          (prevApprox - approx) * 100 > thresholds.roceDeclinePp
        ) {
          const impact = 15;
          score -= impact;
          signals.push(
            signal({
              checkId: "declining_roce",
              dimension: "capitalAllocation",
              severity: "watch",
              title: "Declining Approximate ROCE",
              message: "Approximate ROCE declined versus prior period.",
              scoreImpact: -impact,
              metrics: { roce: approx * 100, priorRoce: prevApprox * 100 },
            })
          );
        }
      }

      const debtGrowth = growthRate(
        num(input.current.debt),
        num(input.previous?.debt)
      );
      const ocf = num(input.current.operatingCashFlow);
      const fcf =
        num(input.current.freeCashFlow) ??
        (ocf !== null && num(input.current.capex) !== null
          ? ocf - Math.abs(num(input.current.capex) as number)
          : null);

      if (
        debtGrowth !== null &&
        debtGrowth > 0.1 &&
        ((ocf !== null && ocf <= 0) || (fcf !== null && fcf < 0))
      ) {
        const impact = 30;
        score -= impact;
        signals.push(
          signal({
            checkId: "debt_weak_cash",
            dimension: "capitalAllocation",
            severity: "critical",
            title: "Increasing Debt with Weak Cash Flow",
            message:
              "Debt is rising while operating/free cash flow remains weak.",
            scoreImpact: -impact,
            metrics: {
              debtGrowth,
              operatingCashFlow: ocf,
              freeCashFlow: fcf,
            },
          })
        );
      }

      const dividend = num(input.current.dividendPaid);
      if (dividend !== null && fcf !== null && dividend > 0 && fcf < 0) {
        const impact = 10;
        score -= impact;
        signals.push(
          signal({
            checkId: "debt_weak_cash",
            dimension: "capitalAllocation",
            severity: "watch",
            title: "Dividend funded without FCF",
            message: "Dividends paid while free cash flow is negative.",
            scoreImpact: -impact,
            metrics: { dividendPaid: dividend, freeCashFlow: fcf },
          })
        );
      }

      return {
        dimension: "capitalAllocation",
        score: clampScore(score),
        signals,
        warnings,
      };
    } catch (err) {
      warnings.push(`Capital allocation analysis error: ${String(err)}`);
      return { dimension: "capitalAllocation", score: 50, signals, warnings };
    }
  }
}

function approximateRoce(m: {
  ebit?: number | null;
  debt?: number | null;
  netWorth?: number | null;
  cash?: number | null;
}): number | null {
  const ebit = num(m.ebit);
  const capital =
    (num(m.debt) ?? 0) + (num(m.netWorth) ?? 0) - (num(m.cash) ?? 0);
  return ratio(ebit, capital > 0 ? capital : null);
}
