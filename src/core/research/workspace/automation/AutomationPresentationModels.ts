/**
 * Workspace automation — presentation models (Sprint 10A.R7).
 * Templates, favorites, tasks, productivity. Never surface null/undefined/NaN.
 */

import { safeWorkspaceText } from "../WorkspaceModels";

export const AUTOMATION_EMPTY = {
  noTemplates: "No Templates",
  noFavorites: "No Favorites",
  noTasks: "No Tasks",
  awaitingWorkspace: "Awaiting Workspace",
  noAutomationRules: "No Automation Rules",
} as const;

export type AutomationEmptyMessage =
  (typeof AUTOMATION_EMPTY)[keyof typeof AUTOMATION_EMPTY];

export const TEMPLATE_KINDS = [
  "research",
  "earnings",
  "portfolio_review",
  "company_deep_dive",
  "sector_analysis",
  "watchlist_review",
  "custom",
] as const;

export type TemplateKind = (typeof TEMPLATE_KINDS)[number];

export const AUTOMATION_RULES = [
  "auto_open_research",
  "auto_open_earnings",
  "auto_open_alerts",
  "auto_load_notes",
  "auto_load_watchlist",
  "auto_load_portfolio",
  "auto_save_workspace",
] as const;

export type AutomationRule = (typeof AUTOMATION_RULES)[number];

export const FAVORITE_KINDS = [
  "company",
  "workspace",
  "template",
  "layout",
  "research",
] as const;

export type FavoriteKind = (typeof FAVORITE_KINDS)[number];

