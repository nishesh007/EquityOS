/**
 * VWAP Continuation module exports — Sprint 11B.3C.1 / 11B.3C.2.
 */

export type { VWAPContinuationConfig } from "./VWAPContinuationConstants";
export {
  DEFAULT_VWAP_CONTINUATION_CONFIG,
  VWAP_CONTINUATION_STRATEGY_ID,
  VWAP_CONTINUATION_STRATEGY_NAME,
  resolveVWAPContinuationConfig,
} from "./VWAPContinuationConstants";

export type {
  VWAPCandle,
  VWAPContinuationDetection,
  VWAPContinuationDetectionContext,
  VWAPContinuationDirection,
  VWAPContinuationMarketData,
  VWAPContinuationStrategyInput,
  VWAPContinuationValidationResult,
} from "./VWAPContinuationTypes";

export {
  isVWAPContinuationStrategyInput,
  toVWAPContinuationDetectionContext,
} from "./VWAPContinuationTypes";

export type {
  VWAPContinuationEntryMode,
  VWAPContinuationPositionType,
  VWAPContinuationQualityGrade,
  VWAPContinuationStopMethod,
  VWAPContinuationTradeConfig,
  VWAPContinuationTradeSetup,
} from "./VWAPContinuationTradeTypes";

export {
  DEFAULT_VWAP_CONTINUATION_TRADE_CONFIG,
  resolveVWAPContinuationTradeConfig,
} from "./VWAPContinuationTradeTypes";

export {
  averageSectorScore,
  calculateConfidence,
  calculateVWAPSlope,
  createEmptyVWAPContinuationDetection,
  detectBounce,
  detectPullback,
  detectVWAPContinuation,
  isValidMarketHours,
  measureVWAPDistance,
  parseSessionMinutes,
  sessionMinutesOf,
  validateBreadth,
  validateMarket,
  validateSector,
  validateTrend,
  validateVolume,
} from "./VWAPContinuationUtils";

export {
  calculateAtrStop,
  calculateRiskAmount,
  calculateSwingStop,
  calculateVwapBufferStop,
  findRecentSwingHigh,
  findRecentSwingLow,
  isRiskWithinLimit,
  isValidStop,
  resolveStopLoss,
  validateTradeRisk,
  type VWAPContinuationStopCandidate,
} from "./VWAPContinuationRisk";

export {
  areValidTargets,
  calculateRiskReward,
  calculateVWAPContinuationEntry,
  calculateVWAPContinuationTradeQuality,
  classifyVWAPContinuationQualityGrade,
  createRejectedVWAPContinuationTradeSetup,
  generateVWAPContinuationTargets,
  validateVWAPContinuationTradeSetup,
  type VWAPContinuationTargetLadder,
} from "./VWAPContinuationTradeUtils";

export {
  VWAPContinuationValidator,
  createVWAPContinuationValidator,
} from "./VWAPContinuationValidator";

export {
  VWAPContinuationDetector,
  getVWAPContinuationDetector,
  resetVWAPContinuationDetector,
} from "./VWAPContinuationDetector";

export {
  VWAPContinuationTradeBuilder,
  getVWAPContinuationTradeBuilder,
  resetVWAPContinuationTradeBuilder,
} from "./VWAPContinuationTradeBuilder";

export {
  VWAPContinuationStrategy,
  createVWAPContinuationStrategyRegistration,
  registerVWAPContinuationStrategy,
} from "./VWAPContinuationStrategy";
