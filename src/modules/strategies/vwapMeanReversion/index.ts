/**
 * VWAP Mean Reversion module exports — Sprint 11B.3D.1 / 11B.3D.2.
 */

export type { VWAPMeanReversionConfig } from "./VWAPMeanReversionConstants";
export {
  DEFAULT_VWAP_MEAN_REVERSION_CONFIG,
  VWAP_MEAN_REVERSION_STRATEGY_ID,
  VWAP_MEAN_REVERSION_STRATEGY_NAME,
  resolveVWAPMeanReversionConfig,
} from "./VWAPMeanReversionConstants";

export type {
  VWAPMeanReversionCandle,
  VWAPMeanReversionDetection,
  VWAPMeanReversionDetectionContext,
  VWAPMeanReversionDirection,
  VWAPMeanReversionMarketData,
  VWAPMeanReversionStrategyInput,
  VWAPMeanReversionValidationResult,
  VWAPStandardDeviationBands,
} from "./VWAPMeanReversionTypes";

export {
  isVWAPMeanReversionStrategyInput,
  toVWAPMeanReversionDetectionContext,
} from "./VWAPMeanReversionTypes";

export type {
  VWAPMeanReversionEntryMode,
  VWAPMeanReversionPositionType,
  VWAPMeanReversionQualityGrade,
  VWAPMeanReversionStopMethod,
  VWAPMeanReversionTradeConfig,
  VWAPMeanReversionTradeSetup,
} from "./VWAPMeanReversionTradeTypes";

export {
  DEFAULT_VWAP_MEAN_REVERSION_TRADE_CONFIG,
  resolveVWAPMeanReversionTradeConfig,
} from "./VWAPMeanReversionTradeTypes";

export {
  averageSectorScore,
  calculateConfidence,
  calculateDeviation,
  calculateVWAPBands,
  computeRSI,
  createEmptyVWAPMeanReversionDetection,
  detectExhaustion,
  detectReversal,
  detectVWAPMeanReversion,
  isValidMarketHours,
  parseSessionMinutes,
  sessionMinutesOf,
  validateBreadth,
  validateMarket,
  validateRSI,
  validateSector,
  validateVolume,
} from "./VWAPMeanReversionUtils";

export {
  calculateAtrStop,
  calculateDeviationBufferStop,
  calculateReversalCandleStop,
  calculateRiskAmount,
  calculateSwingStop,
  findRecentSwingHigh,
  findRecentSwingLow,
  isRiskWithinLimit,
  isValidStop,
  resolveStopLoss,
  validateTradeRisk,
  type VWAPMeanReversionStopCandidate,
} from "./VWAPMeanReversionRisk";

export {
  areValidTargets,
  calculateRiskReward,
  calculateVWAPMeanReversionEntry,
  calculateVWAPMeanReversionTradeQuality,
  classifyVWAPMeanReversionQualityGrade,
  createRejectedVWAPMeanReversionTradeSetup,
  generateVWAPMeanReversionTargets,
  validateVWAPMeanReversionTradeSetup,
  type VWAPMeanReversionTargetLadder,
} from "./VWAPMeanReversionTradeUtils";

export {
  VWAPMeanReversionValidator,
  createVWAPMeanReversionValidator,
} from "./VWAPMeanReversionValidator";

export {
  VWAPMeanReversionDetector,
  getVWAPMeanReversionDetector,
  resetVWAPMeanReversionDetector,
} from "./VWAPMeanReversionDetector";

export {
  VWAPMeanReversionTradeBuilder,
  getVWAPMeanReversionTradeBuilder,
  resetVWAPMeanReversionTradeBuilder,
} from "./VWAPMeanReversionTradeBuilder";

export {
  VWAPMeanReversionStrategy,
  createVWAPMeanReversionStrategyRegistration,
  registerVWAPMeanReversionStrategy,
} from "./VWAPMeanReversionStrategy";
