/**
 * Watchlist Rule Engine — rule builder & evaluation (Sprint 10B.R2).
 * Composes metric bags only; no duplicated scoring engines.
 */

import {
  SMART_WATCHLIST_EMPTY,
  safeSmartNumber,
  safeSmartText,
  type SmartWatchlistCandidate,
  type WatchlistLeafRule,
  type WatchlistRuleGroup,
  type WatchlistRuleNode,
  type WatchlistRuleOperator,
} from "./SmartWatchlistModels";

const rules = new Map<string, WatchlistRuleNode>();
let ruleSeq = 0;

export function isLeafRule(node: WatchlistRuleNode): node is WatchlistLeafRule {
  return node.kind === "leaf";
}

export function isRuleGroup(node: WatchlistRuleNode): node is WatchlistRuleGroup {
  return node.kind === "group";
}

export function createRule(
  input: Omit<WatchlistLeafRule, "kind">
): WatchlistLeafRule {
  ruleSeq += 1;
  const rule: WatchlistLeafRule = {
    kind: "leaf",
    id: safeSmartText(input.id, `rule-${ruleSeq}`),
    field: input.field,
    operator: input.operator,
    value: input.value,
    valueTo: input.valueTo,
    label: safeSmartText(input.label, String(input.field)),
  };
  rules.set(rule.id, rule);
  return rule;
}

export function createRuleGroup(
  input: Omit<WatchlistRuleGroup, "kind">
): WatchlistRuleGroup {
  const group: WatchlistRuleGroup = {
    kind: "group",
    id: safeSmartText(input.id, `group-${++ruleSeq}`),
    logic: input.logic,
    children: input.children,
    label: input.label,
  };
  rules.set(group.id, group);
  return group;
}

export function getRule(id: string): WatchlistRuleNode | null {
  return rules.get(safeSmartText(id, "")) ?? null;
}

export function listRules(): WatchlistRuleNode[] {
  return Array.from(rules.values());
}

function resolveField(
  candidate: SmartWatchlistCandidate,
  field: string
): number | string | null {
  if (field === "portfolio_status") {
    return candidate.inPortfolio ? "in_portfolio" : "not_in_portfolio";
  }
  if (field === "watchlist_status") {
    return candidate.inWatchlist ? "in_watchlist" : "not_in_watchlist";
  }
  if (field === "sector") return candidate.sector ?? null;
  if (field === "industry") return candidate.industry ?? null;

  const raw = candidate.metrics[field];
  if (raw == null || raw === "") return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  return String(raw);
}

function compare(
  operator: WatchlistRuleOperator,
  actual: number | string,
  value: number | string,
  valueTo?: number
): boolean {
  if (typeof actual === "number") {
    const num = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(num) && operator !== "contains") return false;
    switch (operator) {
      case "gt":
        return actual > num;
      case "lt":
        return actual < num;
      case "gte":
        return actual >= num;
      case "lte":
        return actual <= num;
      case "eq":
        return actual === num;
      case "between":
        return (
          valueTo != null &&
          actual >= num &&
          actual <= safeSmartNumber(valueTo, num)
        );
      default:
        return false;
    }
  }

  const text = String(actual).toLowerCase();
  const needle = String(value).toLowerCase();
  switch (operator) {
    case "eq":
    case "contains":
      return text.includes(needle);
    default:
      return false;
  }
}

export function evaluateLeafRule(
  rule: WatchlistLeafRule,
  candidate: SmartWatchlistCandidate
): boolean {
  const actual = resolveField(candidate, rule.field);
  if (actual == null) return false;
  return compare(rule.operator, actual, rule.value, rule.valueTo);
}

export function evaluateRuleNode(
  node: WatchlistRuleNode,
  candidate: SmartWatchlistCandidate
): boolean {
  if (isLeafRule(node)) return evaluateLeafRule(node, candidate);

  const results = node.children.map((child) => evaluateRuleNode(child, candidate));
  switch (node.logic) {
    case "and":
      return results.length > 0 && results.every(Boolean);
    case "or":
      return results.some(Boolean);
    case "not":
      return results.length > 0 && !results[0];
    default:
      return false;
  }
}

export function filterCandidatesByRule(
  root: WatchlistRuleGroup,
  candidates: readonly SmartWatchlistCandidate[]
): SmartWatchlistCandidate[] {
  if (!root.children.length) {
    return [];
  }
  return candidates.filter((c) => evaluateRuleNode(root, c));
}

export function countRulesInTree(node: WatchlistRuleNode): number {
  if (isLeafRule(node)) return 1;
  return node.children.reduce((sum, child) => sum + countRulesInTree(child), 0);
}

export function resetWatchlistRules(): void {
  rules.clear();
  ruleSeq = 0;
}

export class WatchlistRuleEngine {
  createRule = createRule;
  createRuleGroup = createRuleGroup;
  evaluate = evaluateRuleNode;
  filter = filterCandidatesByRule;
  listRules = listRules;
  reset = resetWatchlistRules;
}
