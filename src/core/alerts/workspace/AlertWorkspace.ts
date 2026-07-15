/**
 * Alert Workspace — institutional configurable workspace façade (Sprint 9C.R7).
 */

import {
  getAlertCenter,
  resetAlertCenter,
  type AlertCenter,
} from "../center/AlertCenter";
import type { CenterAlert } from "../center/AlertCenterModels";
import { matchesCenterFilter } from "../center/AlertFilterEngine";
import { AlertRuleEngine, createAlertRule, resetAlertRuleSequence } from "./AlertRuleEngine";
import {
  AlertPreferenceEngine,
  resetPreferenceSequence,
} from "./AlertPreferenceEngine";
import { AlertFavoriteEngine } from "./AlertFavoriteEngine";
import {
  AlertAutomationEngine,
  resetAutomationSequence,
} from "./AlertAutomationEngine";
import { AlertTemplateEngine } from "./AlertTemplateEngine";
import { AlertQuickActionEngine } from "./AlertQuickActionEngine";
import {
  WORKSPACE_EMPTY,
  WORKSPACE_SECTION_LABELS,
  emptyWorkspaceMetrics,
  type AlertRuleDefinition,
  type AlertWorkspaceTemplateId,
  type AlertWorkspaceView,
  type WorkspaceMetrics,
  type WorkspaceSectionId,
  type WorkspaceSidebarView,
} from "./AlertWorkspaceModels";

