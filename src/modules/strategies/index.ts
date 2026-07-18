/**
 * Strategy Framework public exports — Sprint 11B.3A.
 */

export type {
  StrategyAnalysisResult,
  StrategyCategory,
  StrategyEngineOptions,
  StrategyEngineResult,
  StrategyExecutionContext,
  StrategyId,
  StrategyLifecycleSnapshot,
  StrategyLifecycleState,
  StrategyMarketInput,
  StrategyRegistration,
  StrategySignal,
  StrategySignalType,
  StrategyTargets,
  StrategyValidationIssue,
  StrategyValidationResult,
} from "./StrategyTypes";

export type { StrategyFrameworkConfig } from "./StrategyConstants";

export {
  DEFAULT_STRATEGY_FRAMEWORK_CONFIG,
  STRATEGY_CATEGORIES,
  STRATEGY_LIFECYCLE_STATES,
  STRATEGY_LIFECYCLE_TRANSITIONS,
  STRATEGY_SIGNAL_TYPES,
} from "./StrategyConstants";

export { BaseStrategy } from "./BaseStrategy";
export { StrategyLifecycle } from "./StrategyLifecycle";
export {
  StrategyRegistry,
  getStrategyRegistry,
  resetStrategyRegistry,
} from "./StrategyRegistry";
export {
  StrategyFactory,
  getStrategyFactory,
  resetStrategyFactory,
} from "./StrategyFactory";
export {
  StrategyValidator,
  createDefaultStrategyValidator,
} from "./StrategyValidator";
export {
  StrategyEngine,
  getStrategyEngine,
  resetStrategyEngine,
} from "./StrategyEngine";

export {
  buildStrategySignal,
  calculateRiskRewardRatio,
  clampScore,
  createIgnoreSignal,
  defaultHoldingPeriod,
  emptyValidationResult,
  isFinitePositivePrice,
  isStrategyEligible,
  isValidMarketInput,
  mergeValidationResults,
  resolveStrategyFrameworkConfig,
} from "./StrategyUtils";

export {
  ORBStrategy,
  ORBDetector,
  ORBValidator,
  calculateOpeningRange,
  calculateORBConfidence,
  createORBStrategyRegistration,
  detectBreakout,
  detectORB,
  getORBDetector,
  registerORBStrategy,
  resetORBDetector,
  validateBreadth,
  validateLiquidity,
  validateMarket,
  validateVolume,
  DEFAULT_ORB_CONFIG,
  ORB_STRATEGY_ID,
  type ORBCandle,
  type ORBConfig,
  type ORBDetection,
  type ORBDetectionContext,
  type ORBDirection,
  type ORBMarketData,
  type ORBStrategyInput,
} from "./orb";
