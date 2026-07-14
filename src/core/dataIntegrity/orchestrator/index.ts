/**
 * Institutional Validation Orchestrator — public exports (Prompt 9F.12).
 */

export {
  DEFAULT_VALIDATION_CONFIGURATION,
  resolveValidationConfiguration,
} from "./ValidationConfiguration";

export type {
  ValidationExecutionMode,
  ValidationPriority,
  ValidationPipelineId,
  ValidationEngineId,
  ValidationConfiguration,
  ValidationConfigurationInput,
} from "./ValidationConfiguration";

export {
  createRequestId,
  normalizeValidationRequest,
} from "./ValidationRequest";

export type {
  ValidationRequestKind,
  ValidationScope,
  ValidationRequestContext,
  ValidationRequest,
  ValidationRequestInput,
} from "./ValidationRequest";

export { emptyScores } from "./ValidationResponse";

export type {
  ValidationStatus,
  ValidationTraceStep,
  EngineScoreBag,
  ValidationResponse,
} from "./ValidationResponse";

export { ValidationContext } from "./ValidationContext";
export type { EngineRunResult } from "./ValidationContext";

export { ValidationWorkflow } from "./ValidationWorkflow";
export type { WorkflowState } from "./ValidationWorkflow";

export {
  registerValidationEngine,
  getRegisteredValidationEngines,
  getValidationEngine,
  discoverValidationEngines,
  resetValidationEngineRegistrationState,
} from "./ValidationRegistry";

export type {
  ValidationEngineHandler,
  ValidationEngineDefinition,
} from "./ValidationRegistry";

export { ValidationCache } from "./ValidationCache";
export type { OrchestratorCacheStats } from "./ValidationCache";

export { ValidationMetricsTracker } from "./ValidationMetrics";
export type { OrchestratorMetricsSnapshot } from "./ValidationMetrics";

export { ValidationAuditLogger } from "./ValidationAuditLogger";
export type { OrchestratorAuditEntry } from "./ValidationAuditLogger";

export {
  CircularDependencyError,
  buildExecutionPlan,
  resolveDependencies,
  detectCircularDependencies,
} from "./ValidationExecutionPlan";

export type { ValidationExecutionPlan } from "./ValidationExecutionPlan";

export { ValidationRouter } from "./ValidationRouter";
export { ValidationDispatcher } from "./ValidationDispatcher";
export { ValidationPipelineManager } from "./ValidationPipelineManager";
export type { PipelineDefinition } from "./ValidationPipelineManager";

export {
  ValidationOrchestrator,
  registerValidationOrchestrator,
  getValidationOrchestrator,
  resetValidationOrchestrator,
  registerBuiltinValidationEngines,
  buildBuiltinValidationEngines,
  validate,
  validateBatch,
  validateResearch,
  validateRecommendation,
  validateTrade,
  validatePortfolio,
  executePipeline,
  getExecutionStatus,
  cancelValidation,
} from "./ValidationOrchestrator";

export type {
  ExecutionStatus,
  OrchestratorRegistrationResult,
} from "./ValidationOrchestrator";
