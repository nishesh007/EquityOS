/**
 * Institutional Validation Orchestrator — unified API façade (Prompt 9F.12).
 * Routes every validation request through one orchestration layer.
 * Does not modify existing validation engine internals.
 */

import {
  DEFAULT_VALIDATION_CONFIGURATION,
  resolveValidationConfiguration,
  type ValidationConfiguration,
  type ValidationConfigurationInput,
  type ValidationEngineId,
  type ValidationPipelineId,
  type ValidationPriority,
} from "./ValidationConfiguration";
import {
  normalizeValidationRequest,
  type ValidationRequest,
  type ValidationRequestInput,
  type ValidationRequestKind,
} from "./ValidationRequest";
import type { ValidationResponse, ValidationStatus } from "./ValidationResponse";
import { ValidationContext, type EngineRunResult } from "./ValidationContext";
import { ValidationWorkflow, type WorkflowState } from "./ValidationWorkflow";
import {
  areBuiltinValidationEnginesRegistered,
  getRegisteredValidationEngines,
  getValidationEngine,
  markBuiltinValidationEnginesRegistered,
  registerValidationEngine,
  resetValidationEngineRegistrationState,
  type ValidationEngineDefinition,
} from "./ValidationRegistry";
import { ValidationCache } from "./ValidationCache";
import { ValidationMetricsTracker } from "./ValidationMetrics";
import { ValidationAuditLogger } from "./ValidationAuditLogger";
import { ValidationRouter } from "./ValidationRouter";
import { ValidationDispatcher } from "./ValidationDispatcher";
import { ValidationPipelineManager } from "./ValidationPipelineManager";
import type { DatasetType } from "../IntegrityTypes";
import { registerMarketRules } from "../rules/market";
import { registerTechnicalRules } from "../rules/technical";
import { registerFundamentalRules } from "../rules/fundamental";
import { registerRecommendationRules } from "../rules/recommendation";
import { registerTradeSetupRules } from "../rules/tradeSetup";
import { registerHallucinationRules } from "../rules/hallucination";
import { registerHistoricalRules } from "../rules/historical";
import { registerTrustEngine } from "../trust";
import { registerDashboardService } from "../dashboard";
import { safePublishEvent } from "../events/ValidationEventBus";

export interface ExecutionStatus {
  requestId: string;
  state: WorkflowState;
  startedAt: string;
  finishedAt?: string;
  response?: ValidationResponse;
}

interface ActiveExecution {
  workflow: ValidationWorkflow;
  context: ValidationContext;
  startedAt: string;
  finishedAt?: string;
  response?: ValidationResponse;
  priority: ValidationPriority;
}

let defaultOrchestrator: ValidationOrchestrator | null = null;
let orchestratorRegistered = false;

export class ValidationOrchestrator {
  private config: ValidationConfiguration;
  private cache: ValidationCache;
  private metrics: ValidationMetricsTracker;
  private audit: ValidationAuditLogger;
  private router: ValidationRouter;
  private dispatcher: ValidationDispatcher;
  private pipelines: ValidationPipelineManager;
  private readonly active = new Map<string, ActiveExecution>();
  private readonly queue: string[] = [];

  constructor(configInput?: ValidationConfigurationInput) {
    this.config = resolveValidationConfiguration(configInput);
    this.cache = new ValidationCache(this.config.cacheTtlMs);
    this.metrics = new ValidationMetricsTracker();
    this.audit = new ValidationAuditLogger(this.config.maxAuditEntries);
    this.router = new ValidationRouter(this.config);
    this.dispatcher = new ValidationDispatcher(this.config, this.cache);
    this.pipelines = new ValidationPipelineManager(this.config);
  }

  getConfiguration(): ValidationConfiguration {
    return resolveValidationConfiguration(this.config);
  }

  getPipelineManager(): ValidationPipelineManager {
    return this.pipelines;
  }

  getCache(): ValidationCache {
    return this.cache;
  }

  registerEngine(
    definition: ValidationEngineDefinition,
    options?: { force?: boolean }
  ): { registered: boolean; skipped: boolean } {
    return registerValidationEngine(definition, options);
  }

