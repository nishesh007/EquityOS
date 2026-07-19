/**
 * Cash flow quality analyzer — conversion, FCF, and sustainability signals.
 */

import type { QualityThresholds } from "./QualityConfiguration";
import {
  clampScore,
  growthRate,
  netIncomeOf,
  num,
  ratio,
  signal,
  type DimensionAnalysisResult,
  type EarningsQualityInput,
  type QualitySignal,
} from "./qualityTypes";

export class CashFlowQualityAnalyzer {
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
      const fcf =
        num(input.current.freeCashFlow) ??
        (ocf !== null && num(input.current.capex) !== null
          ? ocf - Math.abs(num(input.current.capex) as number)
          : null);

      if (ocf === null && fcf === null) {
        warnings.push("Insufficient cash flow data");
        return { dimension: "cashFlowQuality", score: 55, signals, warnings };
      }

      const conversion = ratio(ocf, ni);
      if (conversion !== null && ni !== null && ni > 0) {
        if (conversion < thresholds.weakCashConversion) {
          const impact = Math.min(35, Math.round((1 - conversion) * 40));
          score -= impact;
          signals.push(
            signal({
              checkId: "ocf_vs_ni",
              dimension: "cashFlowQuality",
              severity: conversion < 0.4 ? "critical" : "warning",
              title: "Operating Cash Flow << Net Income",
              message: `Cash conversion ${round2(conversion)} is below institutional threshold.`,
              scoreImpact: -impact,
              metrics: { cashConversion: conversion, netIncome: ni, operatingCashFlow: ocf },
            })
          );
        }
      }

      if (fcf !== null && fcf < 0) {
        const impact = 20;
        score -= impact;
        signals.push(
          signal({
            checkId: "negative_fcf",
            dimension: "cashFlowQuality",
            severity: "warning",
            title: "Negative Free Cash Flow",
            message: "Free cash flow is negative for the current period.",
            scoreImpact: -impact,
            metrics: { freeCashFlow: fcf, operatingCashFlow: ocf },
          })
        );
      }

      const prevOcf = num(input.previous?.operatingCashFlow);
      const prevNi = input.previous ? netIncomeOf(input.previous) : null;
      const prevConversion = ratio(prevOcf, prevNi);
      if (
        conversion !== null &&
        prevConversion !== null &&
        conversion + 0.15 < prevConversion
      ) {
        const impact = 15;
        score -= impact;
        signals.push(
          signal({
            checkId: "cash_conversion_decline",
            dimension: "cashFlowQuality",
            severity: "warning",
            title: "Cash Conversion Decline",
            message: "Cash conversion deteriorated versus the prior period.",
            scoreImpact: -impact,
            metrics: {
              cashConversion: conversion,
              priorCashConversion: prevConversion,
            },
          })
        );
      }

      // Mild positive for improving OCF with profitable NI
      const ocfGrowth = growthRate(ocf, prevOcf);
      if (ocfGrowth !== null && ocfGrowth > 0.05 && ni !== null && ni > 0) {
        score = Math.min(100, score + 5);
      }

      return {
        dimension: "cashFlowQuality",
        score: clampScore(score),
        signals,
        warnings,
      };
    } catch (err) {
      warnings.push(`Cash flow analysis error: ${String(err)}`);
      return { dimension: "cashFlowQuality", score: 50, signals, warnings };
    }
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
