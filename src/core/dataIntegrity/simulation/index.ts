/**
 * Institutional Validation Simulation & Scenario Testing Engine — public exports (Prompt 9F.28).
 */

export {
  DEFAULT_SIMULATION_CONFIGURATION,
  resolveSimulationConfiguration,
} from "./SimulationConfiguration";

export type {
  SimulationMode,
  SimulationStrictMode,
  SimulationScoreWeights,
  SimulationConfiguration,
  SimulationConfigurationInput,
} from "./SimulationConfiguration";

export {
  createSimulationSourceId,
  registerSimulationSource,
  getSimulationSource,
  listSimulationSources,
  resetSimulationRegistry,
} from "./SimulationRegistry";

export type {
  SimulationSourceKind,
  SimulationSourceDefinition,
} from "./SimulationRegistry";

export { ScenarioBuilder } from "./ScenarioBuilder";
export type {
  ScenarioType,
  ScenarioDefinition,
  BuildScenarioInput,
} from "./ScenarioBuilder";

export { ScenarioGenerator } from "./ScenarioGenerator";
export type { GenerateScenariosOptions } from "./ScenarioGenerator";

export { ScenarioRunner } from "./ScenarioRunner";
export type { ScenarioRunResult } from "./ScenarioRunner";

export { ScenarioComparator } from "./ScenarioComparator";
export type { ScenarioComparison } from "./ScenarioComparator";

export { ScenarioValidator } from "./ScenarioValidator";
export type {
  ScenarioValidationIssue,
  ScenarioValidationResult,
} from "./ScenarioValidator";

export { StressTestEngine } from "./StressTestEngine";
export type {
  StressProfile,
  StressTestOptions,
  StressTestResult,
} from "./StressTestEngine";

export { MonteCarloEngine } from "./MonteCarloEngine";
export type {
  MonteCarloOptions,
  MonteCarloOutcome,
  MonteCarloResult,
} from "./MonteCarloEngine";

export { SimulationMetricsTracker } from "./SimulationMetrics";
export type {
  SimulationHealthScore,
  SimulationOperationalMetrics,
} from "./SimulationMetrics";

export { SimulationAuditLogger } from "./SimulationAuditLogger";
export type {
  SimulationAuditEvent,
  SimulationAuditEntry,
} from "./SimulationAuditLogger";

export {
  createSimulationSnapshotId,
  compareSimulationSnapshots,
  buildSimulationSnapshotPayload,
  SimulationSnapshotStore,
} from "./SimulationSnapshot";

export type {
  SimulationSnapshotKind,
  SimulationSnapshotPayload,
  SimulationSnapshot,
  SimulationSnapshotComparison,
} from "./SimulationSnapshot";

export {
  ValidationSimulationEngine,
  registerSimulation,
  registerValidationSimulationEngine,
  getValidationSimulationEngine,
  resetValidationSimulationEngine,
  registerBuiltinSimulationSources,
  runScenario,
  runStressTest,
  runMonteCarlo,
  compareScenarios,
  createSimulationSnapshot,
  getSimulationMetrics,
} from "./ValidationSimulationEngine";

export type {
  RunScenarioOptions,
  SimulationRegistrationResult,
} from "./ValidationSimulationEngine";
