/**
 * Smart Watchlist Platform — public exports (Sprint 10B.R2).
 */

export {
  SMART_WATCHLIST_EMPTY,
  DYNAMIC_WATCHLIST_TEMPLATES,
  DYNAMIC_TEMPLATE_LABELS,
  WATCHLIST_RULE_FIELDS,
  WATCHLIST_RULE_OPERATORS,
  GROUPING_DIMENSIONS,
  safeSmartText,
  safeSmartNumber,
  emptyDynamicWatchlist,
  emptyRecommendationsView,
  emptySmartWatchlistView,
} from "./SmartWatchlistModels";
export type {
  SmartWatchlistEmptyMessage,
  DynamicWatchlistTemplateId,
  WatchlistRuleField,
  WatchlistRuleOperator,
  GroupingDimension,
  SmartWatchlistCandidate,
  WatchlistLeafRule,
  WatchlistRuleGroup,
  WatchlistRuleNode,
  DynamicWatchlistDefinition,
  DynamicWatchlistRunResult,
  CompanyTag,
  WatchlistGroupBucket,
  WatchlistGroupingView,
  WatchlistRecommendation,
  WatchlistRecommendationsView,
  SmartWatchlistView,
} from "./SmartWatchlistModels";

export {
  createRule,
  createRuleGroup,
  getRule,
  listRules,
  evaluateLeafRule,
  evaluateRuleNode,
  filterCandidatesByRule,
  countRulesInTree,
  resetWatchlistRules,
  WatchlistRuleEngine,
} from "./WatchlistRuleEngine";

export {
  createDynamicWatchlist,
  getDynamicWatchlist,
  listDynamicWatchlists,
  runDynamicWatchlist,
  getLastDynamicRun,
  syncDynamicToRegistry,
  resetDynamicWatchlists,
  DynamicWatchlistEngine,
} from "./DynamicWatchlistEngine";

export {
  tagCompanies,
  getCompanyTags,
  listTaggedCompanies,
  detectDuplicateTags,
  resetWatchlistTags,
  WatchlistTagEngine,
} from "./WatchlistTagEngine";

export {
  groupWatchlist,
  autoGroupAllDimensions,
  WatchlistGroupingEngine,
} from "./WatchlistGroupingEngine";

export {
  getRecommendations,
  detectDuplicateWatchlists,
  WatchlistRecommendationEngine,
} from "./WatchlistRecommendationEngine";

export {
  SmartWatchlistEngine,
  getSmartWatchlistEngine,
  resetSmartWatchlistEngine,
  getSmartWatchlistView,
  getCompanySmartTags,
  SPRINT_10B_R2_FROZEN,
  isSprint10BR2Frozen,
  getSmartWatchlistHealth,
} from "./SmartWatchlistEngine";
export type { SmartWatchlistHealth } from "./SmartWatchlistEngine";
