/**
 * Institutional Strategy Screener — public exports (Sprint 9D.R5).
 */

export {
  STRATEGY_RULE_CATEGORIES,
  STRATEGY_COMPARISON_OPERATORS,
  STRATEGY_LOGIC_OPERATORS,
  isLeafRule,
  isRuleGroup,
  createLeafRule,
  createRuleGroup,
  resolveStrategyField,
  evaluateLeafRule,
  evaluateRuleNode,
  collectMatchedFailedRules,
} from "./StrategyRule";
export type {
  StrategyRuleCategory,
  StrategyComparisonOperator,
  StrategyLogicOperator,
  StrategyLeafRule,
  StrategyRuleGroup,
  StrategyRuleNode,
} from "./StrategyRule";

export {
  STRATEGY_ORIGINS,
  normalizeStrategyDefinition,
} from "./StrategyDefinition";
export type {
  StrategyOrigin,
  StrategyDefinition,
  StrategyDefinitionInput,
} from "./StrategyDefinition";

export {
  STRATEGY_EMPTY,
  emptyStrategyCard,
  emptySavedTemplateCard,
  emptyStrategyExplainability,
  emptyStrategyExecutionResult,
  normalizeStrategyCard,
  normalizeSavedTemplateCard,
  normalizeStrategyExplainability,
} from "./StrategyPresentationModels";
export type {
  StrategyEmptyMessage,
  StrategyCard,
  SavedTemplateCard,
  StrategyExplainability,
  StrategyExecutionResult,
} from "./StrategyPresentationModels";

export {
  createStrategy,
  updateStrategy,
  deleteStrategy,
  cloneStrategy,
  getStrategy,
  listStrategies,
  renameStrategy,
  setStrategyFavorite,
  markStrategyRun,
  saveTemplate,
  listTemplates,
  getTemplate,
  deleteTemplate,
  getRecentStrategyIds,
  getFavoriteStrategyIds,
  resetStrategyLibrary,
} from "./StrategyLibrary";

import { resetStrategyLibrary as resetLibrary } from "./StrategyLibrary";
import { resetBuiltinTemplateFlag } from "./StrategyTemplateEngine";

/** Full strategy module reset for tests (library + builtin registration flag). */
export function resetStrategyModule(): void {
  resetLibrary();
  resetBuiltinTemplateFlag();
}

export {
  BUILTIN_TEMPLATE_IDS,
  registerBuiltinTemplates,
  getBuiltinTemplates,
  resetBuiltinTemplateFlag,
} from "./StrategyTemplateEngine";
export type { BuiltinTemplateId } from "./StrategyTemplateEngine";

export {
  buildStrategyFromLeaves,
  countRules,
  summarizeRules,
  validateRuleTree,
  previewStrategy,
} from "./StrategyBuilderEngine";

export {
  runStrategy,
  toInstitutionalCandidate,
  StrategyEngine,
} from "./StrategyEngine";
export type {
  StrategyUniverseCandidate,
  StrategyRunOptions,
} from "./StrategyEngine";
