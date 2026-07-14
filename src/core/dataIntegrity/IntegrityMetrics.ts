/**
 * Institutional Data Integrity Engine — metrics collector.
 * Exposes aggregates for future dashboard integration.
 */

import type { IntegrityMetricsSnapshot, IntegrityResult } from "./IntegrityTypes";

export class IntegrityMetrics {
  private datasetsValidated = 0;
  private datasetsApproved = 0;
  private datasetsRejected = 0;
  private scoreSum = 0;
  private executionTimeSum = 0;
  private criticalErrors = 0;
  private warningCount = 0;
  private lastValidatedAt: string | null = null;

  record(result: IntegrityResult): void {
    this.datasetsValidated += 1;
    this.scoreSum += result.integrityScore;
    this.executionTimeSum += result.executionTime;
    this.warningCount += result.warnings.length;
    this.criticalErrors += result.errors.filter(
      (e) => e.ruleLevel === "CRITICAL"
    ).length;
    this.lastValidatedAt = result.validatedAt;

    if (result.status === "REJECTED") {
      this.datasetsRejected += 1;
    } else {
      this.datasetsApproved += 1;
    }
  }

  getMetrics(): IntegrityMetricsSnapshot {
    const validated = this.datasetsValidated;
    const averageIntegrityScore =
      validated === 0 ? 0 : Math.round((this.scoreSum / validated) * 100) / 100;
    const averageExecutionTime =
      validated === 0
        ? 0
        : Math.round((this.executionTimeSum / validated) * 100) / 100;
    const successRate =
      validated === 0
        ? 0
        : Math.round((this.datasetsApproved / validated) * 10000) / 100;
    const failureRate =
      validated === 0
        ? 0
        : Math.round((this.datasetsRejected / validated) * 10000) / 100;

    return {
      datasetsValidated: validated,
      datasetsApproved: this.datasetsApproved,
      datasetsRejected: this.datasetsRejected,
      averageIntegrityScore,
      averageExecutionTime,
      criticalErrors: this.criticalErrors,
      warningCount: this.warningCount,
      successRate,
      failureRate,
      totalExecutionTime: Math.round(this.executionTimeSum * 100) / 100,
      lastValidatedAt: this.lastValidatedAt,
    };
  }

  reset(): void {
    this.datasetsValidated = 0;
    this.datasetsApproved = 0;
    this.datasetsRejected = 0;
    this.scoreSum = 0;
    this.executionTimeSum = 0;
    this.criticalErrors = 0;
    this.warningCount = 0;
    this.lastValidatedAt = null;
  }
}
