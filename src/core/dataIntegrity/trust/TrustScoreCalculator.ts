/**
 * Trust Score calculator — weighted aggregation + confidence adjustments + bonuses.
 */

import type { TrustConfiguration } from "./TrustConfiguration";
import {
  TrustAggregationEngine,
  clampTrustScore,
  type TrustAggregationResult,
  type TrustModuleScoreMap,
} from "./TrustAggregationEngine";
import type { TrustErrorReport } from "./TrustMetrics";

export interface TrustAdjustmentSignals {
  /** 0–100 elevated hallucination risk. */
  hallucinationRisk?: number;
  /** Current historical accuracy 0–100 (penalty when below prior). */
  historicalAccuracy?: number;
  previousHistoricalAccuracy?: number;
  /** Current data integrity 0–100 vs previous. */
  dataIntegrityScore?: number;
  previousDataIntegrityScore?: number;
  /** Count of recommendation conflicts. */
  recommendationConflicts?: number;
  /** Count of market inconsistencies. */
  marketInconsistencies?: number;
  /** Count of fundamental inconsistencies. */
  fundamentalInconsistencies?: number;
  /** Bonus flags */
  historicalAccuracyImproved?: boolean;
  strongValidationAcrossModules?: boolean;
  zeroContradictions?: boolean;
  stableFinancials?: boolean;
  stableTechnicals?: boolean;
  excellentRecommendationQuality?: boolean;
  institutionalGradeConsistency?: boolean;
}

export interface TrustScoreCalculationInput {
  moduleScores: TrustModuleScoreMap;
  weights?: Partial<Record<string, number>>;
  signals?: TrustAdjustmentSignals;
  previousScore?: number | null;
}

export interface TrustScoreCalculationResult {
  trustScore: number;
  baseScore: number;
  adjustmentsApplied: number;
  bonusesApplied: number;
  aggregation: TrustAggregationResult;
  errorReports: TrustErrorReport[];
  warnings: string[];
  trustConfidence: number;
}

export class TrustScoreCalculator {
  private readonly aggregator: TrustAggregationEngine;

  constructor(private readonly config: TrustConfiguration) {
    this.aggregator = new TrustAggregationEngine(config);
  }

  calculate(input: TrustScoreCalculationInput): TrustScoreCalculationResult {
    const aggregation = this.aggregator.aggregate({
      moduleScores: input.moduleScores,
      weights: input.weights,
    });

    const { penalty, reports: penaltyReports, warnings: penaltyWarnings } =
      this.computePenalties(input.signals, aggregation);

    const { bonus, reports: bonusReports, warnings: bonusWarnings } =
      this.computeBonuses(input.signals, aggregation);

    let adjustmentsApplied = -penalty;
    let bonusesApplied = bonus;

    if (this.config.mode === "strict" && aggregation.missingModules.length > 0) {
      const missingPenalty =
        aggregation.missingModules.length * this.config.missingModulePenalty;
      adjustmentsApplied -= missingPenalty;
      penaltyReports.push({
        module: "trust.missingModules",
        severity: "WARNING",
        trustImpact: -missingPenalty,
        previousScore: input.previousScore ?? null,
        currentScore: aggregation.baseScore,
        suggestedAction:
          "Provide scores for all registered trust modules or switch to relaxed mode.",
      });
    }

    const trustScore = clampTrustScore(
      aggregation.baseScore + adjustmentsApplied + bonusesApplied
    );

    const trustConfidence = this.computeConfidence(
      trustScore,
      aggregation,
      Math.abs(adjustmentsApplied),
      bonusesApplied
    );

    return {
      trustScore,
      baseScore: aggregation.baseScore,
      adjustmentsApplied,
      bonusesApplied,
      aggregation,
      errorReports: [...penaltyReports, ...bonusReports],
      warnings: [
        ...aggregation.warnings,
        ...penaltyWarnings,
        ...bonusWarnings,
      ],
      trustConfidence,
    };
  }

