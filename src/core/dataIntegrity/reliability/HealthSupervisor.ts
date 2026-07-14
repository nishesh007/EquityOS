/**
 * Health supervisor — evaluates module and platform health.
 */

import type { ReliabilityConfiguration } from "./ReliabilityConfiguration";
import type {
  ProbeHealthStatus,
  ReliabilityProbe,
} from "./ReliabilityRegistry";

export interface ModuleHealthRow {
  module: string;
  sourceId: string;
  status: ProbeHealthStatus;
  healthScore: number;
  available: boolean;
  critical: boolean;
  advisory: boolean;
  latencyMs: number;
  errorRate: number;
}

export interface PlatformHealthReport {
  overallStatus: ProbeHealthStatus;
  overallHealthScore: number;
  availabilityPct: number;
  modules: ModuleHealthRow[];
  unhealthyModules: string[];
  checkedAt: string;
  warnings: string[];
  errors: string[];
}

export class HealthSupervisor {
  constructor(private config: ReliabilityConfiguration) {}

  setConfiguration(config: ReliabilityConfiguration): void {
    this.config = config;
  }

  checkHealth(probes: ReliabilityProbe[]): PlatformHealthReport {
    const warnings: string[] = [];
    const errors: string[] = [];
    const modules: ModuleHealthRow[] = [];

    try {
      for (const probe of probes) {
        const healthScore =
          probe.healthScore ??
          (probe.status === "HEALTHY"
            ? 100
            : probe.status === "DEGRADED"
              ? 60
              : probe.status === "CRITICAL"
                ? 20
                : probe.available === false
                  ? 0
                  : 80);
        const status = resolveStatus(healthScore, probe.status, this.config);
        modules.push({
          module: probe.module,
          sourceId: String(probe.sourceId),
          status,
          healthScore: round2(healthScore),
          available: probe.available !== false,
          critical: probe.critical === true,
          advisory: probe.advisory === true,
          latencyMs: probe.latencyMs ?? 0,
          errorRate: probe.errorRate ?? 0,
        });
      }

      const availableCount = modules.filter((m) => m.available).length;
      const availabilityPct =
        modules.length === 0
          ? 100
          : round2((availableCount / modules.length) * 100);

      const overallHealthScore =
        modules.length === 0
          ? 100
          : round2(
              modules.reduce((s, m) => s + m.healthScore, 0) / modules.length
            );

      const overallStatus = resolveStatus(
        overallHealthScore,
        undefined,
        this.config
      );
      const unhealthyModules = modules
        .filter((m) => m.status !== "HEALTHY")
        .map((m) => m.module);

      if (unhealthyModules.length > 0) {
        warnings.push(
          `Unhealthy modules: ${unhealthyModules.join(", ")}.`
        );
      }
      if (availabilityPct < this.config.availabilityTargetPct) {
        warnings.push(
          `Availability ${availabilityPct}% below target ${this.config.availabilityTargetPct}%.`
        );
      }

      return {
        overallStatus,
        overallHealthScore,
        availabilityPct,
        modules,
        unhealthyModules,
        checkedAt: new Date().toISOString(),
        warnings,
        errors,
      };
    } catch (err) {
      errors.push(`Health check failed: ${String(err)}`);
      return {
        overallStatus: "UNKNOWN",
        overallHealthScore: 0,
        availabilityPct: 0,
        modules,
        unhealthyModules: [],
        checkedAt: new Date().toISOString(),
        warnings,
        errors,
      };
    }
  }
}

function resolveStatus(
  score: number,
  explicit: ProbeHealthStatus | undefined,
  config: ReliabilityConfiguration
): ProbeHealthStatus {
  if (explicit === "CRITICAL" || score < config.healthCriticalThreshold) {
    return "CRITICAL";
  }
  if (explicit === "DEGRADED" || score < config.healthDegradedThreshold) {
    return "DEGRADED";
  }
  if (explicit === "UNKNOWN" && score === 0) return "UNKNOWN";
  return "HEALTHY";
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
