/**
 * Policy registry — stores versioned governance policies.
 */

export type PolicyStatus = "ENABLED" | "DISABLED" | "DEPRECATED" | "DRAFT";

export type PolicyScope =
  | "GLOBAL"
  | "MODULE"
  | "RULE"
  | "PROFILE"
  | "CUSTOM"
  | (string & {});

export interface PolicyDefinition {
  policyId: string;
  name: string;
  description: string;
  scope: PolicyScope;
  status: PolicyStatus;
  version: number;
  moduleIds?: string[];
  ruleIds?: string[];
  profileIds?: string[];
  tags: string[];
  rules: {
    enableRules?: string[];
    disableRules?: string[];
    requireModules?: string[];
    forbidModules?: string[];
    severityOverrides?: Record<string, string>;
    priorityOverrides?: Record<string, number>;
    thresholdOverrides?: Record<string, number>;
  };
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface PolicyVersionRecord {
  policyId: string;
  version: number;
  snapshot: PolicyDefinition;
  changedAt: string;
  changedBy?: string;
  reason?: string;
}

const policies = new Map<string, PolicyDefinition>();
const versions = new Map<string, PolicyVersionRecord[]>();
let builtinsRegistered = false;

export function createPolicyId(
  prefix = "pol"
): string {
  return `${prefix}:${new Date().toISOString()}:${Math.random().toString(36).slice(2, 8)}`;
}

export function registerPolicy(
  policy: PolicyDefinition,
  options?: { force?: boolean }
): { registered: boolean; skipped: boolean } {
  if (policies.has(policy.policyId) && !options?.force) {
    return { registered: false, skipped: true };
  }
  policies.set(policy.policyId, clonePolicy(policy));
  appendVersion(policy, policy.createdBy, "register");
  return { registered: true, skipped: false };
}

export function getPolicy(policyId: string): PolicyDefinition | null {
  const p = policies.get(policyId);
  return p ? clonePolicy(p) : null;
}

export function listPolicies(filter?: {
  status?: PolicyStatus;
  scope?: PolicyScope;
  tag?: string;
}): PolicyDefinition[] {
  let all = [...policies.values()].map(clonePolicy);
  if (filter?.status) all = all.filter((p) => p.status === filter.status);
  if (filter?.scope) all = all.filter((p) => p.scope === filter.scope);
  if (filter?.tag) all = all.filter((p) => p.tags.includes(filter.tag!));
  return all.sort((a, b) => a.name.localeCompare(b.name));
}

export function upsertPolicy(policy: PolicyDefinition): PolicyDefinition {
  policies.set(policy.policyId, clonePolicy(policy));
  appendVersion(policy, policy.updatedBy ?? policy.createdBy, "upsert");
  return clonePolicy(policy);
}

export function removePolicy(policyId: string): boolean {
  const existed = policies.delete(policyId);
  return existed;
}

export function getPolicyVersions(policyId: string): PolicyVersionRecord[] {
  return [...(versions.get(policyId) ?? [])].map((v) => ({
    ...v,
    snapshot: clonePolicy(v.snapshot),
  }));
}

export function getPolicyVersion(
  policyId: string,
  version: number
): PolicyVersionRecord | null {
  const found = (versions.get(policyId) ?? []).find((v) => v.version === version);
  return found
    ? { ...found, snapshot: clonePolicy(found.snapshot) }
    : null;
}

export function resetPolicyRegistry(): void {
  policies.clear();
  versions.clear();
  builtinsRegistered = false;
}

export function areBuiltinPoliciesRegistered(): boolean {
  return builtinsRegistered;
}

export function markBuiltinPoliciesRegistered(): void {
  builtinsRegistered = true;
}

function appendVersion(
  policy: PolicyDefinition,
  changedBy?: string,
  reason?: string
): void {
  const list = versions.get(policy.policyId) ?? [];
  list.push({
    policyId: policy.policyId,
    version: policy.version,
    snapshot: clonePolicy(policy),
    changedAt: new Date().toISOString(),
    changedBy,
    reason,
  });
  versions.set(policy.policyId, list);
}

function clonePolicy(policy: PolicyDefinition): PolicyDefinition {
  return {
    ...policy,
    moduleIds: policy.moduleIds ? [...policy.moduleIds] : undefined,
    ruleIds: policy.ruleIds ? [...policy.ruleIds] : undefined,
    profileIds: policy.profileIds ? [...policy.profileIds] : undefined,
    tags: [...policy.tags],
    rules: {
      enableRules: policy.rules.enableRules
        ? [...policy.rules.enableRules]
        : undefined,
      disableRules: policy.rules.disableRules
        ? [...policy.rules.disableRules]
        : undefined,
      requireModules: policy.rules.requireModules
        ? [...policy.rules.requireModules]
        : undefined,
      forbidModules: policy.rules.forbidModules
        ? [...policy.rules.forbidModules]
        : undefined,
      severityOverrides: policy.rules.severityOverrides
        ? { ...policy.rules.severityOverrides }
        : undefined,
      priorityOverrides: policy.rules.priorityOverrides
        ? { ...policy.rules.priorityOverrides }
        : undefined,
      thresholdOverrides: policy.rules.thresholdOverrides
        ? { ...policy.rules.thresholdOverrides }
        : undefined,
    },
    metadata: { ...policy.metadata },
  };
}
