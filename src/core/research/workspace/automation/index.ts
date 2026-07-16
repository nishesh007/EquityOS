/**
 * Workspace automation — public exports (Sprint 10A.R7).
 */

export {
  AUTOMATION_EMPTY,
  TEMPLATE_KINDS,
  AUTOMATION_RULES,
  FAVORITE_KINDS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  emptyTemplate,
  normalizeTemplate,
  emptyTask,
  normalizeTask,
  emptyFavorite,
  normalizeFavorite,
  emptyAnalytics,
} from "./AutomationPresentationModels";
export type {
  AutomationEmptyMessage,
  TemplateKind,
  AutomationRule,
  FavoriteKind,
  TaskPriority,
  TaskStatus,
  WorkspaceTemplate,
  AutomationRunResult,
  WorkspaceFavorite,
  WorkspaceTask,
  WorkspaceShortcut,
  RecentAction,
  WorkspaceSearchResult,
  WorkspaceAnalytics,
  TemplateView,
  FavoritesView,
  TasksView,
  ProductivityView,
} from "./AutomationPresentationModels";

export {
  createTemplate,
  applyTemplate,
  listTemplates,
  getTemplateView,
  resetWorkspaceTemplates,
  WorkspaceTemplateEngine,
} from "./WorkspaceTemplateEngine";
export type { CreateTemplateInput } from "./WorkspaceTemplateEngine";

export {
  runAutomation,
  getAutomationsRunCount,
  resetWorkspaceAutomation,
  WorkspaceAutomationEngine,
} from "./WorkspaceAutomationEngine";
export type { RunAutomationInput } from "./WorkspaceAutomationEngine";

export {
  addFavorite,
  listFavorites,
  getFavoritesView,
  resetWorkspaceFavorites,
  WorkspaceFavoritesEngine,
} from "./WorkspaceFavoritesEngine";
export type { AddFavoriteInput } from "./WorkspaceFavoritesEngine";

export {
  createTask,
  completeTask,
  listTasks,
  getTasksView,
  resetWorkspaceTasks,
  WorkspaceTaskEngine,
} from "./WorkspaceTaskEngine";
export type { CreateTaskInput } from "./WorkspaceTaskEngine";

export {
  getWorkspaceShortcuts,
  recordRecentAction,
  getRecentActions,
  searchWorkspace,
  resetWorkspaceShortcuts,
  WorkspaceShortcutEngine,
} from "./WorkspaceShortcutEngine";

export {
  getWorkspaceAnalytics,
  getProductivityView,
  trackCompanyResearched,
  resetWorkspaceProductivity,
  WorkspaceProductivityEngine,
} from "./WorkspaceProductivityEngine";

import { resetWorkspaceTemplates } from "./WorkspaceTemplateEngine";
import { resetWorkspaceAutomation } from "./WorkspaceAutomationEngine";
import { resetWorkspaceFavorites } from "./WorkspaceFavoritesEngine";
import { resetWorkspaceTasks } from "./WorkspaceTaskEngine";
import { resetWorkspaceShortcuts } from "./WorkspaceShortcutEngine";
import { resetWorkspaceProductivity } from "./WorkspaceProductivityEngine";

export function resetAutomationEngines(): void {
  resetWorkspaceTemplates();
  resetWorkspaceAutomation();
  resetWorkspaceFavorites();
  resetWorkspaceTasks();
  resetWorkspaceShortcuts();
  resetWorkspaceProductivity();
}
