/**
 * Institutional AI Alert Engine — public exports (Sprint 9C.R1).
 * Orchestration layer only — no notification delivery.
 */

export {
  ALERT_CATEGORIES,
  ALERT_CATEGORY_ATTENTION_RANK,
  isAlertCategory,
  resolveAlertCategory,
} from "./AlertCategory";
export type { AlertCategory } from "./AlertCategory";

export {
  ALERT_PRIORITIES,
  ALERT_PRIORITY_RANK,
  isAlertPriority,
  resolveAlertPriorityBand,
  compareAlertPriority,
} from "./AlertPriority";
export type { AlertPriority } from "./AlertPriority";

export {
  ALERT_SEVERITIES,
  ALERT_SEVERITY_RANK,
  isAlertSeverity,
  resolveAlertSeverityBand,
  compareAlertSeverity,
} from "./AlertSeverity";
export type { AlertSeverity } from "./AlertSeverity";

export {
  ALERT_CONFIDENCE_EMPTY,
  classifyConfidenceScore,
  resolveAlertConfidence,
  averageConfidenceScores,
} from "./AlertConfidence";
export type {
  AlertConfidence,
  AlertConfidenceLevel,
} from "./AlertConfidence";

export {
  ALERT_LIFECYCLE_STATES,
  ALERT_TERMINAL_STATES,
  ALERT_ACTIVE_STATES,
  isAlertLifecycleStatus,
  resolveAlertLifecycle,
  canTransitionLifecycle,
  transitionLifecycle,
  isTerminalLifecycle,
  isActiveLifecycle,
} from "./AlertLifecycle";
export type { AlertLifecycleStatus } from "./AlertLifecycle";

export {
  ALERT_SOURCE_ENGINES,
  DEFAULT_SOURCE_WEIGHTS,
  isAlertSourceEngine,
  resolveAlertSourceEngine,
  getSourceWeight,
} from "./AlertTypes";
export type { AlertSourceEngine, AlertSourceEvent } from "./AlertTypes";

export {
  ALERT_METADATA_VERSION,
  emptyAlertMetadata,
  buildAlertMetadata,
} from "./AlertMetadata";
export type { AlertMetadata } from "./AlertMetadata";

export {
  DEFAULT_ALERT_EXPIRY_MS,
  buildAlertContext,
  withContextHints,
} from "./AlertContext";
export type { AlertContext } from "./AlertContext";

export {
  ALERT_ENGINE_EMPTY,
  emptyAlertListView,
  safeAlertText,
} from "./AlertModels";
export type {
  AlertEmptyMessage,
  InstitutionalAlert,
  AlertListView,
  AlertQuery,
  AlertGenerationResult,
} from "./AlertModels";

export {
  evaluateAlertRules,
  calculateAlertPriority,
  calculateAlertSeverity,
  calculateAlertConfidence,
  resolveCategoryFromEvent,
  resolveExpiry,
  shouldSuppressEvent,
  isExpiredAt,
  bumpPriority,
  moreSevere,
  higherPriority,
} from "./AlertRules";
export type { AlertRuleEvaluation } from "./AlertRules";

export {
  registerSource,
  registerBuiltinSources,
  getSource,
  listSources,
  isSourceRegistered,
  isSourceEnabled,
  resetAlertRegistry,
} from "./AlertRegistry";
export type { AlertSourceDefinition } from "./AlertRegistry";

export {
  createAlertId,
  createAlertFromEvent,
  mergeGroupedAlerts,
  resetAlertFactorySequence,
} from "./AlertFactory";
export type { AlertFactoryInput, AlertFactoryOutput } from "./AlertFactory";

export { AlertCache } from "./AlertCache";

export {
  AlertHistoryStore,
  getInstitutionalAlertHistoryStore,
  resetInstitutionalAlertHistoryStore,
  getInstitutionalAlertHistory,
} from "./AlertHistory";
export type { AlertHistoryRecord } from "./AlertHistory";

export { AlertMetricsTracker } from "./AlertMetrics";
export type { AlertOperationalMetrics } from "./AlertMetrics";

export { AlertEngine } from "./AlertEngine";

export {
  registerAlertEngine,
  getAlertEngine,
  resetAlertEngine,
  generateAlert,
  registerAlertSource,
  dismissAlert,
  archiveAlert,
  expireAlert,
  getAlerts,
  getAlertMetrics,
  getMetrics,
  listAlertSources,
} from "./AlertFacade";
export type { AlertEngineRegistrationResult } from "./AlertFacade";

/** Sprint 9C.R2 — Opportunity / Portfolio / Watchlist alert intelligence */
export {
  INTELLIGENCE_ALERT_EMPTY,
  generateOpportunityAlerts,
  generatePortfolioAlerts,
  generateWatchlistAlerts,
  rankAlerts,
  groupAlerts,
  deduplicateAlerts,
  resetAlertIntelligence,
  decideOpportunityAlerts,
  decidePortfolioAlerts,
  decideWatchlistAlerts,
  generateEarningsAlerts,
  generateNewsAlerts,
  generateCorporateActionAlerts,
  generateTranscriptAlerts,
  correlateAlerts,
  rankNewsAlerts,
  generateManagementCommentaryAlerts,
  generateTechnicalAlerts,
  generateFundamentalAlerts,
  generateMarketAlerts,
  generateSectorAlerts,
  scoreAlerts,
} from "./intelligence";

export type {
  IntelligenceAlertBatch,
  OpportunitySnapshot,
  PortfolioSnapshot,
  WatchlistItemSnapshot,
  OpportunityAlertInput,
  PortfolioAlertInput,
  WatchlistAlertInput,
  RankedAlert,
  AlertGroup,
  DeduplicationResult,
  EventIntelBatch,
  EarningsEventSnapshot,
  NewsAlertSnapshot,
  CorporateActionAlertSnapshot,
  CorrelationResult,
  SignalIntelBatch,
  TechnicalAlertSnapshot,
  FundamentalAlertSnapshot,
  MarketAlertSnapshot,
  SectorAlertSnapshot,
  ScoredAlert,
} from "./intelligence";
