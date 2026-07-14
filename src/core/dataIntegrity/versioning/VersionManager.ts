/**
 * Version manager — register and resolve platform versions.
 */

import type { VersionConfiguration } from "./VersionConfiguration";
import {
  createVersionId,
  listVersionRecords,
  parseSemanticVersion,
  registerVersionRecord,
  type SemanticVersion,
  type VersionKind,
  type VersionRecord,
} from "./VersionRegistry";

export interface RegisterVersionInput {
  kind: VersionKind;
  targetId: string;
  label: string;
  version: string;
  module?: string;
  schemaVersion?: string;
  metadata?: Record<string, unknown>;
  deprecated?: boolean;
  breaking?: boolean;
}

export class VersionManager {
  constructor(private config: VersionConfiguration) {}

  setConfiguration(config: VersionConfiguration): void {
    this.config = config;
  }

  register(
    input: RegisterVersionInput,
    options?: { force?: boolean }
  ): { registered: boolean; skipped: boolean; record: VersionRecord | null; errors: string[] } {
    const errors: string[] = [];
    try {
      const parsed = parseSemanticVersion(input.version);
      if (!parsed) {
        errors.push(`Invalid semantic version: ${input.version}`);
        return { registered: false, skipped: false, record: null, errors };
      }

      const record: VersionRecord = {
        versionId: createVersionId(input.kind, input.targetId, parsed.raw),
        kind: input.kind,
        targetId: input.targetId,
        label: input.label,
        version: parsed,
        module: input.module,
        schemaVersion: input.schemaVersion ?? this.config.schemaVersion,
        metadata: input.metadata,
        deprecated: input.deprecated,
        breaking: input.breaking,
        registeredAt: new Date().toISOString(),
      };

      const result = registerVersionRecord(record, {
        force: options?.force,
        maxVersions: this.config.maxVersions,
      });

      return {
        registered: result.registered,
        skipped: result.skipped,
        record: result.registered ? record : null,
        errors,
      };
    } catch (err) {
      errors.push(`registerVersion failed: ${String(err)}`);
      return { registered: false, skipped: false, record: null, errors };
    }
  }

  list(filter?: { kind?: VersionKind; targetId?: string }): VersionRecord[] {
    return listVersionRecords(filter);
  }

  latest(kind: VersionKind, targetId: string): VersionRecord | null {
    const items = listVersionRecords({ kind, targetId });
    if (items.length === 0) return null;
    return items.sort((a, b) => compareSemver(b.version, a.version))[0] ?? null;
  }
}

export function compareSemver(a: SemanticVersion, b: SemanticVersion): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  if (a.patch !== b.patch) return a.patch - b.patch;
  if (a.prerelease && !b.prerelease) return -1;
  if (!a.prerelease && b.prerelease) return 1;
  if (a.prerelease && b.prerelease) {
    return a.prerelease.localeCompare(b.prerelease);
  }
  return 0;
}
