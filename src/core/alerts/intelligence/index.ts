/**
 * Alert intelligence — public exports (Sprint 9C.R2 + R3).
 * Opportunity / Portfolio / Watchlist / Earnings / News / Corporate Action intelligence.
 */

export {
  INTELLIGENCE_ALERT_EMPTY,
  OPPORTUNITY_ALERT_KINDS,
  PORTFOLIO_ALERT_KINDS,
  WATCHLIST_ALERT_KINDS,
  OPPORTUNITY_KIND_LABELS,
  PORTFOLIO_KIND_LABELS,
  WATCHLIST_KIND_LABELS,
  emptyIntelligenceBatch,
  toAlertPresentationCard,
} from "./AlertPresentationModels";

export type {
  IntelligenceEmptyMessage,
  OpportunityAlertKind,
  PortfolioAlertKind,
  WatchlistAlertKind,
  IntelligenceAlertKind,
  AlertPresentationCard,
  IntelligenceAlertBatch,
  OpportunitySnapshot,
  PortfolioHoldingSnapshot,
  PortfolioSnapshot,
  WatchlistItemSnapshot,
  IntelligencePriorState,
} from "./AlertPresentationModels";

export {
  decideOpportunityAlerts,
  decidePortfolioAlerts,
  decideWatchlistAlerts,
  decisionToSourceEvent,
} from "./AlertDecisionEngine";
export type { AlertDecision } from "./AlertDecisionEngine";

export {
  extractRankingFactors,
  scoreAlertFactors,
  rankAlerts,
} from "./AlertRankingEngine";
export type { AlertRankingFactors, RankedAlert } from "./AlertRankingEngine";

export {
  resolveGroupKey,
  groupAlerts,
  flattenGroupedAlerts,
  mergeGroupMembers,
} from "./AlertGroupingEngine";
export type { AlertGroupKeyStrategy, AlertGroup } from "./AlertGroupingEngine";

export {
  resolveDedupeKey,
  deduplicateAlerts,
} from "./AlertDeduplicationEngine";
export type { DeduplicationResult } from "./AlertDeduplicationEngine";

export {
  OpportunityAlertEngine,
  mapCandidateToSnapshot,
  loadOpportunitySnapshotsFromEngine,
  getOpportunityAlertEngine,
  resetOpportunityAlertEngine,
  resetOpportunityAlertPriorState,
  seedOpportunityAlertPrior,
  getOpportunityAlertPriorState,
  generateOpportunityAlerts,
} from "./OpportunityAlertEngine";
export type { OpportunityAlertInput } from "./OpportunityAlertEngine";

export {
  PortfolioAlertEngine,
  getPortfolioAlertEngine,
  resetPortfolioAlertEngine,
  resetPortfolioAlertPriorState,
  seedPortfolioAlertPrior,
  getLastPortfolioAlertSnapshot,
  generatePortfolioAlerts,
} from "./PortfolioAlertEngine";
export type { PortfolioAlertInput } from "./PortfolioAlertEngine";

export {
  WatchlistAlertEngine,
  getWatchlistAlertIntelligenceEngine,
  resetWatchlistAlertIntelligenceEngine,
  resetWatchlistAlertPriorState,
  seedWatchlistAlertPrior,
  getWatchlistAlertPriorState,
  generateWatchlistAlerts,
} from "./WatchlistAlertEngine";
export type { WatchlistAlertInput } from "./WatchlistAlertEngine";

/** Sprint 9C.R3 — Earnings / News / Corporate Action / Transcript */
export {
  EVENT_ALERT_EMPTY,
  EARNINGS_EVENT_ALERT_KINDS,
  NEWS_ALERT_KINDS,
  CORPORATE_ACTION_ALERT_KINDS,
  EARNINGS_EVENT_KIND_LABELS,
  NEWS_KIND_LABELS,
  CORPORATE_ACTION_KIND_LABELS,
  toEventAlertInsightCard,
  buildEventDecision,
  classifyNewsKinds,
  mapCorporateActionKind,
} from "./AlertInsightModels";
export type {
  EarningsEventAlertKind,
  NewsAlertKind,
  CorporateActionAlertKind,
  EarningsEventSnapshot,
  NewsAlertSnapshot,
  CorporateActionAlertSnapshot,
  TranscriptAlertSnapshot,
  ManagementCommentarySnapshot,
  EventAlertInsightCard,
} from "./AlertInsightModels";

