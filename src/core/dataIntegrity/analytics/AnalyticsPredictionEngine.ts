/**
 * Predictive analytics — estimates future risk without modifying validation decisions.
 */

import type { AnalyticsConfiguration } from "./AnalyticsConfiguration";
import type { AnalyticsObservation } from "./AnalyticsRegistry";
import type { AnalyticsSummary } from "./AnalyticsAggregator";
import type { RuleEffectivenessReport } from "./AnalyticsRuleEffectiveness";
import type { FailureAnalyticsReport } from "./AnalyticsFailurePatterns";
import type { TrendAnalyticsReport } from "./AnalyticsTrendAnalyzer";
import {
  average,
  clampScore,
  linearSlope,
  stdDev,
  zScore,
} from "./AnalyticsCalculator";

export interface AnalyticsPrediction {
  id: string;
  category:
    | "RULE_FAILURE"
    | "TRUST_DEGRADATION"
    | "HALLUCINATION_INCREASE"
    | "MODULE_INSTABILITY"
    | "PERFORMANCE_DECLINE";
  description: string;
  likelihood: number;
  confidence: number;
  horizonDays: number;
  evidence: string[];
}

export interface AnomalyDetectionReport {
  validationSpikes: string[];
  failureSpikes: string[];
  trustCollapse: boolean;
  integrityCollapse: boolean;
  hallucinationIncrease: boolean;
  runtimeIncrease: boolean;
  ruleInstability: string[];
  moduleInstability: string[];
}

export interface PredictionAnalyticsReport {
  predictions: AnalyticsPrediction[];
  anomalies: AnomalyDetectionReport;
  averageConfidence: number;
  advisoryOnly: true;
}

export class AnalyticsPredictionEngine {
  constructor(private readonly config: AnalyticsConfiguration) {}

  analyze(input: {
    observations: AnalyticsObservation[];
    summary: AnalyticsSummary;
    rules: RuleEffectivenessReport;
    failures: FailureAnalyticsReport;
    trends: TrendAnalyticsReport;
  }): PredictionAnalyticsReport {
    const predictions: AnalyticsPrediction[] = [];
    const horizon = this.config.predictionHorizonDays;
    const obs = input.observations;

    // Likely rule failures
    for (const rule of input.rules.rules.slice(0, 20)) {
      if (rule.failureRate >= 30 || rule.reliabilityScore < 70) {
        const confidence = clampScore(
          40 + rule.failureRate * 0.4 + (100 - rule.reliabilityScore) * 0.3
        );
        predictions.push({
          id: `pred-rule-${rule.ruleId}`,
          category: "RULE_FAILURE",
          description: `Rule ${rule.ruleId} is likely to keep failing`,
          likelihood: clampScore(rule.failureRate),
          confidence,
          horizonDays: horizon,
          evidence: [
            `failureRate=${rule.failureRate}`,
            `reliability=${rule.reliabilityScore}`,
          ],
        });
      }
    }

    // Trust degradation
    const trustSeries = obs
      .map((o) => o.trustScore)
      .filter((v): v is number => typeof v === "number");
    if (trustSeries.length >= this.config.minSampleSize) {
      const slope = linearSlope(trustSeries.map((y, i) => ({ x: i, y })));
      if (slope < 0 || input.trends.weekly.direction === "DOWN") {
        const likelihood = clampScore(
          Math.abs(slope) * 20 +
            (input.trends.weekly.delta !== null && input.trends.weekly.delta < 0
              ? Math.abs(input.trends.weekly.delta)
              : 10)
        );
        predictions.push({
          id: "pred-trust-degradation",
          category: "TRUST_DEGRADATION",
          description: "Trust scores are likely to degrade over the horizon",
          likelihood,
          confidence: clampScore(
            50 + input.trends.weekly.strength * 0.3 + trustSeries.length
          ),
          horizonDays: horizon,
          evidence: [
            `trustSlope=${round2(slope)}`,
            `weeklyDirection=${input.trends.weekly.direction}`,
          ],
        });
      }
    }

    // Hallucination increase
    const hall = obs
      .map((o) => o.hallucinationScore)
      .filter((v): v is number => typeof v === "number");
    if (hall.length >= 2) {
      const recent = average(hall.slice(-Math.max(2, Math.floor(hall.length / 3))));
      const prior = average(hall.slice(0, Math.max(1, Math.floor(hall.length / 3))));
      // Lower hallucination score = worse integrity of AI output in our model (score is quality)
      if (recent < prior - 5) {
        predictions.push({
          id: "pred-hallucination-increase",
          category: "HALLUCINATION_INCREASE",
          description: "Hallucination risk is likely to increase",
          likelihood: clampScore(prior - recent),
          confidence: clampScore(55 + hall.length),
          horizonDays: horizon,
          evidence: [`recent=${round2(recent)}`, `prior=${round2(prior)}`],
        });
      }
    }

    // Module instability
    for (const mod of input.failures.mostFailedModules.slice(0, 5)) {
      predictions.push({
        id: `pred-module-${mod.module}`,
        category: "MODULE_INSTABILITY",
        description: `Module ${mod.module} is likely to remain unstable`,
        likelihood: clampScore(40 + mod.failures),
        confidence: clampScore(45 + mod.failures * 2),
        horizonDays: horizon,
        evidence: [`failures=${mod.failures}`],
      });
    }

    // Performance decline (runtime)
    const runtimes = obs
      .map((o) => o.averageRuntimeMs)
      .filter((v): v is number => typeof v === "number");
    if (runtimes.length >= this.config.minSampleSize) {
      const slope = linearSlope(runtimes.map((y, i) => ({ x: i, y })));
      if (slope > 0) {
        predictions.push({
          id: "pred-performance-decline",
          category: "PERFORMANCE_DECLINE",
          description: "Validation runtime is likely to increase",
          likelihood: clampScore(Math.min(100, slope * 5)),
          confidence: clampScore(50 + runtimes.length),
          horizonDays: horizon,
          evidence: [`runtimeSlope=${round2(slope)}`],
        });
      }
    }

    const anomalies = this.detectAnomalies(obs, input.summary, input.rules);

    const averageConfidence =
      predictions.length === 0
        ? 0
        : clampScore(
            predictions.reduce((a, p) => a + p.confidence, 0) /
              predictions.length
          );

    return {
      predictions,
      anomalies,
      averageConfidence,
      advisoryOnly: true,
    };
  }

