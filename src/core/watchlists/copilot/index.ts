/**
 * Watchlist Copilot — public exports (Sprint 10B.R6).
 */

export {
  WATCHLIST_COPILOT_EMPTY,
  DECISION_KINDS,
  COPILOT_QUESTION_KINDS,
  safeCopilotText,
  safeCopilotNumber,
  emptyBriefView,
  emptyDecisionView,
  emptyExecutiveSummary,
  emptyCompanyComparison,
  emptyWatchlistComparison,
  emptyResearchCompanion,
  emptyCopilotBundle,
} from "./WatchlistCopilotModels";
export type {
  WatchlistCopilotEmptyMessage,
  DecisionKind,
  CopilotQuestionKind,
  WatchlistCopilotContext,
  WatchlistBriefView,
  DecisionAssistantView,
  DecisionItem,
  ExecutiveSummaryView,
  CopilotAnswer,
  CompanyComparisonView,
  WatchlistComparisonView,
  ResearchCompanionView,
  ResearchCompanionSuggestion,
  WatchlistCopilotBundle,
} from "./WatchlistCopilotModels";

export { getWatchlistBrief, WatchlistBriefEngine } from "./WatchlistBriefEngine";
export { getDecisionAssistant, WatchlistDecisionAssistant } from "./WatchlistDecisionAssistant";
export { getExecutiveSummary, WatchlistSummaryEngine } from "./WatchlistSummaryEngine";
export { askWatchlist, WatchlistQuestionEngine } from "./WatchlistQuestionEngine";
export {
  compareCompanies,
  compareWatchlists,
  WatchlistComparisonEngine,
} from "./WatchlistComparisonEngine";

export {
  WatchlistCopilotEngine,
  getWatchlistCopilotEngine,
  getWatchlistCopilot,
  getResearchCompanion,
  resetWatchlistCopilot,
  isSprint10BR6Frozen,
  SPRINT_10B_R6_FROZEN,
  getWatchlistCopilotHealth,
} from "./WatchlistCopilotEngine";
