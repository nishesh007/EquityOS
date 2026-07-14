/**
 * Rule governance — enable/disable/override metadata without source changes.
 */

export type RuleRegistrationStatus =
  | "REGISTERED"
  | "UNREGISTERED"
  | "DISABLED"
  | "DEPRECATED";

export interface RuleGovernanceState {
  ruleId: string;
  name: string;
  module: string;
  enabled: boolean;
  deprecated: boolean;
  severity?: string;
  priority?: number;
  threshold?: number;
  tags: string[];
  categories: string[];
  dependencies: string[];
  registrationStatus: RuleRegistrationStatus;
  version: number;
  updatedAt: string;
  updatedBy?: string;
  reason?: string;
}

export class RuleGovernance {
  private readonly rules = new Map<string, RuleGovernanceState>();

  ensureRule(
    input: Partial<RuleGovernanceState> & { ruleId: string; name?: string }
  ): RuleGovernanceState {
    const existing = this.rules.get(input.ruleId);
    if (existing) return this.clone(existing);
    const created: RuleGovernanceState = {
      ruleId: input.ruleId,
      name: input.name ?? input.ruleId,
      module: input.module ?? "unknown",
      enabled: input.enabled ?? true,
      deprecated: input.deprecated ?? false,
      severity: input.severity,
      priority: input.priority,
      threshold: input.threshold,
      tags: [...(input.tags ?? [])],
      categories: [...(input.categories ?? [])],
      dependencies: [...(input.dependencies ?? [])],
      registrationStatus: input.registrationStatus ?? "REGISTERED",
      version: 1,
      updatedAt: new Date().toISOString(),
      updatedBy: input.updatedBy,
      reason: input.reason,
    };
    this.rules.set(created.ruleId, created);
    return this.clone(created);
  }

  enableRule(ruleId: string, updatedBy?: string, reason?: string): RuleGovernanceState | null {
    return this.patch(ruleId, {
      enabled: true,
      registrationStatus: "REGISTERED",
      updatedBy,
      reason: reason ?? "enable",
    });
  }

  disableRule(ruleId: string, updatedBy?: string, reason?: string): RuleGovernanceState | null {
    return this.patch(ruleId, {
      enabled: false,
      registrationStatus: "DISABLED",
      updatedBy,
      reason: reason ?? "disable",
    });
  }

  overrideSeverity(
    ruleId: string,
    severity: string,
    updatedBy?: string
  ): RuleGovernanceState | null {
    return this.patch(ruleId, {
      severity,
      updatedBy,
      reason: "override severity",
    });
  }

  overridePriority(
    ruleId: string,
    priority: number,
    updatedBy?: string
  ): RuleGovernanceState | null {
    return this.patch(ruleId, {
      priority,
      updatedBy,
      reason: "override priority",
    });
  }

  overrideThreshold(
    ruleId: string,
    threshold: number,
    updatedBy?: string
  ): RuleGovernanceState | null {
    return this.patch(ruleId, {
      threshold,
      updatedBy,
      reason: "override threshold",
    });
  }

  assignTags(
    ruleId: string,
    tags: string[],
    updatedBy?: string
  ): RuleGovernanceState | null {
    const existing = this.rules.get(ruleId);
    if (!existing) return null;
    const merged = Array.from(new Set([...existing.tags, ...tags]));
    return this.patch(ruleId, { tags: merged, updatedBy, reason: "assign tags" });
  }

  assignCategories(
    ruleId: string,
    categories: string[],
    updatedBy?: string
  ): RuleGovernanceState | null {
    const existing = this.rules.get(ruleId);
    if (!existing) return null;
    const merged = Array.from(new Set([...existing.categories, ...categories]));
    return this.patch(ruleId, {
      categories: merged,
      updatedBy,
      reason: "assign categories",
    });
  }

  markDeprecated(
    ruleId: string,
    updatedBy?: string,
    reason?: string
  ): RuleGovernanceState | null {
    return this.patch(ruleId, {
      deprecated: true,
      registrationStatus: "DEPRECATED",
      enabled: false,
      updatedBy,
      reason: reason ?? "deprecated",
    });
  }

  restoreRule(ruleId: string, updatedBy?: string): RuleGovernanceState | null {
    return this.patch(ruleId, {
      deprecated: false,
      enabled: true,
      registrationStatus: "REGISTERED",
      updatedBy,
      reason: "restore",
    });
  }

  listRules(): RuleGovernanceState[] {
    return [...this.rules.values()].map((r) => this.clone(r));
  }

  getRule(ruleId: string): RuleGovernanceState | null {
    const r = this.rules.get(ruleId);
    return r ? this.clone(r) : null;
  }

  disabledCount(): number {
    return [...this.rules.values()].filter((r) => !r.enabled || r.deprecated)
      .length;
  }

  reset(): void {
    this.rules.clear();
  }

  private patch(
    ruleId: string,
    patch: Partial<RuleGovernanceState>
  ): RuleGovernanceState | null {
    const existing = this.rules.get(ruleId);
    if (!existing) {
      if (!patch.ruleId && ruleId) {
        this.ensureRule({ ruleId, ...patch });
        return this.getRule(ruleId);
      }
      return null;
    }
    const next: RuleGovernanceState = {
      ...existing,
      ...patch,
      tags: patch.tags ? [...patch.tags] : [...existing.tags],
      categories: patch.categories
        ? [...patch.categories]
        : [...existing.categories],
      dependencies: patch.dependencies
        ? [...patch.dependencies]
        : [...existing.dependencies],
      version: existing.version + 1,
      updatedAt: new Date().toISOString(),
    };
    this.rules.set(ruleId, next);
    return this.clone(next);
  }

  private clone(rule: RuleGovernanceState): RuleGovernanceState {
    return {
      ...rule,
      tags: [...rule.tags],
      categories: [...rule.categories],
      dependencies: [...rule.dependencies],
    };
  }
}