export {
  EarningsAlertEngine,
  decideEarningsEventAlerts,
  mapEarningsCalendarToSnapshot,
  getEarningsIntelAlertEngine,
  resetEarningsIntelAlertEngine,
  generateEarningsAlerts,
} from "./EarningsAlertEngine";
export type { EarningsIntelAlertInput } from "./EarningsAlertEngine";

export {
  TranscriptAlertEngine,
  decideTranscriptAlerts,
  getTranscriptAlertEngine,
  resetTranscriptAlertEngine,
  generateTranscriptAlerts,
} from "./TranscriptAlertEngine";
export type { TranscriptAlertInput } from "./TranscriptAlertEngine";

export {
  ManagementCommentaryAlertEngine,
  decideManagementCommentaryAlerts,
  getManagementCommentaryAlertEngine,
  resetManagementCommentaryAlertEngine,
  generateManagementCommentaryAlerts,
} from "./ManagementCommentaryAlertEngine";
export type { ManagementCommentaryAlertInput } from "./ManagementCommentaryAlertEngine";

export {
  NewsAlertEngine,
  decideNewsAlerts,
  getNewsAlertEngine,
  resetNewsAlertEngine,
  generateNewsAlerts,
} from "./NewsAlertEngine";
export type { NewsAlertInput } from "./NewsAlertEngine";

export {
  CorporateActionAlertEngine,
  decideCorporateActionAlerts,
  getCorporateActionAlertEngine,
  resetCorporateActionAlertEngine,
  generateCorporateActionAlerts,
} from "./CorporateActionAlertEngine";
export type { CorporateActionAlertInput } from "./CorporateActionAlertEngine";

export {
  extractNewsRankingFactors,
  scoreNewsRankingFactors,
  rankNewsAlerts,
} from "./NewsRankingEngine";
export type { NewsRankingFactors, RankedNewsAlert } from "./NewsRankingEngine";

export { correlateAlerts } from "./AlertEventCorrelationEngine";
export type {
  CorrelationDimension,
  CorrelatedAlertCluster,
  CorrelationResult,
} from "./AlertEventCorrelationEngine";

export type { EventIntelBatch } from "./emitEventIntelBatch";

/** Sprint 9C.R4 — Technical / Fundamental / Market / Sector */
export {
  SIGNAL_ALERT_EMPTY,
  TECHNICAL_ALERT_KINDS,
  FUNDAMENTAL_ALERT_KINDS,
  MARKET_ALERT_KINDS,
  SECTOR_ALERT_KINDS,
  TECHNICAL_KIND_LABELS,
  FUNDAMENTAL_KIND_LABELS,
  MARKET_KIND_LABELS,
  SECTOR_KIND_LABELS,
  toSignalAlertCard,
  buildSignalDecision,
} from "./AlertSignalModels";
export type {
  TechnicalAlertKind,
  FundamentalAlertKind,
  MarketAlertKind,
  SectorAlertKind,
  TechnicalAlertSnapshot,
  FundamentalAlertSnapshot,
  MarketAlertSnapshot,
  SectorAlertSnapshot,
  SignalAlertCard,
} from "./AlertSignalModels";

export {
  detectTechnicalSignals,
  TechnicalSignalEngine,
} from "./TechnicalSignalEngine";
export {
  detectFundamentalSignals,
  FundamentalSignalEngine,
} from "./FundamentalSignalEngine";
export {
  detectMarketSignals,
  detectSectorSignals,
  MarketTrendEngine,
} from "./MarketTrendEngine";

export {
  TechnicalAlertEngine,
  getTechnicalAlertEngine,
  resetTechnicalAlertEngine,
  generateTechnicalAlerts,
} from "./TechnicalAlertEngine";
export type { TechnicalAlertInput } from "./TechnicalAlertEngine";

export {
  FundamentalAlertEngine,
  getFundamentalAlertEngine,
  resetFundamentalAlertEngine,
  generateFundamentalAlerts,
} from "./FundamentalAlertEngine";
export type { FundamentalAlertInput } from "./FundamentalAlertEngine";

