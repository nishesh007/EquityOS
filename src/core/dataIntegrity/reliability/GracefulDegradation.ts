/**
 * Graceful degradation — skip non-critical advisory modules; keep core validation.
 */

import type { ReliabilityProbe } from "./ReliabilityRegistry";

export interface DegradationDecision {
  module: string;
  action: "CONTINUE" | "SKIP_ADVISORY" | "DEGRADE" | "PROTECT_CRITICAL";
  reason: string;
  critical: boolean;
}

export interface GracefulDegradationResult {
  degraded: boolean;
  decisions: DegradationDecision[];
  skippedAdvisoryModules: string[];
  continuedCoreModules: string[];
  protectedCriticalModules: string[];
  status: "NORMAL" | "DEGRADED" | "CRITICAL_PROTECTED";
  warnings: string[];
  errors: string[];
  scoreContribution: number;
}

export class GracefulDegradation {
  evaluate(probes: ReliabilityProbe[]): GracefulDegradationResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    const decisions: DegradationDecision[] = [];
    const skippedAdvisoryModules: string[] = [];
    const continuedCoreModules: string[] = [];
    const protectedCriticalModules: string[] = [];

    try {
      const unhealthy = probes.filter(
        (p) =>
          p.available === false ||
          p.status === "CRITICAL" ||
          p.status === "DEGRADED" ||
          (p.healthScore != null && p.healthScore < 50)
      );

      for (const probe of probes) {
        const critical = probe.critical === true;
        const advisory = probe.advisory === true || (!critical && isAdvisoryModule(probe.module));
        const failing =
          probe.available === false ||
          probe.status === "CRITICAL" ||
          probe.status === "DEGRADED";

        if (critical) {
          protectedCriticalModules.push(probe.module);
          continuedCoreModules.push(probe.module);
          decisions.push({
            module: probe.module,
            action: "PROTECT_CRITICAL",
            reason: failing
              ? "Critical module failure — core validation must continue with protection."
              : "Critical module protected.",
            critical: true,
          });
          continue;
        }

        if (failing && advisory) {
          skippedAdvisoryModules.push(probe.module);
          decisions.push({
            module: probe.module,
            action: "SKIP_ADVISORY",
            reason: "Non-critical advisory module skipped during degradation.",
            critical: false,
          });
          continue;
        }

        if (failing) {
          decisions.push({
            module: probe.module,
            action: "DEGRADE",
            reason: "Module degraded; core path continues.",
            critical: false,
          });
          continuedCoreModules.push(probe.module);
          continue;
        }

        continuedCoreModules.push(probe.module);
        decisions.push({
          module: probe.module,
          action: "CONTINUE",
          reason: "Module healthy.",
          critical,
        });
      }

      const degraded = unhealthy.length > 0 || skippedAdvisoryModules.length > 0;
      const criticalFailing = probes.some(
        (p) => p.critical && (p.available === false || p.status === "CRITICAL")
      );

      if (skippedAdvisoryModules.length > 0) {
        warnings.push(
          `Skipped advisory modules: ${unique(skippedAdvisoryModules).join(", ")}.`
        );
      }
      if (criticalFailing) {
        warnings.push(
          "Critical module unhealthy — protected continuity mode engaged."
        );
      }

      const scoreContribution = clamp(
        100 -
          skippedAdvisoryModules.length * 5 -
          (criticalFailing ? 20 : 0) -
          unhealthy.length * 3,
        0,
        100
      );

      return {
        degraded,
        decisions,
        skippedAdvisoryModules: unique(skippedAdvisoryModules),
        continuedCoreModules: unique(continuedCoreModules),
        protectedCriticalModules: unique(protectedCriticalModules),
        status: criticalFailing
          ? "CRITICAL_PROTECTED"
          : degraded
            ? "DEGRADED"
            : "NORMAL",
        warnings,
        errors,
        scoreContribution: round2(scoreContribution),
      };
    } catch (err) {
      errors.push(`Graceful degradation failed: ${String(err)}`);
      return {
        degraded: true,
        decisions,
        skippedAdvisoryModules,
        continuedCoreModules,
        protectedCriticalModules,
        status: "DEGRADED",
        warnings,
        errors,
        scoreContribution: 0,
      };
    }
  }
}

function isAdvisoryModule(module: string): boolean {
  return [
    "analytics",
    "reporting",
    "diagnostics",
    "optimization",
    "dashboard",
  ].includes(module);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
