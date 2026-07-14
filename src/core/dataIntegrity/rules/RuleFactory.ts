/**
 * Advanced Rule Engine — factory for custom rules without modifying RuleEngine.
 */

import type { IntegrityRule, RuleCategory } from "../IntegrityTypes";
import { FunctionalRule, withRuleDefaults } from "./BaseRule";
import type {
  AdvancedRuleDefinition,
  CreateRuleInput,
} from "./RuleTypes";

/** Map advanced domain categories onto Prompt 1 pipeline stages when adapting. */
const CATEGORY_TO_PIPELINE: Record<
  AdvancedRuleDefinition["category"],
  RuleCategory
> = {
  PRICE: "RANGE",
  OHLC: "LOGICAL",
  INDICATOR: "RANGE",
  VOLUME: "RANGE",
  FUNDAMENTAL: "RANGE",
  CORPORATE_ACTION: "LOGICAL",
  PORTFOLIO: "LOGICAL",
  WATCHLIST: "NULL",
  AI: "SCHEMA",
  HISTORICAL: "TIMESTAMP",
  NEWS: "NULL",
  CUSTOM: "SCHEMA",
};

const PRIORITY_TO_NUMBER: Record<AdvancedRuleDefinition["priority"], number> = {
  CRITICAL: 1,
  HIGH: 25,
  MEDIUM: 50,
  LOW: 100,
};

export class RuleFactory {
  /** Create an AdvancedRuleDefinition from a lightweight input. */
  static create(input: CreateRuleInput): AdvancedRuleDefinition {
    return withRuleDefaults({
      id: input.id,
      name: input.name,
      description: input.description,
      category: input.category,
      priority: input.priority,
      ruleLevel: input.ruleLevel,
      version: input.version,
      enabled: input.enabled,
      dependencies: input.dependencies,
      executionMode: input.executionMode,
      timeout: input.timeout,
      tags: input.tags,
      author: input.author,
      datasetTypes: input.datasetTypes,
      condition: input.condition,
      cacheKey: input.cacheKey,
      validate: input.validate,
    });
  }

  /** Instantiate a FunctionalRule from input. */
  static createRule(input: CreateRuleInput): FunctionalRule {
    return new FunctionalRule(RuleFactory.create(input));
  }

  /** Adapt an AdvancedRule to Prompt 1 IntegrityRule for pipeline registration. */
  static toIntegrityRule(rule: AdvancedRuleDefinition): IntegrityRule {
    return {
      id: rule.id,
      name: rule.name,
      description: rule.description,
      category: CATEGORY_TO_PIPELINE[rule.category],
      ruleLevel: rule.ruleLevel,
      priority: PRIORITY_TO_NUMBER[rule.priority],
      enabled: rule.enabled,
      version: rule.version,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
      datasetTypes: rule.datasetTypes,
      validate: rule.validate,
    };
  }

  /**
   * Adapt a Prompt 1 IntegrityRule into an AdvancedRuleDefinition.
   * Preserves validate() and maps numeric priority to a band.
   */
  static fromIntegrityRule(rule: IntegrityRule): AdvancedRuleDefinition {
    let priority: AdvancedRuleDefinition["priority"] = "MEDIUM";
    if (rule.priority <= 10 || rule.ruleLevel === "CRITICAL") {
      priority = "CRITICAL";
    } else if (rule.priority <= 30) {
      priority = "HIGH";
    } else if (rule.priority >= 80) {
      priority = "LOW";
    }

    return withRuleDefaults({
      id: rule.id,
      name: rule.name,
      description: rule.description,
      category: "CUSTOM",
      priority,
      ruleLevel: rule.ruleLevel,
      version: rule.version,
      enabled: rule.enabled,
      datasetTypes: rule.datasetTypes,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
      validate: rule.validate,
    });
  }
}
