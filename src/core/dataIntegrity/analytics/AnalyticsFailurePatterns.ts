/**
 * Failure pattern analytics — clusters, frequency, root-cause candidates.
 */

import type { AnalyticsObservation } from "./AnalyticsRegistry";
import { rate } from "./AnalyticsCalculator";

export interface FailureCluster {
  key: string;
  dimension: "rule" | "module" | "stock" | "source";
  count: number;
  frequency: number;
}

export interface FailureAnalyticsReport {
  mostFailedRules: Array<{ ruleId: string; failures: number }>;
  mostFailedModules: Array<{ module: string; failures: number }>;
  mostFailedStocks: Array<{ stock: string; failures: number }>;
  repeatedFailures: Array<{ key: string; count: number }>;
  failureClusters: FailureCluster[];
  failureFrequency: number;
  rootCauseCandidates: string[];
  totalFailures: number;
}

export class AnalyticsFailurePatterns {
  analyze(observations: AnalyticsObservation[]): FailureAnalyticsReport {
    const ruleFails = countMap();
    const moduleFails = countMap();
    const stockFails = countMap();
    const repeated = countMap();
    let totalFailures = 0;
    let totalValidations = 0;

    for (const o of observations) {
      totalValidations += o.validationCount ?? 0;
      const fails = o.failed ?? (o.ruleFailed ? 1 : 0);
      totalFailures += fails;
      if (fails <= 0 && !o.ruleFailed) continue;

      if (o.ruleId) {
        ruleFails.inc(o.ruleId, fails || 1);
        repeated.inc(`rule:${o.ruleId}`, fails || 1);
      }
      const module = o.module ?? o.sourceId;
      moduleFails.inc(module, fails || 1);
      repeated.inc(`module:${module}`, fails || 1);
      if (o.stock) {
        stockFails.inc(o.stock, fails || 1);
        repeated.inc(`stock:${o.stock}`, fails || 1);
      }
    }

    const mostFailedRules = ruleFails.top(10).map(([ruleId, failures]) => ({
      ruleId,
      failures,
    }));
    const mostFailedModules = moduleFails
      .top(10)
      .map(([module, failures]) => ({ module, failures }));
    const mostFailedStocks = stockFails.top(10).map(([stock, failures]) => ({
      stock,
      failures,
    }));
    const repeatedFailures = repeated
      .top(10)
      .filter(([, c]) => c >= 2)
      .map(([key, count]) => ({ key, count }));

    const failureClusters: FailureCluster[] = [
      ...mostFailedRules.map((r) => ({
        key: r.ruleId,
        dimension: "rule" as const,
        count: r.failures,
        frequency: rate(r.failures, Math.max(totalFailures, 1)),
      })),
      ...mostFailedModules.map((m) => ({
        key: m.module,
        dimension: "module" as const,
        count: m.failures,
        frequency: rate(m.failures, Math.max(totalFailures, 1)),
      })),
      ...mostFailedStocks.map((s) => ({
        key: s.stock,
        dimension: "stock" as const,
        count: s.failures,
        frequency: rate(s.failures, Math.max(totalFailures, 1)),
      })),
    ].sort((a, b) => b.count - a.count);

    const rootCauseCandidates: string[] = [];
    if (mostFailedRules[0]) {
      rootCauseCandidates.push(
        `Rule ${mostFailedRules[0].ruleId} accounts for repeated failures`
      );
    }
    if (mostFailedModules[0]) {
      rootCauseCandidates.push(
        `Module ${mostFailedModules[0].module} is a primary failure hotspot`
      );
    }
    if (mostFailedStocks[0]) {
      rootCauseCandidates.push(
        `Stock ${mostFailedStocks[0].stock} shows concentrated validation failures`
      );
    }

    return {
      mostFailedRules,
      mostFailedModules,
      mostFailedStocks,
      repeatedFailures,
      failureClusters,
      failureFrequency: rate(totalFailures, Math.max(totalValidations, 1)),
      rootCauseCandidates,
      totalFailures,
    };
  }
}

function countMap() {
  const map = new Map<string, number>();
  return {
    inc(key: string, n = 1) {
      map.set(key, (map.get(key) ?? 0) + n);
    },
    top(n: number): Array<[string, number]> {
      return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
    },
  };
}
