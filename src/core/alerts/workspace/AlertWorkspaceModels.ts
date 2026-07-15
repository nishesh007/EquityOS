/**
 * Alert Workspace models (Sprint 9C.R7).
 * Rules, preferences, templates, and in-app automation — no external notifications.
 */

import { safeAlertText } from "../AlertModels";
import type { AlertCenterFilterId, AlertCenterGroupBy } from "../center/AlertCenterModels";

export const WORKSPACE_EMPTY = {
  noRules: "No Rules",
  noSavedViews: "No Saved Views",
  noFavorites: "No Favorites",
  noWorkspaceAlerts: "No Workspace Alerts",
  noAutomationHistory: "No Automation History",
} as const;

export type WorkspaceEmptyMessage =
  (typeof WORKSPACE_EMPTY)[keyof typeof WORKSPACE_EMPTY];

export type AlertRuleConditionField =
  | "confidence"
  | "priority"
  | "risk"
  | "category"
  | "company"
  | "sector"
  | "market"
  | "portfolio"
  | "watchlist"
  | "technical"
  | "fundamental"
  | "news"
  | "corporate_action"
  | "trust"
  | "validation"
  | "ai_recommendation"
  | "impact"
  | "urgency";

export type AlertRuleOperator =
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "eq"
  | "neq"
  | "contains"
  | "is_true"
  | "is_false";

export type AlertRuleActionType =
  | "pin"
  | "highlight"
  | "move_to_top"
  | "favorite"
  | "archive"
  | "snooze"
  | "auto_resolve"
  | "group"
  | "assign_color"
  | "mark_read";

export interface AlertRuleCondition {
  field: AlertRuleConditionField;
  operator: AlertRuleOperator;
  value: string | number | boolean;
}

export interface AlertRuleAction {
  type: AlertRuleActionType;
  value?: string | number | boolean;
}

export interface AlertRuleDefinition {
  id: string;
  name: string;
  enabled: boolean;
  conditions: AlertRuleCondition[];
  actions: AlertRuleAction[];
  createdAt: string;
}

export type WorkspaceSectionId =
  | "favorites"
  | "pinned"
  | "today"
  | "portfolio"
  | "watchlist"
  | "critical"
  | "research"
  | "archived"
  | "recently_resolved";

export type AlertWorkspaceTemplateId =
  | "growth_investor"
  | "swing_trader"
  | "long_term_investor"
  | "research_analyst"
  | "portfolio_manager"
  | "custom";

export type AlertDensity = "compact" | "detailed";

export interface AlertSavedFilter {
  id: string;
  name: string;
  filter: AlertCenterFilterId;
  searchText: string;
  createdAt: string;
}

export interface AlertSavedSearch {
  id: string;
  name: string;
  query: string;
  ticker: string;
  createdAt: string;
}

export interface AlertSavedView {
  id: string;
  name: string;
  filter: AlertCenterFilterId;
  groupBy: AlertCenterGroupBy;
  sort: "priority" | "newest" | "confidence";
  density: AlertDensity;
  createdAt: string;
}

export interface AlertPreferences {
  defaultSort: "priority" | "newest" | "confidence";
  defaultGrouping: AlertCenterGroupBy | "none";
  defaultDensity: AlertDensity;
  defaultFilter: AlertCenterFilterId;
  highlightColor: string;
}

export interface WorkspaceAlertDecoration {
  alertId: string;
  pinned: boolean;
  favorite: boolean;
  highlighted: boolean;
  moveToTop: boolean;
  color: string;
  groupKey: string;
}

export interface AutomationHistoryEntry {
  id: string;
  ruleId: string;
  ruleName: string;
  alertId: string;
  actions: string[];
  at: string;
  success: boolean;
  note: string;
}

export interface WorkspaceMetrics {
  rulesCreated: number;
  rulesTriggered: number;
  automationSuccess: number;
  pinnedAlerts: number;
  favorites: number;
  savedViews: number;
  automationHistoryCount: number;
  labels: {
    rulesCreated: string;
    rulesTriggered: string;
    automationSuccess: string;
    pinnedAlerts: string;
    favorites: string;
    savedViews: string;
    automationHistory: string;
  };
}

export interface WorkspaceSidebarView {
  sections: Array<{ id: WorkspaceSectionId; label: string; count: number }>;
  empty: boolean;
  emptyMessage: WorkspaceEmptyMessage;
}

export interface AlertWorkspaceView {
  sidebar: WorkspaceSidebarView;
  activeSection: WorkspaceSectionId;
  alertIds: string[];
  decorations: WorkspaceAlertDecoration[];
  rules: AlertRuleDefinition[];
  savedViews: AlertSavedView[];
  templates: Array<{ id: AlertWorkspaceTemplateId; label: string }>;
  metrics: WorkspaceMetrics;
  preferences: AlertPreferences;
  empty: boolean;
  emptyMessage: WorkspaceEmptyMessage;
}

export const DEFAULT_PREFERENCES: AlertPreferences = {
  defaultSort: "priority",
  defaultGrouping: "none",
  defaultDensity: "detailed",
  defaultFilter: "all",
  highlightColor: "#C4A35A",
};

export const WORKSPACE_SECTION_LABELS: Record<WorkspaceSectionId, string> = {
  favorites: "Favorite Alerts",
  pinned: "Pinned Alerts",
  today: "Today's Alerts",
  portfolio: "Portfolio Alerts",
  watchlist: "Watchlist Alerts",
  critical: "Critical Alerts",
  research: "Research Alerts",
  archived: "Archived",
  recently_resolved: "Recently Resolved",
};

export const TEMPLATE_LABELS: Record<AlertWorkspaceTemplateId, string> = {
  growth_investor: "Growth Investor",
  swing_trader: "Swing Trader",
  long_term_investor: "Long Term Investor",
  research_analyst: "Research Analyst",
  portfolio_manager: "Portfolio Manager",
  custom: "Custom",
};

export function emptyDecoration(alertId: string): WorkspaceAlertDecoration {
  return {
    alertId: safeAlertText(alertId, ""),
    pinned: false,
    favorite: false,
    highlighted: false,
    moveToTop: false,
    color: "",
    groupKey: "",
  };
}

export function emptyWorkspaceMetrics(): WorkspaceMetrics {
  return {
    rulesCreated: 0,
    rulesTriggered: 0,
    automationSuccess: 0,
    pinnedAlerts: 0,
    favorites: 0,
    savedViews: 0,
    automationHistoryCount: 0,
    labels: {
      rulesCreated: "0",
      rulesTriggered: "0",
      automationSuccess: "0",
      pinnedAlerts: "0",
      favorites: "0",
      savedViews: "0",
      automationHistory: WORKSPACE_EMPTY.noAutomationHistory,
    },
  };
}
