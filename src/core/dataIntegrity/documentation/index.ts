/**
 * Institutional Validation Documentation & Developer Experience Engine — public exports (Prompt 9F.31).
 */

export {
  DEFAULT_DOCUMENTATION_CONFIGURATION,
  resolveDocumentationConfiguration,
} from "./DocumentationConfiguration";

export type {
  DocumentationStyle,
  DocumentationStrictMode,
  DocumentationScoreWeights,
  DocumentationConfiguration,
  DocumentationConfigurationInput,
} from "./DocumentationConfiguration";

export {
  createDocumentationTargetId,
  registerDocumentationTarget,
  getDocumentationTarget,
  listDocumentationTargets,
  resetDocumentationRegistry,
} from "./DocumentationRegistry";

export type {
  DocumentationTargetKind,
  DocumentationTargetDefinition,
} from "./DocumentationRegistry";

export { buildDocument } from "./DocumentationDocument";
export type {
  DocumentationDocumentKind,
  DocumentationSection,
  DocumentationDocument,
} from "./DocumentationDocument";

export { ApiDocsGenerator } from "./ApiDocsGenerator";
export { ModuleDocsGenerator } from "./ModuleDocsGenerator";
export { RuleDocsGenerator } from "./RuleDocsGenerator";
export { ArchitectureDocsBuilder } from "./ArchitectureDocsBuilder";

export {
  DeveloperOnboardingGenerator,
  IntegrationGuideGenerator,
  ExtensionGuideGenerator,
  BestPracticesGenerator,
  ExampleRepositoryBuilder,
} from "./DeveloperGuideGenerators";

export {
  ChangelogGenerator,
  MigrationGuideGenerator,
} from "./ChangelogAndMigration";

export { DocumentationMetricsTracker } from "./DocumentationMetrics";
export type {
  DocumentationHealthScore,
  DocumentationOperationalMetrics,
} from "./DocumentationMetrics";

export { DocumentationAuditLogger } from "./DocumentationAuditLogger";
export type {
  DocumentationAuditEvent,
  DocumentationAuditEntry,
} from "./DocumentationAuditLogger";

export {
  createDocumentationSnapshotId,
  compareDocumentationSnapshots,
  buildDocumentationSnapshotPayload,
  DocumentationSnapshotStore,
} from "./DocumentationSnapshot";

export type {
  DocumentationSnapshotKind,
  DocumentationSnapshotPayload,
  DocumentationSnapshot,
  DocumentationSnapshotComparison,
} from "./DocumentationSnapshot";

export {
  ValidationDocumentationEngine,
  registerDocumentation,
  registerValidationDocumentationEngine,
  getValidationDocumentationEngine,
  resetValidationDocumentationEngine,
  registerBuiltinDocumentationTargets,
  generateApiDocs,
  generateArchitectureDocs,
  generateModuleDocs,
  generateRuleDocs,
  generateDeveloperGuide,
  generateIntegrationGuide,
  generateMigrationGuide,
  generateDocumentationSnapshot,
  getDocumentationMetrics,
} from "./ValidationDocumentationEngine";

export type {
  GenerateDocsOptions,
  DocumentationRegistrationResult,
} from "./ValidationDocumentationEngine";
