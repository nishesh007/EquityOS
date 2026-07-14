/**
 * Capacity planner — current/max/recommended capacity and growth estimates.
 */

export interface CapacityPlan {
  currentCapacity: number;
  maximumSustainableLoad: number;
  recommendedCapacity: number;
  growthTrendPct: number;
  futureScalingRequirement: number;
  safetyMarginPct: number;
  score: number;
  warnings: string[];
}

export class CapacityPlanner {
  plan(input: {
    throughputPerSec: number;
    targetThroughputPerSec: number;
    cpuUsagePct: number;
    memoryUsagePct: number;
    safetyMarginPct: number;
    concurrency: number;
    historicalThroughput?: number[];
  }): CapacityPlan {
    const warnings: string[] = [];
    try {
      const util = Math.max(
        input.cpuUsagePct,
        input.memoryUsagePct,
        1
      ) / 100;
      const currentCapacity = round2(input.throughputPerSec);
      const maximumSustainableLoad = round2(
        currentCapacity / Math.max(0.15, util)
      );
      const margin = Math.max(0, input.safetyMarginPct) / 100;
      const recommendedCapacity = round2(
        Math.max(
          input.targetThroughputPerSec * (1 + margin),
          maximumSustainableLoad * (1 - margin * 0.5)
        )
      );

      const history = input.historicalThroughput ?? [];
      let growthTrendPct = 0;
      if (history.length >= 2) {
        const first = history[0]!;
        const last = history[history.length - 1]!;
        growthTrendPct = round2(
          first === 0 ? 0 : ((last - first) / Math.abs(first)) * 100
        );
      } else {
        growthTrendPct = round2((input.concurrency - 2) * 3.5);
      }

      const futureScalingRequirement = round2(
        Math.max(
          0,
          recommendedCapacity * (1 + Math.max(0, growthTrendPct) / 100) -
            maximumSustainableLoad
        )
      );

      if (currentCapacity < input.targetThroughputPerSec) {
        warnings.push("Current capacity below target throughput");
      }
      if (futureScalingRequirement > 0) {
        warnings.push("Additional scaling capacity recommended");
      }
      if (util >= 0.85) {
        warnings.push("Resource utilization leaves thin capacity headroom");
      }

      const headroomRatio =
        maximumSustainableLoad /
        Math.max(1, input.targetThroughputPerSec * (1 + margin));
      const score = clamp(Math.round(Math.min(100, headroomRatio * 100)), 0, 100);

      return {
        currentCapacity,
        maximumSustainableLoad,
        recommendedCapacity,
        growthTrendPct,
        futureScalingRequirement,
        safetyMarginPct: input.safetyMarginPct,
        score,
        warnings,
      };
    } catch (err) {
      return {
        currentCapacity: 0,
        maximumSustainableLoad: 0,
        recommendedCapacity: 0,
        growthTrendPct: 0,
        futureScalingRequirement: 0,
        safetyMarginPct: input.safetyMarginPct,
        score: 0,
        warnings: [...warnings, `capacity planning failed: ${String(err)}`],
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
