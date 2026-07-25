/**
 * Sprint 9A.1 / 9F.2 — Institutional Opportunity Dashboard ranking.
 *
 * Sprint 9F.2: delegates to Horizon-First pipelines. OE categories are no
 * longer remapped into horizons — each horizon independently selects and
 * constructs recommendations.
 */

import type { OpportunityEngineState } from "@/lib/opportunity-engine/types";
import {
  INSTITUTIONAL_STRATEGY_IDS,
  INSTITUTIONAL_STRATEGY_META,
  type InstitutionalStrategyId,
} from "@/lib/recommendations/horizons/ids";
import { validateInstitutionalTradeLevels } from "@/lib/recommendations/recommendation-validator";
import type {
  SharedMarketSnapshot,
  SharedRecommendation,
} from "@/lib/recommendations/shared-recommendation";
import { selectHorizonDashboardSlots } from "@/lib/recommendations/horizons/adapters";

export type { InstitutionalStrategyId };
export { INSTITUTIONAL_STRATEGY_IDS, INSTITUTIONAL_STRATEGY_META };

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

let cachedDashboardKey = "";
let cachedDashboardSlots: InstitutionalStrategySlot[] = [];

function convictionOf(recommendation: SharedRecommendation): number {
  return Math.max(recommendation.conviction, recommendation.confidence);
}

/**
 * Build the seven institutional slots via Horizon-First pipelines.
 * Cached by tradingDate:scanCount:lastScannedAt (+ regime) — no I/O.
 */
export function selectInstitutionalStrategyDashboard(
  state: OpportunityEngineState,
  shared?: SharedMarketSnapshot
): InstitutionalStrategySlot[] {
  const key = `v9f6-dash:${state.tradingDate}:${state.scanCount}:${state.lastScannedAt}:${shared?.regime ?? ""}`;
  if (key === cachedDashboardKey) return cachedDashboardSlots;

  const slots = selectHorizonDashboardSlots(state, shared);
  cachedDashboardKey = key;
  cachedDashboardSlots = slots;
  return slots;
}

/**
 * Client-side projection when only SharedRecommendation[] is available.
 * Matches by primaryStrategyId === horizon id (horizon-first ids).
 */
export function rankInstitutionalSlotsFromRecommendations(
  recommendations: SharedRecommendation[],
  lastScanTime: string
): InstitutionalStrategySlot[] {
  const scanTime =
    lastScanTime ||
    recommendations[0]?.timestamp ||
    new Date(0).toISOString();

  return INSTITUTIONAL_STRATEGY_IDS.map((strategyId) => {
    const meta = INSTITUTIONAL_STRATEGY_META[strategyId];

    const matching = recommendations.filter(
      (recommendation) =>
        recommendation.primaryStrategyId === strategyId &&
        recommendation.action !== "WATCHLIST"
    );

    let best: SharedRecommendation | null = null;
    for (const recommendation of matching) {
      if (!best || convictionOf(recommendation) > convictionOf(best)) {
        best = recommendation;
      }
    }

    return {
      strategyId,
      label: meta.label,
      emoji: meta.emoji,
      href: meta.href,
      recommendationCount: matching.length,
      pick: best
        ? (() => {
            // Sprint 9F.4 — prefer sealed recommendation Entry Range.
            const entryLow = best.entryLow ?? null;
            const entryHigh = best.entryHigh ?? null;
            const hasZone =
              entryLow != null &&
              entryHigh != null &&
              entryLow !== entryHigh;
            const entry = best.entry;
            const presentation = validateInstitutionalTradeLevels({
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
            if (!presentation.valid) {
              // Still surface the sealed recommendation so the card matches
              // the table dataset (Sprint 9F.6 consistency).
              return {
                strategyId,
                company: best.company,
                symbol: best.symbol,
                currentPrice: null,
                entry,
                entryMode: hasZone ? ("zone" as const) : ("ideal" as const),
                entryLow: hasZone ? entryLow : null,
                entryHigh: hasZone ? entryHigh : null,
                entryAtMarket: false,
                primaryTarget: best.targets[0] ?? entry,
                expectedUpsidePercent: best.expectedReturnPercent ?? null,
                conviction: best.conviction,
                lastScanTime: scanTime,
              } satisfies InstitutionalStrategyPick;
            }
            return {
              strategyId,
              company: best.company,
              symbol: best.symbol,
              currentPrice: null,
              entry,
              entryMode: hasZone ? ("zone" as const) : ("ideal" as const),
              entryLow: hasZone ? entryLow : null,
              entryHigh: hasZone ? entryHigh : null,
              entryAtMarket: false,
              primaryTarget: best.targets[0] ?? entry,
              expectedUpsidePercent: best.expectedReturnPercent ?? null,
              conviction: best.conviction,
              lastScanTime: scanTime,
            } satisfies InstitutionalStrategyPick;
          })()
        : null,
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
  cachedDashboardKey = "";
  cachedDashboardSlots = [];
}
