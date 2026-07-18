/**
 * VWAP Continuation module exports — Sprint 11B.3C.1.
 * Detection only — no trade construction.
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
  VWAPContinuationValidator,
  createVWAPContinuationValidator,
} from "./VWAPContinuationValidator";

export {
  VWAPContinuationDetector,
  getVWAPContinuationDetector,
  resetVWAPContinuationDetector,
} from "./VWAPContinuationDetector";

export {
  VWAPContinuationStrategy,
  createVWAPContinuationStrategyRegistration,
  registerVWAPContinuationStrategy,
} from "./VWAPContinuationStrategy";
