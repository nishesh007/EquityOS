/**
 * Institutional Data Integrity Engine — public module exports.
 *
 * Sprint 9F foundation + advanced rule execution framework (9F.2).
 * Do not import raw provider data into application modules without validate().
 */

export {
  DataIntegrityEngine,
  getDataIntegrityEngine,
  resetDataIntegrityEngine,
  validate,
  validateBatch,
  calculateIntegrityScore,
  registerRule,
  getMetrics,
  executeRules,
  registerRules,
  removeRule,
  getRuleMetrics,
  getAuditHistory,
} from "./DataIntegrityEngine";

export { ValidationPipeline, createBuiltInRules } from "./ValidationPipeline";

export { IntegrityRuleRegistry } from "./IntegrityRuleRegistry";

export {
  buildIntegrityResult,
  calculateIntegrityScore as computeIntegrityScore,
  calculateConfidence,
  getScoreBand,
  resolveStatus,
  createIssue,
} from "./IntegrityResult";

export { IntegrityLogger } from "./IntegrityLogger";
export type { IntegrityLogEntry, IntegrityLogSink } from "./IntegrityLogger";

export { IntegrityMetrics } from "./IntegrityMetrics";

export {
  INTEGRITY_ENGINE_VERSION,
  INTEGRITY_SCORE_THRESHOLD,
  INTEGRITY_SCORE_BANDS,
  SEVERITY_SCORE_PENALTY,
  SEVERITY_CONFIDENCE_PENALTY,
  PIPELINE_STAGE_ORDER,
  SEVERITY_RANK,
  INTEGRITY_STATUS,
  DEFAULT_RANGE_LIMITS,
  LOG_EVENTS,
  INTEGRITY_LOGGER_SERVICE,
} from "./IntegrityConstants";

export { IntegrityConfig } from "./IntegrityConfig";
export type { IntegrityConfigSnapshot, RangeLimits } from "./IntegrityConfig";

export type {
  DatasetType,
  RuleCategory,
  RuleSeverity,
  IntegrityStatus,
  IntegrityScoreBand,
  IntegrityLogLevel,
  IntegrityEnvironment,
  IntegrityIssue,
  RuleValidationOutcome,
  ValidationContext,
  IntegrityRule,
  ValidateRequest,
  ValidateBatchRequest,
  IntegrityResult,
  IntegrityMetricsSnapshot,
  DataIntegrityEngineOptions,
} from "./IntegrityTypes";

/** Prompt 9F.2 advanced rule engine exports. */
export {
  RuleEngine,
  RuleFactory,
  BaseRule,
  FunctionalRule,
  RuleExecutor,
  RuleDependencyResolver,
  CircularDependencyError,
  MissingDependencyError,
  RuleScheduler,
  RulePerformanceTracker,
  RuleCache,
  RuleVersionManager,
  RuleAuditLogger,
  PRIORITY_BAND_RANK,
  DEFAULT_RULE_TIMEOUT_MS,
  DEFAULT_CACHE_TTL_MS,
} from "./rules";

export type {
  AdvancedRuleCategory,
  RulePriorityBand,
  RuleExecutionMode,
  AdvancedRuleDefinition,
  RuleExecutionStatus,
  RuleExecutionResult,
  RuleEngineEventType,
  RuleEngineEvent,
  RuleEngineEventListener,
  ExecuteRulesRequest,
  ExecuteRulesResult,
  RuleAuditEntry,
  RulePerformanceSnapshot,
  CreateRuleInput,
  RuleEngineOptions,
  ScheduleWave,
  RuleVersionRecord,
} from "./rules";

/** Prompt 9F.3 institutional market validation library. */
export {
  registerMarketRules,
  validateMarketData,
  validateOHLC,
  validateQuote,
  validateVolume,
  validateCorporateAdjustments,
  buildMarketRules,
  getMarketValidationMetrics,
  resetMarketValidationMetrics,
  DEFAULT_MARKET_VALIDATION_CONFIG,
} from "./rules/market";

export type {
  MarketValidationConfig,
  MarketValidationConfigInput,
  MarketValidationMetrics,
} from "./rules/market";

