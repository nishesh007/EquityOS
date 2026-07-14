/**
 * Correlation engine — pairwise relationships across validation signals.
 */

import type { InsightsConfiguration } from "./InsightsConfiguration";
import type { InsightObservation } from "./InsightsRegistry";

export type CorrelationPair =
  | "RULE_FAILURE"
  | "TRUST_RECOMMENDATION"
  | "RUNTIME_FAILURE"
  | "RETRY_TIMEOUT"
  | "MODULE_HEALTH"
  | "PIPELINE_RUNTIME"
  | "HISTORICAL_TRUST"
  | "CUSTOM"
  | (string & {});

export interface CorrelationResult {
  correlationId: string;
  pair: CorrelationPair;
  label: string;
  coefficient: number;
  strength: "WEAK" | "MODERATE" | "STRONG";
  confidence: number;
  evidence: string[];
  sampleSize: number;
}

export class CorrelationEngine {
  constructor(private config: InsightsConfiguration) {}

  setConfiguration(config: InsightsConfiguration): void {
    this.config = config;
  }

  analyze(observations: InsightObservation[]): {
    correlations: CorrelationResult[];
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];
    const correlations: CorrelationResult[] = [];

    try {
      const pairs: Array<{
        pair: CorrelationPair;
        label: string;
        xs: number[];
        ys: number[];
      }> = [
        {
          pair: "RULE_FAILURE",
          label: "Rule executions vs failures",
          xs: observations.map((o) => (o.ruleId ? 1 : 0)),
          ys: observations.map((o) => o.failures ?? 0),
        },
        {
          pair: "TRUST_RECOMMENDATION",
          label: "Trust vs recommendation quality",
          xs: num(observations, (o) => o.trustScore),
          ys: num(observations, (o) => o.recommendationQuality),
        },
        {
          pair: "RUNTIME_FAILURE",
          label: "Runtime vs failures",
          xs: num(observations, (o) => o.runtimeMs),
          ys: num(observations, (o) => o.failures),
        },
        {
          pair: "RETRY_TIMEOUT",
          label: "Retries vs timeouts",
          xs: num(observations, (o) => o.retries),
          ys: num(observations, (o) => o.timeouts),
        },
        {
          pair: "MODULE_HEALTH",
          label: "Module load vs health",
          xs: observations.map((o) => o.validations ?? o.failures ?? 0),
          ys: num(observations, (o) => o.healthScore),
        },
        {
          pair: "PIPELINE_RUNTIME",
          label: "Pipeline presence vs runtime",
          xs: observations.map((o) => (o.pipelineId ? 1 : 0)),
          ys: num(observations, (o) => o.runtimeMs),
        },
        {
          pair: "HISTORICAL_TRUST",
          label: "Historical score vs trust",
          xs: num(observations, (o) => o.historicalScore),
          ys: num(observations, (o) => o.trustScore),
        },
      ];

      for (const pair of pairs) {
        const aligned = align(pair.xs, pair.ys);
        if (aligned.xs.length < 2) continue;
        const coefficient = pearson(aligned.xs, aligned.ys);
        if (Math.abs(coefficient) < this.config.correlationThreshold) continue;

        const strength =
          Math.abs(coefficient) >= 0.75
            ? "STRONG"
            : Math.abs(coefficient) >= 0.5
              ? "MODERATE"
              : "WEAK";

        correlations.push({
          correlationId: `corr:${new Date().toISOString()}:${Math.random().toString(36).slice(2, 8)}`,
          pair: pair.pair,
          label: pair.label,
          coefficient: round2(coefficient),
          strength,
          confidence: clamp(Math.abs(coefficient), 0, 1),
          evidence: [
            `n=${aligned.xs.length}`,
            `r=${round2(coefficient)}`,
            `threshold=${this.config.correlationThreshold}`,
          ],
          sampleSize: aligned.xs.length,
        });
      }

      correlations.sort(
        (a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient)
      );
      if (correlations.length > this.config.maxCorrelations) {
        warnings.push(
          `Truncated correlations to ${this.config.maxCorrelations}.`
        );
        return {
          correlations: correlations.slice(0, this.config.maxCorrelations),
          warnings,
          errors,
        };
      }
    } catch (err) {
      errors.push(`Correlation analysis failed: ${String(err)}`);
    }

    return { correlations, warnings, errors };
  }
}

function num(
  observations: InsightObservation[],
  fn: (o: InsightObservation) => number | undefined
): number[] {
  return observations.map((o) => fn(o)).map((n) => (n == null ? NaN : n));
}

function align(
  xs: number[],
  ys: number[]
): { xs: number[]; ys: number[] } {
  const ax: number[] = [];
  const ay: number[] = [];
  const n = Math.min(xs.length, ys.length);
  for (let i = 0; i < n; i++) {
    const x = xs[i]!;
    const y = ys[i]!;
    if (Number.isFinite(x) && Number.isFinite(y)) {
      ax.push(x);
      ay.push(y);
    }
  }
  return { xs: ax, ys: ay };
}

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i]! - meanX;
    const dy = ys[i]! - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  if (den === 0) return 0;
  return num / den;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
