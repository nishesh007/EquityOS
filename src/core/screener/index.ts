/**
 * Institutional AI Screener — public exports (Sprint 9D.R1).
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
} from "./AIScreener";
export type { AIScreenerRegistrationResult } from "./AIScreener";