  private computePenalties(
    signals: TrustAdjustmentSignals | undefined,
    aggregation: TrustAggregationResult
  ): {
    penalty: number;
    reports: TrustErrorReport[];
    warnings: string[];
  } {
    const adj = this.config.confidenceAdjustments;
    const reports: TrustErrorReport[] = [];
    const warnings: string[] = [];
    let penalty = 0;
    const s = signals ?? {};

    if (s.hallucinationRisk !== undefined && s.hallucinationRisk > 0) {
      const impact = s.hallucinationRisk * adj.hallucinationRiskPenalty;
      penalty += impact;
      warnings.push(`Hallucination risk elevated (${s.hallucinationRisk}).`);
      reports.push({
        module: "hallucinationDetection",
        severity: s.hallucinationRisk >= 50 ? "ERROR" : "WARNING",
        trustImpact: -impact,
        previousScore: null,
        currentScore: aggregation.moduleScores.hallucinationDetection ?? 0,
        suggestedAction: "Reduce hallucination risk before publishing AI output.",
      });
    }

    if (
      s.historicalAccuracy !== undefined &&
      s.previousHistoricalAccuracy !== undefined &&
      s.historicalAccuracy < s.previousHistoricalAccuracy
    ) {
      const drop = s.previousHistoricalAccuracy - s.historicalAccuracy;
      const impact = drop * adj.historicalAccuracyPenalty;
      penalty += impact;
      warnings.push(`Historical accuracy fell by ${drop.toFixed(1)}pp.`);
      reports.push({
        module: "historicalPerformance",
        severity: drop >= 15 ? "ERROR" : "WARNING",
        trustImpact: -impact,
        previousScore: s.previousHistoricalAccuracy,
        currentScore: s.historicalAccuracy,
        suggestedAction: "Review model decay and recalibrate recommendation engines.",
      });
    }

    if (
      s.dataIntegrityScore !== undefined &&
      s.previousDataIntegrityScore !== undefined &&
      s.dataIntegrityScore < s.previousDataIntegrityScore
    ) {
      const drop = s.previousDataIntegrityScore - s.dataIntegrityScore;
      const impact = drop * adj.dataIntegrityPenalty;
      penalty += impact;
      warnings.push(`Data integrity decreased by ${drop.toFixed(1)}pp.`);
      reports.push({
        module: "dataIntegrity",
        severity: drop >= 15 ? "CRITICAL" : "WARNING",
        trustImpact: -impact,
        previousScore: s.previousDataIntegrityScore,
        currentScore: s.dataIntegrityScore,
        suggestedAction: "Re-validate upstream datasets before trusting outputs.",
      });
    }

    if ((s.recommendationConflicts ?? 0) > 0) {
      const impact =
        (s.recommendationConflicts ?? 0) * adj.recommendationConflictPenalty;
      penalty += impact;
      warnings.push(
        `Recommendation conflicts increased (${s.recommendationConflicts}).`
      );
      reports.push({
        module: "recommendationValidation",
        severity: "WARNING",
        trustImpact: -impact,
        previousScore: null,
        currentScore: aggregation.moduleScores.recommendationValidation ?? 0,
        suggestedAction: "Resolve conflicting recommendation signals.",
      });
    }

    if ((s.marketInconsistencies ?? 0) > 0) {
      const impact =
        (s.marketInconsistencies ?? 0) * adj.marketInconsistencyPenalty;
      penalty += impact;
      warnings.push(`Market inconsistencies rose (${s.marketInconsistencies}).`);
      reports.push({
        module: "marketValidation",
        severity: "WARNING",
        trustImpact: -impact,
        previousScore: null,
        currentScore: aggregation.moduleScores.marketValidation ?? 0,
        suggestedAction: "Investigate market data inconsistencies.",
      });
    }

    if ((s.fundamentalInconsistencies ?? 0) > 0) {
      const impact =
        (s.fundamentalInconsistencies ?? 0) *
        adj.fundamentalInconsistencyPenalty;
      penalty += impact;
      warnings.push(
        `Fundamental inconsistencies rose (${s.fundamentalInconsistencies}).`
      );
      reports.push({
        module: "fundamentalValidation",
        severity: "WARNING",
        trustImpact: -impact,
        previousScore: null,
        currentScore: aggregation.moduleScores.fundamentalValidation ?? 0,
        suggestedAction: "Reconcile fundamental statement inconsistencies.",
      });
    }

    return {
      penalty: Math.min(penalty, adj.maxPenalty),
      reports,
      warnings,
    };
  }

  private computeBonuses(
    signals: TrustAdjustmentSignals | undefined,
    aggregation: TrustAggregationResult
  ): {
    bonus: number;
    reports: TrustErrorReport[];
    warnings: string[];
  } {
    const b = this.config.bonusScoring;
    const reports: TrustErrorReport[] = [];
    const warnings: string[] = [];
    let bonus = 0;
    const s = signals ?? {};

    const strongAcross =
      s.strongValidationAcrossModules === true ||
      (aggregation.contributingModules.length > 0 &&
        aggregation.contributingModules.every(
          (id) =>
            (aggregation.moduleScores[id] ?? 0) >= b.strongModuleThreshold
        ) &&
        aggregation.missingModules.length === 0);

    const apply = (
      flag: boolean | undefined,
      amount: number,
      module: string,
      message: string
    ) => {
      if (!flag) return;
      bonus += amount;
      warnings.push(message);
      reports.push({
        module,
        severity: "INFO",
        trustImpact: amount,
        previousScore: null,
        currentScore: aggregation.baseScore,
        suggestedAction: "Maintain institutional-grade consistency.",
      });
    };

    apply(
      s.historicalAccuracyImproved === true,
      b.historicalAccuracyImproved,
      "historicalPerformance",
      "Historical accuracy improved."
    );
    apply(
      strongAcross,
      b.strongValidationAcrossModules,
      "trust.aggregation",
      "Strong validation across all modules."
    );
    apply(
      s.zeroContradictions === true,
      b.zeroContradictions,
      "hallucinationDetection",
      "Zero contradictions detected."
    );
    apply(
      s.stableFinancials === true,
      b.stableFinancials,
      "fundamentalValidation",
      "Stable financials."
    );
    apply(
      s.stableTechnicals === true,
      b.stableTechnicals,
      "technicalValidation",
      "Stable technicals."
    );

    const recScore = aggregation.moduleScores.recommendationValidation;
    const excellentRec =
      s.excellentRecommendationQuality === true ||
      (recScore !== undefined && recScore >= b.excellentRecommendationThreshold);
    apply(
      excellentRec,
      b.excellentRecommendationQuality,
      "recommendationValidation",
      "Excellent recommendation quality."
    );
    apply(
      s.institutionalGradeConsistency === true,
      b.institutionalGradeConsistency,
      "trust.aggregation",
      "Institutional-grade consistency."
    );

    return {
      bonus: Math.min(bonus, b.maxBonus),
      reports,
      warnings,
    };
  }

  private computeConfidence(
    trustScore: number,
    aggregation: TrustAggregationResult,
    penaltyMagnitude: number,
    bonus: number
  ): number {
    let confidence = trustScore;
    confidence -= aggregation.missingModules.length * 3;
    confidence -= penaltyMagnitude * 0.5;
    confidence += Math.min(bonus, 5);
    return clampTrustScore(confidence);
  }
}
