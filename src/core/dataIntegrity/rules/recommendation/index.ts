/**
 * Institutional AI Recommendation Validation — public exports.
 */

export {
  DEFAULT_RECOMMENDATION_VALIDATION_CONFIG,
  resolveRecommendationConfig,
} from "./RecommendationValidationConfig";

export type {
  RecommendationAction,
  RecommendationMode,
  RecommendationValidationConfig,
  RecommendationValidationConfigInput,
} from "./RecommendationValidationConfig";

export {
  buildRecommendationRules,
  registerRecommendationRules,
  resetRecommendationRuleRegistrationState,
  getRecommendationValidationMetrics,
  resetRecommendationValidationMetrics,
  getActiveRecommendationConfig,
  getRecommendationAuditLog,
  resetRecommendationAuditLog,
  calculateRecommendationQualityScore,
  deriveComponentScores,
  validateRecommendation,
  validateRecommendationReasoning,
  validateRecommendationConfidence,
  validateRecommendationAlignment,
  configFromContext,
  recFail,
  recPass,
  isPlainObject,
  readNumber,
  readString,
  readAction,
  normalizeAction,
  section,
  hasNonEmptyText,
  scoreDirection,
  actionBias,
  appendRecommendationAudit,
} from "./RecommendationRuleRegistry";

export type {
  RecommendationValidationMetrics,
  RecommendationAuditEntry,
  RecommendationComponentScores,
  RecommendationQualityScoreResult,
} from "./RecommendationRuleRegistry";

export { createRecommendationConsistencyRules } from "./RecommendationConsistencyRules";
export { createRecommendationConfidenceRules } from "./RecommendationConfidenceRules";
export { createRecommendationReasoningRules } from "./RecommendationReasoningRules";
export { createRecommendationRiskRules } from "./RecommendationRiskRules";
export { createRecommendationConflictRules } from "./RecommendationConflictRules";
export { createRecommendationHistoricalRules } from "./RecommendationHistoricalRules";
export { createRecommendationMarketContextRules } from "./RecommendationMarketContextRules";
export { createRecommendationFundamentalAlignmentRules } from "./RecommendationFundamentalAlignmentRules";
export { createRecommendationTechnicalAlignmentRules } from "./RecommendationTechnicalAlignmentRules";
export { createRecommendationQualityScoreRules } from "./RecommendationQualityScoreRules";
export { createRecommendationAuditRules } from "./RecommendationAuditRules";
