/**
 * ORB Detection + Trade Construction module exports
 * (Sprint 11B.3B.1 / 11B.3B.2).
 */

export type { ORBConfig } from "./ORBConstants";
export {
  DEFAULT_ORB_CONFIG,
  DEFAULT_ORB_RANGE_END,
  DEFAULT_ORB_RANGE_START,
  ORB_STRATEGY_ID,
  ORB_STRATEGY_NAME,
} from "./ORBConstants";

export type {
  OpeningRange,
  ORBBreakoutCandidate,
  ORBCandle,
  ORBDetection,
  ORBDetectionContext,
  ORBDirection,
  ORBMarketData,
  ORBStrategyInput,
  ORBValidationResult,
} from "./ORBTypes";

export {
  isORBStrategyInput,
  toORBDetectionContext,
} from "./ORBTypes";

export type {
  ORBEntryMode,
  ORBPositionType,
  ORBQualityGrade,
  ORBStopMethod,
  ORBTradeConfig,
  ORBTradeSetup,
} from "./ORBTradeTypes";

export {
  DEFAULT_ORB_TRADE_CONFIG,
  resolveORBTradeConfig,
} from "./ORBTradeTypes";

export {
  averageSectorScore,
  calculateOpeningRange,
  calculateORBConfidence,
  createEmptyORBDetection,
  detectBreakout,
  detectORB,
  isValidMarketHours,
  isWithinSessionWindow,
  parseSessionMinutes,
  resolveORBConfig,
  sessionMinutesOf,
  validateBreadth,
  validateLiquidity,
  validateMarket,
  validateSector,
  validateVolume,
} from "./ORBUtils";

export {
  calculateAtrStop,
  calculateCandleStop,
  calculateOpeningRangeStop,
  calculateRiskAmount,
  findBreakoutCandle,
  isRiskWithinLimit,
  isValidStop,
  resolveStopLoss,
  validateTradeRisk,
  type ORBStopCandidate,
} from "./ORBRisk";

export {
  areValidTargets,
  calculateORBEntry,
  calculateORBTradeQuality,
  calculateRiskReward,
  classifyORBQualityGrade,
  createRejectedTradeSetup,
  generateORBTargets,
  validateORBTradeSetup,
  type ORBTargetLadder,
} from "./ORBTradeUtils";

export {
  ORBTradeBuilder,
  getORBTradeBuilder,
  resetORBTradeBuilder,
  type ORBTradeBuildInput,
} from "./ORBTradeBuilder";

export { ORBValidator, createORBValidator } from "./ORBValidator";
export {
  ORBDetector,
  getORBDetector,
  resetORBDetector,
} from "./ORBDetector";
export {
  ORBStrategy,
  createORBStrategyRegistration,
  registerORBStrategy,
} from "./ORBStrategy";
