/**
 * Advanced Rule Engine — institutional rule execution framework.
 *
 * Public APIs:
 *   executeRules()
 *   registerRule() / registerRules()
 *   removeRule()
 *   enableRule() / disableRule()
 *   updateRule()
 *   findRule() / listRules()
 *   getRuleMetrics()
 *   getAuditHistory()
 */

import { IntegrityConfig } from "../IntegrityConfig";
import type { ValidationContext } from "../IntegrityTypes";
import { FunctionalRule } from "./BaseRule";
import { RuleAuditLogger } from "./RuleAuditLogger";
import { RuleCache } from "./RuleCache";
import {
  CircularDependencyError,
  MissingDependencyError,
  RuleDependencyResolver,
} from "./RuleDependencyResolver";
import { RuleExecutor } from "./RuleExecutor";
import { RuleFactory } from "./RuleFactory";
import { RulePerformanceTracker } from "./RulePerformanceTracker";
import { RuleScheduler } from "./RuleScheduler";
import type {
  AdvancedRuleDefinition,
  CreateRuleInput,
  ExecuteRulesRequest,
  ExecuteRulesResult,
  RuleAuditEntry,
  RuleEngineEvent,
  RuleEngineEventListener,
  RuleExecutionResult,
  RulePerformanceSnapshot,
} from "./RuleTypes";
import { DEFAULT_CACHE_TTL_MS } from "./RuleTypes";
import { RuleVersionManager } from "./RuleVersionManager";

export interface RuleEngineOptions {
  cacheTtlMs?: number;
  auditLimit?: number;
}

export class RuleEngine {
  private readonly rules = new Map<string, AdvancedRuleDefinition>();
  private readonly resolver = new RuleDependencyResolver();
  private readonly scheduler = new RuleScheduler();
  private readonly cache: RuleCache;
  private readonly executor: RuleExecutor;
  private readonly versions = new RuleVersionManager();
  private readonly audit: RuleAuditLogger;
  private readonly performance = new RulePerformanceTracker();
  private readonly listeners = new Set<RuleEngineEventListener>();

  constructor(options?: RuleEngineOptions) {
    this.cache = new RuleCache(options?.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS);
    this.executor = new RuleExecutor(this.cache);
    this.audit = new RuleAuditLogger(options?.auditLimit);
  }

  // ─── Registration ───────────────────────────────────────────────

  registerRule(
    rule: AdvancedRuleDefinition | CreateRuleInput | FunctionalRule
  ): void {
    const definition = this.normalize(rule);
    if (!definition.id) {
      throw new Error("RuleEngine.registerRule: id is required");
    }
    this.rules.set(definition.id, { ...definition });
    this.versions.registerVersion(definition);
    this.cache.invalidate(definition.id);
  }

  registerRules(
    rules: Array<AdvancedRuleDefinition | CreateRuleInput | FunctionalRule>
  ): void {
    for (const rule of rules) {
      this.registerRule(rule);
    }
  }

  removeRule(ruleId: string): boolean {
    const removed = this.rules.delete(ruleId);
    if (removed) {
      this.cache.invalidate(ruleId);
    }
    return removed;
  }

