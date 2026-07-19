/**
 * Institutional Validation Documentation & Developer Experience Engine — façade (Prompt 9F.31).
 * Documentation-only: never modifies validation engines, RuleEngine, or outcomes.
 */

import {
  DEFAULT_DOCUMENTATION_CONFIGURATION,
  resolveDocumentationConfiguration,
  type DocumentationConfiguration,
  type DocumentationConfigurationInput,
} from "./DocumentationConfiguration";
import {
  areBuiltinDocumentationTargetsRegistered,
  createDocumentationTargetId,
  listDocumentationTargets,
  markBuiltinDocumentationTargetsRegistered,
  registerDocumentationTarget,
  resetDocumentationRegistry,
  type DocumentationTargetDefinition,
  type DocumentationTargetKind,
} from "./DocumentationRegistry";
import { ApiDocsGenerator } from "./ApiDocsGenerator";
import { ModuleDocsGenerator } from "./ModuleDocsGenerator";
import { RuleDocsGenerator } from "./RuleDocsGenerator";
import { ArchitectureDocsBuilder } from "./ArchitectureDocsBuilder";
import {
  BestPracticesGenerator,
  DeveloperOnboardingGenerator,
  ExampleRepositoryBuilder,
  ExtensionGuideGenerator,
  IntegrationGuideGenerator,
} from "./DeveloperGuideGenerators";
import {
  ChangelogGenerator,
  MigrationGuideGenerator,
} from "./ChangelogAndMigration";
import type { DocumentationDocument } from "./DocumentationDocument";
import {
  DocumentationMetricsTracker,
  type DocumentationHealthScore,
  type DocumentationOperationalMetrics,
} from "./DocumentationMetrics";
import { DocumentationAuditLogger } from "./DocumentationAuditLogger";
import {
  DocumentationSnapshotStore,
  buildDocumentationSnapshotPayload,
  compareDocumentationSnapshots,
  type DocumentationSnapshot,
  type DocumentationSnapshotComparison,
  type DocumentationSnapshotKind,
} from "./DocumentationSnapshot";
import { safePublishEvent } from "../events/ValidationEventBus";

export type { DocumentationHealthScore };

export interface GenerateDocsOptions {
  module?: string;
}

let defaultEngine: ValidationDocumentationEngine | null = null;
let engineRegistered = false;

export class ValidationDocumentationEngine {
  private config: DocumentationConfiguration;
  private readonly apiDocs = new ApiDocsGenerator();
  private readonly moduleDocs = new ModuleDocsGenerator();
  private readonly ruleDocs = new RuleDocsGenerator();
  private readonly architecture = new ArchitectureDocsBuilder();
  private readonly onboarding = new DeveloperOnboardingGenerator();
  private readonly integration = new IntegrationGuideGenerator();
  private readonly extension = new ExtensionGuideGenerator();
  private readonly bestPractices = new BestPracticesGenerator();
  private readonly examples = new ExampleRepositoryBuilder();
  private readonly changelog = new ChangelogGenerator();
  private readonly migration = new MigrationGuideGenerator();
  private readonly metrics = new DocumentationMetricsTracker();
  private audit: DocumentationAuditLogger;
  private snapshots: DocumentationSnapshotStore;
  private readonly documents: DocumentationDocument[] = [];
  private lastHealthScore: DocumentationHealthScore | null = null;

  constructor(configInput?: DocumentationConfigurationInput) {
    this.config = resolveDocumentationConfiguration(configInput);
    this.audit = new DocumentationAuditLogger(this.config.maxAuditEntries);
    this.snapshots = new DocumentationSnapshotStore(
      this.config.snapshotRetention
    );
  }

  getConfiguration(): DocumentationConfiguration {
    return resolveDocumentationConfiguration(this.config);
  }

  updateConfiguration(input: DocumentationConfigurationInput): void {
    this.config = resolveDocumentationConfiguration({
      ...this.config,
      ...input,
      scoreWeights: {
        ...this.config.scoreWeights,
        ...input.scoreWeights,
      },
    });
    this.audit.setMaxEntries(this.config.maxAuditEntries);
    this.snapshots.setRetention(this.config.snapshotRetention);
  }