/** Prompt 9F.4 institutional technical indicator validation library. */
export {
  registerTechnicalRules,
  validateTechnicalIndicators,
  validateRSI,
  validateMACD,
  validateMovingAverages,
  validateBollingerBands,
  validateADX,
  validateATR,
  validateVWAP,
  validateIchimoku,
  buildTechnicalRules,
  getTechnicalValidationMetrics,
  resetTechnicalValidationMetrics,
  DEFAULT_TECHNICAL_VALIDATION_CONFIG,
} from "./rules/technical";

export type {
  TechnicalValidationConfig,
  TechnicalValidationConfigInput,
  TechnicalValidationMetrics,
} from "./rules/technical";

/** Prompt 9F.5 institutional fundamental validation library. */
export {
  registerFundamentalRules,
  validateFundamentals,
  validateBalanceSheet,
  validateIncomeStatement,
  validateCashFlow,
  validateFinancialRatios,
  validateTTM,
  validateShareholding,
  buildFundamentalRules,
  getFundamentalValidationMetrics,
  resetFundamentalValidationMetrics,
  DEFAULT_FUNDAMENTAL_VALIDATION_CONFIG,
} from "./rules/fundamental";

export type {
  FundamentalValidationConfig,
  FundamentalValidationConfigInput,
  FundamentalValidationMetrics,
} from "./rules/fundamental";

/** Prompt 9F.6 institutional AI recommendation validation library. */
export {
  registerRecommendationRules,
  validateRecommendation,
  validateRecommendationReasoning,
  validateRecommendationConfidence,
  validateRecommendationAlignment,
  calculateRecommendationQualityScore,
  buildRecommendationRules,
  getRecommendationValidationMetrics,
  resetRecommendationValidationMetrics,
  getRecommendationAuditLog,
  resetRecommendationAuditLog,
  DEFAULT_RECOMMENDATION_VALIDATION_CONFIG,
} from "./rules/recommendation";

export type {
  RecommendationValidationConfig,
  RecommendationValidationConfigInput,
  RecommendationValidationMetrics,
  RecommendationAction,
  RecommendationAuditEntry,
  RecommendationQualityScoreResult,
} from "./rules/recommendation";

/** Prompt 9F.7 institutional trade setup validation library. */
export {
  registerTradeSetupRules,
  validateTradeSetup,
  validateEntry,
  validateStopLoss,
  validateTargets,
  validateRiskReward,
  calculateTradeSetupQuality,
  buildTradeSetupRules,
  getTradeSetupValidationMetrics,
  resetTradeSetupValidationMetrics,
  getTradeSetupAuditLog,
  resetTradeSetupAuditLog,
  DEFAULT_TRADE_SETUP_VALIDATION_CONFIG,
} from "./rules/tradeSetup";

export type {
  TradeSetupValidationConfig,
  TradeSetupValidationConfigInput,
  TradeSetupValidationMetrics,
  TradeSide,
  TradeSetupAuditEntry,
  TradeSetupQualityScoreResult,
} from "./rules/tradeSetup";

/** Prompt 9F.8 institutional AI hallucination detection library. */
export {
  registerHallucinationRules,
  validateAIOutput,
  validateFacts,
  validateEvidence,
  validateReasoning,
  detectContradictions,
  calculateHallucinationScore,
  buildHallucinationRules,
  getHallucinationValidationMetrics,
  resetHallucinationValidationMetrics,
  getHallucinationAuditLog,
  resetHallucinationAuditLog,
  DEFAULT_HALLUCINATION_VALIDATION_CONFIG,
} from "./rules/hallucination";

export type {
  HallucinationValidationConfig,
  HallucinationValidationConfigInput,
  HallucinationValidationMetrics,
  HallucinationAuditEntry,
  HallucinationScoreResult,
  HallucinationScoreBand,
} from "./rules/hallucination";

