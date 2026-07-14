/**
 * Dispatches work to registered validation engines with retry and timeout.
 * Never throws out of dispatch — failures become EngineRunResult errors.
 */

import type { ValidationConfiguration, ValidationEngineId } from "./ValidationConfiguration";
import type { ValidationContext, EngineRunResult } from "./ValidationContext";
import type { ValidationExecutionPlan } from "./ValidationExecutionPlan";
import { getValidationEngine } from "./ValidationRegistry";
import type { ValidationCache } from "./ValidationCache";

export class ValidationDispatcher {
  constructor(
    private readonly config: ValidationConfiguration,
    private readonly cache: ValidationCache
  ) {}

  async executePlan(
    ctx: ValidationContext,
    plan: ValidationExecutionPlan
  ): Promise<void> {
    const strategy = ctx.request.executionStrategy ?? "PIPELINE";

    if (strategy === "SEQUENTIAL" || strategy === "CONDITIONAL") {
      for (const engineId of plan.engines) {
        if (ctx.cancelled) break;
        if (strategy === "CONDITIONAL" && !this.shouldRun(ctx, engineId)) {
          ctx.record(skippedResult(engineId, "Conditional skip"));
          continue;
        }
        await this.runEngine(ctx, engineId);
        if (
          !ctx.request.allowPartial &&
          ctx.results.get(engineId) &&
          !ctx.results.get(engineId)!.ok &&
          !ctx.results.get(engineId)!.skipped
        ) {
          break;
        }
      }
      return;
    }

    // PARALLEL / PIPELINE — execute dependency waves concurrently
    for (const wave of plan.waves) {
      if (ctx.cancelled) break;
      await Promise.all(wave.map((id) => this.runEngine(ctx, id)));
      if (!ctx.request.allowPartial) {
        const failed = wave.some((id) => {
          const r = ctx.results.get(id);
          return r && !r.ok && !r.skipped;
        });
        if (failed) break;
      }
    }
  }

  async runEngine(
    ctx: ValidationContext,
    engineId: ValidationEngineId
  ): Promise<EngineRunResult> {
    if (ctx.cancelled) {
      const skipped = skippedResult(engineId, "Cancelled");
      ctx.record(skipped);
      return skipped;
    }

    const cacheKey = this.cacheKey(ctx, engineId);
    if (ctx.request.useCache !== false) {
      try {
        const cached = this.cache.get<EngineRunResult>(cacheKey);
        if (cached) {
          const result = { ...cached, cached: true, executionTimeMs: 0 };
          ctx.record(result);
          return result;
        }
      } catch {
        ctx.warnings.push(`Cache read failure for ${engineId}`);
      }
    }

    const def = getValidationEngine(engineId);
    if (!def) {
      const missing: EngineRunResult = {
        engineId,
        ok: false,
        score: 0,
        warnings: [],
        errors: [`Engine not registered: ${engineId}`],
        executionTimeMs: 0,
        cached: false,
        attempt: 0,
      };
      ctx.record(missing);
      return missing;
    }

    const retries = ctx.request.retryCount ?? this.config.retryCount;
    const timeoutMs = ctx.request.timeoutMs ?? this.config.timeoutMs;
    let lastError = "Unknown engine failure";

    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      if (ctx.cancelled) {
        const skipped = skippedResult(engineId, "Cancelled");
        ctx.record(skipped);
        return skipped;
      }
      try {
        const result = await withTimeout(
          def.handler(ctx),
          timeoutMs,
          engineId
        );
        result.attempt = attempt;
        result.cached = false;
        try {
          if (ctx.request.useCache !== false && result.ok) {
            this.cache.set(cacheKey, { ...result, cached: false });
          }
        } catch {
          ctx.warnings.push(`Cache write failure for ${engineId}`);
        }
        ctx.record(result);
        return result;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        const timedOut = lastError.includes("timed out");
        if (attempt <= retries) {
          await sleep(this.config.retryDelayMs * attempt);
          continue;
        }
        const failed: EngineRunResult = {
          engineId,
          ok: false,
          score: 0,
          warnings: [],
          errors: [
            timedOut
              ? `Engine ${engineId} timed out after ${timeoutMs}ms`
              : `Engine ${engineId} failed after ${attempt} attempt(s): ${lastError}`,
          ],
          executionTimeMs: timeoutMs,
          cached: false,
          attempt,
          timedOut,
        };
        ctx.record(failed);
        return failed;
      }
    }

    const exhausted: EngineRunResult = {
      engineId,
      ok: false,
      score: 0,
      warnings: [],
      errors: [`Retry exhaustion for ${engineId}: ${lastError}`],
      executionTimeMs: 0,
      cached: false,
      attempt: retries + 1,
    };
    ctx.record(exhausted);
    return exhausted;
  }

  private shouldRun(ctx: ValidationContext, engineId: ValidationEngineId): boolean {
    const conditions = ctx.request.conditions;
    if (!conditions || !conditions[engineId]) return true;
    const prerequisite = conditions[engineId]!;
    const prior = ctx.results.get(prerequisite as ValidationEngineId);
    return Boolean(prior?.ok);
  }

  private cacheKey(ctx: ValidationContext, engineId: ValidationEngineId): string {
    const objectId =
      ctx.request.objectId ??
      ctx.request.context.stock ??
      ctx.request.context.recommendationId ??
      "anon";
    const kind = ctx.request.kind;
    return `orch:${engineId}:${kind}:${objectId}`;
  }
}

function skippedResult(
  engineId: ValidationEngineId,
  reason: string
): EngineRunResult {
  return {
    engineId,
    ok: true,
    score: 0,
    warnings: [reason],
    errors: [],
    executionTimeMs: 0,
    cached: false,
    attempt: 0,
    skipped: true,
  };
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  engineId: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Engine ${engineId} timed out after ${ms}ms`));
    }, ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
