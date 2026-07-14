/**
 * Institutional Validation Simulation — configuration.
 * Mode, replay, seed, iterations, retention, and score weights live here.
 */

export type SimulationMode =
  | "single"
  | "batch"
  | "pipeline"
  | "module"
  | "historical_replay"
  | "future_projection"
  | "regression";

export type SimulationStrictMode = "strict" | "relaxed";

export interface SimulationScoreWeights {
  scenarioCoverage: number;
  simulationAccuracy: number;
  stressCoverage: number;
  comparisonQuality: number;
  replayIntegrity: number;
  auditCompleteness: number;
}

export interface SimulationConfiguration {
  mode: SimulationStrictMode;
  engineVersion: string;
  simulationMode: SimulationMode;
  replaySpeed: number;
  randomSeed: number;
  iterationCount: number;
  snapshotRetention: number;
  auditRetention: number;
  maxAuditEntries: number;
  maxScenarios: number;
  maxIterations: number;
  institutionalMode: boolean;
  sandboxOnly: boolean;
  scoreWeights: SimulationScoreWeights;
}

export const DEFAULT_SIMULATION_CONFIGURATION: SimulationConfiguration = {
  mode: "strict",
  engineVersion: "9F.28.0",
  simulationMode: "single",
  replaySpeed: 1,
  randomSeed: 42,
  iterationCount: 100,
  snapshotRetention: 100,
  auditRetention: 1_000,
  maxAuditEntries: 500,
  maxScenarios: 200,
  maxIterations: 10_000,
  institutionalMode: true,
  sandboxOnly: true,
  scoreWeights: {
    scenarioCoverage: 0.25,
    simulationAccuracy: 0.2,
    stressCoverage: 0.2,
    comparisonQuality: 0.15,
    replayIntegrity: 0.1,
    auditCompleteness: 0.1,
  },
};

export type SimulationConfigurationInput = Partial<
  Omit<SimulationConfiguration, "scoreWeights">
> & {
  scoreWeights?: Partial<SimulationScoreWeights>;
};

export function resolveSimulationConfiguration(
  input?: SimulationConfigurationInput
): SimulationConfiguration {
  const base = DEFAULT_SIMULATION_CONFIGURATION;
  return {
    ...base,
    ...input,
    scoreWeights: {
      ...base.scoreWeights,
      ...input?.scoreWeights,
    },
    replaySpeed: Math.max(0.1, input?.replaySpeed ?? base.replaySpeed),
    randomSeed: input?.randomSeed ?? base.randomSeed,
    iterationCount: Math.max(1, input?.iterationCount ?? base.iterationCount),
    snapshotRetention: Math.max(
      1,
      input?.snapshotRetention ?? base.snapshotRetention
    ),
    auditRetention: Math.max(1, input?.auditRetention ?? base.auditRetention),
    maxAuditEntries: Math.max(
      1,
      input?.maxAuditEntries ?? base.maxAuditEntries
    ),
    maxScenarios: Math.max(1, input?.maxScenarios ?? base.maxScenarios),
    maxIterations: Math.max(1, input?.maxIterations ?? base.maxIterations),
  };
}