/** Prompt 9F.9 institutional historical performance validation library. */
export {
  registerHistoricalRules,
  validateHistoricalPerformance,
  validateRecommendationHistory,
  validateTradeHistory,
  calculateHistoricalScore,
  detectModelDecay,
  buildHistoricalRules,
  getHistoricalValidationMetrics,
  resetHistoricalValidationMetrics,
  getHistoricalAuditLog,
  resetHistoricalAuditLog,
  DEFAULT_HISTORICAL_VALIDATION_CONFIG,
} from "./rules/historical";

export type {
  HistoricalValidationConfig,
  HistoricalValidationConfigInput,
  HistoricalValidationMetrics,
  HistoricalAuditEntry,
  HistoricalScoreResult,
  HistoricalScoreBand,
  ModelDecayResult,
} from "./rules/historical";

/** Prompt 9F.10 Institutional Trust Score Engine. */
export {
  registerTrustEngine,
  getTrustScoreEngine,
  resetTrustScoreEngine,
  calculateTrustScore,
  getTrustHistory,
  getTrustMetrics,
  getTrustTrend,
  classifyTrust,
  registerTrustModule,
  TrustScoreEngine,
  DEFAULT_TRUST_CONFIGURATION,
  resolveTrustConfiguration,
} from "./trust";

export type {
  TrustConfiguration,
  TrustConfigurationInput,
  TrustScoreRequest,
  TrustScoreResult,
  TrustFields,
  TrustClassificationLabel,
  TrustTrendSnapshot,
  TrustMetricsSnapshot,
  TrustHistoryEntry,
  TrustErrorReport,
  TrustModuleDefinition,
  TrustWeightMap,
} from "./trust";

/** Prompt 9F.11 Institutional Validation Dashboard backend. */
export {
  registerDashboardService,
  getValidationDashboardService,
  resetValidationDashboardService,
  ValidationDashboardService,
  getDashboardSummary,
  getDashboardMetrics,
  getDashboardHealth,
  getValidationDistribution,
  getTopFailures,
  createSnapshot,
  loadSnapshot,
  DEFAULT_DASHBOARD_CONFIGURATION,
  resolveDashboardConfiguration,
} from "./dashboard";

export type {
  DashboardConfiguration,
  DashboardConfigurationInput,
  DashboardSummary,
  DashboardSystemHealth,
  DashboardOperationalMetrics,
  ValidationDistribution,
  TopFailuresReport,
  DashboardSnapshot,
  DashboardFilters,
  DashboardModuleStatus,
  DashboardHealthClassification,
} from "./dashboard";

/** Prompt 9F.12 Institutional Validation Orchestrator & unified API. */
export {
  registerValidationOrchestrator,
  getValidationOrchestrator,
  resetValidationOrchestrator,
  ValidationOrchestrator,
  validateBatch as orchestrateValidateBatch,
  validateResearch,
  validateRecommendation as orchestrateValidateRecommendation,
  validateTrade,
  validatePortfolio,
  executePipeline,
  getExecutionStatus,
  cancelValidation,
  validate as orchestrateValidate,
  DEFAULT_VALIDATION_CONFIGURATION,
  resolveValidationConfiguration,
  registerValidationEngine,
} from "./orchestrator";

export type {
  ValidationConfiguration,
  ValidationConfigurationInput,
  ValidationRequest,
  ValidationRequestInput,
  ValidationResponse,
  ValidationExecutionMode,
  ValidationPriority,
  ValidationPipelineId,
  ValidationEngineId,
  ExecutionStatus,
} from "./orchestrator";

/** Prompt 9F.13 Institutional Validation Event Bus & Monitoring Engine. */
export {
  registerValidationEventBus,
  getValidationEventBus,
  resetValidationEventBus,
  ValidationEventBus,
  publishEvent,
  subscribe,
  unsubscribe,
  getEventHistory,
  replayEvents,
  getEventMetrics,
  getEventHealth,
  safePublishEvent,
  DEFAULT_VALIDATION_EVENT_CONFIGURATION,
  resolveValidationEventConfiguration,
} from "./events";

export type {
  ValidationEvent,
  ValidationEventInput,
  ValidationEventType,
  ValidationEventSeverity,
  ValidationEventFilters,
  EventBusMetricsSnapshot,
  EventBusHealth,
  ReplayRequest,
  ReplayResult,
  ValidationEventConfiguration,
} from "./events";

