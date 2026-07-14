/**
 * Institutional Data Integrity Engine — public façade.
 *
 * Public APIs:
 *   validate()
 *   validateBatch()
 *   calculateIntegrityScore()
 *   registerRule()
 *   getMetrics()
 *
 * Future Sprint 9F modules must consume these APIs.
 * This engine does not modify existing EquityOS business logic.
 */

import { IntegrityConfig } from "./IntegrityConfig";
import type { IntegrityConfigSnapshot } from "./IntegrityConfig";
import {
  INTEGRITY_ENGINE_VERSION,
  INTEGRITY_SCORE_THRESHOLD,
} from "./IntegrityConstants";
import { IntegrityLogger } from "./IntegrityLogger";
import { IntegrityMetrics } from "./IntegrityMetrics";
import {
  buildIntegrityResult,
  calculateIntegrityScore as scoreFromIssues,
  createIssue,
} from "./IntegrityResult";
import { IntegrityRuleRegistry } from "./IntegrityRuleRegistry";
import type {
  DataIntegrityEngineOptions,
  IntegrityIssue,
  IntegrityMetricsSnapshot,
  IntegrityResult,
  IntegrityRule,
  ValidateBatchRequest,
  ValidateRequest,
} from "./IntegrityTypes";
import {
  ValidationPipeline,
  createBuiltInRules,
} from "./ValidationPipeline";

export class DataIntegrityEngine {
  private readonly config: IntegrityConfig;
  private readonly registry: IntegrityRuleRegistry;
  private readonly logger: IntegrityLogger;
  private readonly metrics: IntegrityMetrics;
  private readonly pipeline: ValidationPipeline;

  constructor(options?: DataIntegrityEngineOptions) {
    this.config = new IntegrityConfig(options?.config);
    this.registry = new IntegrityRuleRegistry();
    this.logger = new IntegrityLogger({
      level: this.config.get().loggingLevel,
    });
    this.metrics = new IntegrityMetrics();
    this.pipeline = new ValidationPipeline();

    if (options?.registerBuiltInRules !== false) {
      for (const rule of createBuiltInRules()) {
        this.registry.registerRule(rule);
      }
    }
  }

  /**
   * Validate a single dataset through the full integrity pipeline.
   * Never throws — always returns a structured IntegrityResult.
   */
  async validate(request: ValidateRequest): Promise<IntegrityResult> {
    try {
      const cfg = this.config.withOverrides(request.configOverrides);
      this.logger.setLevel(cfg.get().loggingLevel);

      const result = await this.pipeline.run({
        data: request.data,
        datasetType: request.datasetType,
        dataSource:
          request.dataSource ?? cfg.get().defaultDataSource,
        config: cfg,
        metadata: request.metadata,
        registry: this.registry,
        logger: this.logger,
      });

      this.metrics.record(result);
      return result;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown validation failure";
      this.logger.error("validate() caught unexpected error", { error: message });

      const result = buildIntegrityResult({
        datasetType: request.datasetType,
        dataSource: request.dataSource ?? this.config.get().defaultDataSource,
        data: request.data,
        errors: [
          createIssue(
            "engine.internal",
            "Engine Internal Error",
            "SCHEMA",
            "CRITICAL",
            `Validation failed safely: ${message}`
          ),
        ],
        warnings: [],
        passedRules: [],
        failedRules: ["engine.internal"],
        executionTime: 0,
        terminatedEarly: true,
        scoreThreshold: this.config.get().scoreThreshold,
      });
      this.metrics.record(result);
      return result;
    }
  }

  /**
   * Validate multiple datasets. Runs in parallel by default (bounded concurrency).
   */
  async validateBatch(
    request: ValidateBatchRequest
  ): Promise<IntegrityResult[]> {
    const items = request.items ?? [];
    if (items.length === 0) return [];

    const parallel = request.parallel !== false;
    if (!parallel) {
      const results: IntegrityResult[] = [];
      for (const item of items) {
        results.push(await this.validate(item));
      }
      return results;
    }

    const concurrency = Math.max(
      1,
      this.config.get().batchConcurrency
    );
    const results: IntegrityResult[] = new Array(items.length);
    let nextIndex = 0;

    const workers = Array.from(
      { length: Math.min(concurrency, items.length) },
      async () => {
        while (nextIndex < items.length) {
          const index = nextIndex;
          nextIndex += 1;
          results[index] = await this.validate(items[index]);
        }
      }
    );

    await Promise.all(workers);
    return results;
  }

  /**
   * Calculate an integrity score from a list of issues (0–100).
   * Also available for callers that already have issue lists.
   */
  calculateIntegrityScore(issues: IntegrityIssue[]): number {
    return scoreFromIssues(issues);
  }

  /** Register a custom rule dynamically. */
  registerRule(rule: IntegrityRule): void {
    this.registry.registerRule(rule);
  }

  /** Unregister a rule by ID. */
  unregisterRule(ruleId: string): boolean {
    return this.registry.unregisterRule(ruleId);
  }

  /** Enable a rule via configuration override. */
  enableRule(ruleId: string): void {
    this.config.enableRule(ruleId);
  }

  /** Disable a rule via configuration override. */
  disableRule(ruleId: string): void {
    this.config.disableRule(ruleId);
  }

  /** Expose metrics for future dashboard integration. */
  getMetrics(): IntegrityMetricsSnapshot {
    return this.metrics.getMetrics();
  }

  /** Reset accumulated metrics. */
  resetMetrics(): void {
    this.metrics.reset();
  }

  /** Current configuration snapshot. */
  getConfig(): IntegrityConfigSnapshot {
    return this.config.get();
  }

  /** Update configuration. */
  updateConfig(overrides: Partial<IntegrityConfigSnapshot>): void {
    this.config.update(overrides);
    this.logger.setLevel(this.config.get().loggingLevel);
  }

  /** Inspect registered rules. */
  getRules(): IntegrityRule[] {
    return this.registry.getAllRules();
  }

  /** Access logger (for tests / advanced integration). */
  getLogger(): IntegrityLogger {
    return this.logger;
  }

  get version(): string {
    return INTEGRITY_ENGINE_VERSION;
  }

  get scoreThreshold(): number {
    return this.config.get().scoreThreshold ?? INTEGRITY_SCORE_THRESHOLD;
  }
}

/** Singleton default engine instance for Sprint 9F consumers. */
let defaultEngine: DataIntegrityEngine | null = null;

export function getDataIntegrityEngine(
  options?: DataIntegrityEngineOptions
): DataIntegrityEngine {
  if (!defaultEngine || options) {
    defaultEngine = new DataIntegrityEngine(options);
  }
  return defaultEngine;
}

export function resetDataIntegrityEngine(): void {
  defaultEngine = null;
}

/** Convenience wrappers matching the public API contract. */
export async function validate(
  request: ValidateRequest
): Promise<IntegrityResult> {
  return getDataIntegrityEngine().validate(request);
}

export async function validateBatch(
  request: ValidateBatchRequest
): Promise<IntegrityResult[]> {
  return getDataIntegrityEngine().validateBatch(request);
}

export function calculateIntegrityScore(issues: IntegrityIssue[]): number {
  return getDataIntegrityEngine().calculateIntegrityScore(issues);
}

export function registerRule(rule: IntegrityRule): void {
  getDataIntegrityEngine().registerRule(rule);
}

export function getMetrics(): IntegrityMetricsSnapshot {
  return getDataIntegrityEngine().getMetrics();
}
