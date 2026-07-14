/**
 * Institutional Validation Compliance & Governance Engine — public exports (Prompt 9F.22).
 */

export {
  DEFAULT_COMPLIANCE_CONFIGURATION,
  resolveComplianceConfiguration,
} from "./ComplianceConfiguration";

export type {
  ComplianceStrictMode,
  ComplianceProfileId,
  ComplianceScoreWeights,
  ComplianceConfiguration,
  ComplianceConfigurationInput,
} from "./ComplianceConfiguration";

export {
  registerComplianceSource,
  getRegisteredComplianceSources,
  collectAllComplianceObservations,
  resetComplianceSourceRegistrationState,
} from "./ComplianceRegistry";

export type {
  ComplianceSourceId,
  ComplianceObservation,
  ComplianceCollector,
  ComplianceSourceDefinition,
} from "./ComplianceRegistry";

export {
  ComplianceRuleBookStore,
  getBuiltinComplianceRules,
} from "./ComplianceRuleBook";

export type {
  ComplianceRuleTier,
  ComplianceDomain,
  ComplianceRuleDefinition,
  ComplianceRuleCheck,
  ComplianceRuleBook,
  ComplianceObservationFields,
} from "./ComplianceRuleBook";

export { CompliancePolicyEngine } from "./CompliancePolicyEngine";
export type {
  PolicyEvaluationFinding,
  PolicyEvaluationResult,
} from "./CompliancePolicyEngine";

export { ComplianceEvaluator } from "./ComplianceEvaluator";
export type { ComplianceEvaluationResult } from "./ComplianceEvaluator";

export {
  ComplianceViolations,
  severityRank,
  tierToSeverity,
  meetsSeverityThreshold,
  createViolationId,
} from "./ComplianceViolations";

export type {
  ComplianceViolationSeverity,
  ComplianceViolation,
} from "./ComplianceViolations";

export { ComplianceAuditor } from "./ComplianceAuditor";
export type { ComplianceAuditResult } from "./ComplianceAuditor";

export { ComplianceScoreEngine } from "./ComplianceScoreEngine";
export type { ComplianceScoreBreakdown } from "./ComplianceScoreEngine";

export { ComplianceReporting } from "./ComplianceReporting";
export type {
  ComplianceReport,
  ComplianceSummary,
  ViolationReportSection,
  GovernanceReportSection,
  CoverageSection,
  InstitutionalReadinessSection,
} from "./ComplianceReporting";

export { ComplianceMetricsTracker } from "./ComplianceMetrics";
export type { ComplianceOperationalMetrics } from "./ComplianceMetrics";

export { ComplianceAuditLogger } from "./ComplianceAuditLogger";
export type {
  ComplianceAuditEvent,
  ComplianceAuditEntry,
} from "./ComplianceAuditLogger";

export {
  createComplianceSnapshotId,
  compareComplianceSnapshots,
  buildComplianceSnapshotPayload,
  ComplianceSnapshotStore,
} from "./ComplianceSnapshot";

export type {
  ComplianceSnapshotPayload,
  ComplianceSnapshot,
  ComplianceSnapshotComparison,
} from "./ComplianceSnapshot";

export {
  ValidationComplianceEngine,
  registerValidationComplianceEngine,
  getValidationComplianceEngine,
  resetValidationComplianceEngine,
  registerBuiltinComplianceSources,
  buildBuiltinComplianceSources,
  runCompliance,
  evaluatePolicies,
  detectViolations,
  generateComplianceReport,
  getComplianceScore,
  getComplianceMetrics,
  createComplianceSnapshot,
} from "./ValidationComplianceEngine";

export type {
  RunComplianceOptions,
  ComplianceRunResult,
  ComplianceRegistrationResult,
} from "./ValidationComplianceEngine";
