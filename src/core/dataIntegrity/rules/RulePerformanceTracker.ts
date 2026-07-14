/**
 * Advanced Rule Engine — per-rule performance tracker.
 */

import type { RuleExecutionResult, RulePerformanceSnapshot } from "./RuleTypes";

interface Accumulator {
  executions: number;
  successes: number;
  failures: number;
  skipped: number;
  timeouts: number;
  totalRuntime: number;
  maximumRuntime: number;
}

export class RulePerformanceTracker {
  private readonly stats = new Map<string, Accumulator>();

  record(result: RuleExecutionResult): void {
    const acc = this.stats.get(result.ruleId) ?? {
      executions: 0,
      successes: 0,
      failures: 0,
      skipped: 0,
      timeouts: 0,
      totalRuntime: 0,
      maximumRuntime: 0,
    };

    acc.executions += 1;
    acc.totalRuntime += result.executionTime;
    acc.maximumRuntime = Math.max(acc.maximumRuntime, result.executionTime);

    if (result.skipped || result.status === "SKIPPED") {
      acc.skipped += 1;
    } else if (result.timedOut || result.status === "TIMEOUT") {
      acc.timeouts += 1;
      acc.failures += 1;
    } else if (result.passed || result.status === "CACHED") {
      // Cached pass counts as success; cached fail as failure.
      if (result.passed) acc.successes += 1;
      else acc.failures += 1;
    } else if (result.status === "PASSED") {
      acc.successes += 1;
    } else {
      acc.failures += 1;
    }

    this.stats.set(result.ruleId, acc);
  }

  getRuleMetrics(ruleId?: string): RulePerformanceSnapshot[] {
    const ids = ruleId ? [ruleId] : Array.from(this.stats.keys());
    return ids
      .filter((id) => this.stats.has(id))
      .map((id) => this.toSnapshot(id, this.stats.get(id)!));
  }

  getAggregate(): {
    averageRuntime: number;
    maximumRuntime: number;
    failureRate: number;
    successRate: number;
    skippedRate: number;
    timeoutRate: number;
    totalExecutions: number;
  } {
    let executions = 0;
    let successes = 0;
    let failures = 0;
    let skipped = 0;
    let timeouts = 0;
    let totalRuntime = 0;
    let maximumRuntime = 0;

    for (const acc of this.stats.values()) {
      executions += acc.executions;
      successes += acc.successes;
      failures += acc.failures;
      skipped += acc.skipped;
      timeouts += acc.timeouts;
      totalRuntime += acc.totalRuntime;
      maximumRuntime = Math.max(maximumRuntime, acc.maximumRuntime);
    }

    const pct = (n: number) =>
      executions === 0 ? 0 : Math.round((n / executions) * 10000) / 100;

    return {
      averageRuntime:
        executions === 0
          ? 0
          : Math.round((totalRuntime / executions) * 100) / 100,
      maximumRuntime,
      failureRate: pct(failures),
      successRate: pct(successes),
      skippedRate: pct(skipped),
      timeoutRate: pct(timeouts),
      totalExecutions: executions,
    };
  }

  reset(ruleId?: string): void {
    if (ruleId) this.stats.delete(ruleId);
    else this.stats.clear();
  }

  private toSnapshot(
    ruleId: string,
    acc: Accumulator
  ): RulePerformanceSnapshot {
    const pct = (n: number) =>
      acc.executions === 0
        ? 0
        : Math.round((n / acc.executions) * 10000) / 100;

    return {
      ruleId,
      executions: acc.executions,
      successes: acc.successes,
      failures: acc.failures,
      skipped: acc.skipped,
      timeouts: acc.timeouts,
      averageRuntime:
        acc.executions === 0
          ? 0
          : Math.round((acc.totalRuntime / acc.executions) * 100) / 100,
      maximumRuntime: acc.maximumRuntime,
      failureRate: pct(acc.failures),
      successRate: pct(acc.successes),
      skippedRate: pct(acc.skipped),
      timeoutRate: pct(acc.timeouts),
    };
  }
}
