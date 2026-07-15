/**
 * Institutional AI Screener — intelligence exports (Sprint 9D.R2 / R3).
 */

export {
  SCREEN_INTELLIGENCE_EMPTY,
  SCREEN_GRADES,
  SCREEN_RANKING_MODES,
  gradeFromScore,
  emptyScoreFactors,
  emptyExplainability,
  emptyIntelligenceResult,
  normalizeResultCard,
} from "./ScreenPresentationModels";
export type {
  ScreenIntelligenceEmptyMessage,
  ScreenGrade,
  ScreenRankingMode,
  ScreenScoreFactors,
  ScreenExplainability,
  ScreenResultCard,
  IntelligenceScreenResult,
} from "./ScreenPresentationModels";

export {
  ScreenScoringEngine,
  composeScreenScoreFactors,
  deriveTechnicalStrength,
  deriveFundamentalStrength,
  deriveMomentumStrength,
  scoreCandidate,
} from "./ScreenScoringEngine";

export { ScreenRankingEngine, rankResults, rankScreenResults } from "./ScreenRankingEngine";

export {
  ScreenExplainabilityEngine,
  buildExplainability,
  buildScreenExplainability,
} from "./ScreenExplainabilityEngine";
export type { ExplainabilityInput } from "./ScreenExplainabilityEngine";

export {
  TechnicalScreenEngine,
  runTechnicalScreen,
  TECHNICAL_FILTER_IDS,
  TECHNICAL_FILTERS,
} from "./TechnicalScreenEngine";
export type {
  TechnicalFilterId,
  TechnicalFilterSpec,
  TechnicalScreenOptions,
} from "./TechnicalScreenEngine";

export {
  FundamentalScreenEngine,
  runFundamentalScreen,
  FUNDAMENTAL_FILTER_IDS,
  FUNDAMENTAL_FILTERS,
} from "./FundamentalScreenEngine";
export type {
  FundamentalFilterId,
  FundamentalFilterSpec,
  FundamentalScreenOptions,
} from "./FundamentalScreenEngine";

export {
  MultiFactorScreenEngine,
  runMultiFactorScreen,
} from "./MultiFactorScreenEngine";
export type { MultiFactorScreenOptions } from "./MultiFactorScreenEngine";

/* ── Sprint 9D.R3 — Event intelligence ─────────────────────────────── */

export {
  SCREEN_EVENT_EMPTY,
  emptyEventScoreFactors,
  emptyEventExplainability,
  emptyEventScreenResult,
  normalizeEventResultCard,
  candidateTags,
  candidateHasTag,
} from "./EventPresentationModels";
export type {
  ScreenEventEmptyMessage,
  EventScreenMode,
  ScreenEventCandidate,
  EventScoreFactors,
  EventExplainability,
  EventResultCard,
  EventScreenResult,
} from "./EventPresentationModels";

export {
  EventExplainabilityEngine,
  buildEventExplainability,
  composeEventScoreFactors,
  scoreEventCandidate,
} from "./EventExplainabilityEngine";
export type { EventExplainabilityInput } from "./EventExplainabilityEngine";

export {
  EventRankingEngine,
  rankEventResults,
} from "./EventRankingEngine";
export type { EventRankingMode } from "./EventRankingEngine";

export {
  EarningsScreenEngine,
  runEarningsScreen,
  EARNINGS_SCREEN_IDS,
  EARNINGS_SCREEN_LABELS,
} from "./EarningsScreenEngine";
export type {
  EarningsScreenId,
  EarningsScreenOptions,
} from "./EarningsScreenEngine";

export {
  NewsScreenEngine,
  runNewsScreen,
  NEWS_SCREEN_IDS,
  NEWS_SCREEN_LABELS,
} from "./NewsScreenEngine";
export type { NewsScreenId, NewsScreenOptions } from "./NewsScreenEngine";

export {
  CorporateActionScreenEngine,
  runCorporateActionScreen,
  CORPORATE_ACTION_SCREEN_IDS,
  CORPORATE_ACTION_SCREEN_LABELS,
} from "./CorporateActionScreenEngine";
export type {
  CorporateActionScreenId,
  CorporateActionScreenOptions,
} from "./CorporateActionScreenEngine";

export {
  ManagementCommentaryScreenEngine,
  runManagementScreen,
  MANAGEMENT_SCREEN_IDS,
  MANAGEMENT_SCREEN_LABELS,
} from "./ManagementCommentaryScreenEngine";
export type {
  ManagementScreenId,
  ManagementScreenOptions,
} from "./ManagementCommentaryScreenEngine";

export {
  EventCorrelationScreenEngine,
  runEventScreen,
} from "./EventCorrelationScreenEngine";
export type { EventCorrelationOptions } from "./EventCorrelationScreenEngine";
