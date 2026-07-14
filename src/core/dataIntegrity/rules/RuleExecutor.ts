/**
 * Advanced Rule Engine — single-rule executor with timeout + cache.
 */

import { SEVERITY_SCORE_PENALTY } from "../IntegrityConstants";
import type { ValidationContext } from "../IntegrityTypes";
import type { RuleCache } from "./RuleCache";
import type { AdvancedRuleDefinition, RuleExecutionResult } from "./RuleTypes";

export class RuleExecutor {
  constructor(private readonly cache: RuleCache) {}

  async execute(
    rule: AdvancedRuleDefinition,
    ctx: ValidationContext,
    options?: { useCache?: boolean }
  ): Promise<RuleExecutionResult> {
    const started = performance.now();
    const useCache = options?.useCache !== false;

    try {
      if (rule.condition) {
        const allowed = await Promise.resolve(rule.condition(ctx));
        if (!allowed) {
          return this.result(rule, {
            status: "SKIPPED",
            passed: true,
            skipped: true,
            timedOut: false,
            fromCache: false,
            executionTime: elapsed(started),
            scoreImpact: 0,
          });
        }
      }

      if (useCache && rule.cacheKey) {
        const key = rule.cacheKey(ctx);
        if (key) {
          const cached = this.cache.get(rule.id, rule.version, key);
          if (cached) {
            return this.result(rule, {
              status: cached.passed ? "CACHED" : "FAILED",
              passed: cached.passed,
              skipped: false,
              timedOut: false,
              fromCache: true,
              executionTime: elapsed(started),
              outcome: cached,
              scoreImpact: cached.passed
                ? 0
                : SEVERITY_SCORE_PENALTY[rule.ruleLevel],
            });
          }
        }
      }

      const outcome = await this.withTimeout(
        Promise.resolve(rule.validate(ctx)),
        rule.timeout
      );

      if (useCache && rule.cacheKey) {
        const key = rule.cacheKey(ctx);
        if (key) {
          this.cache.set(rule.id, rule.version, key, outcome);
        }
      }

      return this.result(rule, {
        status: outcome.passed ? "PASSED" : "FAILED",
        passed: outcome.passed,
        skipped: false,
        timedOut: false,
        fromCache: false,
        executionTime: elapsed(started),
        outcome,
        scoreImpact: outcome.passed
          ? 0
          : SEVERITY_SCORE_PENALTY[rule.ruleLevel],
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const timedOut = message.includes("Rule timeout");
      return this.result(rule, {
        status: timedOut ? "TIMEOUT" : "ERROR",
        passed: false,
        skipped: false,
        timedOut,
        fromCache: false,
        executionTime: elapsed(started),
        error: message,
        scoreImpact: SEVERITY_SCORE_PENALTY[rule.ruleLevel],
      });
    }
  }

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      return promise;
    }
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Rule timeout after ${timeoutMs}ms`));
      }, timeoutMs);
      promise.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (err) => {
          clearTimeout(timer);
          reject(err);
        }
      );
    });
  }

  private result(
    rule: AdvancedRuleDefinition,
    partial: Omit<RuleExecutionResult, "ruleId" | "ruleName" | "version">
  ): RuleExecutionResult {
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      version: rule.version,
      ...partial,
    };
  }
}

function elapsed(started: number): number {
  return Math.round((performance.now() - started) * 100) / 100;
}