  /** Unified validate entry point. */
  async validate(input: ValidationRequestInput): Promise<ValidationResponse> {
    const request = normalizeValidationRequest(input);
    return this.enqueueAndRun(request);
  }

  async validateBatch(
    inputs: ValidationRequestInput[]
  ): Promise<ValidationResponse[]> {
    const sorted = [...inputs].sort(
      (a, b) =>
        (this.config.priorityWeights[b.priority ?? "NORMAL"] ?? 0) -
        (this.config.priorityWeights[a.priority ?? "NORMAL"] ?? 0)
    );
    const results: ValidationResponse[] = [];
    for (const input of sorted) {
      results.push(
        await this.validate({
          ...input,
          kind: input.kind ?? "BATCH",
        })
      );
    }
    return results;
  }

  async validateResearch(
    data: unknown,
    options?: Partial<ValidationRequestInput>
  ): Promise<ValidationResponse> {
    return this.validate({
      ...options,
      data,
      kind: "RESEARCH",
      pipeline: options?.pipeline ?? "ResearchValidation",
      module: options?.module ?? "research",
    });
  }

  async validateRecommendation(
    data: unknown,
    options?: Partial<ValidationRequestInput>
  ): Promise<ValidationResponse> {
    return this.validate({
      ...options,
      data,
      kind: "RECOMMENDATION",
      pipeline: options?.pipeline ?? "RecommendationValidation",
      module: options?.module ?? "recommendation",
    });
  }

  async validateTrade(
    data: unknown,
    options?: Partial<ValidationRequestInput>
  ): Promise<ValidationResponse> {
    return this.validate({
      ...options,
      data,
      kind: "TRADE",
      pipeline: options?.pipeline ?? "TradeValidation",
      module: options?.module ?? "trade",
    });
  }

  async validatePortfolio(
    data: unknown,
    options?: Partial<ValidationRequestInput>
  ): Promise<ValidationResponse> {
    return this.validate({
      ...options,
      data,
      kind: "PORTFOLIO",
      pipeline: options?.pipeline ?? "PortfolioValidation",
      module: options?.module ?? "portfolio",
    });
  }

  async executePipeline(
    pipelineId: ValidationPipelineId,
    data: unknown,
    options?: Partial<ValidationRequestInput>
  ): Promise<ValidationResponse> {
    return this.validate({
      ...options,
      data,
      pipeline: pipelineId,
      executionStrategy: options?.executionStrategy ?? "PIPELINE",
      kind: options?.kind ?? "CUSTOM",
      module: options?.module ?? "pipeline",
    });
  }

  getExecutionStatus(requestId: string): ExecutionStatus | null {
    const active = this.active.get(requestId);
    if (!active) return null;
    return {
      requestId,
      state: active.workflow.getState(),
      startedAt: active.startedAt,
      finishedAt: active.finishedAt,
      response: active.response,
    };
  }

  cancelValidation(requestId: string): boolean {
    const active = this.active.get(requestId);
    if (!active) return false;
    if (active.workflow.isTerminal()) return false;
    active.context.cancelled = true;
    active.workflow.force("CANCELLED");
    active.finishedAt = new Date().toISOString();
    return true;
  }

  getMetrics() {
    return this.metrics.getMetrics();
  }

  getAuditLog(requestId?: string) {
    return this.audit.getLog(requestId);
  }

  resetOperationalState(): void {
    this.cache.clear();
    this.metrics.reset();
    this.audit.reset();
    this.active.clear();
    this.queue.length = 0;
  }