/** Prompt 9F.14 Institutional Validation Analytics Engine. */
export {
  registerValidationAnalyticsEngine,
  getValidationAnalyticsEngine,
  resetValidationAnalyticsEngine,
  ValidationAnalyticsEngine,
  getAnalyticsSummary,
  getRuleEffectiveness,
  getFailureAnalytics,
  getTrendAnalytics,
  getDistributionAnalytics,
  getPredictionAnalytics,
  createAnalyticsSnapshot,
  DEFAULT_ANALYTICS_CONFIGURATION,
  resolveAnalyticsConfiguration,
  registerAnalyticsSource,
} from "./analytics";

export type {
  AnalyticsConfiguration,
  AnalyticsConfigurationInput,
  AnalyticsSummary,
  RuleEffectivenessReport,
  FailureAnalyticsReport,
  TrendAnalyticsReport,
  DistributionAnalyticsReport,
  PredictionAnalyticsReport,
  AnalyticsSnapshot,
  AnalyticsObservation,
  AnalyticsRunResult,
} from "./analytics";

/** Prompt 9F.15 Institutional Validation Reporting & Export Engine. */
export {
  registerValidationReportingEngine,
  getValidationReportingEngine,
  resetValidationReportingEngine,
  ValidationReportingEngine,
  generateReport,
  generateValidationReport,
  generateTrustReport,
  generateAnalyticsReport,
  generateAuditReport,
  exportReportModel,
  createReportSnapshot,
  DEFAULT_REPORTING_CONFIGURATION,
  resolveReportingConfiguration,
  registerReportSource,
} from "./reporting";

export type {
  ReportingConfiguration,
  ReportingConfigurationInput,
  InstitutionalReport,
  ReportFilters,
  ReportType,
  ExportFormat,
  ReportExportModel,
  ReportSnapshot,
  GenerateReportOptions,
} from "./reporting";

/** Prompt 9F.16 Institutional Validation Developer Tools & Diagnostics Engine. */
export {
  registerValidationDiagnosticsEngine,
  getValidationDiagnosticsEngine,
  resetValidationDiagnosticsEngine,
  ValidationDiagnosticsEngine,
  runDiagnostics,
  inspectRules,
  inspectPipeline,
  generateTrace,
  profileValidation,
  getDiagnosticsHealth,
  createDiagnosticsSnapshot,
  generateDiagnosticsReport,
  DEFAULT_DIAGNOSTICS_CONFIGURATION,
  resolveDiagnosticsConfiguration,
  registerDiagnosticsSource,
} from "./diagnostics";

export type {
  DiagnosticsConfiguration,
  DiagnosticsConfigurationInput,
  DiagnosticsMode,
  DiagnosticsReport,
  DiagnosticsSnapshot,
  DiagnosticsRunResult,
  RunDiagnosticsOptions,
  DiagnosticsProbe,
} from "./diagnostics";

/** Prompt 9F.17 Institutional Validation Administration & Policy Engine. */
export {
  registerValidationAdministrationEngine,
  getValidationAdministrationEngine,
  resetValidationAdministrationEngine,
  ValidationAdministrationEngine,
  createPolicy,
  updatePolicy,
  deletePolicy,
  evaluatePolicy,
  applyOverride,
  rollbackPolicy,
  createGovernanceSnapshot,
  getAdministrationMetrics,
  DEFAULT_ADMINISTRATION_CONFIGURATION,
  resolveAdministrationConfiguration,
  registerPolicy,
} from "./admin";

export type {
  AdministrationConfiguration,
  AdministrationConfigurationInput,
  GovernanceProfileId,
  PolicyDefinition,
  GovernanceSnapshot,
  AdministrationOperationalMetrics,
  CreatePolicyInput,
  UpdatePolicyInput,
  ApplyOverrideInput,
} from "./admin";

