/**
 * Institutional AI Hallucination Detection — public exports.
 */

export {
  DEFAULT_HALLUCINATION_VALIDATION_CONFIG,
  resolveHallucinationConfig,
  resolveHallucinationScoreBand,
} from "./HallucinationValidationConfig";

export type {
  HallucinationMode,
  HallucinationScoreBand,
  HallucinationValidationConfig,
  HallucinationValidationConfigInput,
} from "./HallucinationValidationConfig";

export {
  buildHallucinationRules,
  registerHallucinationRules,
  resetHallucinationRuleRegistrationState,
  getHallucinationValidationMetrics,
  resetHallucinationValidationMetrics,
  getActiveHallucinationConfig,
  getHallucinationAuditLog,
  resetHallucinationAuditLog,
  calculateHallucinationScore,
  deriveHallucinationComponentScores,
  validateAIOutput,
  validateFacts,
  validateEvidence,
  validateReasoning,
  detectContradictions,
  configFromContext,
  halFail,
  halPass,
  isPlainObject,
  readNumber,
  readString,
  readAction,
  section,
  hasNonEmptyText,
  scoreDirection,
  evidenceSection,
  collectEvidenceSources,
  appendHallucinationAudit,
} from "./HallucinationRuleRegistry";

export type {
  HallucinationValidationMetrics,
  HallucinationAuditEntry,
  HallucinationComponentScores,
  HallucinationScoreResult,
} from "./HallucinationRuleRegistry";

export { createFactValidationRules } from "./FactValidationRules";
export { createSourceVerificationRules } from "./SourceVerificationRules";
export { createReasoningConsistencyRules } from "./ReasoningConsistencyRules";
export { createDataEvidenceRules } from "./DataEvidenceRules";
export { createContradictionDetectionRules } from "./ContradictionDetectionRules";
export { createConfidenceVerificationRules } from "./ConfidenceVerificationRules";
export { createMarketContextRules } from "./MarketContextRules";
export { createNumericalConsistencyRules } from "./NumericalConsistencyRules";
export { createHistoricalConsistencyRules } from "./HistoricalConsistencyRules";
export { createDuplicateReasoningRules } from "./DuplicateReasoningRules";
export { createAIOutputIntegrityRules } from "./AIOutputIntegrityRules";
export { createHallucinationScoreRules } from "./HallucinationScoreRules";
export { createHallucinationAuditRules } from "./HallucinationAuditRules";
