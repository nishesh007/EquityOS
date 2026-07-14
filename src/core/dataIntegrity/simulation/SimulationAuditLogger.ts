/**
 * Audit logger for simulation / scenario operations.
 */

import type { SimulationHealthScore } from "./SimulationMetrics";

export type SimulationAuditEvent =
  | "ScenarioRun"
  | "StressTest"
  | "MonteCarloRun"
  | "ReplayRun"
  | "ScenarioCompared"
  | "SnapshotCreated"
  | "SimulationScoreComputed"
  | "Warning"
  | "Error";

export interface SimulationAuditEntry {
  timestamp: string;
  event: SimulationAuditEvent;
  scenarioId?: string;
  runId?: string;
  simulationHealthScore?: number;
  scoreBreakdown?: SimulationHealthScore;
  executionTimeMs: number;
  warnings: string[];
  errors: string[];
  engineVersion: string;
}

export class SimulationAuditLogger {
  private readonly entries: SimulationAuditEntry[] = [];
  private maxEntries: number;

  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
  }

  setMaxEntries(n: number): void {
    this.maxEntries = n;
  }

  append(entry: SimulationAuditEntry): SimulationAuditEntry {
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
    return entry;
  }

  getLog(limit?: number): SimulationAuditEntry[] {
    if (limit === undefined) return [...this.entries];
    return this.entries.slice(-limit);
  }

  completenessScore(): number {
    if (this.entries.length === 0) return 40;
    const kinds = new Set(this.entries.map((e) => e.event));
    const expected: SimulationAuditEvent[] = [
      "ScenarioRun",
      "StressTest",
      "MonteCarloRun",
      "ScenarioCompared",
      "SnapshotCreated",
    ];
    const hit = expected.filter((k) => kinds.has(k)).length;
    return clamp(Math.round((hit / expected.length) * 100), 0, 100);
  }

  reset(): void {
    this.entries.length = 0;
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
