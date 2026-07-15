/**
 * Alert Template Engine — investor persona presets (Sprint 9C.R7).
 */

import { createAlertRule, type AlertRuleEngine } from "./AlertRuleEngine";
import type { AlertPreferenceEngine } from "./AlertPreferenceEngine";
import {
  TEMPLATE_LABELS,
  type AlertRuleDefinition,
  type AlertWorkspaceTemplateId,
} from "./AlertWorkspaceModels";

export function buildTemplateRules(
  templateId: AlertWorkspaceTemplateId
): AlertRuleDefinition[] {
  switch (templateId) {
    case "growth_investor":
      return [
        createAlertRule({
          name: "Growth — High conviction pin",
          enabled: true,
          conditions: [
            { field: "confidence", operator: "gt", value: 90 },
            { field: "portfolio", operator: "is_true", value: true },
          ],
          actions: [{ type: "pin" }, { type: "highlight", value: "#3D8B6E" }],
        }),
        createAlertRule({
          name: "Growth — Opportunity favorite",
          enabled: true,
          conditions: [
            { field: "category", operator: "eq", value: "Opportunity" },
            { field: "priority", operator: "gte", value: 80 },
          ],
          actions: [{ type: "favorite" }, { type: "move_to_top" }],
        }),
      ];
    case "swing_trader":
      return [
        createAlertRule({
          name: "Swing — Technical highlight",
          enabled: true,
          conditions: [
            { field: "technical", operator: "is_true", value: true },
            { field: "priority", operator: "gt", value: 75 },
          ],
          actions: [
            { type: "highlight", value: "#4A7C9B" },
            { type: "move_to_top" },
          ],
        }),
      ];
    case "long_term_investor":
      return [
        createAlertRule({
          name: "LT — Fundamental archive noise",
          enabled: true,
          conditions: [
            { field: "priority", operator: "lt", value: 40 },
            { field: "technical", operator: "is_true", value: true },
          ],
          actions: [{ type: "archive" }],
        }),
        createAlertRule({
          name: "LT — Earnings pin",
          enabled: true,
          conditions: [
            { field: "category", operator: "eq", value: "Earnings" },
            { field: "portfolio", operator: "is_true", value: true },
          ],
          actions: [{ type: "pin" }, { type: "mark_read" }],
        }),
      ];
    case "research_analyst":
      return [
        createAlertRule({
          name: "Research — Validation focus",
          enabled: true,
          conditions: [
            { field: "validation", operator: "lt", value: 55 },
          ],
          actions: [{ type: "highlight", value: "#B85C38" }, { type: "favorite" }],
        }),
      ];
    case "portfolio_manager":
      return [
        createAlertRule({
          name: "PM — Critical to top",
          enabled: true,
          conditions: [
            { field: "risk", operator: "gte", value: 80 },
            { field: "portfolio", operator: "is_true", value: true },
          ],
          actions: [{ type: "move_to_top" }, { type: "pin" }, { type: "assign_color", value: "#8B3A3A" }],
        }),
        createAlertRule({
          name: "PM — Banking sector highlight",
          enabled: true,
          conditions: [
            { field: "sector", operator: "contains", value: "Bank" },
            { field: "priority", operator: "gt", value: 85 },
          ],
          actions: [{ type: "highlight" }],
        }),
      ];
    case "custom":
    default:
      return [];
  }
}

export class AlertTemplateEngine {
  apply(
    templateId: AlertWorkspaceTemplateId,
    rules: AlertRuleEngine,
    preferences: AlertPreferenceEngine
  ): { rulesAdded: number; template: AlertWorkspaceTemplateId; label: string } {
    const defs = buildTemplateRules(templateId);
    for (const rule of defs) rules.add(rule);

    if (templateId === "swing_trader") {
      preferences.setPreferences({
        defaultSort: "newest",
        defaultDensity: "compact",
        defaultFilter: "today",
      });
    } else if (templateId === "portfolio_manager") {
      preferences.setPreferences({
        defaultSort: "priority",
        defaultGrouping: "portfolio",
        defaultFilter: "portfolio",
        defaultDensity: "detailed",
      });
    } else if (templateId === "research_analyst") {
      preferences.setPreferences({
        defaultSort: "confidence",
        defaultFilter: "research",
        defaultDensity: "detailed",
      });
    }

    return {
      rulesAdded: defs.length,
      template: templateId,
      label: TEMPLATE_LABELS[templateId],
    };
  }

  list(): Array<{ id: AlertWorkspaceTemplateId; label: string }> {
    return (Object.keys(TEMPLATE_LABELS) as AlertWorkspaceTemplateId[]).map(
      (id) => ({ id, label: TEMPLATE_LABELS[id] })
    );
  }
}
