/**
 * VWAP Mean Reversion module exports — Sprint 11B.3D.1.
 * Detection only — no trade construction.
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
  VWAPMeanReversionValidator,
  createVWAPMeanReversionValidator,
} from "./VWAPMeanReversionValidator";

export {
  VWAPMeanReversionDetector,
  getVWAPMeanReversionDetector,
  resetVWAPMeanReversionDetector,
} from "./VWAPMeanReversionDetector";

export {
  VWAPMeanReversionStrategy,
  createVWAPMeanReversionStrategyRegistration,
  registerVWAPMeanReversionStrategy,
} from "./VWAPMeanReversionStrategy";