export {
  MarketAlertEngine,
  getMarketAlertEngine,
  resetMarketAlertEngine,
  generateMarketAlerts,
} from "./MarketAlertEngine";
export type { MarketAlertInput } from "./MarketAlertEngine";

export {
  SectorAlertEngine,
  getSectorAlertEngine,
  resetSectorAlertEngine,
  generateSectorAlerts,
} from "./SectorAlertEngine";
export type { SectorAlertInput } from "./SectorAlertEngine";

export {
  extractAlertScoreFactors,
  computeAlertScore,
  scoreAlerts,
} from "./AlertScoringEngine";
export type { AlertScoreFactors, ScoredAlert } from "./AlertScoringEngine";

export type { SignalIntelBatch } from "./emitSignalIntelBatch";

/** Sprint 9C.R6 — AI prioritization, explainability & decision support */
export {
  DECISION_SUPPORT_EMPTY,
  emptyEvidenceResult,
  safeScore,
  safeLabel,
} from "./AlertDecisionModels";
export type {
  DecisionSupportEmptyMessage,
  AlertRecommendationAction,
  AlertDecisionBadge,
  AlertPriorityFactorBreakdown,
  AlertPriorityResult,
  AlertImpactResult,
  AlertRecommendationResult,
  AlertExplainabilityResult,
  AlertEvidenceItem,
  AlertEvidenceResult,
  AlertConflictResult,
  AlertSimilarityMatch,
  AlertSimilarityResult,
  AlertTimelineEvent,
  AlertTimelineResult,
  AlertConfidenceBreakdownResult,
  AlertDecisionSupportPanel,
} from "./AlertDecisionModels";

export {
  AlertPriorityEngine,
  extractPriorityFactors,
  computePriorityScore,
  scoreAlertPriority,
} from "./AlertPriorityEngine";
export {
  AlertImpactEngine,
  estimateAlertImpact,
  formatImpactSummary,
} from "./AlertImpactEngine";
export {
  AlertRecommendationEngine,
  recommendAlertAction,
} from "./AlertRecommendationEngine";
export {
  AlertExplainabilityEngine,
  explainAlert,
} from "./AlertExplainabilityEngine";
export {
  AlertEvidenceEngine,
  collectAlertEvidence,
} from "./AlertEvidenceEngine";
export {
  AlertConflictEngine,
  detectAlertConflicts,
} from "./AlertConflictEngine";
export {
  AlertSimilarityEngine,
  findSimilarAlerts,
} from "./AlertSimilarityEngine";
export {
  AlertTimelineEngine,
  buildAlertTimeline,
} from "./AlertTimelineEngine";
export {
  AlertConfidenceBreakdownEngine,
  buildConfidenceBreakdown,
  getAlertConfidenceBreakdown,
} from "./AlertConfidenceBreakdown";
export { buildAlertDecisionSupport } from "./buildAlertDecisionSupport";

import { resetOpportunityAlertEngine } from "./OpportunityAlertEngine";
import { resetPortfolioAlertEngine } from "./PortfolioAlertEngine";
import { resetWatchlistAlertIntelligenceEngine } from "./WatchlistAlertEngine";
import { resetEarningsIntelAlertEngine } from "./EarningsAlertEngine";
import { resetTranscriptAlertEngine } from "./TranscriptAlertEngine";
import { resetManagementCommentaryAlertEngine } from "./ManagementCommentaryAlertEngine";
import { resetNewsAlertEngine } from "./NewsAlertEngine";
import { resetCorporateActionAlertEngine } from "./CorporateActionAlertEngine";
import { resetTechnicalAlertEngine } from "./TechnicalAlertEngine";
import { resetFundamentalAlertEngine } from "./FundamentalAlertEngine";
import { resetMarketAlertEngine } from "./MarketAlertEngine";
import { resetSectorAlertEngine } from "./SectorAlertEngine";

export function resetAlertIntelligence(): void {
  resetOpportunityAlertEngine();
  resetPortfolioAlertEngine();
  resetWatchlistAlertIntelligenceEngine();
  resetEarningsIntelAlertEngine();
  resetTranscriptAlertEngine();
  resetManagementCommentaryAlertEngine();
  resetNewsAlertEngine();
  resetCorporateActionAlertEngine();
  resetTechnicalAlertEngine();
  resetFundamentalAlertEngine();
  resetMarketAlertEngine();
  resetSectorAlertEngine();
}
