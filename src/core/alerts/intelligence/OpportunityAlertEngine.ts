/**
 * Opportunity Alert Engine — research opportunity intelligence (Sprint 9C.R2).
 * Reuses Sprint 9A opportunity candidates; emits into R1 Alert Engine.
 */

import type { OpportunityCandidate } from "@/lib/opportunity-engine/types";
import { OPPORTUNITY_CATEGORIES } from "@/lib/opportunity-engine/types";
import { getCategoryOpportunities } from "@/lib/opportunity-engine/engine";
import { generateAlert, registerAlertEngine } from "../AlertFacade";
import type { InstitutionalAlert } from "../AlertModels";
import { safeAlertText } from "../AlertModels";
import {
  decideOpportunityAlerts,
  decisionToSourceEvent,
} from "./AlertDecisionEngine";
import {
  emptyIntelligenceBatch,
  INTELLIGENCE_ALERT_EMPTY,
  toAlertPresentationCard,
  type IntelligenceAlertBatch,
  type IntelligencePriorState,
  type OpportunitySnapshot,
} from "./AlertPresentationModels";
import { deduplicateAlerts } from "./AlertDeduplicationEngine";

export interface OpportunityAlertInput {
  opportunities?: OpportunitySnapshot[];
  /** Live candidates from opportunity engine — mapped without recalculation. */
  candidates?: OpportunityCandidate[];
  portfolioSymbols?: readonly string[];
  watchlistSymbols?: readonly string[];
  prior?: IntelligencePriorState | null;
  now?: Date;
}

function numMetric(
  metrics: Record<string, number | string | null> | undefined,
  key: string
): number | null {
  if (!metrics) return null;
  const v = metrics[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export function mapCandidateToSnapshot(
  candidate: OpportunityCandidate
): OpportunitySnapshot {
  return {
    id: candidate.id,
    symbol: candidate.symbol,
    company: candidate.company,
    category: candidate.category,
    side: candidate.side,
    aiConvictionScore: candidate.aiConvictionScore,
    confidencePercent: candidate.confidencePercent,
    entryZone: { ...candidate.entryZone },
    stopLoss: candidate.stopLoss,
    target1: candidate.target1,
    target2: candidate.target2,
    riskReward: candidate.riskReward,
    reason: candidate.reason,
    momentum: numMetric(candidate.scanMetrics, "momentum"),
    relativeStrength: numMetric(candidate.scanMetrics, "relative_strength"),
    volumeRatio: numMetric(candidate.scanMetrics, "volume_ratio"),
    trendScore: numMetric(candidate.scanMetrics, "trend_score"),
    institutionalGrade: candidate.bestCallScore ?? candidate.aiConvictionScore,
    currentPrice: numMetric(candidate.scanMetrics, "price"),
    firstDetectedAt: candidate.firstDetectedAt,
    lastDetectedAt: candidate.lastDetectedAt,
    tradeStatus: null,
  };
}

/** Read live opportunity state without recalculating research scores. */
export function loadOpportunitySnapshotsFromEngine(): OpportunitySnapshot[] {
  try {
    const all: OpportunitySnapshot[] = [];
    const seen = new Set<string>();
    for (const category of OPPORTUNITY_CATEGORIES) {
      for (const candidate of getCategoryOpportunities(category)) {
        if (seen.has(candidate.id)) continue;
        seen.add(candidate.id);
        all.push(mapCandidateToSnapshot(candidate));
      }
    }
    return all;
  } catch {
    return [];
  }
}

let priorStore: IntelligencePriorState = {
  opportunities: {},
  portfolio: null,
  watchlist: {},
};

export function getOpportunityAlertPriorState(): IntelligencePriorState {
  return {
    opportunities: { ...priorStore.opportunities },
    portfolio: priorStore.portfolio
      ? {
          ...priorStore.portfolio,
          holdings: priorStore.portfolio.holdings.map((h) => ({ ...h })),
        }
      : null,
    watchlist: { ...priorStore.watchlist },
  };
}

export function resetOpportunityAlertPriorState(): void {
  priorStore = { opportunities: {}, portfolio: null, watchlist: {} };
}

export function seedOpportunityAlertPrior(
  snapshots: readonly OpportunitySnapshot[]
): void {
  for (const s of snapshots) {
    const key = safeAlertText(s.symbol, s.id).toUpperCase();
    priorStore.opportunities[key] = { ...s };
  }
}

export class OpportunityAlertEngine {
  generate(input: OpportunityAlertInput = {}): IntelligenceAlertBatch {
    registerAlertEngine();
    const now = input.now ?? new Date();

    const snapshots: OpportunitySnapshot[] =
      input.opportunities ??
      (input.candidates
        ? input.candidates.map(mapCandidateToSnapshot)
        : loadOpportunitySnapshotsFromEngine());

    if (snapshots.length === 0) {
      return emptyIntelligenceBatch(INTELLIGENCE_ALERT_EMPTY.noOpportunities);
    }

    const priorMap =
      input.prior?.opportunities ?? priorStore.opportunities;
    const portfolioSet = new Set(
      (input.portfolioSymbols ?? []).map((s) => s.toUpperCase())
    );
    const watchlistSet = new Set(
      (input.watchlistSymbols ?? []).map((s) => s.toUpperCase())
    );

    const collected: InstitutionalAlert[] = [];
    let created = 0;
    let deduplicated = 0;
    let grouped = 0;

    for (const snap of snapshots) {
      const key = safeAlertText(snap.symbol, snap.id).toUpperCase();
      const prior = priorMap[key] ?? null;
      const decisions = decideOpportunityAlerts(snap, prior, {
        inPortfolio: portfolioSet.has(key),
        inWatchlist: watchlistSet.has(key),
      });

      for (const decision of decisions) {
        const result = generateAlert(decisionToSourceEvent(decision), now);
        if (result.alert) collected.push(result.alert);
        if (result.created) created += 1;
        if (result.deduplicated) deduplicated += 1;
        if (result.grouped) grouped += 1;
      }

      // Update prior for next run
      priorStore.opportunities[key] = { ...snap };
    }

    const deduped = deduplicateAlerts(collected);
    if (deduped.alerts.length === 0) {
      return emptyIntelligenceBatch(INTELLIGENCE_ALERT_EMPTY.noOpportunities);
    }

    return {
      alerts: deduped.alerts,
      cards: deduped.alerts.map((a) =>
        toAlertPresentationCard(
          a,
          typeof a.metadata.extras.kindLabel === "string"
            ? a.metadata.extras.kindLabel
            : undefined
        )
      ),
      total: deduped.alerts.length,
      created,
      deduplicated: deduplicated + deduped.merged,
      grouped,
      empty: false,
      emptyMessage: INTELLIGENCE_ALERT_EMPTY.noOpportunities,
    };
  }
}

let singleton: OpportunityAlertEngine | null = null;

export function getOpportunityAlertEngine(): OpportunityAlertEngine {
  if (!singleton) singleton = new OpportunityAlertEngine();
  return singleton;
}

export function resetOpportunityAlertEngine(): void {
  singleton = null;
  resetOpportunityAlertPriorState();
}

/** Public API — generateOpportunityAlerts() */
export function generateOpportunityAlerts(
  input?: OpportunityAlertInput
): IntelligenceAlertBatch {
  try {
    return getOpportunityAlertEngine().generate(input);
  } catch {
    return emptyIntelligenceBatch(INTELLIGENCE_ALERT_EMPTY.awaitingAnalysis);
  }
}
