/**
 * AI Strategy Builder public API (Sprint 11D).
 */

export type {
  BuilderTab,
  BuiltStrategy,
  ComparisonHighlight,
  DeploymentChecklistItem,
  DeploymentReadiness,
  DeploymentStatus,
  ImprovementSuggestion,
  LibraryFilterState,
  MarketRegime,
  StrategyBuilderAction,
  StrategyBuilderState,
  StrategyBuildingBlocks,
  StrategyGenerationContext,
  StrategyGrade,
  StrategyPerformance,
  StrategyRules,
  StrategyScores,
  StrategySource,
  StrategyTemplate,
  StrategyUniverse,
} from "./types";

export {
  STRATEGY_TEMPLATES,
  cloneTemplate,
  getTemplateById,
} from "./templates";

export {
  TECHNICAL_INDICATOR_OPTIONS,
  FUNDAMENTAL_FILTER_OPTIONS,
  VALUATION_FILTER_OPTIONS,
  VOLUME_FILTER_OPTIONS,
  MOMENTUM_FILTER_OPTIONS,
  RISK_RULE_OPTIONS,
  EXIT_RULE_OPTIONS,
  POSITION_SIZING_OPTIONS,
  HOLDING_PERIOD_OPTIONS,
  UNIVERSE_OPTIONS,
  REGIME_OPTIONS,
  createDefaultBuildingBlocks,
  toggleListItem,
} from "./catalog";

export {
  generateRulesFromBlocks,
  generateStrategies,
  createStrategyFromParts,
  validateBuildingBlocks,
} from "./generator";

export {
  simulatePerformance,
  calculateScores,
  generateImprovements,
  buildDeploymentReadiness,
  evaluateStrategyBundle,
} from "./evaluate";

export {
  LIBRARY_STORAGE_KEY,
  loadLibrary,
  saveLibrary,
  isDuplicateName,
  saveToLibrary,
  duplicateStrategy,
  renameStrategy,
  archiveStrategy,
  deleteStrategy,
  toggleFavorite,
  setStrategyTags,
  updateStrategyRules,
  filterLibrary,
  strategyFromTemplateEdit,
} from "./library";

export {
  buildComparisonHighlight,
  resolveComparedStrategies,
} from "./comparison";

export { exportStrategies } from "./export";

export {
  UI_STORAGE_KEY,
  createInitialBuilderState,
  hydrateBuilderState,
  persistBuilderUi,
  builderReducer,
  allStrategies,
} from "./store";
