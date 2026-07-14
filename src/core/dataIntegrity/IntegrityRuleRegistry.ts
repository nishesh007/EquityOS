/**
 * Institutional Data Integrity Engine — central rule registry.
 * All validation logic is registered here and executed dynamically.
 */

import type { DatasetType, IntegrityRule, RuleCategory } from "./IntegrityTypes";
import { PIPELINE_STAGE_ORDER } from "./IntegrityConstants";

export class IntegrityRuleRegistry {
  private readonly rules = new Map<string, IntegrityRule>();

  registerRule(rule: IntegrityRule): void {
    if (!rule.id || typeof rule.id !== "string") {
      throw new Error("IntegrityRuleRegistry: rule.id is required");
    }
    this.rules.set(rule.id, { ...rule });
  }

  unregisterRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  getRule(ruleId: string): IntegrityRule | undefined {
    const rule = this.rules.get(ruleId);
    return rule ? { ...rule } : undefined;
  }

  hasRule(ruleId: string): boolean {
    return this.rules.has(ruleId);
  }

  getAllRules(): IntegrityRule[] {
    return Array.from(this.rules.values()).map((r) => ({ ...r }));
  }

  /**
   * Returns enabled rules for a dataset type, ordered by pipeline stage
   * then priority (ascending).
   */
  getExecutableRules(
    datasetType: DatasetType,
    isEnabled: (rule: IntegrityRule) => boolean
  ): IntegrityRule[] {
    const stageIndex = new Map(
      PIPELINE_STAGE_ORDER.map((stage, index) => [stage, index])
    );

    return this.getAllRules()
      .filter((rule) => {
        if (!isEnabled(rule)) return false;
        if (!rule.datasetTypes || rule.datasetTypes.length === 0) return true;
        return rule.datasetTypes.includes(datasetType);
      })
      .sort((a, b) => {
        const stageA = stageIndex.get(a.category) ?? 999;
        const stageB = stageIndex.get(b.category) ?? 999;
        if (stageA !== stageB) return stageA - stageB;
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.id.localeCompare(b.id);
      });
  }

  getRulesByCategory(category: RuleCategory): IntegrityRule[] {
    return this.getAllRules()
      .filter((r) => r.category === category)
      .sort((a, b) => a.priority - b.priority);
  }

  clear(): void {
    this.rules.clear();
  }

  size(): number {
    return this.rules.size;
  }
}
