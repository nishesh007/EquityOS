/**
 * Sprint 9A.1 / 9F.2 — Institutional Opportunity Dashboard ranking.
 *
 * Sprint 9F.2: delegates to Horizon-First pipelines. OE categories are no
 * longer remapped into horizons — each horizon independently selects and
 * constructs recommendations.
 *
 * Dashboard fallback: when horizon slots have no picks, project cards from
 * the shared recommendations list via category / horizon mapping.
 */

import type {
  OpportunityCategory,
  OpportunityEngineState,
} from "@/lib/opportunity-engine/types";
import {
  INSTITUTIONAL_STRATEGY_IDS,
  INSTITUTIONAL_STRATEGY_META,
  type InstitutionalStrategyId,
} from "@/lib/recommendations/horizons/ids";
import { validateInstitutionalTradeLevels } from "@/lib/recommendations/recommendation-validator";
import { readPublishedFromState } from "@/lib/recommendations/published/client";
import type {
  SharedMarketSnapshot,
  SharedRecommendation,
} from "@/lib/recommendations/shared-recommendation";

export type { InstitutionalStrategyId };
export { INSTITUTIONAL_STRATEGY_IDS, INSTITUTIONAL_STRATEGY_META };

/**
 * OE category → dashboard horizon when primaryStrategyId is an OE strategy
 * slug (e.g. opening-range-fade) rather than a horizon id.
 */
const CATEGORY_TO_HORIZON: Record<OpportunityCategory, InstitutionalStrategyId> =
  {
    intraday: "intraday",
    swing: "swing",
    relative_volume: "btst",
    mean_reversion: "scalping",
    breakout: "short_term",
    momentum: "medium_term",
    ai_high_conviction: "long_term",
  };

export interface InstitutionalStrategyPick {
  strategyId: InstitutionalStrategyId;
  company: string;
  symbol: string;
  /** Live market price only — never used as the recommended entry. */
  currentPrice: number | null;
  /**
   * Recommended execution midpoint (Ideal Entry).
   * Kept for compatibility; prefer entryMode / entryLow / entryHigh in UI.
   */
  entry: number;
  /** "zone" → Entry Zone · "ideal" → Ideal Entry */
  entryMode: "zone" | "ideal";
  entryLow: number | null;
  entryHigh: number | null;
  /** True when live price sits inside the ideal / zone mid tolerance. */
  entryAtMarket: boolean;
  primaryTarget: number;
  /** Canonical Expected Return % (Target1 from Effective Entry). */
  expectedUpsidePercent: number | null;
  conviction: number;
  lastScanTime: string;
  /** Historical win rate % from completed paper outcomes (read-time). */
  expectedWinRate?: number | null;
  /** True when relevant cohort sample < display threshold. */
  expectedWinRateEstimated?: boolean;
  /** True only when sample ≥ 30 — UI may show Expected Win Rate. */
  showExpectedWinRate?: boolean;
  /** Model / AI confidence (0–100). Shown when win rate is suppressed. */
  aiConfidence?: number | null;
  /** Historical confidence from ranking sample depth (0–100). */
  historicalConfidence?: number | null;
  /** Reason when Expected Win Rate is hidden. */
  winRateSuppressedReason?: string | null;
  /** Consensus Engine score (0–100). */
  consensusScore?: number | null;
  /** 1-based consensus rank among quality-passed set. */
  consensusRank?: number | null;
  /** Win-rate sample size used by consensus. */
  winRateSampleSize?: number | null;
}

export interface InstitutionalStrategySlot {
  strategyId: InstitutionalStrategyId;
  label: string;
  emoji: string;
  href: string;
  /**
   * Highest-ranked recommendation from the same horizon table dataset.
   * Null only when that horizon's recommendation list is genuinely empty.
   */
  pick: InstitutionalStrategyPick | null;
  /** Count of published recommendations in the matching table (Sprint 9F.6). */
  recommendationCount?: number;
  lastScanTime: string;
}

/** Empty-state copy — only when the matching recommendation table is empty. */
export const NO_RECOMMENDATION_AVAILABLE_MESSAGE = "No Recommendation Available";

