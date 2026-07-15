/**
 * Institutional Strategy Screener — builder helpers (Sprint 9D.R5).
 */

import {
  createLeafRule,
  createRuleGroup,
  isLeafRule,
  isRuleGroup,
  type StrategyLeafRule,
  type StrategyLogicOperator,
  type StrategyRuleNode,
} from "./StrategyRule";
import {
  normalizeStrategyDefinition,
  type StrategyDefinition,
  type StrategyDefinitionInput,
} from "./StrategyDefinition";
import {
  normalizeStrategyCard,
  type StrategyCard,
} from "./StrategyPresentationModels";

export function buildStrategyFromLeaves(
  name: string,
  leaves: Array<Omit<StrategyLeafRule, "kind">>,
  logic: StrategyLogicOperator = "and",
  extras?: Partial<StrategyDefinitionInput>
): StrategyDefinition {
  const root = createRuleGroup({
    id: extras?.id ? `${extras.id}-root` : "builder-root",
    logic,
    children: leaves.map((l) => createLeafRule(l)),
    label: name,
  });

  return normalizeStrategyDefinition({
    id: extras?.id ?? `strategy-${Date.now()}`,
    name,
    description: extras?.description ?? "",
    root,
    origin: extras?.origin ?? "user",
    favorite: extras?.favorite,
    version: extras?.version,
    tags: extras?.tags,
  });
}

export function countRules(node: StrategyRuleNode): number {
  if (isLeafRule(node)) return 1;
  return node.children.reduce((sum, child) => sum + countRules(child), 0);
}

export function summarizeRules(node: StrategyRuleNode): string[] {
  const lines: string[] = [];

  function walk(n: StrategyRuleNode, depth: number): void {
    if (isLeafRule(n)) {
      const label =
        n.label ||
        n.description ||
        `${n.field} ${n.operator} ${String(n.value)}${
          n.valueTo != null ? `-${n.valueTo}` : ""
        }`;
      lines.push(label);
      return;
    }
    if (n.label) {
      lines.push(`${n.logic.toUpperCase()}: ${n.label}`);
    } else {
      lines.push(`${n.logic.toUpperCase()} group`);
    }
    for (const child of n.children) walk(child, depth + 1);
  }

  walk(node, 0);
  return lines;
}

export function validateRuleTree(node: StrategyRuleNode): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  function walk(n: StrategyRuleNode, path: string): void {
    if (isLeafRule(n)) {
      if (!n.field || !String(n.field).trim()) {
        errors.push(`${path}: leaf field is required`);
      }
      if (n.operator === "between" && n.valueTo == null) {
        errors.push(`${path}: between operator requires valueTo`);
      }
      if (
        typeof n.value === "number" &&
        !Number.isFinite(n.value) &&
        n.operator !== "contains"
      ) {
        errors.push(`${path}: leaf value must be finite`);
      }
      return;
    }

    if (!isRuleGroup(n)) {
      errors.push(`${path}: unknown node kind`);
      return;
    }

    if (n.logic === "not" && n.children.length !== 1) {
      errors.push(`${path}: NOT group must have exactly one child`);
    }
    n.children.forEach((child, i) => walk(child, `${path}/${i}`));
  }

  walk(node, "root");
  return { valid: errors.length === 0, errors };
}

export function previewStrategy(definition: StrategyDefinition): StrategyCard {
  return normalizeStrategyCard({
    id: definition.id,
    name: definition.name,
    description: definition.description,
    origin: definition.origin,
    favorite: definition.favorite,
    version: definition.version,
    ruleCount: countRules(definition.root),
    tags: definition.tags,
    lastRunAt: definition.lastRunAt,
    empty: false,
  });
}