function isToday(iso: string, now: Date): boolean {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return false;
  const d = new Date(t);
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export class AlertWorkspace {
  private readonly rules = new AlertRuleEngine();
  private readonly preferences = new AlertPreferenceEngine();
  private readonly favorites = new AlertFavoriteEngine();
  private readonly automation: AlertAutomationEngine;
  private readonly templates = new AlertTemplateEngine();
  private readonly quickActions: AlertQuickActionEngine;
  private activeSection: WorkspaceSectionId = "today";
  private center: AlertCenter;

  constructor(center?: AlertCenter) {
    this.center = center ?? getAlertCenter();
    this.automation = new AlertAutomationEngine(this.rules, this.favorites);
    this.quickActions = new AlertQuickActionEngine(this.favorites);
  }

  reset(): void {
    this.rules.clear();
    this.preferences.clear();
    this.favorites.clear();
    this.automation.clear();
    resetAlertRuleSequence();
    resetPreferenceSequence();
    resetAutomationSequence();
    this.activeSection = "today";
  }

  setCenter(center: AlertCenter): void {
    this.center = center;
  }

  addRule(
    input: Omit<AlertRuleDefinition, "id" | "createdAt"> & { id?: string }
  ): AlertRuleDefinition {
    return this.rules.add(createAlertRule(input));
  }

  listRules(): AlertRuleDefinition[] {
    return this.rules.list();
  }

  removeRule(ruleId: string): boolean {
    return this.rules.remove(ruleId);
  }

  runAutomation(options?: { now?: Date }): ReturnType<
    AlertAutomationEngine["runAll"]
  > {
    const items = this.listCenterAlerts();
    return this.automation.runAll(items, {
      center: this.center,
      now: options?.now,
    });
  }

  applyTemplate(templateId: AlertWorkspaceTemplateId) {
    return this.templates.apply(templateId, this.rules, this.preferences);
  }

  getPreferences() {
    return this.preferences.getPreferences();
  }

  setPreferences(
    patch: Parameters<AlertPreferenceEngine["setPreferences"]>[0]
  ) {
    return this.preferences.setPreferences(patch);
  }

  saveView(input: Parameters<AlertPreferenceEngine["saveView"]>[0]) {
    return this.preferences.saveView(input);
  }

  saveFilter(input: Parameters<AlertPreferenceEngine["saveFilter"]>[0]) {
    return this.preferences.saveFilter(input);
  }

  saveSearch(input: Parameters<AlertPreferenceEngine["saveSearch"]>[0]) {
    return this.preferences.saveSearch(input);
  }

  listSavedViews() {
    return this.preferences.listViews();
  }

  quickAction(
    alertId: string,
    action: Parameters<AlertQuickActionEngine["perform"]>[1],
    options?: { now?: Date }
  ) {
    return this.quickActions.perform(alertId, action, this.center, options);
  }

  listQuickActions() {
    return this.quickActions.listActions();
  }

  private listCenterAlerts(): CenterAlert[] {
    // Reconstruct lightweight CenterAlert list from center view rows + drawer
    const view = this.center.getView({ filter: "all" });
    const items: CenterAlert[] = [];
    for (const row of view.rows) {
      const drawer = this.center.getDrawer(row.id);
      // Use ingest path: center already has items; pull via history sync
      // Access through performAction no-op copy to get item
      const copy = this.center.performAction(row.id, "copy");
      if (copy.item) items.push(copy.item);
      else if (drawer) {
        // Fallback shouldn't happen when rows exist
      }
    }
    return items;
  }

  sectionAlertIds(
    section: WorkspaceSectionId,
    now = new Date()
  ): string[] {
    const items = this.listCenterAlerts();
    const favIds = new Set(this.favorites.listFavorites().map((d) => d.alertId));
    const pinIds = new Set(this.favorites.listPinned().map((d) => d.alertId));

    return items
      .filter((item) => {
        switch (section) {
          case "favorites":
            return favIds.has(item.id);
          case "pinned":
            return pinIds.has(item.id) || item.pinned;
          case "today":
            return isToday(item.alert.createdAt, now);
          case "portfolio":
            return matchesCenterFilter(item, "portfolio", now);
          case "watchlist":
            return matchesCenterFilter(item, "watchlist", now);
          case "critical":
            return matchesCenterFilter(item, "critical", now);
          case "research":
            return matchesCenterFilter(item, "research", now);
          case "archived":
            return matchesCenterFilter(item, "archived", now);
          case "recently_resolved":
            return matchesCenterFilter(item, "resolved", now);
          default:
            return true;
        }
      })
      .map((i) => i.id);
  }

  getSidebar(now = new Date()): WorkspaceSidebarView {
    const sections = (
      Object.keys(WORKSPACE_SECTION_LABELS) as WorkspaceSectionId[]
    ).map((id) => ({
      id,
      label: WORKSPACE_SECTION_LABELS[id],
      count: this.sectionAlertIds(id, now).length,
    }));
    const total = sections.reduce((s, x) => s + x.count, 0);
    return {
      sections,
      empty: total === 0,
      emptyMessage: WORKSPACE_EMPTY.noWorkspaceAlerts,
    };
  }

  getMetrics(): WorkspaceMetrics {
    const base = emptyWorkspaceMetrics();
    const history = this.automation.getHistory();
    const metrics: WorkspaceMetrics = {
      rulesCreated: this.rules.list().length,
      rulesTriggered: this.automation.getTriggeredCount(),
      automationSuccess: this.automation.getSuccessCount(),
      pinnedAlerts: this.favorites.listPinned().length,
      favorites: this.favorites.listFavorites().length,
      savedViews: this.preferences.listViews().length,
      automationHistoryCount: history.length,
      labels: {
        rulesCreated: String(this.rules.list().length),
        rulesTriggered: String(this.automation.getTriggeredCount()),
        automationSuccess: String(this.automation.getSuccessCount()),
        pinnedAlerts: String(this.favorites.listPinned().length),
        favorites: String(this.favorites.listFavorites().length),
        savedViews: String(this.preferences.listViews().length),
        automationHistory:
          history.length === 0
            ? WORKSPACE_EMPTY.noAutomationHistory
            : String(history.length),
      },
    };
    return metrics ?? base;
  }

  setActiveSection(section: WorkspaceSectionId): void {
    this.activeSection = section;
  }

  getView(options?: {
    section?: WorkspaceSectionId;
    now?: Date;
  }): AlertWorkspaceView {
    const now = options?.now ?? new Date();
    const section = options?.section ?? this.activeSection;
    this.activeSection = section;
    const alertIds = this.sectionAlertIds(section, now);
    const sidebar = this.getSidebar(now);
    const decorations = this.favorites.listAll();
    const rules = this.rules.list();
    const savedViews = this.preferences.listViews();

    if (sidebar.empty && rules.length === 0 && savedViews.length === 0) {
      return {
        sidebar,
        activeSection: section,
        alertIds: [],
        decorations,
        rules,
        savedViews,
        templates: this.templates.list(),
        metrics: this.getMetrics(),
        preferences: this.preferences.getPreferences(),
        empty: true,
        emptyMessage: WORKSPACE_EMPTY.noWorkspaceAlerts,
      };
    }

    return {
      sidebar,
      activeSection: section,
      alertIds,
      decorations,
      rules,
      savedViews,
      templates: this.templates.list(),
      metrics: this.getMetrics(),
      preferences: this.preferences.getPreferences(),
      empty: alertIds.length === 0,
      emptyMessage:
        section === "favorites"
          ? WORKSPACE_EMPTY.noFavorites
          : savedViews.length === 0 && section === "research"
            ? WORKSPACE_EMPTY.noSavedViews
            : WORKSPACE_EMPTY.noWorkspaceAlerts,
    };
  }

  getAutomationHistory() {
    const history = this.automation.getHistory();
    return {
      entries: history,
      empty: history.length === 0,
      emptyMessage: WORKSPACE_EMPTY.noAutomationHistory,
    };
  }

  getRuleEngine(): AlertRuleEngine {
    return this.rules;
  }

  getFavoriteEngine(): AlertFavoriteEngine {
    return this.favorites;
  }
}

let singleton: AlertWorkspace | null = null;

export function getAlertWorkspace(): AlertWorkspace {
  if (!singleton) singleton = new AlertWorkspace();
  return singleton;
}

export function resetAlertWorkspace(): void {
  singleton?.reset();
  singleton = null;
  resetAlertCenter();
}

export function getAlertWorkspaceView(options?: {
  section?: WorkspaceSectionId;
  now?: Date;
}): AlertWorkspaceView {
  try {
    return getAlertWorkspace().getView(options);
  } catch {
    return {
      sidebar: {
        sections: [],
        empty: true,
        emptyMessage: WORKSPACE_EMPTY.noWorkspaceAlerts,
      },
      activeSection: "today",
      alertIds: [],
      decorations: [],
      rules: [],
      savedViews: [],
      templates: [],
      metrics: emptyWorkspaceMetrics(),
      preferences: {
        defaultSort: "priority",
        defaultGrouping: "none",
        defaultDensity: "detailed",
        defaultFilter: "all",
        highlightColor: "#C4A35A",
      },
      empty: true,
      emptyMessage: WORKSPACE_EMPTY.noWorkspaceAlerts,
    };
  }
}
