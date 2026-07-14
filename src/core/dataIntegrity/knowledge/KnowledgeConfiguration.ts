/**
 * Institutional Validation Knowledge Graph — configuration.
 * Depth, limits, relationship types, and score weights live here; no magic numbers elsewhere.
 */

export type KnowledgeStrictMode = "strict" | "relaxed";

export interface KnowledgeScoreWeights {
  relationshipCoverage: number;
  dependencyAccuracy: number;
  impactAccuracy: number;
  graphCompleteness: number;
  queryReliability: number;
  evidenceQuality: number;
}

export type KnowledgeRelationshipType =
  | "DEPENDS_ON"
  | "USES"
  | "PRODUCES"
  | "CONSUMES"
  | "TRIGGERS"
  | "OBSERVES"
  | "OPTIMIZES"
  | "AUDITS"
  | "REPORTS"
  | "CORRELATES"
  | "REFERENCES"
  | "CUSTOM"
  | (string & {});

export interface KnowledgeConfiguration {
  mode: KnowledgeStrictMode;
  engineVersion: string;
  graphDepth: number;
  queryLimit: number;
  relationshipTypes: KnowledgeRelationshipType[];
  snapshotRetention: number;
  auditRetention: number;
  maxAuditEntries: number;
  maxNodes: number;
  maxEdges: number;
  confidenceThreshold: number;
  strictMode: boolean;
  institutionalMode: boolean;
  scoreWeights: KnowledgeScoreWeights;
}

export const DEFAULT_KNOWLEDGE_CONFIGURATION: KnowledgeConfiguration = {
  mode: "strict",
  engineVersion: "9F.23.0",
  graphDepth: 6,
  queryLimit: 100,
  relationshipTypes: [
    "DEPENDS_ON",
    "USES",
    "PRODUCES",
    "CONSUMES",
    "TRIGGERS",
    "OBSERVES",
    "OPTIMIZES",
    "AUDITS",
    "REPORTS",
    "CORRELATES",
    "REFERENCES",
    "CUSTOM",
  ],
  snapshotRetention: 100,
  auditRetention: 1_000,
  maxAuditEntries: 500,
  maxNodes: 5_000,
  maxEdges: 20_000,
  confidenceThreshold: 0.55,
  strictMode: true,
  institutionalMode: true,
  scoreWeights: {
    relationshipCoverage: 0.25,
    dependencyAccuracy: 0.2,
    impactAccuracy: 0.2,
    graphCompleteness: 0.15,
    queryReliability: 0.1,
    evidenceQuality: 0.1,
  },
};

export type KnowledgeConfigurationInput = Partial<
  Omit<KnowledgeConfiguration, "scoreWeights" | "relationshipTypes">
> & {
  scoreWeights?: Partial<KnowledgeScoreWeights>;
  relationshipTypes?: KnowledgeRelationshipType[];
};

export function resolveKnowledgeConfiguration(
  input?: KnowledgeConfigurationInput
): KnowledgeConfiguration {
  const base = DEFAULT_KNOWLEDGE_CONFIGURATION;
  return {
    ...base,
    ...input,
    relationshipTypes: input?.relationshipTypes
      ? [...input.relationshipTypes]
      : [...base.relationshipTypes],
    scoreWeights: {
      ...base.scoreWeights,
      ...input?.scoreWeights,
    },
    graphDepth: Math.max(1, input?.graphDepth ?? base.graphDepth),
    queryLimit: Math.max(1, input?.queryLimit ?? base.queryLimit),
    snapshotRetention: Math.max(
      1,
      input?.snapshotRetention ?? base.snapshotRetention
    ),
    auditRetention: Math.max(1, input?.auditRetention ?? base.auditRetention),
    maxAuditEntries: Math.max(
      1,
      input?.maxAuditEntries ?? base.maxAuditEntries
    ),
    maxNodes: Math.max(1, input?.maxNodes ?? base.maxNodes),
    maxEdges: Math.max(1, input?.maxEdges ?? base.maxEdges),
    confidenceThreshold: clamp(
      input?.confidenceThreshold ?? base.confidenceThreshold,
      0,
      1
    ),
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
