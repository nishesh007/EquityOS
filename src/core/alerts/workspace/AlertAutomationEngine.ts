/**
 * Alert Automation Engine — in-app rule execution (Sprint 9C.R7).
 * No email / SMS / push — EquityOS workflow only.
 */

import type { AlertCenter } from "../center/AlertCenter";
import type { CenterAlert } from "../center/AlertCenterModels";
import { safeAlertText } from "../AlertModels";
import { AlertRuleEngine } from "./AlertRuleEngine";
import { AlertFavoriteEngine } from "./AlertFavoriteEngine";
import type {
  AlertRuleAction,
  AlertRuleDefinition,
  AutomationHistoryEntry,
  WorkspaceAlertDecoration,
} from "./AlertWorkspaceModels";

let autoSeq = 0;

export function resetAutomationSequence(): void {
  autoSeq = 0;
}

export interface AutomationRunResult {
  alertId: string;
  triggeredRules: number;
  actionsApplied: string[];
  decoration: WorkspaceAlertDecoration;
  history: AutomationHistoryEntry[];
}

export class AlertAutomationEngine {
  private readonly history: AutomationHistoryEntry[] = [];
  private triggered = 0;
  private success = 0;

  constructor(
    private readonly rules: AlertRuleEngine,
    private readonly favorites: AlertFavoriteEngine
  ) {}

  clear(): void {
    this.history.length = 0;
    this.triggered = 0;
    this.success = 0;
    resetAutomationSequence();
  }

  getHistory(): AutomationHistoryEntry[] {
    return this.history.map((h) => ({ ...h, actions: [...h.actions] }));
  }

  getTriggeredCount(): number {
    return this.triggered;
  }

  getSuccessCount(): number {
    return this.success;
  }

  applyActions(
    item: CenterAlert,
    actions: readonly AlertRuleAction[],
    options?: {
      center?: AlertCenter | null;
      rule?: AlertRuleDefinition | null;
      now?: Date;
    }
  ): { applied: string[]; decoration: WorkspaceAlertDecoration } {
    const applied: string[] = [];
    let decoration = this.favorites.get(item.id);
    const center = options?.center;
    const now = options?.now;

    for (const action of actions) {
      switch (action.type) {
        case "pin":
          decoration = this.favorites.pin(item.id);
          center?.performAction(item.id, "pin", { now });
          applied.push("pin");
          break;
        case "highlight":
          decoration = this.favorites.highlight(
            item.id,
            typeof action.value === "string" ? action.value : ""
          );
          applied.push("highlight");
          break;
        case "move_to_top":
          decoration = this.favorites.pin(item.id);
          applied.push("move_to_top");
          break;
        case "favorite":
          decoration = this.favorites.favorite(item.id);
          applied.push("favorite");
          break;
        case "archive":
          center?.performAction(item.id, "archive", { now });
          applied.push("archive");
          break;
        case "snooze":
          center?.performAction(item.id, "snooze", {
            now,
            snoozeUntil: new Date(Date.now() + 3_600_000),
          });
          applied.push("snooze");
          break;
        case "auto_resolve":
          center?.performAction(item.id, "resolve", { now });
          applied.push("auto_resolve");
          break;
        case "group":
          decoration = this.favorites.setGroup(
            item.id,
            typeof action.value === "string"
              ? action.value
              : item.alert.category
          );
          applied.push("group");
          break;
        case "assign_color":
          decoration = this.favorites.assignColor(
            item.id,
            typeof action.value === "string" ? action.value : "#C4A35A"
          );
          applied.push("assign_color");
          break;
        case "mark_read":
          center?.performAction(item.id, "mark_read", { now });
          applied.push("mark_read");
          break;
        default:
          break;
      }
    }

    if (options?.rule) {
      autoSeq += 1;
      const entry: AutomationHistoryEntry = {
        id: `auto::${autoSeq}`,
        ruleId: options.rule.id,
        ruleName: safeAlertText(options.rule.name, "Rule"),
        alertId: item.id,
        actions: applied,
        at: (now ?? new Date()).toISOString(),
        success: applied.length > 0,
        note:
          applied.length > 0
            ? `Applied ${applied.join(", ")}`
            : "No actions applied",
      };
      this.history.push(entry);
      this.triggered += 1;
      if (entry.success) this.success += 1;
    }

    return { applied, decoration: this.favorites.get(item.id) };
  }

  runForAlert(
    item: CenterAlert,
    options?: { center?: AlertCenter | null; now?: Date }
  ): AutomationRunResult {
    const hits = this.rules.evaluate(item);
    const allApplied: string[] = [];
    const historyEntries: AutomationHistoryEntry[] = [];

    for (const hit of hits) {
      const before = this.history.length;
      const result = this.applyActions(item, hit.actions, {
        center: options?.center,
        rule: hit.rule,
        now: options?.now,
      });
      allApplied.push(...result.applied);
      historyEntries.push(...this.history.slice(before));
    }

    return {
      alertId: item.id,
      triggeredRules: hits.length,
      actionsApplied: Array.from(new Set(allApplied)),
      decoration: this.favorites.get(item.id),
      history: historyEntries,
    };
  }

  runAll(
    items: readonly CenterAlert[],
    options?: { center?: AlertCenter | null; now?: Date }
  ): AutomationRunResult[] {
    return items.map((item) => this.runForAlert(item, options));
  }
}
