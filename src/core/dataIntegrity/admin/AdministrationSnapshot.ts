/**
 * Governance snapshots with compare, diff, and rollback support.
 */

import type { AdministrationConfiguration } from "./AdministrationConfiguration";
import type { PolicyDefinition } from "./PolicyRegistry";
import type { GovernanceProfile } from "./PolicyProfiles";
import type { ConfigurationProfile } from "./ConfigurationProfiles";
import type { RuleGovernanceState } from "./RuleGovernance";
import type { ModuleGovernanceState } from "./ModuleGovernance";
import type { ActiveOverride } from "./PolicyOverrides";

export interface GovernanceSnapshotPayload {
  policies: PolicyDefinition[];
  activePolicyProfile: GovernanceProfile;
  activeConfigurationProfile: ConfigurationProfile;
  configuration: AdministrationConfiguration;
  rules: RuleGovernanceState[];
  modules: ModuleGovernanceState[];
  overrides: ActiveOverride[];
  configurationVersion: number;
  policyVersionHash: string;
}

export interface GovernanceSnapshot {
  snapshotId: string;
  timestamp: string;
  label?: string;
  version: number;
  payload: GovernanceSnapshotPayload;
}

export interface GovernanceSnapshotComparison {
  baselineId: string;
  compareId: string;
  policyCountDelta: number;
  overrideCountDelta: number;
  disabledRuleDelta: number;
  disabledModuleDelta: number;
  profileChanged: boolean;
  configurationChanged: boolean;
  policyDiff: Array<{
    policyId: string;
    change: "added" | "removed" | "modified";
  }>;
  configurationDiff: Array<{ key: string; before: unknown; after: unknown }>;
}

export function createGovernanceSnapshotId(
  timestamp: string = new Date().toISOString()
): string {
  return `gov:${timestamp}:${Math.random().toString(36).slice(2, 8)}`;
}

export function compareGovernanceSnapshots(
  baseline: GovernanceSnapshot,
  compare: GovernanceSnapshot
): GovernanceSnapshotComparison {
  const baselinePolicies = new Map(
    baseline.payload.policies.map((p) => [p.policyId, p])
  );
  const comparePolicies = new Map(
    compare.payload.policies.map((p) => [p.policyId, p])
  );
  const policyDiff: GovernanceSnapshotComparison["policyDiff"] = [];

  for (const id of comparePolicies.keys()) {
    if (!baselinePolicies.has(id)) {
      policyDiff.push({ policyId: id, change: "added" });
    } else {
      const a = baselinePolicies.get(id)!;
      const b = comparePolicies.get(id)!;
      if (
        a.version !== b.version ||
        a.status !== b.status ||
        JSON.stringify(a.rules) !== JSON.stringify(b.rules)
      ) {
        policyDiff.push({ policyId: id, change: "modified" });
      }
    }
  }
  for (const id of baselinePolicies.keys()) {
    if (!comparePolicies.has(id)) {
      policyDiff.push({ policyId: id, change: "removed" });
    }
  }

  const configurationDiff: GovernanceSnapshotComparison["configurationDiff"] =
    [];
  const keys = new Set([
    ...Object.keys(baseline.payload.configuration),
    ...Object.keys(compare.payload.configuration),
  ]);
  for (const key of keys) {
    const before =
      baseline.payload.configuration[
        key as keyof AdministrationConfiguration
      ];
    const after =
      compare.payload.configuration[key as keyof AdministrationConfiguration];
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      configurationDiff.push({ key, before, after });
    }
  }

  return {
    baselineId: baseline.snapshotId,
    compareId: compare.snapshotId,
    policyCountDelta:
      compare.payload.policies.length - baseline.payload.policies.length,
    overrideCountDelta:
      compare.payload.overrides.length - baseline.payload.overrides.length,
    disabledRuleDelta:
      compare.payload.rules.filter((r) => !r.enabled).length -
      baseline.payload.rules.filter((r) => !r.enabled).length,
    disabledModuleDelta:
      compare.payload.modules.filter((m) => !m.enabled).length -
      baseline.payload.modules.filter((m) => !m.enabled).length,
    profileChanged:
      baseline.payload.activePolicyProfile.profileId !==
      compare.payload.activePolicyProfile.profileId,
    configurationChanged: configurationDiff.length > 0,
    policyDiff,
    configurationDiff,
  };
}

export class AdministrationSnapshotStore {
  private readonly snapshots = new Map<string, GovernanceSnapshot>();
  private retention: number;
  private versionSeq = 0;

  constructor(retention: number) {
    this.retention = retention;
  }

  setRetention(n: number): void {
    this.retention = n;
  }

  save(
    payload: GovernanceSnapshotPayload,
    label?: string
  ): GovernanceSnapshot {
    this.versionSeq += 1;
    const snapshot: GovernanceSnapshot = {
      snapshotId: createGovernanceSnapshotId(),
      timestamp: new Date().toISOString(),
      label,
      version: this.versionSeq,
      payload: clonePayload(payload),
    };
    this.snapshots.set(snapshot.snapshotId, snapshot);
    this.enforceRetention();
    return {
      ...snapshot,
      payload: clonePayload(snapshot.payload),
    };
  }

  load(snapshotId: string): GovernanceSnapshot | null {
    const s = this.snapshots.get(snapshotId);
    return s
      ? { ...s, payload: clonePayload(s.payload) }
      : null;
  }

  list(): GovernanceSnapshot[] {
    return [...this.snapshots.values()]
      .sort((a, b) => a.version - b.version)
      .map((s) => ({ ...s, payload: clonePayload(s.payload) }));
  }

  clear(): void {
    this.snapshots.clear();
    this.versionSeq = 0;
  }

  get size(): number {
    return this.snapshots.size;
  }

  private enforceRetention(): void {
    const all = [...this.snapshots.values()].sort(
      (a, b) => a.version - b.version
    );
    if (all.length <= this.retention) return;
    const overflow = all.length - this.retention;
    for (let i = 0; i < overflow; i++) {
      this.snapshots.delete(all[i]!.snapshotId);
    }
  }
}

export function hashPolicyVersions(policies: PolicyDefinition[]): string {
  return policies
    .map((p) => `${p.policyId}@${p.version}`)
    .sort()
    .join("|");
}

function clonePayload(
  payload: GovernanceSnapshotPayload
): GovernanceSnapshotPayload {
  return JSON.parse(JSON.stringify(payload)) as GovernanceSnapshotPayload;
}
