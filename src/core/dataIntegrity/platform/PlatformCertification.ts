/**
 * Platform certification — verifies engine registration and readiness (orchestration only).
 */

import type { PlatformConfiguration } from "./PlatformConfiguration";
import type { PlatformEngineRecord } from "./PlatformRegistry";
import type { PlatformHealthReport } from "./PlatformHealth";

export type PlatformCertificationStatus =
  | "production_ready"
  | "conditionally_ready"
  | "not_ready"
  | "blocked";

export interface PlatformCertificationCheck {
  checkId: string;
  label: string;
  passed: boolean;
  details: string;
}

export interface PlatformCertificationResult {
  certificationId: string;
  status: PlatformCertificationStatus;
  summary: string;
  reasoning: string[];
  checks: PlatformCertificationCheck[];
  health: PlatformHealthReport;
  generatedAt: string;
  warnings: string[];
  errors: string[];
}

export class PlatformCertification {
  private seq = 0;

  certify(input: {
    engines: PlatformEngineRecord[];
    required: string[];
    health: PlatformHealthReport;
    config: PlatformConfiguration;
    integrityOk: boolean;
  }): PlatformCertificationResult {
    this.seq += 1;
    const certificationId = `platcert:${this.seq}:${Date.now()}`;
    const warnings: string[] = [];
    const errors: string[] = [];
    const checks: PlatformCertificationCheck[] = [];

    try {
      if (!input.config.orchestrationOnly) {
        errors.push("Platform requires orchestrationOnly=true");
      }

      const registeredIds = new Set(
        input.engines.filter((e) => e.registered).map((e) => e.engineId)
      );
      const missing = input.required.filter((id) => !registeredIds.has(id as never));
      checks.push({
        checkId: "engines-registered",
        label: "Every engine registered",
        passed: missing.length === 0,
        details:
          missing.length === 0
            ? `All ${input.required.length} engines registered`
            : `Missing: ${missing.join(", ")}`,
      });

      checks.push({
        checkId: "exports-ready",
        label: "Exports ready",
        passed: input.engines.filter((e) => e.registered).every((e) => e.exportReady),
        details: "Public façades exportable via dataIntegrity index",
      });
      checks.push({
        checkId: "metrics-ready",
        label: "Metrics ready",
        passed: input.engines.filter((e) => e.registered).every((e) => e.metricsReady),
        details: "Engine metrics surfaces available",
      });
      checks.push({
        checkId: "snapshots-ready",
        label: "Snapshots ready",
        passed: input.engines
          .filter((e) => e.registered)
          .every((e) => e.snapshotReady),
        details: "Snapshot capabilities available",
      });
      checks.push({
        checkId: "audit-ready",
        label: "Audit logging ready",
        passed: input.engines.filter((e) => e.registered).every((e) => e.auditReady),
        details: "Audit logging surfaces available",
      });
      checks.push({
        checkId: "health",
        label: "Platform health",
        passed:
          input.health.overallHealthScore >=
          input.config.conditionalReadyThreshold,
        details: `Health score ${input.health.overallHealthScore}`,
      });
      checks.push({
        checkId: "event-bus",
        label: "Event bus integrated",
        passed: registeredIds.has("events"),
        details: "Validation Event Bus registration",
      });
      checks.push({
        checkId: "orchestrator",
        label: "Orchestrator integrated",
        passed: registeredIds.has("orchestrator"),
        details: "Validation Orchestrator registration",
      });
      checks.push({
        checkId: "diagnostics",
        label: "Diagnostics integrated",
        passed: registeredIds.has("diagnostics"),
        details: "Diagnostics engine registration",
      });
      checks.push({
        checkId: "reporting",
        label: "Reporting integrated",
        passed: registeredIds.has("reporting"),
        details: "Reporting engine registration",
      });
      checks.push({
        checkId: "analytics",
        label: "Analytics integrated",
        passed: registeredIds.has("analytics"),
        details: "Analytics engine registration",
      });
      checks.push({
        checkId: "security",
        label: "Security integrated",
        passed: registeredIds.has("security"),
        details: "Security engine registration",
      });
      checks.push({
        checkId: "release-readiness",
        label: "Release readiness integrated",
        passed: registeredIds.has("release"),
        details: "Release certification engine registration",
      });
      checks.push({
        checkId: "integrity-verified",
        label: "Platform integrity verified",
        passed: input.integrityOk,
        details: input.integrityOk
          ? "Integrity verification passed"
          : "Integrity verification failed",
      });

      for (const c of checks.filter((x) => !x.passed)) {
        warnings.push(`${c.label}: ${c.details}`);
      }

      const failedRequired = checks.filter((c) => !c.passed);
      const criticalFailed = failedRequired.filter((c) =>
        [
          "engines-registered",
          "integrity-verified",
          "orchestrator",
          "event-bus",
        ].includes(c.checkId)
      );

      let status: PlatformCertificationStatus = "production_ready";
      const reasoning: string[] = [];

      if (
        input.health.overallHealthScore < input.config.blockedThreshold ||
        criticalFailed.length > 0 ||
        (input.config.requireAllEngines && missing.length > 0)
      ) {
        status = "blocked";
        reasoning.push(
          criticalFailed.length > 0
            ? `Critical checks failed: ${criticalFailed.map((c) => c.checkId).join(", ")}`
            : `Health ${input.health.overallHealthScore} below blocked threshold ${input.config.blockedThreshold}.`
        );
        if (missing.length > 0) {
          reasoning.push(`Missing engines: ${missing.join(", ")}`);
        }
      } else if (
        input.health.overallHealthScore < input.config.productionReadyThreshold ||
        failedRequired.length > 0
      ) {
        if (
          input.health.overallHealthScore >=
          input.config.conditionalReadyThreshold
        ) {
          status = "conditionally_ready";
          reasoning.push(
            "Platform is usable with residual gaps below production-ready threshold."
          );
        } else {
          status = "not_ready";
          reasoning.push(
            "Platform health and checks do not meet conditional readiness."
          );
        }
        for (const c of failedRequired.slice(0, 5)) {
          reasoning.push(`${c.label} incomplete`);
        }
      } else {
        status = "production_ready";
        reasoning.push(
          "All Sprint 9F engines registered with health, metrics, snapshots, audit, and release readiness verified."
        );
      }

      const summary = `Platform certification: ${status.split("_").join(" ")} (health ${input.health.overallHealthScore}/100).`;

      return {
        certificationId,
        status,
        summary,
        reasoning,
        checks,
        health: { ...input.health },
        generatedAt: new Date().toISOString(),
        warnings,
        errors,
      };
    } catch (err) {
      errors.push(`platform certification failed: ${String(err)}`);
      return {
        certificationId,
        status: "blocked",
        summary: "Platform certification unavailable",
        reasoning: [String(err)],
        checks,
        health: input.health,
        generatedAt: new Date().toISOString(),
        warnings,
        errors,
      };
    }
  }
}