/** @deprecated Use NO_RECOMMENDATION_AVAILABLE_MESSAGE (Sprint 9F.6). */
export const NO_HIGH_CONVICTION_MESSAGE = NO_RECOMMENDATION_AVAILABLE_MESSAGE;

function convictionOf(recommendation: SharedRecommendation): number {
  return Math.max(recommendation.conviction, recommendation.confidence);
}

/** Number of dashboard slots that have a visible pick card. */
export function filledSlotCount(
  slots: readonly InstitutionalStrategySlot[] | null | undefined
): number {
  if (!slots?.length) return 0;
  return slots.filter((slot) => slot.pick != null).length;
}

function horizonForRecommendation(
  recommendation: SharedRecommendation
): InstitutionalStrategyId | null {
  if (
    INSTITUTIONAL_STRATEGY_IDS.includes(
      recommendation.primaryStrategyId as InstitutionalStrategyId
    )
  ) {
    return recommendation.primaryStrategyId as InstitutionalStrategyId;
  }
  if (
    INSTITUTIONAL_STRATEGY_IDS.includes(
      recommendation.category as InstitutionalStrategyId
    )
  ) {
    return recommendation.category as InstitutionalStrategyId;
  }
  return CATEGORY_TO_HORIZON[recommendation.category] ?? null;
}

function toDashboardPick(
  best: SharedRecommendation,
  strategyId: InstitutionalStrategyId,
  scanTime: string
): InstitutionalStrategyPick {
  const entryLow = best.entryLow ?? null;
  const entryHigh = best.entryHigh ?? null;
  const hasZone =
    entryLow != null && entryHigh != null && entryLow !== entryHigh;
  const entry = best.entry;
  // Prefer sealed Entry Range; still surface the pick when validation fails
  // so cards stay aligned with the recommendation list.
  validateInstitutionalTradeLevels({
    action: best.action,
    entry,
    entryLow: hasZone ? entryLow : null,
    entryHigh: hasZone ? entryHigh : null,
    stopLoss: best.stopLoss,
    targets: best.targets,
    holdingPeriod: best.holdingPeriod,
    primaryStrategy: best.primaryStrategy,
    statedRiskReward: best.riskReward,
  });
  return {
    strategyId,
    company: best.company,
    symbol: best.symbol,
    currentPrice: null,
    entry,
    entryMode: hasZone ? "zone" : "ideal",
    entryLow: hasZone ? entryLow : null,
    entryHigh: hasZone ? entryHigh : null,
    entryAtMarket: false,
    primaryTarget: best.targets[0] ?? entry,
    expectedUpsidePercent: best.expectedReturnPercent ?? null,
    conviction: best.conviction,
    lastScanTime: scanTime,
  };
}

/**
 * Prefer Institutional Ranking when recommendations exist; otherwise keep
 * baked published slots / empty shell. Does not mutate Published SSOT.
 */
export function resolveDashboardSlotsFromRecommendations(options: {
  strategyDashboard?: InstitutionalStrategySlot[] | null;
  recommendations: SharedRecommendation[];
  lastScanTime?: string | null;
  scoreOf?: (recommendation: SharedRecommendation) => number;
}): InstitutionalStrategySlot[] {
  const { strategyDashboard, recommendations, lastScanTime, scoreOf } = options;
  if (recommendations.length > 0) {
    return rankInstitutionalSlotsFromRecommendations(
      recommendations,
      lastScanTime ??
        recommendations[0]?.timestamp ??
        new Date(0).toISOString(),
      scoreOf ? { scoreOf } : undefined
    );
  }
  if (strategyDashboard && filledSlotCount(strategyDashboard) > 0) {
    return strategyDashboard;
  }
  return (
    strategyDashboard ??
    rankInstitutionalSlotsFromRecommendations(
      [],
      lastScanTime ?? new Date(0).toISOString()
    )
  );
}

/**
 * Read published dashboard slots — no request-time horizon pipeline.
 */
