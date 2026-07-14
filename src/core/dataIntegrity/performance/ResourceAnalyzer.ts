/**
 * Resource analyzer — advisory CPU/memory/cache/GC/pipeline cost estimates.
 */

export interface ResourceAnalysis {
  cpuUsagePct: number;
  memoryUsagePct: number;
  objectAllocationRate: number;
  cacheEfficiencyPct: number;
  gcPressurePct: number;
  pipelineCost: number;
  dependencyCost: number;
  efficiencyScore: number;
  warnings: string[];
}

export class ResourceAnalyzer {
  analyze(input: {
    concurrency: number;
    sampleSize: number;
    averageLatencyMs: number;
    sourceCount: number;
    institutionalMode: boolean;
  }): ResourceAnalysis {
    const warnings: string[] = [];
    try {
      const loadFactor = Math.min(
        1.5,
        (input.concurrency * Math.sqrt(Math.max(1, input.sampleSize))) / 40
      );
      const latencyFactor = Math.min(1.2, input.averageLatencyMs / 120);

      const cpuUsagePct = clamp(
        round2(35 + loadFactor * 40 + latencyFactor * 10),
        1,
        99
      );
      const memoryUsagePct = clamp(
        round2(30 + loadFactor * 35 + input.sourceCount * 1.5),
        1,
        99
      );
      const objectAllocationRate = round2(
        input.sampleSize * input.concurrency * 12
      );
      const cacheEfficiencyPct = clamp(
        round2(88 - loadFactor * 15 + (input.institutionalMode ? 3 : 0)),
        20,
        99
      );
      const gcPressurePct = clamp(
        round2(12 + loadFactor * 25 + (100 - cacheEfficiencyPct) * 0.2),
        1,
        95
      );
      const pipelineCost = round2(
        input.averageLatencyMs * 0.45 + input.concurrency * 4
      );
      const dependencyCost = round2(
        input.sourceCount * 2.5 + loadFactor * 8
      );

      if (cpuUsagePct >= 85) warnings.push("CPU usage near saturation");
      if (memoryUsagePct >= 85) warnings.push("Memory usage near saturation");
      if (gcPressurePct >= 60) warnings.push("Elevated GC pressure");
      if (cacheEfficiencyPct < 50) warnings.push("Low cache efficiency");

      const efficiencyScore = clamp(
        Math.round(
          (100 - cpuUsagePct) * 0.25 +
            (100 - memoryUsagePct) * 0.25 +
            cacheEfficiencyPct * 0.3 +
            (100 - gcPressurePct) * 0.2
        ),
        0,
        100
      );

      return {
        cpuUsagePct,
        memoryUsagePct,
        objectAllocationRate,
        cacheEfficiencyPct,
        gcPressurePct,
        pipelineCost,
        dependencyCost,
        efficiencyScore,
        warnings,
      };
    } catch (err) {
      return {
        cpuUsagePct: 0,
        memoryUsagePct: 0,
        objectAllocationRate: 0,
        cacheEfficiencyPct: 0,
        gcPressurePct: 0,
        pipelineCost: 0,
        dependencyCost: 0,
        efficiencyScore: 0,
        warnings: [...warnings, `resource analysis failed: ${String(err)}`],
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
