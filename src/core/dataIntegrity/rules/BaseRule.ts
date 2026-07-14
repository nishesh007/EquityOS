/**
 * Advanced Rule Engine — base rule abstraction.
 * Future modules extend BaseRule or use RuleFactory.create().
 */

import type {
  DatasetType,
  RuleSeverity,
  RuleValidationOutcome,
  ValidationContext,
} from "../IntegrityTypes";
import {
  DEFAULT_RULE_TIMEOUT_MS,
  type AdvancedRuleCategory,
  type AdvancedRuleDefinition,
  type RuleExecutionMode,
  type RulePriorityBand,
} from "./RuleTypes";

export abstract class BaseRule implements AdvancedRuleDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: AdvancedRuleCategory;
  readonly priority: RulePriorityBand;
  readonly ruleLevel: RuleSeverity;
  readonly version: string;
  enabled: boolean;
  readonly dependencies: string[];
  readonly executionMode: RuleExecutionMode;
  readonly timeout: number;
  readonly tags: string[];
  readonly author: string;
  readonly createdAt: string;
  updatedAt: string;
  readonly datasetTypes?: readonly DatasetType[];

  constructor(definition: AdvancedRuleDefinition) {
    this.id = definition.id;
    this.name = definition.name;
    this.description = definition.description;
    this.category = definition.category;
    this.priority = definition.priority;
    this.ruleLevel = definition.ruleLevel;
    this.version = definition.version;
    this.enabled = definition.enabled;
    this.dependencies = [...definition.dependencies];
    this.executionMode = definition.executionMode;
    this.timeout = definition.timeout;
    this.tags = [...definition.tags];
    this.author = definition.author;
    this.createdAt = definition.createdAt;
    this.updatedAt = definition.updatedAt;
    this.datasetTypes = definition.datasetTypes
      ? [...definition.datasetTypes]
      : undefined;
    this.condition = definition.condition;
    this.cacheKey = definition.cacheKey;
  }

  condition?: AdvancedRuleDefinition["condition"];
  cacheKey?: AdvancedRuleDefinition["cacheKey"];

  abstract validate(
    ctx: ValidationContext
  ): RuleValidationOutcome | Promise<RuleValidationOutcome>;

  toDefinition(): AdvancedRuleDefinition {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      category: this.category,
      priority: this.priority,
      ruleLevel: this.ruleLevel,
      version: this.version,
      enabled: this.enabled,
      dependencies: [...this.dependencies],
      executionMode: this.executionMode,
      timeout: this.timeout,
      tags: [...this.tags],
      author: this.author,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      datasetTypes: this.datasetTypes ? [...this.datasetTypes] : undefined,
      condition: this.condition,
      cacheKey: this.cacheKey,
      validate: (ctx) => this.validate(ctx),
    };
  }

  appliesTo(datasetType: DatasetType): boolean {
    if (!this.datasetTypes || this.datasetTypes.length === 0) return true;
    return this.datasetTypes.includes(datasetType);
  }
}

/** Concrete rule built from a plain definition (used by RuleFactory). */
export class FunctionalRule extends BaseRule {
  private readonly validator: AdvancedRuleDefinition["validate"];

  constructor(definition: AdvancedRuleDefinition) {
    super(definition);
    this.validator = definition.validate;
  }

  validate(
    ctx: ValidationContext
  ): RuleValidationOutcome | Promise<RuleValidationOutcome> {
    return this.validator(ctx);
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function withRuleDefaults(
  partial: Partial<AdvancedRuleDefinition> &
    Pick<AdvancedRuleDefinition, "id" | "name" | "validate">
): AdvancedRuleDefinition {
  const ts = nowIso();
  return {
    description: partial.description ?? partial.name,
    category: partial.category ?? "CUSTOM",
    priority: partial.priority ?? "MEDIUM",
    ruleLevel: partial.ruleLevel ?? "ERROR",
    version: partial.version ?? "1.0.0",
    enabled: partial.enabled ?? true,
    dependencies: partial.dependencies ?? [],
    executionMode: partial.executionMode ?? "SEQUENTIAL",
    timeout: partial.timeout ?? DEFAULT_RULE_TIMEOUT_MS,
    tags: partial.tags ?? [],
    author: partial.author ?? "system",
    createdAt: partial.createdAt ?? ts,
    updatedAt: partial.updatedAt ?? ts,
    datasetTypes: partial.datasetTypes,
    condition: partial.condition,
    cacheKey: partial.cacheKey,
    id: partial.id,
    name: partial.name,
    validate: partial.validate,
  };
}
