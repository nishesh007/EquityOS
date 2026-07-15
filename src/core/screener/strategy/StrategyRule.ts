/**
 * Institutional Strategy Screener — rules & operators (Sprint 9D.R5).
 * Backtest-ready rule definitions. Evaluation composes metric bags only.
 */

export const STRATEGY_RULE_CATEGORIES = [
  "Technical",
  "Fundamental",
  "Momentum",
  "Growth",
  "Value",
  "Income",
  "Quality",
  "Risk",
  "Liquidity",
  "Sector",
  "Market",
  "Validation",
  "Trust",
  "AI Conviction",
  "Portfolio",
  "Watchlist",
  "Corporate Action",
  "News",
  "Earnings",
  "Alerts",
] as const;

export type StrategyRuleCategory = (typeof STRATEGY_RULE_CATEGORIES)[number];

export const STRATEGY_COMPARISON_OPERATORS = [
  "gt",
  "lt",
  "gte",
  "lte",
  "eq",
  "contains",
  "between",
] as const;

export type StrategyComparisonOperator =
  (typeof STRATEGY_COMPARISON_OPERATORS)[number];

export const STRATEGY_LOGIC_OPERATORS = ["and", "or", "not"] as const;
export type StrategyLogicOperator = (typeof STRATEGY_LOGIC_OPERATORS)[number];

export interface StrategyLeafRule {
  kind: "leaf";
  id: string;
  category: StrategyRuleCategory;
  field: string;
  operator: StrategyComparisonOperator;
  value: number | string;
  valueTo?: number;
  label?: string;
  description?: string;
}

export interface StrategyRuleGroup {
  kind: "group";
  id: string;
  logic: StrategyLogicOperator;
  children: StrategyRuleNode[];
  label?: string;
}

export type StrategyRuleNode = StrategyLeafRule | StrategyRuleGroup;

export function isLeafRule(node: StrategyRuleNode): node is StrategyLeafRule {
  return node.kind === "leaf";
}

export function isRuleGroup(node: StrategyRuleNode): node is StrategyRuleGroup {
  return node.kind === "group";
}

export function createLeafRule(
  input: Omit<StrategyLeafRule, "kind">
): StrategyLeafRule {
  return { kind: "leaf", ...input };
}

export function createRuleGroup(
  input: Omit<StrategyRuleGroup, "kind">
): StrategyRuleGroup {
  return { kind: "group", ...input };
}

export function resolveStrategyField(
  metrics: Record<string, number | string | null | undefined>,
  field: string
): number | string | null {
  const raw = metrics[field];
  if (raw == null || raw === "") return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  return String(raw);
}

export function evaluateLeafRule(
  rule: StrategyLeafRule,
  metrics: Record<string, number | string | null | undefined>
): boolean {
  const actual = resolveStrategyField(metrics, rule.field);
  if (actual == null) return false;

  if (typeof actual === "number") {
    const value =
      typeof rule.value === "number" ? rule.value : Number(rule.value);
    if (!Number.isFinite(value) && rule.operator !== "contains") return false;
    switch (rule.operator) {
      case "gt":
        return actual > value;
      case "lt":
        return actual < value;
      case "gte":
        return actual >= value;
      case "lte":
        return actual <= value;
      case "eq":
        return actual === value;
      case "between": {
        const to =
          typeof rule.valueTo === "number" && Number.isFinite(rule.valueTo)
            ? rule.valueTo
            : value;
        return actual >= value && actual <= to;
      }
      case "contains":
        return String(actual).includes(String(rule.value));
      default:
        return false;
    }
  }

  const text = String(actual).toLowerCase();
  switch (rule.operator) {
    case "eq":
      return text === String(rule.value).toLowerCase();
    case "contains":
      return text.includes(String(rule.value).toLowerCase());
    default:
      return false;
  }
}

export function evaluateRuleNode(
  node: StrategyRuleNode,
  metrics: Record<string, number | string | null | undefined>
): boolean {
  if (isLeafRule(node)) return evaluateLeafRule(node, metrics);
  const results = node.children.map((child) => evaluateRuleNode(child, metrics));
  switch (node.logic) {
    case "and":
      return results.length === 0 ? true : results.every(Boolean);
    case "or":
      return results.length === 0 ? false : results.some(Boolean);
    case "not":
      return !(results[0] ?? false);
    default:
      return false;
  }
}

export function collectMatchedFailedRules(
  node: StrategyRuleNode,
  metrics: Record<string, number | string | null | undefined>
): { matched: string[]; failed: string[] } {
  const matched: string[] = [];
  const failed: string[] = [];

  function walk(n: StrategyRuleNode): boolean {
    if (isLeafRule(n)) {
      const label =
        n.label ||
        n.description ||
        `${n.field} ${n.operator} ${String(n.value)}${
          n.valueTo != null ? `-${n.valueTo}` : ""
        }`;
      const ok = evaluateLeafRule(n, metrics);
      if (ok) matched.push(label);
      else failed.push(label);
      return ok;
    }
    const childResults = n.children.map((c) => walk(c));
    if (n.logic === "and") return childResults.every(Boolean);
    if (n.logic === "or") return childResults.some(Boolean);
    return !(childResults[0] ?? false);
  }

  walk(node);
  return { matched, failed };
}
