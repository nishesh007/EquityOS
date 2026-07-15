/**
 * Alert Workspace — public exports (Sprint 9C.R7).
 */

export {
  WORKSPACE_EMPTY,
  DEFAULT_PREFERENCES,
  WORKSPACE_SECTION_LABELS,
  TEMPLATE_LABELS,
  emptyDecoration,
  emptyWorkspaceMetrics,
} from "./AlertWorkspaceModels";
export type {
  WorkspaceEmptyMessage,
  AlertRuleConditionField,
  AlertRuleOperator,
  AlertRuleActionType,
  AlertRuleCondition,
  AlertRuleAction,
  AlertRuleDefinition,
  WorkspaceSectionId,
  AlertWorkspaceTemplateId,
  AlertDensity,
  AlertSavedFilter,
  AlertSavedSearch,
  AlertSavedView,
  AlertPreferences,
  WorkspaceAlertDecoration,
  AutomationHistoryEntry,
  WorkspaceMetrics,
  WorkspaceSidebarView,
  AlertWorkspaceView,
} from "./AlertWorkspaceModels";

export {
  AlertRuleEngine,
  createAlertRule,
  evaluateCondition,
  evaluateRule,
  resetAlertRuleSequence,
} from "./AlertRuleEngine";

export {
  AlertPreferenceEngine,
  resetPreferenceSequence,
} from "./AlertPreferenceEngine";

export { AlertFavoriteEngine } from "./AlertFavoriteEngine";

export {
  AlertAutomationEngine,
  resetAutomationSequence,
} from "./AlertAutomationEngine";
export type { AutomationRunResult } from "./AlertAutomationEngine";

export {
  AlertTemplateEngine,
  buildTemplateRules,
} from "./AlertTemplateEngine";

export { AlertQuickActionEngine } from "./AlertQuickActionEngine";
export type { WorkspaceQuickActionId } from "./AlertQuickActionEngine";

export {
  AlertWorkspace,
  getAlertWorkspace,
  resetAlertWorkspace,
  getAlertWorkspaceView,
} from "./AlertWorkspace";