  private async enqueueAndRun(
    request: ValidationRequest
  ): Promise<ValidationResponse> {
    const workflow = new ValidationWorkflow();
    workflow.transition("QUEUED");
    const context = new ValidationContext(request);
    const execution: ActiveExecution = {
      workflow,
      context,
      startedAt: new Date().toISOString(),
      priority: request.priority,
    };
    this.active.set(request.requestId, execution);

    // Priority insert into queue
    this.queue.push(request.requestId);
    this.queue.sort((a, b) => {
      const ea = this.active.get(a);
      const eb = this.active.get(b);
      return (
        (this.config.priorityWeights[eb?.priority ?? "NORMAL"] ?? 0) -
        (this.config.priorityWeights[ea?.priority ?? "NORMAL"] ?? 0)
      );
    });

    // Process head of queue (cooperative — current request runs if first or CRITICAL)
    try {
      return await this.runExecution(request.requestId);
    } catch (err) {
      // Never crash the application
      const message = err instanceof Error ? err.message : String(err);
      const response = this.buildResponse(context, workflow, {
        forceStatus: "FAILED",
        extraErrors: [`Orchestrator failure: ${message}`],
      });
      execution.response = response;
      execution.finishedAt = new Date().toISOString();
      workflow.force("FAILED");
      this.recordMetrics(request, response, workflow.getState());
      return response;
    } finally {
      const idx = this.queue.indexOf(request.requestId);
      if (idx >= 0) this.queue.splice(idx, 1);
    }
  }

  private async runExecution(requestId: string): Promise<ValidationResponse> {
    const execution = this.active.get(requestId);
    if (!execution) {
      throw new Error(`Unknown execution: ${requestId}`);
    }
    const { workflow, context } = execution;
    const request = context.request;

    if (context.cancelled) {
      workflow.force("CANCELLED");
      const response = this.buildResponse(context, workflow);
      execution.response = response;
      execution.finishedAt = new Date().toISOString();
      this.recordMetrics(request, response, "CANCELLED");
      return response;
    }

    workflow.transition("RUNNING");
    const plan = this.router.route(request);
    const pipelineStarted = Date.now();

    safePublishEvent({
      eventType: "ValidationStarted",
      module: "orchestrator",
      validationId: request.requestId,
      entityId: request.objectId ?? request.context.stock,
      correlationId: request.requestId,
      payload: {
        kind: request.kind,
        pipeline: plan.pipelineId,
        engines: plan.engines,
      },
      source: "orchestrator",
    });
    if (plan.pipelineId) {
      safePublishEvent({
        eventType: "PipelineStarted",
        module: "orchestrator",
        validationId: request.requestId,
        payload: { pipeline: plan.pipelineId, engines: plan.engines },
        source: "orchestrator",
      });
    }

    await this.dispatcher.executePlan(context, plan);

    if (context.cancelled) {
      workflow.force("CANCELLED");
    } else if (context.trace.some((t) => t.status === "TIMEOUT")) {
      workflow.force("TIMED_OUT");
    } else if (
      context.errors.length > 0 &&
      context.trace.every(
        (t) => t.status === "ERROR" || t.status === "FAILED" || t.status === "TIMEOUT"
      )
    ) {
      workflow.force("FAILED");
    } else {
      workflow.transition("COMPLETED");
    }

    const response = this.buildResponse(context, workflow);
    execution.response = response;
    execution.finishedAt = new Date().toISOString();

    const terminalType =
      workflow.getState() === "CANCELLED"
        ? "ValidationCancelled"
        : workflow.getState() === "FAILED" || workflow.getState() === "TIMED_OUT"
          ? "ValidationFailed"
          : "ValidationCompleted";
    safePublishEvent({
      eventType: terminalType,
      module: "orchestrator",
      validationId: request.requestId,
      entityId: request.objectId ?? request.context.stock,
      correlationId: request.requestId,
      payload: {
        status: response.validationStatus,
        overallValidationScore: response.overallValidationScore,
        trustScore: response.trustScore,
      },
      executionTimeMs: response.executionTime,
      source: "orchestrator",
      severity:
        terminalType === "ValidationFailed"
          ? "ERROR"
          : terminalType === "ValidationCancelled"
            ? "WARNING"
            : "INFO",
    });
    if (plan.pipelineId) {
      safePublishEvent({
        eventType:
          terminalType === "ValidationFailed"
            ? "PipelineFailed"
            : "PipelineCompleted",
        module: "orchestrator",
        validationId: request.requestId,
        payload: { pipeline: plan.pipelineId, status: response.validationStatus },
        source: "orchestrator",
      });
    }

    this.audit.append({
      requestId: request.requestId,
      timestamp: new Date().toISOString(),
      pipeline: plan.pipelineId,
      modulesExecuted: plan.engines,
      scores: { ...response.scores },
      warnings: response.warnings,
      errors: response.errors,
      executionTimeMs: response.executionTime,
      engineVersions: Object.fromEntries(
        plan.engines.map((id) => [
          id,
          getValidationEngine(id)?.version ?? this.config.engineVersion,
        ])
      ),
      validationStatus: response.validationStatus,
      workflowState: workflow.getState(),
      engineVersion: this.config.engineVersion,
    });

    this.recordMetrics(request, response, workflow.getState(), {
      pipelineId: plan.pipelineId,
      pipelineTimeMs: Date.now() - pipelineStarted,
    });

    return response;
  }

