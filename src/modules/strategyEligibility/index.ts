/**
 * Strategy Eligibility module public exports (Sprint 11B.2C).
 */

export type {
  EligibleStrategy,
  StrategyCategory,
  StrategyEligibilityConfig,
  StrategyEligibilityInput,
  StrategyEligibilityListener,
  StrategyEligibilityServiceOptions,
  StrategyEligibilitySnapshot,
  StrategyEligibilityWeights,
  StrategyId,
  StrategyProfile,
} from "./StrategyEligibilityTypes";

export {
  DEFAULT_STRATEGY_ELIGIBILITY_CONFIG,
  DEFAULT_STRATEGY_ELIGIBILITY_WEIGHTS,
} from "./StrategyEligibilityTypes";

export {
  STRATEGY_MATRIX,
  getEnabledStrategyProfiles,
  getStrategyProfile,
  resolveStrategyMatrix,
} from "./StrategyMatrix";

export {
  StrategyEligibilityEngine,
  getStrategyEligibilityEngine,
  resetStrategyEligibilityEngine,
} from "./StrategyEligibilityEngine";

export {
  StrategyEligibilityService,
  getEligibleStrategies,
  getStrategyEligibilityService,
  refreshEligibility,
  resetStrategyEligibilityService,
  subscribeStrategyEligibility,
} from "./StrategyEligibilityService";

export {
  averageSectorScore,
  buildEligibilitySummary,
  collectBlockedReasons,
  collectSupportReasons,
  computeEligibilityScore,
  createFallbackEligibilitySnapshot,
  evaluateStrategyEligibility,
  evaluateStrategyMatrix,
  isEligibilityInputIncomplete,
  resolveStrategyEligibilityConfig,
  scoreRegimeMatch,
  sortEligibleStrategies,
} from "./StrategyEligibilityUtils";
