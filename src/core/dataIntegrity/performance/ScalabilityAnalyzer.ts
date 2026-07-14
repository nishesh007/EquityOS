/**
 * Scalability analyzer — linear/horizontal/vertical readiness and backpressure.
 */

export interface ScalabilityAnalysis {
  linearScalingScore: number;
  horizontalReadiness: number;
  verticalReadiness: number;
  concurrencyHeadroom: number;
  queueDepth: number;
  backpressurePct: number;
  score: number;
  warnings: string[];
}

export class ScalabilityAnalyzer {
  analyze(input: {
    concurrency: number;
    throughputPerSec: number;
    targetThroughputPerSec: number;
    cpuUsagePct: number;
    memoryUsagePct: number;
    p95LatencyMs: number;
    targetLatencyMs: number;
  }): ScalabilityAnalysis {
    const warnings: string[] = [];
    try {
      const throughputRatio =
        input.throughputPerSec / Math.max(1, input.targetThroughputPerSec);
      const latencyRatio =
        input.p95LatencyMs / Math.max(1, input.targetLatencyMs);

      const linearScalingScore = clamp(
        Math.round(100 - Math.max(0, latencyRatio - 1) * 40 - Math.max(0, 1 - throughputRatio) * 30),
        0,
        100
      );

      const horizontalReadiness = clamp(
        Math.round(
          100 -
            input.cpuUsagePct * 0.35 -
            input.memoryUsagePct * 0.25 +
            Math.min(20, input.concurrency * 2)
        ),
        0,
        100
      );

      const verticalReadiness = clamp(
        Math.round(
          100 - input.memoryUsagePct * 0.45 - input.cpuUsagePct * 0.2
        ),
        0,
        100
      );

      const concurrencyHeadroom = clamp(
        Math.round(
          Math.max(0, 16 - input.concurrency) * 6 +
            (100 - input.cpuUsagePct) * 0.4
        ),
        0,
        100
      );

      const queueDepth = clamp(
        Math.round(
          Math.max(0, latencyRatio - 1) * 20 +
            Math.max(0, input.concurrency - 4) * 3
        ),
        0,
        100
      );

      const backpressurePct = clamp(
        round2(
          Math.max(0, latencyRatio - 1) * 40 +
            Math.max(0, input.cpuUsagePct - 70) * 1.2
        ),
        0,
        100
      );

      if (backpressurePct >= 40) warnings.push("Backpressure elevated");
      if (queueDepth >= 30) warnings.push("Queue depth growing");
      if (horizontalReadiness < 50) {
        warnings.push("Limited horizontal scaling readiness");
      }

      const score = clamp(
        Math.round(
          linearScalingScore * 0.3 +
            horizontalReadiness * 0.25 +
            verticalReadiness * 0.2 +
            concurrencyHeadroom * 0.15 +
            (100 - backpressurePct) * 0.1
        ),
        0,
        100
      );

      return {
        linearScalingScore,
        horizontalReadiness,
        verticalReadiness,
        concurrencyHeadroom,
        queueDepth,
        backpressurePct,
        score,
        warnings,
      };
    } catch (err) {
      return {
        linearScalingScore: 0,
        horizontalReadiness: 0,
        verticalReadiness: 0,
        concurrencyHeadroom: 0,
        queueDepth: 0,
        backpressurePct: 0,
        score: 0,
        warnings: [...warnings, `scalability analysis failed: ${String(err)}`],
      };
    }
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