/** Prompt 9F.18 Institutional Validation Automation & Optimization Engine. */
export {
  registerValidationOptimizationEngine,
  getValidationOptimizationEngine,
  resetValidationOptimizationEngine,
  ValidationOptimizationEngine,
  runOptimization,
  analyzePerformance,
  optimizePipeline,
  optimizeCache,
  analyzeDependencies,
  getOptimizationMetrics,
  createOptimizationSnapshot,
  DEFAULT_OPTIMIZATION_CONFIGURATION,
  resolveOptimizationConfiguration,
  registerOptimizationSource,
} from "./optimization";

export type {
  OptimizationConfiguration,
  OptimizationConfigurationInput,
  OptimizationMode,
  OptimizationRunResult,
  OptimizationSnapshot,
  OptimizationProbe,
  RunOptimizationOptions,
  OptimizationOperationalMetrics,
} from "./optimization";

/** Prompt 9F.19 Institutional Validation Reliability & Resilience Engine. */
export {
  registerValidationReliabilityEngine,
  getValidationReliabilityEngine,
  resetValidationReliabilityEngine,
  ValidationReliabilityEngine,
  checkHealth,
  runRecovery,
  tripCircuit,
  resetCircuit,
  retryExecution,
  getReliabilityMetrics,
  createReliabilitySnapshot,
  DEFAULT_RELIABILITY_CONFIGURATION,
  resolveReliabilityConfiguration,
  registerReliabilitySource,
} from "./reliability";

export type {
  ReliabilityConfiguration,
  ReliabilityConfigurationInput,
  ReliabilitySnapshot,
  ReliabilityProbe,
  CheckHealthOptions,
  ReliabilityOperationalMetrics,
  CircuitBreakerStatus,
} from "./reliability";

/** Prompt 9F.20 Institutional Validation Observability & Telemetry Engine. */
export {
  registerValidationObservabilityEngine,
  getValidationObservabilityEngine,
  resetValidationObservabilityEngine,
  ValidationObservabilityEngine,
  collectTelemetry,
  collectMetrics,
  collectTrace,
  collectEvent,
  exportTelemetry,
  getObservabilityMetrics,
  createTelemetrySnapshot,
  DEFAULT_TELEMETRY_CONFIGURATION,
  resolveTelemetryConfiguration,
  registerTelemetrySource,
} from "./observability";

export type {
  TelemetryConfiguration,
  TelemetryConfigurationInput,
  TelemetrySnapshot,
  TelemetrySample,
  TelemetryCollectionResult,
  CollectTelemetryOptions,
  ObservabilityOperationalMetrics,
  TelemetryExportModel,
} from "./observability";

/** Prompt 9F.21 Institutional Validation Intelligence & Insights Engine. */
export {
  registerValidationIntelligenceEngine,
  getValidationIntelligenceEngine,
  resetValidationIntelligenceEngine,
  ValidationIntelligenceEngine,
  generateInsights,
  detectPatterns,
  analyzeCorrelations,
  generateRecommendations,
  getRiskInsights,
  getInsightMetrics,
  createInsightSnapshot,
  DEFAULT_INSIGHTS_CONFIGURATION,
  resolveInsightsConfiguration,
  registerInsightSource,
} from "./intelligence";

export type {
  InsightsConfiguration,
  InsightsConfigurationInput,
  InsightsPack,
  InsightSnapshot,
  InsightObservation,
  GenerateInsightsOptions,
  InsightsOperationalMetrics,
  IntelligentRecommendation,
} from "./intelligence";

/** Prompt 9F.22 Institutional Validation Compliance & Governance Engine. */
export {
  registerValidationComplianceEngine,
  getValidationComplianceEngine,
  resetValidationComplianceEngine,
  ValidationComplianceEngine,
  runCompliance,
  evaluatePolicies,
  detectViolations,
  generateComplianceReport,
  getComplianceScore,
  getComplianceMetrics,
  createComplianceSnapshot,
  DEFAULT_COMPLIANCE_CONFIGURATION,
  resolveComplianceConfiguration,
  registerComplianceSource,
} from "./compliance";

export type {
  ComplianceConfiguration,
  ComplianceConfigurationInput,
  ComplianceReport,
  ComplianceSnapshot,
  ComplianceObservation,
  RunComplianceOptions,
  ComplianceOperationalMetrics,
  ComplianceViolation,
} from "./compliance";
