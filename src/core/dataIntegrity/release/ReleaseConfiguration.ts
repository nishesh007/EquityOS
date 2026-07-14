/**
 * Institutional Validation Release — configuration.
 * Certification mode, risk thresholds, checklist profiles, retention, and score weights live here.
 */

export type CertificationMode =
  | "strict"
  | "standard"
  | "relaxed"
  | "institutional";

export type ChecklistProfile =
  | "pre_release"
  | "deployment"
  | "rollback"
  | "operational"
  | "security"
  | "compliance"
  | "full";

export interface RiskThresholds {
  critical: number;
  high: number;
  medium: number;
  low: number;
  blockBelowScore: number;
  conditionalBelowScore: number;
}

export interface ReleaseScoreWeights {
  health: number;
  testing: number;
  security: number;
  compliance: number;
  performance: number;
  reliability: number;
  operationalReadiness: number;
}

export interface ReleaseConfiguration {
  mode: CertificationMode;
  engineVersion: string;
  checklistProfile: ChecklistProfile;
  snapshotRetention: number;
  auditRetention: number;
  maxAuditEntries: number;
  maxChecklistItems: number;
  institutionalMode: boolean;
  certificationOnly: boolean;
  riskThresholds: RiskThresholds;
  scoreWeights: ReleaseScoreWeights;
}

export const DEFAULT_RELEASE_CONFIGURATION: ReleaseConfiguration = {
  mode: "institutional",
  engineVersion: "9F.30.0",
  checklistProfile: "full",
  snapshotRetention: 100,
  auditRetention: 1_000,
  maxAuditEntries: 500,
  maxChecklistItems: 200,
  institutionalMode: true,
  certificationOnly: true,
  riskThresholds: {
    critical: 90,
    high: 70,
    medium: 40,
    low: 15,
    blockBelowScore: 50,
    conditionalBelowScore: 75,
  },
  scoreWeights: {
    health: 0.25,
    testing: 0.2,
    security: 0.15,
    compliance: 0.15,
    performance: 0.1,
    reliability: 0.1,
    operationalReadiness: 0.05,
  },
};

export type ReleaseConfigurationInput = Partial<
  Omit<ReleaseConfiguration, "scoreWeights" | "riskThresholds">
> & {
  scoreWeights?: Partial<ReleaseScoreWeights>;
  riskThresholds?: Partial<RiskThresholds>;
};

export function resolveReleaseConfiguration(
  input?: ReleaseConfigurationInput
): ReleaseConfiguration {
  const base = DEFAULT_RELEASE_CONFIGURATION;
  return {
    ...base,
    ...input,
    scoreWeights: {
      ...base.scoreWeights,
      ...input?.scoreWeights,
    },
    riskThresholds: {
      ...base.riskThresholds,
      ...input?.riskThresholds,
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
    maxChecklistItems: Math.max(
      1,
      input?.maxChecklistItems ?? base.maxChecklistItems
    ),
  };
}
