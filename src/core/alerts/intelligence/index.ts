/**
 * Alert intelligence — public exports (Sprint 9C.R2).
 * Opportunity / Portfolio / Watchlist alert generation on top of R1 Alert Engine.
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

import { resetOpportunityAlertEngine } from "./OpportunityAlertEngine";
import { resetPortfolioAlertEngine } from "./PortfolioAlertEngine";
import { resetWatchlistAlertIntelligenceEngine } from "./WatchlistAlertEngine";

export function resetAlertIntelligence(): void {
  resetOpportunityAlertEngine();
  resetPortfolioAlertEngine();
  resetWatchlistAlertIntelligenceEngine();
}