  registerTarget(
    definition: Omit<DocumentationTargetDefinition, "registeredAt"> & {
      registeredAt?: string;
    },
    options?: { force?: boolean }
  ) {
    return registerDocumentationTarget(definition, options);
  }

  generateApiDocs(): DocumentationDocument {
    return this.track("api", "ApiDocsGenerated", () =>
      this.apiDocs.generate(listDocumentationTargets(), this.config)
    );
  }

  generateArchitectureDocs(): DocumentationDocument {
    return this.track("architecture", "ArchitectureDocsGenerated", () =>
      this.architecture.generateArchitecture(
        listDocumentationTargets(),
        this.config
      )
    );
  }

  generateModuleDocs(options: GenerateDocsOptions = {}): DocumentationDocument {
    return this.track("module", "ModuleDocsGenerated", () =>
      this.moduleDocs.generate(
        listDocumentationTargets(),
        this.config,
        options.module
      )
    );
  }

  generateRuleDocs(): DocumentationDocument {
    return this.track("other", "RuleDocsGenerated", () =>
      this.ruleDocs.generate(listDocumentationTargets(), this.config)
    );
  }

  generateDeveloperGuide(): DocumentationDocument {
    const started = Date.now();
    try {
      const targets = listDocumentationTargets();
      const onboarding = this.onboarding.generate(targets, this.config);
      const extension = this.extension.generate();
      const practices = this.bestPractices.generate(this.config);
      const examples = this.examples.generate(targets, this.config);
      const changelog = this.changelog.generate(
        targets,
        this.config.engineVersion
      );

      const guide: DocumentationDocument = {
        documentId: `doc:developer:${Date.now()}`,
        kind: "guide",
        title: "Developer Guide",
        summary:
          "Combined developer onboarding, extension, best practices, examples, and changelog.",
        sections: [
          ...onboarding.sections,
          ...extension.sections,
          ...practices.sections,
          ...examples.sections,
          ...changelog.sections,
        ],
        relatedModules: [
          ...new Set([
            ...onboarding.relatedModules,
            ...extension.relatedModules,
            ...practices.relatedModules,
          ]),
        ],
        generatedAt: new Date().toISOString(),
        wordCount:
          onboarding.wordCount +
          extension.wordCount +
          practices.wordCount +
          examples.wordCount +
          changelog.wordCount,
        qualityScore: clamp(
          Math.round(
            (onboarding.qualityScore +
              extension.qualityScore +
              practices.qualityScore +
              examples.qualityScore) /
              4
          ),
          0,
          100
        ),
        warnings: [
          ...onboarding.warnings,
          ...extension.warnings,
          ...practices.warnings,
          ...examples.warnings,
        ],
        errors: [
          ...onboarding.errors,
          ...extension.errors,
          ...practices.errors,
          ...examples.errors,
        ],
      };

      return this.finalize("guide", "GuideGenerated", guide, started);
    } catch (err) {
      return this.finalize(
        "guide",
        "Error",
        {
          documentId: `doc:developer:error:${Date.now()}`,
          kind: "guide",
          title: "Developer Guide",
          summary: "Developer guide unavailable",
          sections: [],
          relatedModules: [],
          generatedAt: new Date().toISOString(),
          wordCount: 0,
          qualityScore: 0,
          warnings: [],
          errors: [`generateDeveloperGuide failed: ${String(err)}`],
        },
        started
      );
    }
  }

  generateIntegrationGuide(): DocumentationDocument {
    return this.track("guide", "GuideGenerated", () =>
      this.integration.generate(listDocumentationTargets())
    );
  }

  generateMigrationGuide(): DocumentationDocument {
    return this.track("guide", "GuideGenerated", () =>
      this.migration.generate(listDocumentationTargets())
    );
  }

  /** Extra generators exposed for completeness (pipeline/deps/config/lifecycle). */
  generatePipelineDocs(): DocumentationDocument {
    return this.track("architecture", "DocsGenerated", () =>
      this.architecture.generatePipeline(listDocumentationTargets())
    );
  }

  generateDependencyDocs(): DocumentationDocument {
    return this.track("architecture", "DocsGenerated", () =>
      this.architecture.generateDependencies(listDocumentationTargets())
    );
  }

  generateConfigurationDocs(): DocumentationDocument {
    return this.track("other", "DocsGenerated", () =>
      this.architecture.generateConfiguration(this.config)
    );
  }

