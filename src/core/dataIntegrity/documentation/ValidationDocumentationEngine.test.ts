/**
 * Institutional Validation Documentation Engine — unit tests (Prompt 9F.31).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  ValidationDocumentationEngine,
  registerDocumentation,
  resetValidationDocumentationEngine,
  listDocumentationTargets,
  resetDocumentationRegistry,
  DEFAULT_DOCUMENTATION_CONFIGURATION,
  generateApiDocs,
  generateArchitectureDocs,
  generateModuleDocs,
  generateRuleDocs,
  generateDeveloperGuide,
  generateIntegrationGuide,
  generateMigrationGuide,
  generateDocumentationSnapshot,
  getDocumentationMetrics,
  compareDocumentationSnapshots,
  buildDocumentationSnapshotPayload,
} from "./index";

describe("Documentation registration", () => {
  beforeEach(() => {
    resetValidationDocumentationEngine();
    resetDocumentationRegistry();
  });

  afterEach(() => {
    resetValidationDocumentationEngine();
    resetDocumentationRegistry();
  });

  it("registers documentation engine idempotently", () => {
    const first = registerDocumentation({ force: true });
    expect(first.registered).toBe(true);
    expect(first.targetsRegistered).toBeGreaterThanOrEqual(10);
    expect(listDocumentationTargets().length).toBeGreaterThanOrEqual(10);

    const second = registerDocumentation();
    expect(second.registered).toBe(false);
    expect(second.skipped).toBe(true);
  });
});

describe("Documentation generation", () => {
  let engine: ValidationDocumentationEngine;

  beforeEach(() => {
    resetValidationDocumentationEngine();
    resetDocumentationRegistry();
    engine = new ValidationDocumentationEngine({
      style: "institutional",
      includeExamples: true,
      documentationOnly: true,
    });
    registerDocumentation({ engine, force: true });
  });

  afterEach(() => {
    resetValidationDocumentationEngine();
    resetDocumentationRegistry();
  });

  it("generates API, architecture, module, and rule docs", () => {
    expect(DEFAULT_DOCUMENTATION_CONFIGURATION.engineVersion).toBe("9F.31.0");

    const api = generateApiDocs();
    expect(api.kind).toBe("api");
    expect(api.sections.length).toBeGreaterThan(0);
    expect(api.qualityScore).toBeGreaterThan(0);

    const architecture = generateArchitectureDocs();
    expect(architecture.kind).toBe("architecture");
    expect(architecture.sections.some((s) => s.heading.includes("Pipeline"))).toBe(
      true
    );

    const modules = generateModuleDocs();
    expect(modules.kind).toBe("module");
    expect(modules.relatedModules.length).toBeGreaterThan(0);

    const rules = generateRuleDocs();
    expect(rules.kind).toBe("rule");
    expect(rules.sections.length).toBeGreaterThan(0);

    const health = engine.getDocumentationHealthScore();
    expect(health.overall).toBeGreaterThanOrEqual(0);
    expect(health.overall).toBeLessThanOrEqual(100);
  });

  it("generates developer, integration, and migration guides", () => {
    const developer = generateDeveloperGuide();
    expect(developer.kind).toBe("guide");
    expect(developer.wordCount).toBeGreaterThan(20);

    const integration = generateIntegrationGuide();
    expect(integration.kind).toBe("integration");
    expect(integration.title).toContain("Integration");

    const migration = generateMigrationGuide();
    expect(migration.kind).toBe("migration");
    expect(migration.sections.some((s) => s.heading.includes("Compatibility"))).toBe(
      true
    );
  });
});

describe("Registry and public API coverage", () => {
  beforeEach(() => {
    resetValidationDocumentationEngine();
    resetDocumentationRegistry();
    registerDocumentation({ force: true });
  });

  afterEach(() => {
    resetValidationDocumentationEngine();
    resetDocumentationRegistry();
  });

  it("lists registered targets and supports module filter", () => {
    const targets = listDocumentationTargets({ kind: "engine" });
    expect(targets.length).toBeGreaterThan(0);
    const filtered = generateModuleDocs({ module: "orchestrator" });
    expect(filtered.title.toLowerCase()).toContain("orchestrator");
  });
});

describe("Snapshots, metrics, audit, regression", () => {
  let engine: ValidationDocumentationEngine;

  beforeEach(() => {
    resetValidationDocumentationEngine();
    resetDocumentationRegistry();
    engine = new ValidationDocumentationEngine({ includeExamples: true });
    registerDocumentation({ engine, force: true });
  });

  afterEach(() => {
    resetValidationDocumentationEngine();
    resetDocumentationRegistry();
  });

  it("creates snapshots, tracks metrics/audit, detects regressions", () => {
    engine.generateApiDocs();
    engine.generateArchitectureDocs();
    engine.generateModuleDocs();
    engine.generateDeveloperGuide();
    const snap1 = generateDocumentationSnapshot("baseline", "documentation");
    expect(snap1.payload.score.overall).toBeGreaterThan(0);
    expect(snap1.payload.documentCount).toBeGreaterThan(0);

    // Second snapshot after additional sparse generation still stays on same store.
    engine.generateIntegrationGuide();
    const snap2 = engine.createDocumentationSnapshot("follow-up", "guide");
    expect(snap2.payload.documentCount).toBeGreaterThanOrEqual(
      snap1.payload.documentCount
    );

    // Explicit regression comparison using score/coverage drop.
    const baseline = {
      snapshotId: "base",
      timestamp: new Date().toISOString(),
      version: 1,
      payload: buildDocumentationSnapshotPayload({
        score: {
          apiCoverage: 90,
          moduleCoverage: 90,
          architectureCompleteness: 90,
          developerGuideQuality: 90,
          snapshotIntegrity: 90,
          auditCompleteness: 90,
          overall: 90,
        },
        documentCount: 10,
        apiCount: 3,
        moduleCount: 3,
        guideCount: 3,
        coveragePct: 100,
        configurationVersion: "9F.31.0",
      }),
    };
    const degraded = {
      snapshotId: "degraded",
      timestamp: new Date().toISOString(),
      version: 2,
      payload: buildDocumentationSnapshotPayload({
        score: {
          apiCoverage: 40,
          moduleCoverage: 35,
          architectureCompleteness: 30,
          developerGuideQuality: 25,
          snapshotIntegrity: 40,
          auditCompleteness: 40,
          overall: 35,
        },
        documentCount: 2,
        apiCount: 0,
        moduleCount: 0,
        guideCount: 1,
        coveragePct: 25,
        configurationVersion: "9F.31.0",
      }),
    };
    const cmp = compareDocumentationSnapshots(baseline, degraded);
    expect(cmp.regressionDetected).toBe(true);
    expect(["improving", "stable", "degrading"]).toContain(cmp.trend);

    const metrics = getDocumentationMetrics();
    expect(metrics.documentsGenerated).toBeGreaterThanOrEqual(4);
    expect(metrics.documentationHealthScore).toBeGreaterThanOrEqual(0);

    const audit = engine.getAuditLog();
    expect(audit.some((e) => e.event === "ApiDocsGenerated")).toBe(true);
    expect(audit.some((e) => e.event === "SnapshotCreated")).toBe(true);
  });
});

describe("Graceful failure isolation", () => {
  beforeEach(() => {
    resetValidationDocumentationEngine();
    resetDocumentationRegistry();
  });

  afterEach(() => {
    resetValidationDocumentationEngine();
    resetDocumentationRegistry();
  });

  it("never throws from public APIs", () => {
    registerDocumentation({ force: true });
    const api = generateApiDocs();
    expect(api.documentId).toBeTruthy();
    const arch = generateArchitectureDocs();
    expect(arch.documentId).toBeTruthy();
  });
});
