/**
 * Operational metrics for the simulation engine.
 */

export interface SimulationHealthScore {
  scenarioCoverage: number;
  simulationAccuracy: number;
  stressCoverage: number;
  comparisonQuality: number;
  replayIntegrity: number;
  auditCompleteness: number;
  overall: number;
}

export interface SimulationOperationalMetrics {
  scenarioRuns: number;
  stressTests: number;
  monteCarloRuns: number;
  replayRuns: number;
  simulationHealthScore: number;
  averageRuntimeMs: number;
  snapshotCount: number;
  lastRunAt: string | null;
}

export class SimulationMetricsTracker {
  private scenarioRuns = 0;
  private stressTests = 0;
  private monteCarloRuns = 0;
  private replayRuns = 0;
  private simulationHealthScore = 0;
  private runtimeSum = 0;
  private runtimeCount = 0;
  private snapshotCount = 0;
  private lastRunAt: string | null = null;

  recordScenario(runtimeMs: number, healthScore?: number): void {
    this.scenarioRuns += 1;
    this.runtimeSum += runtimeMs;
    this.runtimeCount += 1;
    if (healthScore !== undefined) this.simulationHealthScore = healthScore;
    this.lastRunAt = new Date().toISOString();
  }

  recordStress(runtimeMs: number): void {
    this.stressTests += 1;
    this.runtimeSum += runtimeMs;
    this.runtimeCount += 1;
    this.lastRunAt = new Date().toISOString();
  }

  recordMonteCarlo(runtimeMs: number): void {
    this.monteCarloRuns += 1;
    this.runtimeSum += runtimeMs;
    this.runtimeCount += 1;
    this.lastRunAt = new Date().toISOString();
  }

  recordReplay(runtimeMs: number): void {
    this.replayRuns += 1;
    this.runtimeSum += runtimeMs;
    this.runtimeCount += 1;
    this.lastRunAt = new Date().toISOString();
  }

  setHealthScore(score: number): void {
    this.simulationHealthScore = score;
  }

  setSnapshotCount(n: number): void {
    this.snapshotCount = n;
  }

  getMetrics(): SimulationOperationalMetrics {
    return {
      scenarioRuns: this.scenarioRuns,
      stressTests: this.stressTests,
      monteCarloRuns: this.monteCarloRuns,
      replayRuns: this.replayRuns,
      simulationHealthScore: this.simulationHealthScore,
      averageRuntimeMs:
        this.runtimeCount === 0
          ? 0
          : round2(this.runtimeSum / this.runtimeCount),
      snapshotCount: this.snapshotCount,
      lastRunAt: this.lastRunAt,
    };
  }

  reset(): void {
    this.scenarioRuns = 0;
    this.stressTests = 0;
    this.monteCarloRuns = 0;
    this.replayRuns = 0;
    this.simulationHealthScore = 0;
    this.runtimeSum = 0;
    this.runtimeCount = 0;
    this.snapshotCount = 0;
    this.lastRunAt = null;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