export function selectInstitutionalStrategyDashboard(
  state: OpportunityEngineState,
  _shared?: SharedMarketSnapshot
): InstitutionalStrategySlot[] {
  const published = readPublishedFromState(state);
  if (published?.strategyDashboard?.length) {
    return published.strategyDashboard;
  }

  const lastScanTime = state.lastScannedAt ?? new Date(0).toISOString();
  return INSTITUTIONAL_STRATEGY_IDS.map((strategyId) => {
    const meta = INSTITUTIONAL_STRATEGY_META[strategyId];
    return {
      strategyId,
      label: meta.label,
      emoji: meta.emoji,
      href: meta.href,
      pick: null,
      recommendationCount: 0,
      lastScanTime,
    };
  });
}

/**
 * Project seven dashboard cards from SharedRecommendation[].
 * Matches primaryStrategyId, then OE category → horizon, then fills
 * remaining empty slots with unused high-ranked recommendations.
 *
 * By default ranks by conviction; pass `scoreOf` (e.g. institutionalRank)
 * to prefer Institutional Ranking Engine scores.
 */
export function rankInstitutionalSlotsFromRecommendations(
  recommendations: SharedRecommendation[],
  lastScanTime: string,
  options?: { scoreOf?: (recommendation: SharedRecommendation) => number }
): InstitutionalStrategySlot[] {
  const scoreOf =
    options?.scoreOf ??
    ((recommendation: SharedRecommendation) => convictionOf(recommendation));
  const scanTime =
    lastScanTime ||
    recommendations[0]?.timestamp ||
    new Date(0).toISOString();

  const actionable = recommendations.filter(
    (recommendation) => recommendation.action !== "WATCHLIST"
  );

  const byHorizon = new Map<
    InstitutionalStrategyId,
    SharedRecommendation[]
  >();
  for (const id of INSTITUTIONAL_STRATEGY_IDS) {
    byHorizon.set(id, []);
  }

  for (const recommendation of actionable) {
    const horizon = horizonForRecommendation(recommendation);
    if (horizon) {
      byHorizon.get(horizon)!.push(recommendation);
    }
  }

  const usedSymbols = new Set<string>();
  const picks = new Map<InstitutionalStrategyId, SharedRecommendation>();

  for (const strategyId of INSTITUTIONAL_STRATEGY_IDS) {
    const matching = byHorizon.get(strategyId) ?? [];
    let best: SharedRecommendation | null = null;
    for (const recommendation of matching) {
      if (!best || scoreOf(recommendation) > scoreOf(best)) {
        best = recommendation;
      }
    }
    if (best) {
      picks.set(strategyId, best);
      usedSymbols.add(best.symbol.toUpperCase());
    }
  }

  // Fill remaining empty horizons so valid recs can still show 7 cards.
  const leftovers = actionable
    .filter((r) => !usedSymbols.has(r.symbol.toUpperCase()))
    .sort((a, b) => scoreOf(b) - scoreOf(a));

  for (const strategyId of INSTITUTIONAL_STRATEGY_IDS) {
    if (picks.has(strategyId)) continue;
    const next = leftovers.find(
      (r) => !usedSymbols.has(r.symbol.toUpperCase())
    );
    if (!next) break;
    picks.set(strategyId, next);
    usedSymbols.add(next.symbol.toUpperCase());
  }

  return INSTITUTIONAL_STRATEGY_IDS.map((strategyId) => {
    const meta = INSTITUTIONAL_STRATEGY_META[strategyId];
    const matching = byHorizon.get(strategyId) ?? [];
    const best = picks.get(strategyId) ?? null;

    return {
      strategyId,
      label: meta.label,
      emoji: meta.emoji,
      href: meta.href,
      recommendationCount: matching.length || (best ? 1 : 0),
      pick: best ? toDashboardPick(best, strategyId, scanTime) : null,
      lastScanTime: scanTime,
    };
  });
}

export function parseInstitutionalStrategyId(
  value: string | null | undefined
): InstitutionalStrategyId | null {
  if (!value) return null;
  return INSTITUTIONAL_STRATEGY_IDS.includes(value as InstitutionalStrategyId)
    ? (value as InstitutionalStrategyId)
    : null;
}

/** @internal test helper */
export function __resetInstitutionalDashboardCacheForTests(): void {
  // Published SSOT — no request-time dashboard cache.
}
