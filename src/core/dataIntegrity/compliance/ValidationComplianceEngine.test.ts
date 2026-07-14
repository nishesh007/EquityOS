/**
 * Institutional Validation Compliance Engine — unit tests (Prompt 9F.22).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  ValidationComplianceEngine,
  registerValidationComplianceEngine,
  resetValidationComplianceEngine,
  getRegisteredComplianceSources,
  resetComplianceSourceRegistrationState,
  DEFAULT_COMPLIANCE_CONFIGURATION,
  getBuiltinComplianceRules,
  runCompliance,
  evaluatePolicies,
  detectViolations,
  generateComplianceReport,
  getComplianceScore,
  getComplianceMetrics,
  createComplianceSnapshot,
  type ComplianceObservation,
} from "./index";

function healthyObservations(): ComplianceObservation[] {
  return [
    {
      sourceId: "admin",
      module: "admin",
      timestamp: new Date().toISOString(),
      policiesPresent: 5,
      policiesEnabled: 5,
      auditEnabled: true,
      governanceViolation: false,
      dependencyOk: true,
    },
    {
      sourceId: "policy",
      module: "policy",
      timestamp: new Date().toISOString(),
      policiesPresent: 5,
      policiesEnabled: 5,
      auditEnabled: true,
    },
    {
      sourceId: "ruleEngine",
      module: "ruleEngine",
      timestamp: new Date().toISOString(),
      criticalRulesDisabled: 0,
      configurationDrift: false,
      versionMismatch: false,
      configVersion: "9F.22.0",
      expectedConfigVersion: "9F.22.0",
      dependencyOk: true,
      auditEnabled: true,
      rulesEnabled: 20,
      rulesTotal: 20,
    },
    {
      sourceId: "observability",
      module: "observability",
      timestamp: new Date().toISOString(),
      monitoringEnabled: true,
      monitoringGap: false,
      observabilityScore: 90,
      healthScore: 90,
    },
    {
      sourceId: "reporting",
      module: "reporting",
      timestamp: new Date().toISOString(),
      reportingEnabled: true,
      reportingGap: false,
      auditEnabled: true,
    },
    {
      sourceId: "reliability",
      module: "reliability",
      timestamp: new Date().toISOString(),
      reliabilityScore: 85,
      availability: 99,
      healthScore: 85,
      dependencyOk: true,
    },
    {
      sourceId: "trust",
      module: "trust",
      timestamp: new Date().toISOString(),
      trustScore: 88,
      healthScore: 88,
    },
    {
      sourceId: "diagnostics",
      module: "diagnostics",
      timestamp: new Date().toISOString(),
      diagnosticsEnabled: true,
      healthScore: 80,
    },
    {
      sourceId: "orchestrator",
      module: "orchestrator",
      timestamp: new Date().toISOString(),
      dependencyOk: true,
      diagnosticsEnabled: true,
      healthScore: 90,
      auditGap: false,
    },
  ];
}

function nonCompliantObservations(): ComplianceObservation[] {
  return [
    {
      sourceId: "admin",
      module: "admin",
      timestamp: new Date().toISOString(),
      policiesPresent: 0,
      policiesEnabled: 0,
      auditEnabled: false,
      auditGap: true,
      governanceViolation: true,
    },
    {
      sourceId: "ruleEngine",
      module: "ruleEngine",
      timestamp: new Date().toISOString(),
      criticalRulesDisabled: 3,
      configurationDrift: true,
      versionMismatch: true,
      configVersion: "1.0.0",
      expectedConfigVersion: "9F.22.0",
      dependencyOk: false,
    },
    {
      sourceId: "observability",
      module: "observability",
      timestamp: new Date().toISOString(),
      monitoringEnabled: false,
      monitoringGap: true,
      observabilityScore: 40,
      healthScore: 40,
    },
    {
      sourceId: "reporting",
      module: "reporting",
      timestamp: new Date().toISOString(),
      reportingEnabled: false,
      reportingGap: true,
    },
    {
      sourceId: "reliability",
      module: "reliability",
      timestamp: new Date().toISOString(),
      reliabilityScore: 40,
      availability: 70,
      healthScore: 40,
    },
    {
      sourceId: "trust",
      module: "trust",
      timestamp: new Date().toISOString(),
      trustScore: 40,
    },
  ];
}

describe("Compliance registration", () => {
  beforeEach(() => {
    resetValidationComplianceEngine();
    resetComplianceSourceRegistrationState();
  });

  afterEach(() => {
    resetValidationComplianceEngine();
    resetComplianceSourceRegistrationState();
  });

  it("registers compliance engine idempotently", () => {
    const first = registerValidationComplianceEngine({ force: true });
    expect(first.registered).toBe(true);
    expect(first.sourcesRegistered).toBeGreaterThanOrEqual(10);
    expect(getRegisteredComplianceSources().length).toBeGreaterThanOrEqual(10);

    const second = registerValidationComplianceEngine();
    expect(second.registered).toBe(false);
    expect(second.skipped).toBe(true);
  });
});

describe("Policy evaluation and rule book", () => {
  let engine: ValidationComplianceEngine;

  beforeEach(() => {
    resetValidationComplianceEngine();
    engine = new ValidationComplianceEngine({
      complianceProfile: "institutional",
      ruleBookVersion: "1.0.0",
      confidenceThreshold: 0.5,
    });
  });

  it("loads versioned rule books and evaluates policies", () => {
    expect(getBuiltinComplianceRules().length).toBeGreaterThan(0);
    expect(engine.getRuleBooks().length).toBeGreaterThan(0);
    expect(DEFAULT_COMPLIANCE_CONFIGURATION.engineVersion).toBe("9F.22.0");

    const policy = engine.evaluatePolicies({
      observations: healthyObservations(),
      includeLiveCollectors: false,
    });
    expect(policy.missingPolicies).toBe(false);
    expect(policy.policyCoveragePercent).toBeGreaterThan(0);

    const missing = engine.evaluatePolicies({
      observations: nonCompliantObservations(),
      includeLiveCollectors: false,
    });
    expect(missing.missingPolicies).toBe(true);
    expect(missing.findings.length).toBeGreaterThan(0);
  });
});

describe("Violations, reporting, and score", () => {
  let engine: ValidationComplianceEngine;

  beforeEach(() => {
    resetValidationComplianceEngine();
    engine = new ValidationComplianceEngine({
      complianceProfile: "institutional",
      ruleBookVersion: "1.0.0",
      confidenceThreshold: 0.5,
      strictCompliance: true,
    });
  });

  it("detects violations and generates compliance report", () => {
    const detected = engine.detectViolations({
      observations: nonCompliantObservations(),
      includeLiveCollectors: false,
    });
    expect(detected.violations.length).toBeGreaterThan(0);
    expect(
      detected.violations.every(
        (v) =>
          v.severity &&
          v.evidence.length > 0 &&
          v.affectedModules.length > 0 &&
          v.suggestedResolution &&
          typeof v.confidence === "number"
      )
    ).toBe(true);

    const report = engine.generateComplianceReport({
      observations: nonCompliantObservations(),
      includeLiveCollectors: false,
    });
    expect(report.summary.totalViolations).toBeGreaterThan(0);
    expect(report.violationReport.violations.length).toBeGreaterThan(0);
    expect(report.governanceReport.failedRules).toBeGreaterThan(0);
    expect(report.score.overall).toBeGreaterThanOrEqual(0);
    expect(report.score.overall).toBeLessThanOrEqual(100);
  });

  it("scores healthy platforms higher than non-compliant ones", () => {
    const healthy = engine.runCompliance({
      observations: healthyObservations(),
      includeLiveCollectors: false,
    });
    const unhealthy = engine.runCompliance({
      observations: nonCompliantObservations(),
      includeLiveCollectors: false,
    });
    expect(healthy.score.overall).toBeGreaterThan(unhealthy.score.overall);
    expect(healthy.violations.length).toBeLessThan(unhealthy.violations.length);
  });
});

describe("Snapshots, metrics, and audit", () => {
  let engine: ValidationComplianceEngine;

  beforeEach(() => {
    resetValidationComplianceEngine();
    engine = new ValidationComplianceEngine({
      complianceProfile: "institutional",
      ruleBookVersion: "1.0.0",
      confidenceThreshold: 0.5,
    });
  });

  it("creates snapshots and detects regressions", () => {
    engine.runCompliance({
      observations: healthyObservations(),
      includeLiveCollectors: false,
    });
    const snap1 = engine.createComplianceSnapshot("baseline");

    engine.runCompliance({
      observations: nonCompliantObservations(),
      includeLiveCollectors: false,
    });
    const snap2 = engine.createComplianceSnapshot("regressed");

    const comparison = engine.compareComplianceSnapshots(
      snap1.snapshotId,
      snap2.snapshotId
    );
    expect(comparison).not.toBeNull();
    expect(comparison!.regressionDetected).toBe(true);
    expect(engine.listSnapshots().length).toBe(2);
  });

  it("tracks metrics and audit log", () => {
    engine.runCompliance({
      observations: healthyObservations(),
      includeLiveCollectors: false,
    });
    const metrics = engine.getComplianceMetrics();
    expect(metrics.complianceRuns).toBeGreaterThan(0);
    expect(metrics.complianceScore).toBeGreaterThanOrEqual(0);
    expect(engine.getAuditLog().length).toBeGreaterThan(0);
  });
});

describe("Public API", () => {
  beforeEach(() => {
    resetValidationComplianceEngine();
    resetComplianceSourceRegistrationState();
  });

  afterEach(() => {
    resetValidationComplianceEngine();
    resetComplianceSourceRegistrationState();
  });

  it("exposes compliance helpers", () => {
    const engine = new ValidationComplianceEngine({
      complianceProfile: "institutional",
      ruleBookVersion: "1.0.0",
      confidenceThreshold: 0.5,
    });
    registerValidationComplianceEngine({ engine, force: true });

    const observations = healthyObservations();
    expect(
      runCompliance({ observations, includeLiveCollectors: false }).score
        .overall
    ).toBeGreaterThanOrEqual(0);
    expect(
      evaluatePolicies({ observations, includeLiveCollectors: false })
        .policyCoveragePercent
    ).toBeGreaterThan(0);
    expect(
      detectViolations({
        observations: nonCompliantObservations(),
        includeLiveCollectors: false,
      }).violations.length
    ).toBeGreaterThan(0);
    expect(
      generateComplianceReport({ observations, includeLiveCollectors: false })
        .summary.complianceScore
    ).toBeGreaterThanOrEqual(0);
    expect(getComplianceScore().overall).toBeGreaterThanOrEqual(0);
    expect(getComplianceMetrics().complianceRuns).toBeGreaterThan(0);
    expect(createComplianceSnapshot("api").snapshotId).toContain("comp:");
  });
});
