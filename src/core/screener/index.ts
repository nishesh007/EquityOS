/**
 * Institutional AI Screener — public exports (Sprint 9D.R1 / R2).
 * Composition layer only — no duplicated engine calculations.
 */

export {
  SCREEN_TYPES,
  SCREEN_ORIGINS,
  DEFAULT_SCREEN_WEIGHTS,
  isScreenType,
  resolveScreenType,
  resolveScreenWeights,
} from "./ScreenDefinition";
export type {
  ScreenType,
  ScreenOrigin,
  ScreenUniverseKind,
  ScreenSortOrder,
  ScreenRule,
  ScreenWeights,
  ScreenDefinition,
  ScreenDefinitionInput,
} from "./ScreenDefinition";

export {
  SCREEN_ENGINE_EMPTY,
  safeScreenText,
  safeScreenNumber,
  assertNoSentinelText,
} from "./ScreenModels";
export type {
  ScreenEmptyMessage,
  ScreenUniverseCandidate,
  ScreenEngineScores,
  ResolvedScreenScores,
  ScreenRunOptions,
} from "./ScreenModels";

export {
  emptyScreenRunResults,
  normalizeScreenMatch,
} from "./ScreenResult";
export type { ScreenMatchResult, ScreenRunResults } from "./ScreenResult";

export {
  buildScreenSnapshot,
  emptyScreenSnapshot,
} from "./ScreenSnapshot";
export type { ScreenSnapshot } from "./ScreenSnapshot";

export { ScreenMetricsTracker } from "./ScreenMetrics";
export type { ScreenOperationalMetrics } from "./ScreenMetrics";

export { ScreenCache } from "./ScreenCache";

export {
  registerBuiltinScreens,
  getScreen,
  listScreens,
  setScreenEnabled,
  isScreenEnabled,
  resetScreenRegistry,
} from "./ScreenRegistry";

export { ScreenRunner } from "./ScreenRunner";
export type { ScreenRunnerDeps } from "./ScreenRunner";

export {
  registerAIScreener,
  getAIScreener,
  resetAIScreener,
  registerScreen,
  runScreen,
  getResults,
  getMetrics,
  clearCache,
  runTechnicalScreen,
  runFundamentalScreen,
  runMultiFactorScreen,
  rankResults,
  buildExplainability,
} from "./AIScreener";
export type { AIScreenerRegistrationResult } from "./AIScreener";
export type {
  TechnicalScreenOptions,
  FundamentalScreenOptions,
  MultiFactorScreenOptions,
  IntelligenceScreenResult,
  ScreenResultCard,
  ScreenRankingMode,
  ExplainabilityInput,
} from "./AIScreener";

export {
  SCREEN_INTELLIGENCE_EMPTY,
  SCREEN_GRADES,
  SCREEN_RANKING_MODES,
  gradeFromScore,
  emptyScoreFactors,
  emptyExplainability,
  emptyIntelligenceResult,
  normalizeResultCard,
  ScreenScoringEngine,
  composeScreenScoreFactors,
  deriveTechnicalStrength,
  deriveFundamentalStrength,
  deriveMomentumStrength,
  scoreCandidate,
  ScreenRankingEngine,
  rankScreenResults,
  ScreenExplainabilityEngine,
  buildScreenExplainability,
  TechnicalScreenEngine,
  TECHNICAL_FILTER_IDS,
  TECHNICAL_FILTERS,
  FundamentalScreenEngine,
  FUNDAMENTAL_FILTER_IDS,
  FUNDAMENTAL_FILTERS,
  MultiFactorScreenEngine,
} from "./intelligence";
export type {
  ScreenIntelligenceEmptyMessage,
  ScreenGrade,
  ScreenScoreFactors,
  ScreenExplainability,
  TechnicalFilterId,
  TechnicalFilterSpec,
  FundamentalFilterId,
  FundamentalFilterSpec,
} from "./intelligence";