  enableRule(ruleId: string): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;
    rule.enabled = true;
    rule.updatedAt = new Date().toISOString();
    return true;
  }

  disableRule(ruleId: string): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;
    rule.enabled = false;
    rule.updatedAt = new Date().toISOString();
    return true;
  }

  updateRule(
    ruleId: string,
    patch: Partial<
      Omit<AdvancedRuleDefinition, "id" | "createdAt" | "validate">
    > & { validate?: AdvancedRuleDefinition["validate"] }
  ): boolean {
    const existing = this.rules.get(ruleId);
    if (!existing) return false;

    const updated: AdvancedRuleDefinition = {
      ...existing,
      ...patch,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
      validate: patch.validate ?? existing.validate,
      dependencies: patch.dependencies
        ? [...patch.dependencies]
        : [...existing.dependencies],
      tags: patch.tags ? [...patch.tags] : [...existing.tags],
    };

    // Compatibility check when version changes
    if (patch.version && patch.version !== existing.version) {
      if (!this.versions.isCompatibleUpgrade(existing.version, patch.version)) {
        throw new Error(
          `Incompatible rule version upgrade for ${ruleId}: ${existing.version} -> ${patch.version}`
        );
      }
    }

    this.rules.set(ruleId, updated);
    this.versions.registerVersion(updated);
    this.cache.invalidate(ruleId);
    return true;
  }

  findRule(ruleId: string): AdvancedRuleDefinition | undefined {
    const rule = this.rules.get(ruleId);
    return rule ? this.clone(rule) : undefined;
  }

  listRules(filter?: {
    category?: AdvancedRuleDefinition["category"];
    enabled?: boolean;
    tag?: string;
  }): AdvancedRuleDefinition[] {
    let rules = Array.from(this.rules.values());
    if (filter?.category) {
      rules = rules.filter((r) => r.category === filter.category);
    }
    if (filter?.enabled !== undefined) {
      rules = rules.filter((r) => r.enabled === filter.enabled);
    }
    if (filter?.tag) {
      rules = rules.filter((r) => r.tags.includes(filter.tag!));
    }
    return rules.map((r) => this.clone(r));
  }

  // ─── Execution ──────────────────────────────────────────────────

  async executeRules(
    request: ExecuteRulesRequest
  ): Promise<ExecuteRulesResult> {
    const started = performance.now();
    const events: RuleEngineEvent[] = [];
    const results: RuleExecutionResult[] = [];
    let currentData = request.data;
    let terminatedEarly = false;

    const config = request.config ?? new IntegrityConfig({ loggingLevel: "silent" });
    const dataSource = request.dataSource ?? config.get().defaultDataSource;

    const selected = this.selectRules(request);
    let resolved: AdvancedRuleDefinition[];
    try {
      resolved = this.resolver.resolve(selected);
    } catch (err) {
      if (
        err instanceof CircularDependencyError ||
        err instanceof MissingDependencyError
      ) {
        return {
          results: [],
          passedRules: [],
          failedRules: [],
          skippedRules: [],
          timedOutRules: [],
          terminatedEarly: true,
          executionTime: elapsed(started),
          data: currentData,
          events: [
            this.emit("ValidationCompleted", events, {
              error: err.message,
            }),
          ],
        };
      }
      throw err;
    }

    const waves = this.scheduler.schedule(resolved);

    for (const wave of waves) {
      if (terminatedEarly) break;

      const ctxBase: Omit<ValidationContext, "data"> = {
        datasetType: request.datasetType,
        dataSource,
        config,
        metadata: request.metadata,
      };

      if (wave.mode === "PARALLEL" || wave.mode === "BATCH") {
        const settled = await Promise.all(
          wave.rules.map(async (rule) => {
            this.emit("RuleStarted", events, { ruleId: rule.id });
            const ctx: ValidationContext = { ...ctxBase, data: currentData };
            return this.executor.execute(rule, ctx, {
              useCache: request.useCache,
            });
          })
        );

        for (const result of settled) {
          this.consumeResult(result, results, events, {
            datasetType: request.datasetType,
            dataSource,
          });
          if (
            !result.passed &&
            !result.skipped &&
            this.rules.get(result.ruleId)?.ruleLevel === "CRITICAL"
          ) {
            terminatedEarly = true;
          }
          if (result.outcome?.data !== undefined) {
            currentData = result.outcome.data;
          }
        }
      } else if (wave.mode === "LAZY") {
        // Lazy: only run if no prior failures in this session.
        const hasFailure = results.some(
          (r) => !r.passed && !r.skipped && r.status !== "CACHED"
        );
        const rule = wave.rules[0];
        if (hasFailure) {
          const skipped: RuleExecutionResult = {
            ruleId: rule.id,
            ruleName: rule.name,
            status: "SKIPPED",
            passed: true,
            skipped: true,
            timedOut: false,
            fromCache: false,
            executionTime: 0,
            scoreImpact: 0,
            version: rule.version,
          };
          this.emit("RuleSkipped", events, { ruleId: rule.id });
          this.consumeResult(skipped, results, events, {
            datasetType: request.datasetType,
            dataSource,
          });
        } else {
          this.emit("RuleStarted", events, { ruleId: rule.id });
          const ctx: ValidationContext = { ...ctxBase, data: currentData };
          const result = await this.executor.execute(rule, ctx, {
            useCache: request.useCache,
          });
          this.consumeResult(result, results, events, {
            datasetType: request.datasetType,
            dataSource,
          });
          if (result.outcome?.data !== undefined) {
            currentData = result.outcome.data;
          }
          if (
            !result.passed &&
            !result.skipped &&
            rule.ruleLevel === "CRITICAL"
          ) {
            terminatedEarly = true;
          }
        }
      } else {
        // SEQUENTIAL + CONDITIONAL (condition handled inside executor)
        const rule = wave.rules[0];
        this.emit("RuleStarted", events, { ruleId: rule.id });
        const ctx: ValidationContext = { ...ctxBase, data: currentData };
        const result = await this.executor.execute(rule, ctx, {
          useCache: request.useCache,
        });
        this.consumeResult(result, results, events, {
          datasetType: request.datasetType,
          dataSource,
        });
        if (result.outcome?.data !== undefined) {
          currentData = result.outcome.data;
        }
        if (
          !result.passed &&
          !result.skipped &&
          rule.ruleLevel === "CRITICAL"
        ) {
          terminatedEarly = true;
        }
      }
    }

    this.emit("ValidationCompleted", events, {
      terminatedEarly,
      ruleCount: results.length,
    });

    return {
      results,
      passedRules: results
        .filter((r) => r.passed && !r.skipped)
        .map((r) => r.ruleId),
      failedRules: results
        .filter((r) => !r.passed && !r.skipped)
        .map((r) => r.ruleId),
      skippedRules: results.filter((r) => r.skipped).map((r) => r.ruleId),
      timedOutRules: results.filter((r) => r.timedOut).map((r) => r.ruleId),
      terminatedEarly,
      executionTime: elapsed(started),
      data: currentData,
      events,
    };
  }

  /**
   * Efficient batch execution across many datasets (10 → 10_000).
   * Uses bounded concurrency.
   */
  async executeRulesBatch(
    items: ExecuteRulesRequest[],
    options?: { concurrency?: number }
  ): Promise<ExecuteRulesResult[]> {
    if (items.length === 0) return [];
    const concurrency = Math.max(1, options?.concurrency ?? 16);
    const results: ExecuteRulesResult[] = new Array(items.length);
    let next = 0;

    const workers = Array.from(
      { length: Math.min(concurrency, items.length) },
      async () => {
        while (next < items.length) {
          const index = next;
          next += 1;
          try {
            results[index] = await this.executeRules(items[index]);
          } catch (err) {
            const message =
              err instanceof Error ? err.message : "Batch item failed";
            results[index] = {
              results: [],
              passedRules: [],
              failedRules: [],
              skippedRules: [],
              timedOutRules: [],
              terminatedEarly: true,
              executionTime: 0,
              data: items[index]?.data,
              events: [
                {
                  type: "ValidationCompleted",
                  timestamp: new Date().toISOString(),
                  payload: { error: message },
                },
              ],
            };
          }
        }
      }
    );

    await Promise.all(workers);
    return results;
  }

  // ─── Metrics / Audit / Events ───────────────────────────────────

  getRuleMetrics(ruleId?: string): RulePerformanceSnapshot[] {
    return this.performance.getRuleMetrics(ruleId);
  }

  getAggregateMetrics() {
    return this.performance.getAggregate();
  }

  getAuditHistory(limit?: number): RuleAuditEntry[] {
    return this.audit.getAuditHistory(limit);
  }

  getVersionHistory(ruleId: string) {
    return this.versions.getVersions(ruleId);
  }

  getCacheStats() {
    return this.cache.stats();
  }

  setCacheTtl(ttlMs: number): void {
    this.cache.setTtl(ttlMs);
  }

  clearCache(ruleId?: string): void {
    this.cache.invalidate(ruleId);
  }

  on(listener: RuleEngineEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  clear(): void {
    this.rules.clear();
    this.cache.invalidate();
    this.audit.clear();
    this.performance.reset();
    this.versions.clear();
  }

  size(): number {
    return this.rules.size;
  }

  // ─── Internals ──────────────────────────────────────────────────

  private selectRules(
    request: ExecuteRulesRequest
  ): AdvancedRuleDefinition[] {
    let rules = Array.from(this.rules.values()).filter((r) => r.enabled);

    if (request.ruleIds && request.ruleIds.length > 0) {
      const allowed = new Set(request.ruleIds);
      rules = rules.filter((r) => allowed.has(r.id));
    }

    rules = rules.filter(
      (r) =>
        !r.datasetTypes ||
        r.datasetTypes.length === 0 ||
        r.datasetTypes.includes(request.datasetType)
    );

    return rules.map((r) => this.clone(r));
  }

  private consumeResult(
    result: RuleExecutionResult,
    results: RuleExecutionResult[],
    events: RuleEngineEvent[],
    meta: { datasetType: ExecuteRulesRequest["datasetType"]; dataSource: string }
  ): void {
    results.push(result);
    this.performance.record(result);
    this.audit.record(result, meta);

    if (result.skipped) {
      this.emit("RuleSkipped", events, {
        ruleId: result.ruleId,
        status: result.status,
      });
    } else if (!result.passed) {
      this.emit("RuleFailed", events, {
        ruleId: result.ruleId,
        status: result.status,
        error: result.error,
      });
    } else {
      this.emit("RuleCompleted", events, {
        ruleId: result.ruleId,
        status: result.status,
        fromCache: result.fromCache,
      });
    }
  }

  private emit(
    type: RuleEngineEvent["type"],
    events: RuleEngineEvent[],
    payload?: Record<string, unknown> & { ruleId?: string }
  ): RuleEngineEvent {
    const event: RuleEngineEvent = {
      type,
      ruleId: payload?.ruleId,
      timestamp: new Date().toISOString(),
      payload,
    };
    events.push(event);
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Never let listener failures crash the engine.
      }
    }
    return event;
  }

  private normalize(
    rule: AdvancedRuleDefinition | CreateRuleInput | FunctionalRule
  ): AdvancedRuleDefinition {
    if (rule instanceof FunctionalRule) {
      return rule.toDefinition();
    }
    if ("validate" in rule && "priority" in rule && typeof rule.priority === "string") {
      // Likely already an AdvancedRuleDefinition (priority is a band string)
      if (
        "dependencies" in rule &&
        "executionMode" in rule &&
        "timeout" in rule
      ) {
        return { ...(rule as AdvancedRuleDefinition) };
      }
    }
    return RuleFactory.create(rule as CreateRuleInput);
  }

  private clone(rule: AdvancedRuleDefinition): AdvancedRuleDefinition {
    return {
      ...rule,
      dependencies: [...rule.dependencies],
      tags: [...rule.tags],
      datasetTypes: rule.datasetTypes ? [...rule.datasetTypes] : undefined,
    };
  }
}

function elapsed(started: number): number {
  return Math.round((performance.now() - started) * 100) / 100;
}