export const TASK_PRIORITIES = ["low", "medium", "high", "critical"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_STATUSES = ["pending", "completed"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface WorkspaceTemplate {
  id: string;
  workspaceId: string;
  kind: TemplateKind;
  name: string;
  description: string;
  tabs: string[];
  layoutPreset: string | null;
  ticker: string | null;
  createdAt: string;
  empty: boolean;
  emptyMessage: AutomationEmptyMessage;
}

export interface AutomationRunResult {
  id: string;
  workspaceId: string;
  rules: AutomationRule[];
  actions: string[];
  tabsOpened: number;
  notesLoaded: number;
  saved: boolean;
  at: string;
  empty: boolean;
  emptyMessage: AutomationEmptyMessage;
}

export interface WorkspaceFavorite {
  id: string;
  workspaceId: string;
  kind: FavoriteKind;
  label: string;
  target: string;
  ticker: string | null;
  pinned: boolean;
  createdAt: string;
  empty: boolean;
  emptyMessage: AutomationEmptyMessage;
}

export interface WorkspaceTask {
  id: string;
  workspaceId: string;
  title: string;
  body: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  linkedTicker: string | null;
  linkedResearch: string | null;
  createdAt: string;
  completedAt: string | null;
  empty: boolean;
  emptyMessage: AutomationEmptyMessage;
}

export interface WorkspaceShortcut {
  id: string;
  label: string;
  keys: string;
  action: string;
  route: string;
}

export interface RecentAction {
  id: string;
  label: string;
  route: string;
  at: string;
}

export interface WorkspaceSearchResult {
  id: string;
  kind: string;
  label: string;
  route: string;
  score: number;
}

export interface WorkspaceAnalytics {
  sessionDurationMinutes: number;
  companiesResearched: number;
  reportsGenerated: number;
  researchProductivity: number;
  completionRate: number;
  tasksCompleted: number;
  tasksPending: number;
  templatesApplied: number;
  automationsRun: number;
  empty: boolean;
  emptyMessage: AutomationEmptyMessage;
}

export interface TemplateView {
  templates: WorkspaceTemplate[];
  empty: boolean;
  emptyMessage: AutomationEmptyMessage;
}

export interface FavoritesView {
  favorites: WorkspaceFavorite[];
  empty: boolean;
  emptyMessage: AutomationEmptyMessage;
}

export interface TasksView {
  tasks: WorkspaceTask[];
  pending: WorkspaceTask[];
  completed: WorkspaceTask[];
  empty: boolean;
  emptyMessage: AutomationEmptyMessage;
}

export interface ProductivityView {
  shortcuts: WorkspaceShortcut[];
  recentActions: RecentAction[];
  searchResults: WorkspaceSearchResult[];
  analytics: WorkspaceAnalytics;
  empty: boolean;
  emptyMessage: AutomationEmptyMessage;
}

export function emptyTemplate(
  message: AutomationEmptyMessage = AUTOMATION_EMPTY.noTemplates
): WorkspaceTemplate {
  return {
    id: "",
    workspaceId: "",
    kind: "custom",
    name: message,
    description: message,
    tabs: [],
    layoutPreset: null,
    ticker: null,
    createdAt: "",
    empty: true,
    emptyMessage: message,
  };
}

export function normalizeTemplate(input: Partial<WorkspaceTemplate>): WorkspaceTemplate {
  const kind = TEMPLATE_KINDS.includes(input.kind as TemplateKind)
    ? (input.kind as TemplateKind)
    : "custom";
  return {
    id: safeWorkspaceText(input.id, ""),
    workspaceId: safeWorkspaceText(input.workspaceId, "").toLowerCase(),
    kind,
    name: safeWorkspaceText(input.name, AUTOMATION_EMPTY.awaitingWorkspace),
    description: safeWorkspaceText(input.description, ""),
    tabs: Array.isArray(input.tabs)
      ? input.tabs.map((t) => safeWorkspaceText(t, "")).filter(Boolean)
      : [],
    layoutPreset: input.layoutPreset ? safeWorkspaceText(input.layoutPreset, "") : null,
    ticker: input.ticker ? safeWorkspaceText(input.ticker, "").toUpperCase() : null,
    createdAt: safeWorkspaceText(input.createdAt, new Date().toISOString()),
    empty: Boolean(input.empty),
    emptyMessage: input.emptyMessage ?? AUTOMATION_EMPTY.awaitingWorkspace,
  };
}

export function emptyTask(
  message: AutomationEmptyMessage = AUTOMATION_EMPTY.noTasks
): WorkspaceTask {
  return {
    id: "",
    workspaceId: "",
    title: message,
    body: message,
    status: "pending",
    priority: "medium",
    dueDate: null,
    linkedTicker: null,
    linkedResearch: null,
    createdAt: "",
    completedAt: null,
    empty: true,
    emptyMessage: message,
  };
}

export function normalizeTask(input: Partial<WorkspaceTask>): WorkspaceTask {
  const priority = TASK_PRIORITIES.includes(input.priority as TaskPriority)
    ? (input.priority as TaskPriority)
    : "medium";
  const status = TASK_STATUSES.includes(input.status as TaskStatus)
    ? (input.status as TaskStatus)
    : "pending";
  return {
    id: safeWorkspaceText(input.id, ""),
    workspaceId: safeWorkspaceText(input.workspaceId, "").toLowerCase(),
    title: safeWorkspaceText(input.title, AUTOMATION_EMPTY.awaitingWorkspace),
    body: safeWorkspaceText(input.body, ""),
    status,
    priority,
    dueDate: input.dueDate ? safeWorkspaceText(input.dueDate, "") : null,
    linkedTicker: input.linkedTicker
      ? safeWorkspaceText(input.linkedTicker, "").toUpperCase()
      : null,
    linkedResearch: input.linkedResearch
      ? safeWorkspaceText(input.linkedResearch, "")
      : null,
    createdAt: safeWorkspaceText(input.createdAt, new Date().toISOString()),
    completedAt: input.completedAt ? safeWorkspaceText(input.completedAt, "") : null,
    empty: Boolean(input.empty),
    emptyMessage: input.emptyMessage ?? AUTOMATION_EMPTY.awaitingWorkspace,
  };
}

export function emptyFavorite(
  message: AutomationEmptyMessage = AUTOMATION_EMPTY.noFavorites
): WorkspaceFavorite {
  return {
    id: "",
    workspaceId: "",
    kind: "company",
    label: message,
    target: "",
    ticker: null,
    pinned: false,
    createdAt: "",
    empty: true,
    emptyMessage: message,
  };
}

export function normalizeFavorite(input: Partial<WorkspaceFavorite>): WorkspaceFavorite {
  const kind = FAVORITE_KINDS.includes(input.kind as FavoriteKind)
    ? (input.kind as FavoriteKind)
    : "company";
  return {
    id: safeWorkspaceText(input.id, ""),
    workspaceId: safeWorkspaceText(input.workspaceId, "").toLowerCase(),
    kind,
    label: safeWorkspaceText(input.label, AUTOMATION_EMPTY.awaitingWorkspace),
    target: safeWorkspaceText(input.target, ""),
    ticker: input.ticker ? safeWorkspaceText(input.ticker, "").toUpperCase() : null,
    pinned: Boolean(input.pinned),
    createdAt: safeWorkspaceText(input.createdAt, new Date().toISOString()),
    empty: Boolean(input.empty),
    emptyMessage: input.emptyMessage ?? AUTOMATION_EMPTY.awaitingWorkspace,
  };
}

export function emptyAnalytics(
  message: AutomationEmptyMessage = AUTOMATION_EMPTY.awaitingWorkspace
): WorkspaceAnalytics {
  return {
    sessionDurationMinutes: 0,
    companiesResearched: 0,
    reportsGenerated: 0,
    researchProductivity: 0,
    completionRate: 0,
    tasksCompleted: 0,
    tasksPending: 0,
    templatesApplied: 0,
    automationsRun: 0,
    empty: true,
    emptyMessage: message,
  };
}
