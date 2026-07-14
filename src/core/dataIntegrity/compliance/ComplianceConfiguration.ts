/**
 * Institutional Validation Compliance — configuration.
 * Profiles, thresholds, retention, and score weights live here; no magic numbers elsewhere.
 */

export type ComplianceStrictMode = "strict" | "relaxed";

export type ComplianceProfileId =
  | "institutional"
  | "research"
  | "production"
  | "staging"
  | "development"
  | "custom"
  | (string & {});

export interface ComplianceScoreWeights {
  policyCoverage: number;
  governanceQuality: number;
  auditCoverage: number;
  configurationHealth: number;
  operationalReadiness: number;
  monitoringCoverage: number;
}

export interface ComplianceConfiguration {
  mode: ComplianceStrictMode;
  engineVersion: string;
  complianceProfile: ComplianceProfileId;
  ruleBookVersion: string;
  severityThreshold: "CRITICAL" | "MAJOR" | "MINOR" | "WARNING";
  snapshotRetention: number;
  auditRetention: number;
  maxAuditEntries: number;
  maxViolations: number;
  confidenceThreshold: number;
  strictCompliance: boolean;
  institutionalMode: boolean;
  scoreWeights: ComplianceScoreWeights;
}

export const DEFAULT_COMPLIANCE_CONFIGURATION: ComplianceConfiguration = {
  mode: "strict",
  engineVersion: "9F.22.0",
  complianceProfile: "institutional",
  ruleBookVersion: "1.0.0",
  severityThreshold: "WARNING",
  snapshotRetention: 100,
  auditRetention: 1_000,
  maxAuditEntries: 500,
  maxViolations: 200,
  confidenceThreshold: 0.55,
  strictCompliance: true,
  institutionalMode: true,
  scoreWeights: {
    policyCoverage: 0.25,
    governanceQuality: 0.2,
    auditCoverage: 0.15,
    configurationHealth: 0.15,
    operationalReadiness: 0.15,
    monitoringCoverage: 0.1,
  },
};

export type ComplianceConfigurationInput = Partial<
  Omit<ComplianceConfiguration, "scoreWeights">
> & {
  scoreWeights?: Partial<ComplianceScoreWeights>;
};

export function resolveComplianceConfiguration(
  input?: ComplianceConfigurationInput
): ComplianceConfiguration {
  const base = DEFAULT_COMPLIANCE_CONFIGURATION;
  return {
    ...base,
    ...input,
    scoreWeights: {
      ...base.scoreWeights,
      ...input?.scoreWeights,
    },
    confidenceThreshold: clamp(
      input?.confidenceThreshold ?? base.confidenceThreshold,
      0,
      1
    ),
    snapshotRetention: Math.max(
      1,
      input?.snapshotRetention ?? base.snapshotRetention
    ),
    auditRetention: Math.max(1, input?.auditRetention ?? base.auditRetention),
    maxAuditEntries: Math.max(
      1,
      input?.maxAuditEntries ?? base.maxAuditEntries
    ),
    maxViolations: Math.max(1, input?.maxViolations ?? base.maxViolations),
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
