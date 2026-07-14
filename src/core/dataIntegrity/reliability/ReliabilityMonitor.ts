/**
 * Reliability monitor — aggregates health, circuits, retries, timeouts into resilience score.
 */

import type { ReliabilityConfiguration } from "./ReliabilityConfiguration";
import type { PlatformHealthReport } from "./HealthSupervisor";
import type { GracefulDegradationResult } from "./GracefulDegradation";
import type { CircuitBreakerStatus } from "./CircuitBreaker";

export interface ResilienceScoreBreakdown {
  availability: number;
  recoverySuccess: number;
  timeoutStability: number;
  retryEfficiency: number;
  healthStability: number;
  gracefulDegradation: number;
  overall: number;
}

export interface ReliabilityMonitorReport {
  resilienceScore: ResilienceScoreBreakdown;
  health: PlatformHealthReport;
  degradation: GracefulDegradationResult;
  openCircuits: string[];
  monitoredAt: string;
  warnings: string[];
  errors: string[];
}

export class ReliabilityMonitor {
  constructor(private config: ReliabilityConfiguration) {}

  setConfiguration(config: ReliabilityConfiguration): void {
    this.config = config;
  }

  buildReport(input: {
    health: PlatformHealthReport;
    degradation: GracefulDegradationResult;
    circuits: CircuitBreakerStatus[];
    recoveryRate: number;
    timeoutCount: number;
    retryCount: number;
    successfulRetries: number;
  }): ReliabilityMonitorReport {
    const warnings = [
      ...input.health.warnings,
      ...input.degradation.warnings,
    ];
    const errors = [...input.health.errors, ...input.degradation.errors];

    const availability = clamp(input.health.availabilityPct, 0, 100);
    const recoverySuccess = clamp(input.recoveryRate, 0, 100);
    const timeoutStability = clamp(
      100 - Math.min(60, input.timeoutCount * 5),
      0,
      100
    );
    const retryEfficiency =
      input.retryCount === 0
        ? 100
        : clamp(
            (input.successfulRetries / Math.max(1, input.retryCount)) * 100,
            0,
            100
          );
    const healthStability = clamp(input.health.overallHealthScore, 0, 100);
    const gracefulDegradation = clamp(
      input.degradation.scoreContribution,
      0,
      100
    );

    const w = this.config.scoreWeights;
    const weighted =
      availability * w.availability +
      recoverySuccess * w.recoverySuccess +
      timeoutStability * w.timeoutStability +
      retryEfficiency * w.retryEfficiency +
      healthStability * w.healthStability +
      gracefulDegradation * w.gracefulDegradation;
    const weightSum =
      w.availability +
      w.recoverySuccess +
      w.timeoutStability +
      w.retryEfficiency +
      w.healthStability +
      w.gracefulDegradation;
    const overall = round2(weightSum === 0 ? 0 : weighted / weightSum);

    const openCircuits = input.circuits
      .filter((c) => c.state === "OPEN")
      .map((c) => c.circuitId);
    if (openCircuits.length > 0) {
      warnings.push(`Open circuits: ${openCircuits.join(", ")}.`);
    }

    return {
      resilienceScore: {
        availability: round2(availability),
        recoverySuccess: round2(recoverySuccess),
        timeoutStability: round2(timeoutStability),
        retryEfficiency: round2(retryEfficiency),
        healthStability: round2(healthStability),
        gracefulDegradation: round2(gracefulDegradation),
        overall,
      },
      health: input.health,
      degradation: input.degradation,
      openCircuits,
      monitoredAt: new Date().toISOString(),
      warnings,
      errors,
    };
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
