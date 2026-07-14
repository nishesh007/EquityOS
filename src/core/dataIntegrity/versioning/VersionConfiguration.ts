/**
 * Institutional Validation Versioning — configuration.
 * Migration mode, compatibility, retention, and score weights live here; no magic numbers elsewhere.
 */

export type VersionStrictMode = "strict" | "relaxed";

export type MigrationMode =
  | "forward"
  | "backward"
  | "dry_run"
  | "preview"
  | "incremental"
  | "batch";

export type CompatibilityStrictness = "strict" | "moderate" | "permissive";

export interface VersionScoreWeights {
  compatibility: number;
  migrationSafety: number;
  schemaIntegrity: number;
  rollbackReadiness: number;
  configurationStability: number;
  dependencyHealth: number;
}

export interface VersionConfiguration {
  mode: VersionStrictMode;
  engineVersion: string;
  migrationMode: MigrationMode;
  compatibilityStrictness: CompatibilityStrictness;
  schemaVersion: string;
  snapshotRetention: number;
  auditRetention: number;
  maxAuditEntries: number;
  maxVersions: number;
  maxMigrations: number;
  institutionalMode: boolean;
  allowBreakingInRelaxed: boolean;
  scoreWeights: VersionScoreWeights;
}

export const DEFAULT_VERSION_CONFIGURATION: VersionConfiguration = {
  mode: "strict",
  engineVersion: "9F.24.0",
  migrationMode: "dry_run",
  compatibilityStrictness: "strict",
  schemaVersion: "1.0.0",
  snapshotRetention: 100,
  auditRetention: 1_000,
  maxAuditEntries: 500,
  maxVersions: 1_000,
  maxMigrations: 500,
  institutionalMode: true,
  allowBreakingInRelaxed: false,
  scoreWeights: {
    compatibility: 0.25,
    migrationSafety: 0.2,
    schemaIntegrity: 0.2,
    rollbackReadiness: 0.15,
    configurationStability: 0.1,
    dependencyHealth: 0.1,
  },
};

export type VersionConfigurationInput = Partial<
  Omit<VersionConfiguration, "scoreWeights">
> & {
  scoreWeights?: Partial<VersionScoreWeights>;
};

export function resolveVersionConfiguration(
  input?: VersionConfigurationInput
): VersionConfiguration {
  const base = DEFAULT_VERSION_CONFIGURATION;
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
    maxVersions: Math.max(1, input?.maxVersions ?? base.maxVersions),
    maxMigrations: Math.max(1, input?.maxMigrations ?? base.maxMigrations),
  };
}
