/**
 * Weighted earnings quality score composer (0–100).
 */

import type { QualityWeightMap } from "./QualityConfiguration";
import {
  clampScore,
  type DimensionAnalysisResult,
  type QualitySignal,
} from "./qualityTypes";

export interface QualityScoreBreakdown {
  cashFlowQuality: number;
  accrualQuality: number;
  accountingQuality: number;
  workingCapital: number;
  capitalAllocation: number;
  margins: number;
  redFlags: number;
  overall: number;
}

export interface QualityScoreResult {
  score: number;
  breakdown: QualityScoreBreakdown;
  weights: QualityWeightMap;
  signals: QualitySignal[];
  classification: "strong" | "acceptable" | "weak" | "poor";
  advisoryOnly: true;
}

export class QualityScoreEngine {
  compose(
    dimensions: DimensionAnalysisResult[],
    weights: QualityWeightMap
  ): QualityScoreResult {
    const byDim = new Map(dimensions.map((d) => [d.dimension, d]));

    const cashFlowQuality = byDim.get("cashFlowQuality")?.score ?? 50;
    const accrualQuality = byDim.get("accrualQuality")?.score ?? 50;
    const accountingQuality = byDim.get("accountingQuality")?.score ?? 50;
    const workingCapital = byDim.get("workingCapital")?.score ?? 50;
    const capitalAllocation = byDim.get("capitalAllocation")?.score ?? 50;
    const margins = byDim.get("margins")?.score ?? 50;
    const redFlags = byDim.get("redFlags")?.score ?? 50;

    const overall = clampScore(
      cashFlowQuality * weights.cashFlowQuality +
        accrualQuality * weights.accrualQuality +
        accountingQuality * weights.accountingQuality +
        workingCapital * weights.workingCapital +
        capitalAllocation * weights.capitalAllocation +
        margins * weights.margins +
        redFlags * weights.redFlags
    );

    const signals = dimensions.flatMap((d) => d.signals);

    return {
      score: overall,
      breakdown: {
        cashFlowQuality,
        accrualQuality,
        accountingQuality,
        workingCapital,
        capitalAllocation,
        margins,
        redFlags,
        overall,
      },
      weights: { ...weights },
      signals,
      classification: classify(overall),
      advisoryOnly: true,
    };
  }
}

function classify(
  score: number
): QualityScoreResult["classification"] {
  if (score >= 80) return "strong";
  if (score >= 65) return "acceptable";
  if (score >= 45) return "weak";
  return "poor";
}