  private buildResponse(
    ctx: ValidationContext,
    workflow: ValidationWorkflow,
    opts?: { forceStatus?: ValidationStatus; extraErrors?: string[] }
  ): ValidationResponse {
    const errors = [...ctx.errors, ...(opts?.extraErrors ?? [])];
    const warnings = [...ctx.warnings];

    const scoreValues = [
      ctx.scores.integrityScore,
      ctx.scores.trustScore,
      ctx.scores.hallucinationScore,
      ctx.scores.historicalScore,
      ctx.scores.recommendationQuality,
      ctx.scores.tradeQuality,
    ].filter((s): s is number => typeof s === "number" && s > 0);

    const overall =
      scoreValues.length === 0
        ? averageTraceScores(ctx)
        : round2(
            scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length
          );
    ctx.scores.overallValidationScore = overall;

    let validationStatus: ValidationStatus =
      opts?.forceStatus ??
      deriveStatus(workflow.getState(), overall, errors, warnings, ctx);

    if (this.config.strictMode && errors.length > 0) {
      validationStatus = "REJECTED";
    }

    return {
      requestId: ctx.request.requestId,
      validationStatus,
      integrityScore: ctx.scores.integrityScore ?? 0,
      trustScore: ctx.scores.trustScore ?? 0,
      hallucinationScore: ctx.scores.hallucinationScore ?? 0,
      historicalScore: ctx.scores.historicalScore ?? 0,
      recommendationQuality: ctx.scores.recommendationQuality ?? 0,
      tradeQuality: ctx.scores.tradeQuality ?? 0,
      overallValidationScore: overall,
      warnings,
      errors,
      executionTime: ctx.elapsed(),
      validationTrace: [...ctx.trace],
      workflowState: workflow.getState(),
      enginesExecuted: [...ctx.results.keys()],
      scores: { ...ctx.scores },
      engineVersion: this.config.engineVersion,
      cached: ctx.trace.some((t) => t.cached),
      timestamp: new Date().toISOString(),
    };
  }

  private recordMetrics(
    request: ValidationRequest,
    response: ValidationResponse,
    state: WorkflowState,
    extra?: { pipelineId?: string; pipelineTimeMs?: number }
  ): void {
    const cacheStats = this.cache.getStats();
    const outcome =
      state === "COMPLETED"
        ? "COMPLETED"
        : state === "CANCELLED"
          ? "CANCELLED"
          : state === "TIMED_OUT"
            ? "TIMED_OUT"
            : "FAILED";
    this.metrics.recordRequest({
      executionTimeMs: response.executionTime,
      pipelineTimeMs: extra?.pipelineTimeMs,
      pipelineId: extra?.pipelineId ?? request.pipeline,
      engines: response.enginesExecuted,
      outcome,
      cacheHitRatio: cacheStats.hitRatio,
      cacheMissRatio: cacheStats.missRatio,
    });
  }
}

function deriveStatus(
  state: WorkflowState,
  overall: number,
  errors: string[],
  warnings: string[],
  ctx: ValidationContext
): ValidationStatus {
  if (state === "CANCELLED") return "CANCELLED";
  if (state === "TIMED_OUT") return "TIMED_OUT";
  if (state === "FAILED") return "FAILED";

  const hasFailures = ctx.trace.some(
    (t) => t.status === "FAILED" || t.status === "ERROR"
  );
  const hasPasses = ctx.trace.some(
    (t) => t.status === "PASSED" || t.status === "CACHED"
  );

  if (hasFailures && hasPasses) return "PARTIAL";
  if (errors.length > 0 && !hasPasses) return "FAILED";
  if (overall < 70) return "REJECTED";
  if (warnings.length > 0 || overall < 85) return "WARNING";
  return "APPROVED";
}

