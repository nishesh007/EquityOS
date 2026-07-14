/**
 * Institutional Validation Explainability — configuration.
 * Trace depth, verbosity, explanation style, retention, and score weights live here.
 */

export type ExplanationStyle =
  | "concise"
  | "detailed"
  | "institutional"
  | "technical";

export type TraceVerbosity = "minimal" | "standard" | "verbose";

export type ExplainabilityStrictMode = "strict" | "relaxed";

export interface ExplainabilityScoreWeights {
  traceCompleteness: number;
  ruleCoverage: number;
  confidenceCoverage: number;
  explanationQuality: number;
  dependencyVisibility: number;
  auditCompleteness: number;
}

export interface ExplainabilityConfiguration {
  mode: ExplainabilityStrictMode;
  engineVersion: string;
  traceDepth: number;
  verbosity: TraceVerbosity;
  explanationStyle: ExplanationStyle;
  snapshotRetention: number;
  auditRetention: number;
  maxAuditEntries: number;
  maxTraceNodes: number;
  maxExplanations: number;
  institutionalMode: boolean;
  includeSkippedRules: boolean;
  includeDependencies: boolean;
  scoreWeights: ExplainabilityScoreWeights;
}

export const DEFAULT_EXPLAINABILITY_CONFIGURATION: ExplainabilityConfiguration =
  {
    mode: "strict",
    engineVersion: "9F.27.0",
    traceDepth: 8,
    verbosity: "standard",
    explanationStyle: "institutional",
    snapshotRetention: 100,
    auditRetention: 1_000,
    maxAuditEntries: 500,
    maxTraceNodes: 500,
    maxExplanations: 200,
    institutionalMode: true,
    includeSkippedRules: true,
    includeDependencies: true,
    scoreWeights: {
      traceCompleteness: 0.3,
      ruleCoverage: 0.2,
      confidenceCoverage: 0.2,
      explanationQuality: 0.15,
      dependencyVisibility: 0.1,
      auditCompleteness: 0.05,
    },
  };

export type ExplainabilityConfigurationInput = Partial<
  Omit<ExplainabilityConfiguration, "scoreWeights">
> & {
  scoreWeights?: Partial<ExplainabilityScoreWeights>;
};

export function resolveExplainabilityConfiguration(
  input?: ExplainabilityConfigurationInput
): ExplainabilityConfiguration {
  const base = DEFAULT_EXPLAINABILITY_CONFIGURATION;
  return {
    ...base,
    ...input,
    scoreWeights: {
      ...base.scoreWeights,
      ...input?.scoreWeights,
    },
    traceDepth: Math.max(1, input?.traceDepth ?? base.traceDepth),
    snapshotRetention: Math.max(
      1,
      input?.snapshotRetention ?? base.snapshotRetention
    ),
    auditRetention: Math.max(1, input?.auditRetention ?? base.auditRetention),
    maxAuditEntries: Math.max(
      1,
      input?.maxAuditEntries ?? base.maxAuditEntries
    ),
    maxTraceNodes: Math.max(1, input?.maxTraceNodes ?? base.maxTraceNodes),
    maxExplanations: Math.max(
      1,
      input?.maxExplanations ?? base.maxExplanations
    ),
  };
}
