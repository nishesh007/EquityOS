/**
 * Institutional Data Integrity Engine — public façade.
 *
 * Public APIs (Prompt 1):
 *   validate() / validateBatch() / calculateIntegrityScore() / registerRule() / getMetrics()
 *
 * Extended APIs (Prompt 9F.2):
 *   executeRules() / registerRules() / removeRule() / enableRule() / disableRule()
 *   getRuleMetrics() / getAuditHistory()
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
import { RuleEngine } from "./rules/RuleEngine";
import { RuleFactory } from "./rules/RuleFactory";
import type {
  AdvancedRuleDefinition,
  CreateRuleInput,
  ExecuteRulesRequest,
  ExecuteRulesResult,
  RuleAuditEntry,
  RulePerformanceSnapshot,
} from "./rules/RuleTypes";
import { FunctionalRule } from "./rules/BaseRule";

export class DataIntegrityEngine {
  private readonly config: IntegrityConfig;
  private readonly registry: IntegrityRuleRegistry;
  private readonly logger: IntegrityLogger;
  private readonly metrics: IntegrityMetrics;
  private readonly pipeline: ValidationPipeline;
  /** Prompt 9F.2 advanced rule execution framework (additive). */
  private readonly ruleEngine: RuleEngine;

  constructor(options?: DataIntegrityEngineOptions) {
    this.config = new IntegrityConfig(options?.config);
    this.registry = new IntegrityRuleRegistry();
    this.logger = new IntegrityLogger({
      level: this.config.get().loggingLevel,
    });
    this.metrics = new IntegrityMetrics();
    this.pipeline = new ValidationPipeline();
    this.ruleEngine = new RuleEngine();

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

  /** Register a custom Prompt 1 pipeline rule dynamically. */
  registerRule(rule: IntegrityRule): void {
    this.registry.registerRule(rule);
  }

  /** Unregister a Prompt 1 pipeline rule by ID. */
  unregisterRule(ruleId: string): boolean {
    return this.registry.unregisterRule(ruleId);
  }

  /**
   * Enable a rule via configuration override (pipeline)
   * and advanced RuleEngine when present.
   */
  enableRule(ruleId: string): void {
    this.config.enableRule(ruleId);
    this.ruleEngine.enableRule(ruleId);
  }

  /**
   * Disable a rule via configuration override (pipeline)
   * and advanced RuleEngine when present.
   */
  disableRule(ruleId: string): void {
    this.config.disableRule(ruleId);
    this.ruleEngine.disableRule(ruleId);
  }

  // ─── Prompt 9F.2 advanced rule APIs (additive) ─────────────────

  /** Execute advanced institutional rules (does not replace validate()). */
  async executeRules(
    request: ExecuteRulesRequest
  ): Promise<ExecuteRulesResult> {
    return this.ruleEngine.executeRules({
      ...request,
      config: request.config ?? this.config,
    });
  }

  /** Register one advanced rule (and optionally mirror into the pipeline). */
  registerAdvancedRule(
    rule: AdvancedRuleDefinition | CreateRuleInput | FunctionalRule,
    options?: { mirrorToPipeline?: boolean }
  ): void {
    this.ruleEngine.registerRule(rule);
    if (options?.mirrorToPipeline) {
      const definition =
        rule instanceof FunctionalRule
          ? rule.toDefinition()
          : "executionMode" in rule && "dependencies" in rule
            ? (rule as AdvancedRuleDefinition)
            : RuleFactory.create(rule as CreateRuleInput);
      this.registry.registerRule(RuleFactory.toIntegrityRule(definition));
    }
  }

  registerRules(
    rules: Array<AdvancedRuleDefinition | CreateRuleInput | FunctionalRule>,
    options?: { mirrorToPipeline?: boolean }
  ): void {
    for (const rule of rules) {
      this.registerAdvancedRule(rule, options);
    }
  }

  removeRule(ruleId: string): boolean {
    const advanced = this.ruleEngine.removeRule(ruleId);
    const pipeline = this.registry.unregisterRule(ruleId);
    return advanced || pipeline;
  }

  getRuleMetrics(ruleId?: string): RulePerformanceSnapshot[] {
    return this.ruleEngine.getRuleMetrics(ruleId);
  }

  getAuditHistory(limit?: number): RuleAuditEntry[] {
    return this.ruleEngine.getAuditHistory(limit);
  }

  /** Access the advanced RuleEngine for future Sprint 9F modules. */
  getRuleEngine(): RuleEngine {
    return this.ruleEngine;
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

/** Prompt 9F.2 convenience wrappers. */
export async function executeRules(
  request: ExecuteRulesRequest
): Promise<ExecuteRulesResult> {
  return getDataIntegrityEngine().executeRules(request);
}

export function registerRules(
  rules: Array<AdvancedRuleDefinition | CreateRuleInput | FunctionalRule>
): void {
  getDataIntegrityEngine().registerRules(rules);
}

export function removeRule(ruleId: string): boolean {
  return getDataIntegrityEngine().removeRule(ruleId);
}

export function getRuleMetrics(ruleId?: string): RulePerformanceSnapshot[] {
  return getDataIntegrityEngine().getRuleMetrics(ruleId);
}

export function getAuditHistory(limit?: number): RuleAuditEntry[] {
  return getDataIntegrityEngine().getAuditHistory(limit);
}
