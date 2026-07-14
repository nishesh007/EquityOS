/**
 * Institutional Technical Indicator Validation — public exports.
 */

export {
  DEFAULT_TECHNICAL_VALIDATION_CONFIG,
  resolveTechnicalConfig,
  buildTechnicalRules,
  registerTechnicalRules,
  resetTechnicalRuleRegistrationState,
  getTechnicalValidationMetrics,
  resetTechnicalValidationMetrics,
  getActiveTechnicalConfig,
  validateTechnicalIndicators,
  validateRSI,
  validateMACD,
  validateMovingAverages,
  validateBollingerBands,
  validateADX,
  validateATR,
  validateVWAP,
  validateIchimoku,
  configFromContext,
  techFail,
  techPass,
  isPlainObject,
  readNumber,
  indicatorSource,
  asSeries,
  readIndicatorNumber,
} from "./TechnicalRuleRegistry";

export type {
  TechnicalValidationConfig,
  TechnicalValidationConfigInput,
  TechnicalValidationMetrics,
} from "./TechnicalRuleRegistry";

export { createRSIValidationRules } from "./RSIValidationRules";
export { createMACDValidationRules } from "./MACDValidationRules";
export { createMovingAverageValidationRules } from "./MovingAverageValidationRules";
export { createBollingerBandValidationRules } from "./BollingerBandValidationRules";
export { createATRValidationRules } from "./ATRValidationRules";
export { createADXValidationRules } from "./ADXValidationRules";
export { createSupertrendValidationRules } from "./SupertrendValidationRules";
export { createVWAPValidationRules } from "./VWAPValidationRules";
export { createIchimokuValidationRules } from "./IchimokuValidationRules";
export { createMomentumValidationRules } from "./MomentumValidationRules";
export { createVolumeIndicatorValidationRules } from "./VolumeIndicatorValidationRules";
export { createOscillatorValidationRules } from "./OscillatorValidationRules";
export { createIndicatorConsistencyRules } from "./IndicatorConsistencyRules";
export { createIndicatorCrossValidationRules } from "./IndicatorCrossValidationRules";
