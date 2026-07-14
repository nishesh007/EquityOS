/**
 * Timeout manager — per-rule / module / pipeline / global timeouts with graceful handling.
 */

import type { ReliabilityConfiguration } from "./ReliabilityConfiguration";

export type TimeoutScope = "RULE" | "MODULE" | "PIPELINE" | "GLOBAL";

export interface TimeoutCheckResult {
  scope: TimeoutScope;
  targetId: string;
  limitMs: number;
  elapsedMs: number;
  timedOut: boolean;
  remainingMs: number;
}

export class TimeoutManager {
  private timeoutCount = 0;
  private readonly history: TimeoutCheckResult[] = [];

  constructor(private config: ReliabilityConfiguration) {}

  setConfiguration(config: ReliabilityConfiguration): void {
    this.config = config;
  }

  getLimit(scope: TimeoutScope): number {
    switch (scope) {
      case "RULE":
        return this.config.ruleTimeoutMs;
      case "MODULE":
        return this.config.moduleTimeoutMs;
      case "PIPELINE":
        return this.config.pipelineTimeoutMs;
      case "GLOBAL":
        return this.config.globalTimeoutMs;
      default:
        return this.config.globalTimeoutMs;
    }
  }

  check(
    scope: TimeoutScope,
    targetId: string,
    elapsedMs: number
  ): TimeoutCheckResult {
    const limitMs = this.getLimit(scope);
    const timedOut = elapsedMs > limitMs;
    const result: TimeoutCheckResult = {
      scope,
      targetId,
      limitMs,
      elapsedMs,
      timedOut,
      remainingMs: Math.max(0, limitMs - elapsedMs),
    };
    if (timedOut) {
      this.timeoutCount += 1;
      this.history.push(result);
      if (this.history.length > 200) {
        this.history.splice(0, this.history.length - 200);
      }
    }
    return result;
  }

  /**
   * Wraps an async operation with a timeout. On timeout, returns graceful failure
   * without throwing into validation correctness paths.
   */
  async withTimeout<T>(
    scope: TimeoutScope,
    targetId: string,
    operation: () => Promise<T> | T,
    options?: { timeoutMs?: number }
  ): Promise<{
    ok: boolean;
    result: T | null;
    timedOut: boolean;
    elapsedMs: number;
    error?: string;
  }> {
    const limitMs = options?.timeoutMs ?? this.getLimit(scope);
    const started = Date.now();
    try {
      const result = await Promise.race([
        Promise.resolve().then(() => operation()),
        new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new Error(`Timeout after ${limitMs}ms`)),
            limitMs
          );
        }),
      ]);
      const elapsedMs = Date.now() - started;
      this.check(scope, targetId, elapsedMs);
      return { ok: true, result, timedOut: false, elapsedMs };
    } catch (err) {
      const elapsedMs = Date.now() - started;
      const timedOut =
        elapsedMs >= limitMs || String(err).toLowerCase().includes("timeout");
      if (timedOut) {
        this.timeoutCount += 1;
        this.history.push({
          scope,
          targetId,
          limitMs,
          elapsedMs,
          timedOut: true,
          remainingMs: 0,
        });
      }
      return {
        ok: false,
        result: null,
        timedOut,
        elapsedMs,
        error: String(err),
      };
    }
  }

  getTimeoutCount(): number {
    return this.timeoutCount;
  }

  getHistory(limit?: number): TimeoutCheckResult[] {
    if (limit === undefined) return [...this.history];
    return this.history.slice(-limit);
  }

  reset(): void {
    this.timeoutCount = 0;
    this.history.length = 0;
  }
}