  private detectAnomalies(
    observations: AnalyticsObservation[],
    summary: AnalyticsSummary,
    rules: RuleEffectivenessReport
  ): AnomalyDetectionReport {
    const validationCounts = observations
      .map((o) => o.validationCount ?? 0)
      .filter((n) => n > 0);
    const failureCounts = observations.map((o) => o.failed ?? 0);
    const trust = observations
      .map((o) => o.trustScore)
      .filter((v): v is number => typeof v === "number");
    const integrity = observations
      .map((o) => o.integrityScore)
      .filter((v): v is number => typeof v === "number");
    const hall = observations
      .map((o) => o.hallucinationScore)
      .filter((v): v is number => typeof v === "number");
    const runtimes = observations
      .map((o) => o.averageRuntimeMs)
      .filter((v): v is number => typeof v === "number");

    const validationSpikes = spikeLabels(
      validationCounts,
      this.config.spikeMultiplier,
      this.config.anomalyZScoreThreshold,
      "validation"
    );
    const failureSpikes = spikeLabels(
      failureCounts,
      this.config.spikeMultiplier,
      this.config.anomalyZScoreThreshold,
      "failure"
    );

    const trustCollapse =
      trust.length >= 2 &&
      trust[trust.length - 1]! <=
        trust[0]! - this.config.collapseDropThreshold;
    const integrityCollapse =
      integrity.length >= 2 &&
      integrity[integrity.length - 1]! <=
        integrity[0]! - this.config.collapseDropThreshold;
    const hallucinationIncrease =
      hall.length >= 2 &&
      hall[hall.length - 1]! <= hall[0]! - this.config.collapseDropThreshold / 2;
    const runtimeIncrease =
      runtimes.length >= 2 &&
      runtimes[runtimes.length - 1]! >=
        average(runtimes) * this.config.spikeMultiplier;

    const ruleInstability = rules.rules
      .filter((r) => r.reliabilityScore < 60 || stdDev([r.successRate, r.failureRate]) > 20)
      .map((r) => r.ruleId)
      .slice(0, 10);

    const moduleInstability = [
      ...new Set(
        observations
          .filter((o) => (o.failed ?? 0) > 0 || o.critical)
          .map((o) => o.module ?? o.sourceId)
      ),
    ].slice(0, 10);

    void summary;
    return {
      validationSpikes,
      failureSpikes,
      trustCollapse,
      integrityCollapse,
      hallucinationIncrease,
      runtimeIncrease,
      ruleInstability,
      moduleInstability,
    };
  }
}

function spikeLabels(
  values: number[],
  multiplier: number,
  zThresh: number,
  prefix: string
): string[] {
  if (values.length < 3) return [];
  const mean = average(values);
  const out: string[] = [];
  values.forEach((v, i) => {
    const z = zScore(v, values);
    if (v >= mean * multiplier || Math.abs(z) >= zThresh) {
      out.push(`${prefix}-spike@${i}:${round2(v)}`);
    }
  });
  return out.slice(0, 10);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