  generateLifecycleDocs(): DocumentationDocument {
    return this.track("other", "DocsGenerated", () =>
      this.architecture.generateLifecycle()
    );
  }

  createDocumentationSnapshot(
    label?: string,
    kind: DocumentationSnapshotKind = "documentation"
  ): DocumentationSnapshot {
    const started = Date.now();
    try {
      const score = this.computeHealthScore();
      this.lastHealthScore = score;
      const metrics = this.metrics.getMetrics();
      const coveragePct = clamp(
        Math.round(
          ((metrics.apiDocs > 0 ? 1 : 0) +
            (metrics.moduleDocs > 0 ? 1 : 0) +
            (metrics.architectureDocs > 0 ? 1 : 0) +
            (metrics.guideDocs > 0 ? 1 : 0)) *
            25
        ),
        0,
        100
      );
      const payload = buildDocumentationSnapshotPayload({
        kind,
        score,
        documentCount: this.documents.length,
        apiCount: metrics.apiDocs,
        moduleCount: metrics.moduleDocs,
        guideCount: metrics.guideDocs,
        coveragePct,
        configurationVersion: this.config.engineVersion,
      });
      const snapshot = this.snapshots.save(payload, label);
      this.metrics.setSnapshotCount(this.snapshots.size);
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "SnapshotCreated",
        documentationHealthScore: score.overall,
        scoreBreakdown: score,
        executionTimeMs: Date.now() - started,
        warnings: [],
        errors: [],
        engineVersion: this.config.engineVersion,
      });
      return snapshot;
    } catch {
      return this.snapshots.save(
        buildDocumentationSnapshotPayload({
          kind,
          score: zeroScore(),
          documentCount: 0,
          apiCount: 0,
          moduleCount: 0,
          guideCount: 0,
          coveragePct: 0,
          configurationVersion: this.config.engineVersion,
        }),
        label ?? "error"
      );
    }
  }

  compareDocumentationSnapshots(
    baselineId: string,
    compareId: string
  ): DocumentationSnapshotComparison | null {
    const a = this.snapshots.load(baselineId);
    const b = this.snapshots.load(compareId);
    if (!a || !b) return null;
    return compareDocumentationSnapshots(a, b);
  }

  listSnapshots(): DocumentationSnapshot[] {
    return this.snapshots.list();
  }

  listDocuments(): DocumentationDocument[] {
    return this.documents.map(cloneDoc);
  }

  getDocumentationMetrics(): DocumentationOperationalMetrics {
    this.metrics.setSnapshotCount(this.snapshots.size);
    return this.metrics.getMetrics();
  }

  getDocumentationHealthScore(): DocumentationHealthScore {
    return this.lastHealthScore ?? this.computeHealthScore();
  }

  getAuditLog(limit?: number) {
    return this.audit.getLog(limit);
  }

  resetOperationalState(): void {
    this.metrics.reset();
    this.audit.reset();
    this.snapshots.clear();
    this.documents.length = 0;
    this.lastHealthScore = null;
  }

  private track(
    kind: "api" | "module" | "architecture" | "guide" | "other",
    event:
      | "DocsGenerated"
      | "ApiDocsGenerated"
      | "ArchitectureDocsGenerated"
      | "ModuleDocsGenerated"
      | "RuleDocsGenerated"
      | "GuideGenerated"
      | "Error",
    fn: () => DocumentationDocument
  ): DocumentationDocument {
    const started = Date.now();
    try {
      if (!this.config.documentationOnly) {
        throw new Error("Documentation engine requires documentationOnly=true");
      }
      const doc = fn();
      return this.finalize(kind, event, doc, started);
    } catch (err) {
      return this.finalize(
        kind,
        "Error",
        {
          documentId: `doc:error:${Date.now()}`,
          kind: "guide",
          title: "Documentation Error",
          summary: "Documentation generation failed",
          sections: [],
          relatedModules: [],
          generatedAt: new Date().toISOString(),
          wordCount: 0,
          qualityScore: 0,
          warnings: [],
          errors: [String(err)],
        },
        started
      );
    }
  }

  private finalize(
    kind: "api" | "module" | "architecture" | "guide" | "other",
    event:
      | "DocsGenerated"
      | "ApiDocsGenerated"
      | "ArchitectureDocsGenerated"
      | "ModuleDocsGenerated"
      | "RuleDocsGenerated"
      | "GuideGenerated"
      | "Error",
    doc: DocumentationDocument,
    started: number
  ): DocumentationDocument {
    this.documents.push(cloneDoc(doc));
    if (this.documents.length > this.config.maxDocuments) {
      this.documents.splice(0, this.documents.length - this.config.maxDocuments);
    }

    const score = this.computeHealthScore(doc.qualityScore);
    this.lastHealthScore = score;
    this.metrics.recordGeneration({
      kind,
      runtimeMs: Date.now() - started,
      healthScore: score.overall,
    });
    this.metrics.setSnapshotCount(this.snapshots.size);

    this.audit.append({
      timestamp: new Date().toISOString(),
      event,
      documentId: doc.documentId,
      documentationHealthScore: score.overall,
      scoreBreakdown: score,
      executionTimeMs: Date.now() - started,
      warnings: doc.warnings,
      errors: doc.errors,
      engineVersion: this.config.engineVersion,
    });
    this.audit.append({
      timestamp: new Date().toISOString(),
      event: "DocumentationScoreComputed",
      documentId: doc.documentId,
      documentationHealthScore: score.overall,
      scoreBreakdown: score,
      executionTimeMs: 0,
      warnings: [],
      errors: [],
      engineVersion: this.config.engineVersion,
    });

    safePublishEvent({
      eventType: "WarningRaised",
      module: "documentation",
      source: "documentation-engine",
      severity: doc.errors.length > 0 ? "WARNING" : "INFO",
      payload: {
        documentId: doc.documentId,
        kind: doc.kind,
        documentationOnly: true,
        noValidationMutation: true,
        healthScore: score.overall,
      },
      executionTimeMs: Date.now() - started,
    });

    return cloneDoc(doc);
  }

  private computeHealthScore(lastQuality = 80): DocumentationHealthScore {
    const w = this.config.scoreWeights;
    const metrics = this.metrics.getMetrics();
    const targets = listDocumentationTargets();
    const moduleTargets = targets.filter(
      (t) => t.kind === "module" || t.kind === "engine"
    );
    const apiTargets = targets.filter((t) => t.publicApi.length > 0);

    const apiCoverage = clamp(
      Math.round(
        (apiTargets.length === 0 ? 0 : Math.min(1, metrics.apiDocs / 1)) * 70 +
          Math.min(30, apiTargets.length * 2)
      ),
      0,
      100
    );
    const moduleCoverage = clamp(
      Math.round(
        (moduleTargets.length === 0
          ? 0
          : Math.min(1, metrics.moduleDocs / 1)) *
          70 +
          Math.min(30, moduleTargets.length * 2)
      ),
      0,
      100
    );
    const architectureCompleteness = clamp(
      metrics.architectureDocs > 0 ? 85 + Math.min(15, metrics.architectureDocs * 3) : 35,
      0,
      100
    );
    const developerGuideQuality = clamp(
      metrics.guideDocs > 0
        ? Math.round((lastQuality + 70) / 2 + Math.min(15, metrics.guideDocs * 3))
        : 40,
      0,
      100
    );
    const snapshotIntegrity = clamp(
      this.snapshots.size > 0 ? 80 + Math.min(20, this.snapshots.size * 4) : 50,
      0,
      100
    );
    const auditCompleteness = this.audit.completenessScore();

    const overall = clamp(
      Math.round(
        apiCoverage * w.apiCoverage +
          moduleCoverage * w.moduleCoverage +
          architectureCompleteness * w.architectureCompleteness +
          developerGuideQuality * w.developerGuideQuality +
          snapshotIntegrity * w.snapshotIntegrity +
          auditCompleteness * w.auditCompleteness
      ),
      0,
      100
    );

    const score: DocumentationHealthScore = {
      apiCoverage,
      moduleCoverage,
      architectureCompleteness,
      developerGuideQuality,
      snapshotIntegrity,
      auditCompleteness,
      overall,
    };
    this.metrics.setHealthScore(overall);
    return score;
  }
}

