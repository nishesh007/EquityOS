/**
 * Retry manager — infrastructure failures only; never retries logical validation failures.
 */

import type { ReliabilityConfiguration } from "./ReliabilityConfiguration";
import type { FailureKind } from "./ReliabilityRegistry";

export interface RetryAttempt {
  attempt: number;
  delayMs: number;
  at: string;
}

export interface RetryExecutionResult<T> {
  ok: boolean;
  result: T | null;
  attempts: RetryAttempt[];
  retried: boolean;
  skipped: boolean;
  skipReason?: string;
  errors: string[];
  totalDelayMs: number;
}

export class RetryManager {
  constructor(private config: ReliabilityConfiguration) {}

  setConfiguration(config: ReliabilityConfiguration): void {
    this.config = config;
  }

  computeDelay(attempt: number): number {
    switch (this.config.retryPolicy) {
      case "NONE":
        return 0;
      case "IMMEDIATE":
        return 0;
      case "FIXED":
        return this.config.fixedRetryDelayMs;
      case "LINEAR":
        return this.config.linearRetryDelayMs * Math.max(1, attempt);
      case "EXPONENTIAL":
        return (
          this.config.exponentialBaseDelayMs *
          Math.pow(this.config.exponentialMultiplier, Math.max(0, attempt - 1))
        );
      default:
        return this.config.fixedRetryDelayMs;
    }
  }

  shouldRetry(failureKind?: FailureKind): boolean {
    if (this.config.retryPolicy === "NONE") return false;
    if (failureKind === "LOGICAL") return false;
    return (
      failureKind === "INFRASTRUCTURE" ||
      failureKind === "TIMEOUT" ||
      failureKind === "DEPENDENCY" ||
      failureKind === "CONFIGURATION" ||
      failureKind === "UNKNOWN" ||
      failureKind == null
    );
  }

  /**
   * Executes an infrastructure operation with advisory retry scheduling.
   * Delays are recorded; sleep is optional via `sleep` for testability.
   */
  async retryExecution<T>(
    operation: () => Promise<T> | T,
    options?: {
      failureKind?: FailureKind;
      maxRetries?: number;
      sleep?: (ms: number) => Promise<void>;
    }
  ): Promise<RetryExecutionResult<T>> {
    const attempts: RetryAttempt[] = [];
    const errors: string[] = [];
    let totalDelayMs = 0;

    if (!this.shouldRetry(options?.failureKind)) {
      try {
        const result = await operation();
        return {
          ok: true,
          result,
          attempts: [{ attempt: 1, delayMs: 0, at: new Date().toISOString() }],
          retried: false,
          skipped: options?.failureKind === "LOGICAL",
          skipReason:
            options?.failureKind === "LOGICAL"
              ? "Logical validation failures are never retried."
              : this.config.retryPolicy === "NONE"
                ? "Retry policy is NONE."
                : undefined,
          errors,
          totalDelayMs: 0,
        };
      } catch (err) {
        return {
          ok: false,
          result: null,
          attempts: [{ attempt: 1, delayMs: 0, at: new Date().toISOString() }],
          retried: false,
          skipped: options?.failureKind === "LOGICAL",
          skipReason:
            options?.failureKind === "LOGICAL"
              ? "Logical validation failures are never retried."
              : undefined,
          errors: [String(err)],
          totalDelayMs: 0,
        };
      }
    }

    const maxRetries = options?.maxRetries ?? this.config.maxRetries;
    const sleep =
      options?.sleep ??
      (async (ms: number) => {
        if (ms > 0) await new Promise((r) => setTimeout(r, ms));
      });

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        const result = await operation();
        attempts.push({
          attempt,
          delayMs: 0,
          at: new Date().toISOString(),
        });
        return {
          ok: true,
          result,
          attempts,
          retried: attempt > 1,
          skipped: false,
          errors,
          totalDelayMs,
        };
      } catch (err) {
        errors.push(String(err));
        if (attempt > maxRetries) {
          attempts.push({
            attempt,
            delayMs: 0,
            at: new Date().toISOString(),
          });
          break;
        }
        const delayMs = this.computeDelay(attempt);
        attempts.push({
          attempt,
          delayMs,
          at: new Date().toISOString(),
        });
        totalDelayMs += delayMs;
        await sleep(delayMs);
      }
    }

    return {
      ok: false,
      result: null,
      attempts,
      retried: attempts.length > 1,
      skipped: false,
      errors,
      totalDelayMs,
    };
  }
}
