/**
 * Institutional AI Screener — intelligence exports (Sprint 9D.R2).
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
