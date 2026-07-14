/**
 * Version registry — semantic version records for engines, modules, schemas, and more.
 */

export type VersionKind =
  | "ENGINE"
  | "MODULE"
  | "SCHEMA"
  | "CONFIGURATION"
  | "POLICY"
  | "RULE"
  | "MIGRATION"
  | "CUSTOM"
  | (string & {});

export interface SemanticVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  raw: string;
}

export interface VersionRecord {
  versionId: string;
  kind: VersionKind;
  targetId: string;
  label: string;
  version: SemanticVersion;
  module?: string;
  schemaVersion?: string;
  metadata?: Record<string, unknown>;
  deprecated?: boolean;
  breaking?: boolean;
  registeredAt: string;
}

export function parseSemanticVersion(raw: string): SemanticVersion | null {
  const match = raw
    .trim()
    .match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4],
    raw,
  };
}

export function formatSemanticVersion(v: SemanticVersion): string {
  return v.prerelease
    ? `${v.major}.${v.minor}.${v.patch}-${v.prerelease}`
    : `${v.major}.${v.minor}.${v.patch}`;
}

export function createVersionId(kind: VersionKind, targetId: string, raw: string): string {
  return `ver:${kind}:${targetId}:${raw}`.toLowerCase();
}

const versions = new Map<string, VersionRecord>();
let builtinsRegistered = false;

export function registerVersionRecord(
  record: VersionRecord,
  options?: { force?: boolean; maxVersions?: number }
): { registered: boolean; skipped: boolean } {
  if (versions.has(record.versionId) && !options?.force) {
    return { registered: false, skipped: true };
  }
  const max = options?.maxVersions ?? 1_000;
  if (versions.size >= max && !versions.has(record.versionId)) {
    return { registered: false, skipped: true };
  }
  versions.set(record.versionId, {
    ...record,
    version: { ...record.version },
    metadata: record.metadata ? { ...record.metadata } : undefined,
  });
  return { registered: true, skipped: false };
}

export function getVersionRecord(versionId: string): VersionRecord | null {
  const v = versions.get(versionId);
  return v ? cloneVersion(v) : null;
}

export function listVersionRecords(filter?: {
  kind?: VersionKind;
  targetId?: string;
}): VersionRecord[] {
  return [...versions.values()]
    .filter((v) => {
      if (filter?.kind && v.kind !== filter.kind) return false;
      if (filter?.targetId && v.targetId !== filter.targetId) return false;
      return true;
    })
    .map(cloneVersion);
}

export function resetVersionRegistry(): void {
  versions.clear();
  builtinsRegistered = false;
}

export function areBuiltinVersionsRegistered(): boolean {
  return builtinsRegistered;
}

export function markBuiltinVersionsRegistered(): void {
  builtinsRegistered = true;
}

function cloneVersion(record: VersionRecord): VersionRecord {
  return {
    ...record,
    version: { ...record.version },
    metadata: record.metadata ? { ...record.metadata } : undefined,
  };
}
