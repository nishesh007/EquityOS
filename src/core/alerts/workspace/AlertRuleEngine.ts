/**
 * Alert Rule Engine — condition evaluation & custom rules (Sprint 9C.R7).
 */

import type { CenterAlert } from "../center/AlertCenterModels";
import { safeAlertText } from "../AlertModels";
import { scoreAlertPriority } from "../intelligence/AlertPriorityEngine";
import { estimateAlertImpact } from "../intelligence/AlertImpactEngine";
import { recommendAlertAction } from "../intelligence/AlertRecommendationEngine";
import type {
  AlertRuleAction,
  AlertRuleCondition,
  AlertRuleDefinition,
} from "./AlertWorkspaceModels";

let ruleSeq = 0;

export function resetAlertRuleSequence(): void {
  ruleSeq = 0;
}

export function createAlertRule(
  input: Omit<AlertRuleDefinition, "id" | "createdAt"> & {
    id?: string;
    createdAt?: string;
  }
): AlertRuleDefinition {
  ruleSeq += 1;
  return {
    id: input.id ?? `rule::${ruleSeq}`,
    name: safeAlertText(input.name, `Rule ${ruleSeq}`),
    enabled: input.enabled !== false,
    conditions: input.conditions.map((c) => ({ ...c })),
    actions: input.actions.map((a) => ({ ...a })),
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}

function fieldValue(
  item: CenterAlert,
  field: AlertRuleCondition["field"]
): string | number | boolean {
  const alert = item.alert;
  const priority = scoreAlertPriority(alert);
  const impact = estimateAlertImpact(alert);
  const rec = recommendAlertAction(alert);
  const event = alert.metadata.eventType.toLowerCase();
  const sector = safeAlertText(alert.metadata.extras.sector, "");

  switch (field) {
    case "confidence":
      return alert.confidence.score;
    case "priority":
      return priority.score;
    case "risk":
      return priority.factors.risk;
    case "category":
      return alert.category;
    case "company":
      return alert.company;
    case "sector":
      return sector;
    case "market":
      return alert.sourceEngine === "Market" || event.includes("market");
    case "portfolio":
      return alert.inPortfolio === true;
    case "watchlist":
      return alert.inWatchlist === true;
    case "technical":
      return alert.category === "Technical";
    case "fundamental":
      return alert.category === "Fundamental";
    case "news":
      return alert.category === "News" || alert.sourceEngine === "News";
    case "corporate_action":
      return (
        alert.category === "Corporate Action" ||
        alert.sourceEngine === "Corporate Actions"
      );
    case "trust":
      return priority.factors.trustScore;
    case "validation":
      return priority.factors.validationScore;
    case "ai_recommendation":
      return rec.action;
    case "impact":
      return impact.score;
    case "urgency":
      return impact.urgency;
    default:
      return "";
  }
}

export function evaluateCondition(
  item: CenterAlert,
  condition: AlertRuleCondition
): boolean {
  const left = fieldValue(item, condition.field);
  const right = condition.value;

  switch (condition.operator) {
    case "gt":
      return Number(left) > Number(right);
    case "gte":
      return Number(left) >= Number(right);
    case "lt":
      return Number(left) < Number(right);
    case "lte":
      return Number(left) <= Number(right);
    case "eq":
      return String(left).toLowerCase() === String(right).toLowerCase();
    case "neq":
      return String(left).toLowerCase() !== String(right).toLowerCase();
    case "contains":
      return String(left).toLowerCase().includes(String(right).toLowerCase());
    case "is_true":
      return left === true || left === "true" || left === 1;
    case "is_false":
      return left === false || left === "false" || left === 0;
    default:
      return false;
  }
}

export function evaluateRule(
  item: CenterAlert,
  rule: AlertRuleDefinition
): { matched: boolean; actions: AlertRuleAction[] } {
  if (!rule.enabled || rule.conditions.length === 0) {
    return { matched: false, actions: [] };
  }
  const matched = rule.conditions.every((c) => evaluateCondition(item, c));
  return {
    matched,
    actions: matched ? rule.actions.map((a) => ({ ...a })) : [],
  };
}

export class AlertRuleEngine {
  private readonly rules = new Map<string, AlertRuleDefinition>();

  clear(): void {
    this.rules.clear();
  }

  add(rule: AlertRuleDefinition): AlertRuleDefinition {
    this.rules.set(rule.id, {
      ...rule,
      conditions: rule.conditions.map((c) => ({ ...c })),
      actions: rule.actions.map((a) => ({ ...a })),
    });
    return this.get(rule.id)!;
  }

  remove(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  get(ruleId: string): AlertRuleDefinition | null {
    const r = this.rules.get(ruleId);
    return r
      ? {
          ...r,
          conditions: r.conditions.map((c) => ({ ...c })),
          actions: r.actions.map((a) => ({ ...a })),
        }
      : null;
  }

  list(): AlertRuleDefinition[] {
    return [...this.rules.values()].map((r) => ({
      ...r,
      conditions: r.conditions.map((c) => ({ ...c })),
      actions: r.actions.map((a) => ({ ...a })),
    }));
  }

  evaluate(
    item: CenterAlert,
    rules?: readonly AlertRuleDefinition[]
  ): Array<{ rule: AlertRuleDefinition; actions: AlertRuleAction[] }> {
    const source = rules ?? this.list();
    const hits: Array<{ rule: AlertRuleDefinition; actions: AlertRuleAction[] }> =
      [];
    for (const rule of source) {
      const result = evaluateRule(item, rule);
      if (result.matched) hits.push({ rule, actions: result.actions });
    }
    return hits;
  }
}