function averageTraceScores(ctx: ValidationContext): number {
  const scores = ctx.trace
    .filter((t) => !t.cached || (t.score ?? 0) > 0)
    .map((t) => t.score ?? 0)
    .filter((s) => s > 0);
  if (scores.length === 0) return 0;
  return round2(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function scoreFromRulesResult(result: {
  failedRules: string[];
  passedRules: string[];
  results?: Array<{ scoreImpact?: number }>;
}): number {
  const total = result.passedRules.length + result.failedRules.length;
  if (total === 0) return 100;
  const impact =
    result.results?.reduce((a, r) => a + (r.scoreImpact ?? 0), 0) ??
    result.failedRules.length * 10;
  return Math.max(0, Math.min(100, 100 - impact));
}

function okResult(
  engineId: ValidationEngineId,
  score: number,
  started: number,
  extras?: Partial<EngineRunResult>
): EngineRunResult {
  const errors = extras?.errors ?? [];
  const ok =
    extras?.ok !== undefined
      ? extras.ok
      : score >= 70 && errors.length === 0;
  return {
    engineId,
    ok,
    score: round2(score),
    warnings: extras?.warnings ?? [],
    errors,
    executionTimeMs: Date.now() - started,
    cached: false,
    attempt: 1,
    raw: extras?.raw,
  };
}

/** Connect existing engines to the orchestrator without changing their internals. */
export function buildBuiltinValidationEngines(): ValidationEngineDefinition[] {
  return [
    {
      id: "dataIntegrity",
      name: "Data Integrity Engine",
      version: "1.0.0",
      tags: ["core", "integrity"],
      handler: async (ctx) => {
        const started = Date.now();
        try {
          const { validate } = await import("../DataIntegrityEngine");
          const result = await validate({
            data: ctx.request.data,
            datasetType: (ctx.request.datasetType as DatasetType) ?? "STOCK_QUOTE",
            dataSource: ctx.request.dataSource ?? "orchestrator",
            metadata: ctx.request.context.metadata,
          });
          return okResult("dataIntegrity", result.integrityScore, started, {
            warnings: result.warnings.map((w) => w.message),
            errors: result.errors.map((e) => e.message),
            raw: result,
            ok: result.status !== "REJECTED",
          });
        } catch (err) {
          return {
            engineId: "dataIntegrity",
            ok: false,
            score: 0,
            warnings: [],
            errors: [err instanceof Error ? err.message : String(err)],
            executionTimeMs: Date.now() - started,
            cached: false,
            attempt: 1,
          };
        }
      },
    },
    {
      id: "market",
      name: "Market Validation",
      version: "9F.3.0",
      tags: ["market"],
      handler: async (ctx) => {
        const started = Date.now();
        try {
          const { validateMarketData } = await import("../rules/market");
          const result = await validateMarketData(ctx.request.data, {
            datasetType: ctx.request.datasetType as DatasetType | undefined,
            dataSource: ctx.request.dataSource,
            metadata: ctx.request.context.metadata,
          });
          const score = scoreFromRulesResult(result);
          return okResult("market", score, started, {
            warnings: result.failedRules.length
              ? [`Failed rules: ${result.failedRules.join(", ")}`]
              : [],
            errors: [],
            raw: result,
            ok: result.failedRules.length === 0,
          });
        } catch (err) {
          return failResult("market", started, err);
        }
      },
    },
    {
      id: "technical",
      name: "Technical Validation",
      version: "9F.4.0",
      tags: ["technical"],
      handler: async (ctx) => {
        const started = Date.now();
        try {
          const { validateTechnicalIndicators } = await import(
            "../rules/technical"
          );
          const result = await validateTechnicalIndicators(ctx.request.data, {
            metadata: ctx.request.context.metadata,
          });
          const score = scoreFromRulesResult(result);
          return okResult("technical", score, started, {
            raw: result,
            ok: result.failedRules.length === 0,
          });
        } catch (err) {
          return failResult("technical", started, err);
        }
      },
    },
    {
      id: "fundamental",
      name: "Fundamental Validation",
      version: "9F.5.0",
      tags: ["fundamental"],
      handler: async (ctx) => {
        const started = Date.now();
        try {
          const { validateFundamentals } = await import(
            "../rules/fundamental"
          );
          const result = await validateFundamentals(ctx.request.data, {
            metadata: ctx.request.context.metadata,
          });
          const score = scoreFromRulesResult(result);
          return okResult("fundamental", score, started, {
            raw: result,
            ok: result.failedRules.length === 0,
          });
        } catch (err) {
          return failResult("fundamental", started, err);
        }
      },
    },
    {
      id: "recommendation",
      name: "Recommendation Validation",
      version: "9F.6.0",
      tags: ["recommendation", "ai"],
      handler: async (ctx) => {
        const started = Date.now();
        try {
          const {
            validateRecommendation,
            calculateRecommendationQualityScore,
          } = await import("../rules/recommendation");
          const result = await validateRecommendation(ctx.request.data, {
            metadata: ctx.request.context.metadata,
          });
          const quality = calculateRecommendationQualityScore(ctx.request.data);
          return okResult("recommendation", quality.score, started, {
            raw: result,
            ok: !quality.rejected && result.failedRules.length === 0,
            warnings: quality.rejected
              ? ["Recommendation quality below threshold"]
              : [],
          });
        } catch (err) {
          return failResult("recommendation", started, err);
        }
      },
    },
    {
      id: "tradeSetup",
      name: "Trade Setup Validation",
      version: "9F.7.0",
      tags: ["trade"],
      handler: async (ctx) => {
        const started = Date.now();
        try {
          const { validateTradeSetup, calculateTradeSetupQuality } =
            await import("../rules/tradeSetup");
          const result = await validateTradeSetup(ctx.request.data, {
            metadata: ctx.request.context.metadata,
          });
          const quality = calculateTradeSetupQuality(ctx.request.data);
          return okResult("tradeSetup", quality.score, started, {
            raw: result,
            ok: !quality.rejected && result.failedRules.length === 0,
          });
        } catch (err) {
          return failResult("tradeSetup", started, err);
        }
      },
    },
    {
      id: "hallucination",
      name: "Hallucination Detection",
      version: "9F.8.0",
      tags: ["ai", "hallucination"],
      handler: async (ctx) => {
        const started = Date.now();
        try {
          const { validateAIOutput, calculateHallucinationScore } =
            await import("../rules/hallucination");
          const result = await validateAIOutput(ctx.request.data, {
            metadata: ctx.request.context.metadata,
          });
          const score = calculateHallucinationScore(ctx.request.data);
          return okResult("hallucination", score.score, started, {
            raw: result,
            ok: !score.rejected,
          });
        } catch (err) {
          return failResult("hallucination", started, err);
        }
      },
    },
    {
      id: "historical",
      name: "Historical Performance",
      version: "9F.9.0",
      tags: ["historical"],
      handler: async (ctx) => {
        const started = Date.now();
        try {
          const { validateHistoricalPerformance, calculateHistoricalScore } =
            await import("../rules/historical");
          const result = await validateHistoricalPerformance(ctx.request.data, {
            metadata: ctx.request.context.metadata,
          });
          const score = calculateHistoricalScore(ctx.request.data);
          return okResult("historical", score.score, started, {
            raw: result,
            ok: !score.rejected,
          });
        } catch (err) {
          return failResult("historical", started, err);
        }
      },
    },
    {
      id: "trust",
      name: "Trust Engine",
      version: "9F.10.0",
      tags: ["trust"],
      dependsOn: [],
      handler: async (ctx) => {
        const started = Date.now();
        try {
          const { calculateTrustScore } = await import("../trust");
          const moduleScores: Record<string, number> = {};
          for (const [id, result] of ctx.results) {
            if (!result.skipped) moduleScores[mapTrustModuleId(id)] = result.score;
          }
          // Also accept nested moduleScores on payload
          const trust = calculateTrustScore({
            objectId:
              ctx.request.objectId ??
              ctx.request.context.stock ??
              ctx.request.requestId,
            objectType: ctx.request.kind,
            payload: ctx.request.data,
            moduleScores: {
              dataIntegrity: moduleScores.dataIntegrity ?? ctx.scores.integrityScore,
              marketValidation: moduleScores.marketValidation ?? ctx.getScore("market"),
              technicalValidation:
                moduleScores.technicalValidation ?? ctx.getScore("technical"),
              fundamentalValidation:
                moduleScores.fundamentalValidation ??
                ctx.getScore("fundamental"),
              recommendationValidation:
                moduleScores.recommendationValidation ??
                ctx.getScore("recommendation"),
              tradeSetupValidation:
                moduleScores.tradeSetupValidation ??
                ctx.getScore("tradeSetup"),
              hallucinationDetection:
                moduleScores.hallucinationDetection ??
                ctx.getScore("hallucination"),
              historicalPerformance:
                moduleScores.historicalPerformance ??
                ctx.getScore("historical"),
            },
            warnings: ctx.warnings,
            failedRules: ctx.errors,
          });
          return okResult("trust", trust.trustScore, started, {
            raw: trust,
            ok: !trust.rejected,
            warnings: trust.warnings,
          });
        } catch (err) {
          return failResult("trust", started, err);
        }
      },
    },
    {
      id: "dashboard",
      name: "Validation Dashboard",
      version: "9F.11.0",
      tags: ["dashboard", "monitoring"],
      handler: async (ctx) => {
        const started = Date.now();
        try {
          const { getDashboardSummary } = await import("../dashboard");
          const summary = getDashboardSummary();
          return okResult(
            "dashboard",
            summary.health.overallHealthScore,
            started,
            { raw: summary, ok: true }
          );
        } catch (err) {
          return failResult("dashboard", started, err);
        }
      },
    },
  ];
}

function mapTrustModuleId(engineId: ValidationEngineId): string {
  const map: Record<string, string> = {
    dataIntegrity: "dataIntegrity",
    market: "marketValidation",
    technical: "technicalValidation",
    fundamental: "fundamentalValidation",
    recommendation: "recommendationValidation",
    tradeSetup: "tradeSetupValidation",
    hallucination: "hallucinationDetection",
    historical: "historicalPerformance",
  };
  return map[engineId] ?? engineId;
}

function failResult(
  engineId: ValidationEngineId,
  started: number,
  err: unknown
): EngineRunResult {
  return {
    engineId,
    ok: false,
    score: 0,
    warnings: [],
    errors: [err instanceof Error ? err.message : String(err)],
    executionTimeMs: Date.now() - started,
    cached: false,
    attempt: 1,
  };
}

export function registerBuiltinValidationEngines(options?: {
  force?: boolean;
}): { registered: number; skipped: number; total: number } {
  if (areBuiltinValidationEnginesRegistered() && !options?.force) {
    return {
      registered: 0,
      skipped: getRegisteredValidationEngines().length,
      total: getRegisteredValidationEngines().length,
    };
  }

  // Ensure underlying engines are registered (idempotent, no internal changes)
  try {
    registerMarketRules();
  } catch {
    /* optional in test isolation */
  }
  try {
    registerTechnicalRules();
  } catch {
    /* optional */
  }
  try {
    registerFundamentalRules();
  } catch {
    /* optional */
  }
  try {
    registerRecommendationRules();
  } catch {
    /* optional */
  }
  try {
    registerTradeSetupRules();
  } catch {
    /* optional */
  }
  try {
    registerHallucinationRules();
  } catch {
    /* optional */
  }
  try {
    registerHistoricalRules();
  } catch {
    /* optional */
  }
  try {
    registerTrustEngine();
  } catch {
    /* optional */
  }
  try {
    registerDashboardService({ startBackgroundRefresh: false });
  } catch {
    /* optional */
  }

  let added = 0;
  let skipped = 0;
  for (const def of buildBuiltinValidationEngines()) {
    const result = registerValidationEngine(def, options);
    if (result.registered) added += 1;
    else skipped += 1;
  }
  markBuiltinValidationEnginesRegistered();
  return {
    registered: added,
    skipped,
    total: getRegisteredValidationEngines().length,
  };
}

export interface OrchestratorRegistrationResult {
  registered: boolean;
  skipped: boolean;
  enginesRegistered: number;
}

/** Idempotent orchestrator startup registration. */
export function registerValidationOrchestrator(options?: {
  orchestrator?: ValidationOrchestrator;
  config?: ValidationConfigurationInput;
  force?: boolean;
}): OrchestratorRegistrationResult {
  if (orchestratorRegistered && !options?.force) {
    return {
      registered: false,
      skipped: true,
      enginesRegistered: getRegisteredValidationEngines().length,
    };
  }

  const engines = registerBuiltinValidationEngines({ force: options?.force });
  if (options?.orchestrator) {
    defaultOrchestrator = options.orchestrator;
  } else if (!defaultOrchestrator || options?.config || options?.force) {
    defaultOrchestrator = new ValidationOrchestrator(options?.config);
  }

  orchestratorRegistered = true;
  return {
    registered: true,
    skipped: false,
    enginesRegistered: engines.total,
  };
}

export function getValidationOrchestrator(
  options?: ValidationConfigurationInput
): ValidationOrchestrator {
  if (!defaultOrchestrator || options) {
    defaultOrchestrator = new ValidationOrchestrator(options);
    registerBuiltinValidationEngines();
  }
  return defaultOrchestrator;
}

export function resetValidationOrchestrator(): void {
  if (defaultOrchestrator) {
    defaultOrchestrator.resetOperationalState();
  }
  defaultOrchestrator = null;
  orchestratorRegistered = false;
  resetValidationEngineRegistrationState();
}

/** Public API convenience wrappers. */
export async function validate(
  input: ValidationRequestInput
): Promise<ValidationResponse> {
  registerValidationOrchestrator();
  return getValidationOrchestrator().validate(input);
}

export async function validateBatch(
  inputs: ValidationRequestInput[]
): Promise<ValidationResponse[]> {
  registerValidationOrchestrator();
  return getValidationOrchestrator().validateBatch(inputs);
}

export async function validateResearch(
  data: unknown,
  options?: Partial<ValidationRequestInput>
): Promise<ValidationResponse> {
  registerValidationOrchestrator();
  return getValidationOrchestrator().validateResearch(data, options);
}

export async function validateRecommendation(
  data: unknown,
  options?: Partial<ValidationRequestInput>
): Promise<ValidationResponse> {
  registerValidationOrchestrator();
  return getValidationOrchestrator().validateRecommendation(data, options);
}

export async function validateTrade(
  data: unknown,
  options?: Partial<ValidationRequestInput>
): Promise<ValidationResponse> {
  registerValidationOrchestrator();
  return getValidationOrchestrator().validateTrade(data, options);
}

export async function validatePortfolio(
  data: unknown,
  options?: Partial<ValidationRequestInput>
): Promise<ValidationResponse> {
  registerValidationOrchestrator();
  return getValidationOrchestrator().validatePortfolio(data, options);
}

export async function executePipeline(
  pipelineId: ValidationPipelineId,
  data: unknown,
  options?: Partial<ValidationRequestInput>
): Promise<ValidationResponse> {
  registerValidationOrchestrator();
  return getValidationOrchestrator().executePipeline(
    pipelineId,
    data,
    options
  );
}

export function getExecutionStatus(
  requestId: string
): ExecutionStatus | null {
  return getValidationOrchestrator().getExecutionStatus(requestId);
}

export function cancelValidation(requestId: string): boolean {
  return getValidationOrchestrator().cancelValidation(requestId);
}

export {
  DEFAULT_VALIDATION_CONFIGURATION,
  resolveValidationConfiguration,
  registerValidationEngine,
};

export type { ValidationRequestKind };
