/**
 * Advanced Rule Engine — version manager.
 * Tracks rule versions for safe upgrades without breaking existing rules.
 */

import type { AdvancedRuleDefinition } from "./RuleTypes";

export interface RuleVersionRecord {
  ruleId: string;
  version: string;
  registeredAt: string;
  definition: AdvancedRuleDefinition;
}

export class RuleVersionManager {
  private readonly history = new Map<string, RuleVersionRecord[]>();

  registerVersion(rule: AdvancedRuleDefinition): void {
    const list = this.history.get(rule.id) ?? [];
    const exists = list.some((r) => r.version === rule.version);
    if (exists) {
      // Same version re-registration updates the stored definition snapshot.
      const idx = list.findIndex((r) => r.version === rule.version);
      list[idx] = {
        ruleId: rule.id,
        version: rule.version,
        registeredAt: new Date().toISOString(),
        definition: { ...rule, validate: rule.validate },
      };
    } else {
      list.push({
        ruleId: rule.id,
        version: rule.version,
        registeredAt: new Date().toISOString(),
        definition: { ...rule, validate: rule.validate },
      });
    }
    this.history.set(rule.id, list);
  }

  getVersions(ruleId: string): RuleVersionRecord[] {
    return [...(this.history.get(ruleId) ?? [])];
  }

  getLatestVersion(ruleId: string): string | undefined {
    const list = this.history.get(ruleId);
    if (!list || list.length === 0) return undefined;
    return list[list.length - 1].version;
  }

  hasVersion(ruleId: string, version: string): boolean {
    return (this.history.get(ruleId) ?? []).some((r) => r.version === version);
  }

  /**
   * Semantic-ish compare: major.minor.patch numeric tuples.
   * Returns true when next is compatible with current (same major, next >= current).
   */
  isCompatibleUpgrade(current: string, next: string): boolean {
    const parse = (v: string): number[] =>
      v.split(".").map((p) => {
        const n = Number.parseInt(p, 10);
        return Number.isFinite(n) ? n : 0;
      });
    const a = parse(current);
    const b = parse(next);
    const majorA = a[0] ?? 0;
    const majorB = b[0] ?? 0;
    if (majorA !== majorB) return false;
    const len = Math.max(a.length, b.length);
    for (let i = 0; i < len; i++) {
      const left = a[i] ?? 0;
      const right = b[i] ?? 0;
      if (right > left) return true;
      if (right < left) return false;
    }
    return true; // equal versions are compatible
  }

  clear(ruleId?: string): void {
    if (ruleId) {
      this.history.delete(ruleId);
    } else {
      this.history.clear();
    }
  }
}
