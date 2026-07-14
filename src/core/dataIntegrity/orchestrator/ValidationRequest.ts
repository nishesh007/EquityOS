/**
 * Unified validation request model for the Institutional Orchestrator.
 */

import type {
  ValidationEngineId,
  ValidationExecutionMode,
  ValidationPipelineId,
  ValidationPriority,
} from "./ValidationConfiguration";

export type ValidationRequestKind =
  | "STOCK"
  | "RECOMMENDATION"
  | "TRADE"
  | "PORTFOLIO"
  | "RESEARCH"
  | "AI"
  | "BATCH"
  | "CUSTOM";

export type ValidationScope =
  | "FULL"
  | "PARTIAL"
  | "SCORES_ONLY"
  | "ENGINES_ONLY";

export interface ValidationRequestContext {
  stock?: string;
  sector?: string;
  exchange?: string;
  portfolioId?: string;
  recommendationId?: string;
  tradeId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface ValidationRequest {
  requestId: string;
  timestamp: string;
  module: string;
  priority: ValidationPriority;
  validationScope: ValidationScope;
  kind: ValidationRequestKind;
  context: ValidationRequestContext;
  /** Payload to validate. */
  data: unknown;
  mode?: ValidationExecutionMode;
  pipeline?: ValidationPipelineId;
  /** Explicit engines (CUSTOM mode / overrides). */
  engines?: ValidationEngineId[];
  /** Sequential | Parallel | Conditional execution strategy. */
  executionStrategy?:
    | "SEQUENTIAL"
    | "PARALLEL"
    | "CONDITIONAL"
    | "PIPELINE";
  /** Skip engines that already have fresh cache entries. */
  useCache?: boolean;
  /** Override retry count. */
  retryCount?: number;
  /** Override timeout ms. */
  timeoutMs?: number;
  /** Conditional: only run engine if predicate key is truthy in prior results. */
  conditions?: Record<string, string>;
  /** Soft-fail: continue pipeline on engine error. */
  allowPartial?: boolean;
  objectId?: string;
  datasetType?: string;
  dataSource?: string;
}

export type ValidationRequestInput = Omit<
  ValidationRequest,
  "requestId" | "timestamp" | "module" | "priority" | "validationScope" | "kind" | "context" | "data"
> & {
  requestId?: string;
  timestamp?: string;
  module?: string;
  priority?: ValidationPriority;
  validationScope?: ValidationScope;
  kind?: ValidationRequestKind;
  context?: ValidationRequestContext;
  data: unknown;
};

export function createRequestId(): string {
  return `val-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeValidationRequest(
  input: ValidationRequestInput
): ValidationRequest {
  return {
    requestId: input.requestId ?? createRequestId(),
    timestamp: input.timestamp ?? new Date().toISOString(),
    module: input.module ?? "orchestrator",
    priority: input.priority ?? "NORMAL",
    validationScope: input.validationScope ?? "FULL",
    kind: input.kind ?? "CUSTOM",
    context: input.context ?? {},
    data: input.data,
    mode: input.mode,
    pipeline: input.pipeline,
    engines: input.engines,
    executionStrategy: input.executionStrategy ?? "PIPELINE",
    useCache: input.useCache ?? true,
    retryCount: input.retryCount,
    timeoutMs: input.timeoutMs,
    conditions: input.conditions,
    allowPartial: input.allowPartial ?? true,
    objectId: input.objectId,
    datasetType: input.datasetType,
    dataSource: input.dataSource,
  };
}