function cloneDoc(doc: DocumentationDocument): DocumentationDocument {
  return {
    ...doc,
    sections: doc.sections.map((s) => ({
      ...s,
      bullets: s.bullets ? [...s.bullets] : undefined,
    })),
    relatedModules: [...doc.relatedModules],
    warnings: [...doc.warnings],
    errors: [...doc.errors],
  };
}

function zeroScore(): DocumentationHealthScore {
  return {
    apiCoverage: 0,
    moduleCoverage: 0,
    architectureCompleteness: 0,
    developerGuideQuality: 0,
    snapshotIntegrity: 0,
    auditCompleteness: 0,
    overall: 0,
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

const BUILTIN_TARGETS: Array<{
  kind: DocumentationTargetKind;
  name: string;
  module: string;
  description: string;
  publicApi: string[];
  dependencies: string[];
  version: string;
}> = [
  { kind: "engine", name: "Integrity Engine", module: "integrity", description: "Core data integrity validation and scoring.", publicApi: ["validate", "validateBatch", "getMetrics"], dependencies: [], version: "9F.1.0" },
  { kind: "engine", name: "Rule Engine", module: "rules", description: "Advanced rule execution framework.", publicApi: ["executeRules", "registerRules"], dependencies: ["integrity"], version: "9F.2.0" },
  { kind: "engine", name: "Validation Orchestrator", module: "orchestrator", description: "Unified validation API and pipelines.", publicApi: ["validate", "validateBatch", "executePipeline"], dependencies: ["integrity", "rules"], version: "9F.12.0" },
  { kind: "engine", name: "Trust Engine", module: "trust", description: "Institutional trust scoring.", publicApi: ["calculateTrustScore", "getTrustMetrics"], dependencies: ["integrity"], version: "9F.10.0" },
  { kind: "engine", name: "Analytics Engine", module: "analytics", description: "Validation analytics and trends.", publicApi: ["getAnalyticsSummary", "createAnalyticsSnapshot"], dependencies: ["orchestrator"], version: "9F.14.0" },
  { kind: "engine", name: "Performance Engine", module: "performance", description: "Benchmark and capacity planning.", publicApi: ["runBenchmark", "analyzeCapacity"], dependencies: ["observability"], version: "9F.26.0" },
  { kind: "engine", name: "Explainability Engine", module: "explainability", description: "Decision traces and explanations.", publicApi: ["traceDecision", "generateExplanation"], dependencies: ["rules", "trust"], version: "9F.27.0" },
  { kind: "engine", name: "Simulation Engine", module: "simulation", description: "Sandboxed scenario testing.", publicApi: ["runScenario", "runMonteCarlo"], dependencies: ["performance", "analytics"], version: "9F.28.0" },
  { kind: "engine", name: "Learning Engine", module: "learning", description: "Advisory continuous improvement.", publicApi: ["collectFeedback", "generateImprovements"], dependencies: ["analytics", "simulation"], version: "9F.29.0" },
  { kind: "engine", name: "Release Engine", module: "release", description: "Production readiness certification.", publicApi: ["evaluateReadiness", "certifyRelease"], dependencies: ["compliance", "security", "versioning"], version: "9F.30.0" },
  { kind: "engine", name: "Documentation Engine", module: "documentation", description: "Documentation and developer experience.", publicApi: ["generateApiDocs", "generateDeveloperGuide"], dependencies: ["orchestrator"], version: "9F.31.0" },
  { kind: "api", name: "Validation Event Bus API", module: "events", description: "Event publish/subscribe monitoring bus.", publicApi: ["publishEvent", "subscribe", "getEventMetrics"], dependencies: ["orchestrator"], version: "9F.13.0" },
  { kind: "module", name: "Compliance Module", module: "compliance", description: "Compliance and governance checks.", publicApi: ["runCompliance", "getComplianceScore"], dependencies: ["admin"], version: "9F.22.0" },
  { kind: "module", name: "Security Module", module: "security", description: "Access control and authorization.", publicApi: ["authorize", "validateAccess"], dependencies: ["admin"], version: "9F.25.0" },
  { kind: "pipeline", name: "Default Validation Pipeline", module: "orchestrator", description: "Standard multi-stage validation pipeline.", publicApi: ["executePipeline"], dependencies: ["rules", "integrity"], version: "1.0.0" },
];

export function registerBuiltinDocumentationTargets(options?: {
  force?: boolean;
}): { registered: number; skipped: number; total: number } {
  if (areBuiltinDocumentationTargetsRegistered() && !options?.force) {
    return {
      registered: 0,
      skipped: listDocumentationTargets().length,
      total: listDocumentationTargets().length,
    };
  }
  let added = 0;
  let skipped = 0;
  for (const t of BUILTIN_TARGETS) {
    const result = registerDocumentationTarget(
      {
        targetId: createDocumentationTargetId(t.kind, t.module + ":" + t.name),
        kind: t.kind,
        name: t.name,
        module: t.module,
        description: t.description,
        publicApi: t.publicApi,
        dependencies: t.dependencies,
        version: t.version,
        metadata: { integration: "read-only", sprint: "9F.31" },
      },
      { force: options?.force }
    );
    if (result.registered) added += 1;
    else skipped += 1;
  }
  markBuiltinDocumentationTargetsRegistered();
  return {
    registered: added,
    skipped,
    total: listDocumentationTargets().length,
  };
}

export interface DocumentationRegistrationResult {
  registered: boolean;
  skipped: boolean;
  targetsRegistered: number;
}

export function registerDocumentation(options?: {
  engine?: ValidationDocumentationEngine;
  config?: DocumentationConfigurationInput;
  force?: boolean;
}): DocumentationRegistrationResult {
  return registerValidationDocumentationEngine(options);
}

export function registerValidationDocumentationEngine(options?: {
  engine?: ValidationDocumentationEngine;
  config?: DocumentationConfigurationInput;
  force?: boolean;
}): DocumentationRegistrationResult {
  if (engineRegistered && !options?.force) {
    return {
      registered: false,
      skipped: true,
      targetsRegistered: listDocumentationTargets().length,
    };
  }

  if (options?.engine) {
    defaultEngine = options.engine;
  } else if (!defaultEngine || options?.config || options?.force) {
    defaultEngine = new ValidationDocumentationEngine(options?.config);
  }

  const builtins = registerBuiltinDocumentationTargets({
    force: options?.force,
  });
  engineRegistered = true;
  return {
    registered: true,
    skipped: false,
    targetsRegistered: builtins.total,
  };
}

export function getValidationDocumentationEngine(
  options?: DocumentationConfigurationInput
): ValidationDocumentationEngine {
  if (!defaultEngine || options) {
    defaultEngine = new ValidationDocumentationEngine(options);
    registerBuiltinDocumentationTargets();
  }
  return defaultEngine;
}

export function resetValidationDocumentationEngine(): void {
  if (defaultEngine) defaultEngine.resetOperationalState();
  defaultEngine = null;
  engineRegistered = false;
  resetDocumentationRegistry();
}

/** Public API convenience wrappers. */
export function generateApiDocs() {
  registerDocumentation();
  return getValidationDocumentationEngine().generateApiDocs();
}

export function generateArchitectureDocs() {
  registerDocumentation();
  return getValidationDocumentationEngine().generateArchitectureDocs();
}

export function generateModuleDocs(options?: GenerateDocsOptions) {
  registerDocumentation();
  return getValidationDocumentationEngine().generateModuleDocs(options);
}

export function generateRuleDocs() {
  registerDocumentation();
  return getValidationDocumentationEngine().generateRuleDocs();
}

export function generateDeveloperGuide() {
  registerDocumentation();
  return getValidationDocumentationEngine().generateDeveloperGuide();
}

export function generateIntegrationGuide() {
  registerDocumentation();
  return getValidationDocumentationEngine().generateIntegrationGuide();
}

export function generateMigrationGuide() {
  registerDocumentation();
  return getValidationDocumentationEngine().generateMigrationGuide();
}

export function generateDocumentationSnapshot(
  label?: string,
  kind?: DocumentationSnapshotKind
) {
  registerDocumentation();
  return getValidationDocumentationEngine().createDocumentationSnapshot(
    label,
    kind
  );
}

export function getDocumentationMetrics() {
  registerDocumentation();
  return getValidationDocumentationEngine().getDocumentationMetrics();
}

export {
  DEFAULT_DOCUMENTATION_CONFIGURATION,
  resolveDocumentationConfiguration,
};
