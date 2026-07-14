/**
 * Distribution analysis across scores, sectors, exchanges, and recommendations.
 */

import type { AnalyticsObservation } from "./AnalyticsRegistry";
import { clampScore } from "./AnalyticsCalculator";

export interface ScoreBucket {
  label: string;
  min: number;
  max: number;
  count: number;
}

export interface DistributionAnalyticsReport {
  validationDistribution: Record<string, number>;
  trustDistribution: ScoreBucket[];
  integrityDistribution: ScoreBucket[];
  hallucinationDistribution: ScoreBucket[];
  historicalScoreDistribution: ScoreBucket[];
  sectorDistribution: Record<string, number>;
  exchangeDistribution: Record<string, number>;
  recommendationDistribution: Record<string, number>;
}

const SCORE_BANDS = [
  { label: "0-49", min: 0, max: 49 },
  { label: "50-69", min: 50, max: 69 },
  { label: "70-84", min: 70, max: 84 },
  { label: "85-94", min: 85, max: 94 },
  { label: "95-100", min: 95, max: 100 },
] as const;

export class AnalyticsDistribution {
  analyze(observations: AnalyticsObservation[]): DistributionAnalyticsReport {
    return {
      validationDistribution: countBy(observations, (o) => o.sourceId),
      trustDistribution: bucketScores(
        observations.map((o) => o.trustScore).filter(isNum)
      ),
      integrityDistribution: bucketScores(
        observations.map((o) => o.integrityScore).filter(isNum)
      ),
      hallucinationDistribution: bucketScores(
        observations.map((o) => o.hallucinationScore).filter(isNum)
      ),
      historicalScoreDistribution: bucketScores(
        observations.map((o) => o.historicalScore).filter(isNum)
      ),
      sectorDistribution: countBy(observations, (o) => o.sector ?? "UNKNOWN"),
      exchangeDistribution: countBy(
        observations,
        (o) => o.exchange ?? "UNKNOWN"
      ),
      recommendationDistribution: countBy(
        observations,
        (o) => o.recommendation ?? "UNKNOWN"
      ),
    };
  }
}

function bucketScores(scores: number[]): ScoreBucket[] {
  return SCORE_BANDS.map((band) => ({
    label: band.label,
    min: band.min,
    max: band.max,
    count: scores.filter((s) => {
      const v = clampScore(s);
      return v >= band.min && v <= band.max;
    }).length,
  }));
}

function countBy(
  observations: AnalyticsObservation[],
  keyFn: (o: AnalyticsObservation) => string
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const o of observations) {
    const key = keyFn(o);
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

function isNum(v: number | undefined): v is number {
  return typeof v === "number" && Number.isFinite(v);
}
