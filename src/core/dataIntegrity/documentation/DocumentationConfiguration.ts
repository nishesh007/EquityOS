/**
 * Institutional Validation Documentation — configuration.
 * Style, depth, retention, and score weights live here; no magic numbers elsewhere.
 */

export type DocumentationStyle =
  | "concise"
  | "standard"
  | "detailed"
  | "institutional";

export type DocumentationStrictMode = "strict" | "relaxed";

export interface DocumentationScoreWeights {
  apiCoverage: number;
  moduleCoverage: number;
  architectureCompleteness: number;
  developerGuideQuality: number;
  snapshotIntegrity: number;
  auditCompleteness: number;
}

export interface DocumentationConfiguration {
  mode: DocumentationStrictMode;
  engineVersion: string;
  style: DocumentationStyle;
  includeExamples: boolean;
  includeDeprecated: boolean;
  snapshotRetention: number;
  auditRetention: number;
  maxAuditEntries: number;
  maxDocuments: number;
  institutionalMode: boolean;
  documentationOnly: boolean;
  scoreWeights: DocumentationScoreWeights;
}

export const DEFAULT_DOCUMENTATION_CONFIGURATION: DocumentationConfiguration = {
  mode: "strict",
  engineVersion: "9F.31.0",
  style: "institutional",
  includeExamples: true,
  includeDeprecated: false,
  snapshotRetention: 100,
  auditRetention: 1_000,
  maxAuditEntries: 500,
  maxDocuments: 500,
  institutionalMode: true,
  documentationOnly: true,
  scoreWeights: {
    apiCoverage: 0.25,
    moduleCoverage: 0.2,
    architectureCompleteness: 0.2,
    developerGuideQuality: 0.15,
    snapshotIntegrity: 0.1,
    auditCompleteness: 0.1,
  },
};

export type DocumentationConfigurationInput = Partial<
  Omit<DocumentationConfiguration, "scoreWeights">
> & {
  scoreWeights?: Partial<DocumentationScoreWeights>;
};

export function resolveDocumentationConfiguration(
  input?: DocumentationConfigurationInput
): DocumentationConfiguration {
  const base = DEFAULT_DOCUMENTATION_CONFIGURATION;
  return {
    ...base,
    ...input,
    scoreWeights: {
      ...base.scoreWeights,
      ...input?.scoreWeights,
    },
    snapshotRetention: Math.max(
      1,
      input?.snapshotRetention ?? base.snapshotRetention
    ),
    auditRetention: Math.max(1, input?.auditRetention ?? base.auditRetention),
    maxAuditEntries: Math.max(
      1,
      input?.maxAuditEntries ?? base.maxAuditEntries
    ),
    maxDocuments: Math.max(1, input?.maxDocuments ?? base.maxDocuments),
  };
}
