/**
 * Aggregates validation module scores into a weighted base Trust Score.
 * Architecture supports unlimited future validation sources.
 */

import type { TrustConfiguration, TrustModuleId } from "./TrustConfiguration";
import { TrustWeightManager } from "./TrustWeightManager";

export type TrustModuleScoreMap = Record<string, number | undefined>;

export interface TrustAggregationInput {
  moduleScores: TrustModuleScoreMap;
  /** Optional override weights; defaults to config weights. */
  weights?: Partial<Record<string, number>>;
}

export interface TrustAggregationResult {
  baseScore: number;
  moduleScores: Record<string, number>;
  weightDistribution: Record<string, number>;
  contributingModules: string[];
  missingModules: string[];
  warnings: string[];
}

export function clampTrustScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value * 100) / 100));
}

export class TrustAggregationEngine {
  constructor(private readonly config: TrustConfiguration) {}

  aggregate(input: TrustAggregationInput): TrustAggregationResult {
    const weightManager = new TrustWeightManager({
      ...this.config.weights,
      ...(input.weights ?? {}),
    });
    const normalized = weightManager.getNormalizedWeights();
    const moduleIds = Object.keys(normalized);

    const moduleScores: Record<string, number> = {};
    const weightDistribution: Record<string, number> = {};
    const contributingModules: string[] = [];
    const missingModules: string[] = [];
    const warnings: string[] = [];

    let weightedSum = 0;

    for (const moduleId of moduleIds) {
      const weight = normalized[moduleId] ?? 0;
      if (weight <= 0) continue;

      weightDistribution[moduleId] = weight;
      const raw = input.moduleScores[moduleId];

      if (raw === undefined || raw === null || !Number.isFinite(raw)) {
        missingModules.push(moduleId);
        const fallback = this.config.missingModuleDefaultScore;
        moduleScores[moduleId] = fallback;
        weightedSum += fallback * weight;
        warnings.push(
          `Missing score for trust module "${moduleId}"; using default ${fallback}.`
        );
        continue;
      }

      const score = clampTrustScore(raw);
      moduleScores[moduleId] = score;
      contributingModules.push(moduleId);
      weightedSum += score * weight;
    }

    return {
      baseScore: clampTrustScore(weightedSum),
      moduleScores,
      weightDistribution,
      contributingModules,
      missingModules,
      warnings,
    };
  }

  /** Merge custom module scores into the aggregation map. */
  static mergeModuleScore(
    scores: TrustModuleScoreMap,
    moduleId: TrustModuleId,
    score: number
  ): TrustModuleScoreMap {
    return { ...scores, [moduleId]: clampTrustScore(score) };
  }
}
