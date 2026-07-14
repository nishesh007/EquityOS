/**
 * Platform health aggregation — read-only scores across Sprint 9F engines.
 */

import type { PlatformConfiguration } from "./PlatformConfiguration";
import type { PlatformEngineRecord } from "./PlatformRegistry";

export interface PlatformHealthReport {
  overallHealthScore: number;
  overallTrustScore: number;
  overallReadiness: number;
  overallCompliance: number;
  overallSecurity: number;
  overallReliability: number;
  overallPerformance: number;
  overallExplainability: number;
  overallDocumentation: number;
  overallCoverage: number;
  overallCertification: number;
  overallRisk: number;
  overallValidationStatus: "healthy" | "degraded" | "critical" | "unknown";
  engineCount: number;
  registeredCount: number;
  healthyCount: number;
}

export class PlatformHealth {
  compute(
    engines: PlatformEngineRecord[],
    config: PlatformConfiguration,
    extras?: Partial<{
      trust: number;
      readiness: number;
      compliance: number;
      security: number;
      reliability: number;
      performance: number;
      explainability: number;
      documentation: number;
      certification: number;
    }>
  ): PlatformHealthReport {
    const registered = engines.filter((e) => e.registered);
    const healthy = registered.filter((e) => e.healthy);
    const coverage = clamp(
      Math.round(
        (registered.length / Math.max(1, engines.length || 1)) * 100
      ),
      0,
      100
    );

    const capability = (predicate: (e: PlatformEngineRecord) => boolean) => {
      const subset = registered.filter(predicate);
      if (subset.length === 0) return coverage > 0 ? 75 : 40;
      const ok = subset.filter(
        (e) => e.healthy && e.metricsReady && e.exportReady
      ).length;
      return clamp(Math.round((ok / subset.length) * 100), 0, 100);
    };

    const trust = extras?.trust ?? capability((e) => e.engineId === "trust");
    const readiness =
      extras?.readiness ??
      capability((e) =>
        ["release", "orchestrator", "reliability"].includes(e.engineId)
      );
    const compliance =
      extras?.compliance ?? capability((e) => e.engineId === "compliance");
    const security =
      extras?.security ?? capability((e) => e.engineId === "security");
    const reliability =
      extras?.reliability ??
      capability((e) => e.engineId === "reliability");
    const performance =
      extras?.performance ??
      capability((e) => e.engineId === "performance");
    const explainability =
      extras?.explainability ??
      capability((e) => e.engineId === "explainability");
    const documentation =
      extras?.documentation ??
      capability((e) => e.engineId === "documentation");
    const certification =
      extras?.certification ??
      capability((e) => e.engineId === "release");

    const w = config.healthWeights;
    const overallHealthScore = clamp(
      Math.round(
        trust * w.trust +
          readiness * w.readiness +
          compliance * w.compliance +
          security * w.security +
          reliability * w.reliability +
          performance * w.performance +
          explainability * w.explainability +
          documentation * w.documentation +
          coverage * w.coverage +
          certification * w.certification
      ),
      0,
      100
    );

    const missing = engines.length - registered.length;
    const unhealthy = registered.length - healthy.length;
    const overallRisk = clamp(
      Math.round(missing * 4 + unhealthy * 6 + (100 - overallHealthScore) * 0.35),
      0,
      100
    );

    let overallValidationStatus: PlatformHealthReport["overallValidationStatus"] =
      "unknown";
    if (registered.length === 0) overallValidationStatus = "unknown";
    else if (overallHealthScore >= config.productionReadyThreshold) {
      overallValidationStatus = "healthy";
    } else if (overallHealthScore >= config.conditionalReadyThreshold) {
      overallValidationStatus = "degraded";
    } else {
      overallValidationStatus = "critical";
    }

    return {
      overallHealthScore,
      overallTrustScore: trust,
      overallReadiness: readiness,
      overallCompliance: compliance,
      overallSecurity: security,
      overallReliability: reliability,
      overallPerformance: performance,
      overallExplainability: explainability,
      overallDocumentation: documentation,
      overallCoverage: coverage,
      overallCertification: certification,
      overallRisk,
      overallValidationStatus,
      engineCount: engines.length,
      registeredCount: registered.length,
      healthyCount: healthy.length,
    };
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
