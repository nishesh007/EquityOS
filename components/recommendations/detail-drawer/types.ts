import type { InstitutionalStrategyPick } from "@/lib/recommendations/institutional-strategy-dashboard";
import type {
  RecommendationAction,
  SharedRecommendation,
} from "@/lib/recommendations/shared-recommendation";
import { toDecisionAction } from "@/lib/recommendations/executive-decision-presenter";

/** Drawer action badge — HOLD presents engine WATCHLIST for institutional UI. */
export type RecommendationDrawerAction = "BUY" | "SELL" | "HOLD";

/**
 * Presentation context for the Recommendation Detail Drawer.
 * Sprint 11A.2 — Executive Decision Layer consumes `source` when present.
 */
export interface RecommendationDetailContext {
  id: string;
  symbol: string;
  company: string;
  action: RecommendationDrawerAction;
  confidence: number;
  recommendationDate: string;
  currentPrice: number | null;
  changePercent: number | null;
  changeAbsolute: number | null;
  marketCap: string | null;
  sector: string | null;
  industry: string | null;
  marketStatus: string | null;
  /** Full SharedRecommendation when opened from a recommendation surface. */
  source: SharedRecommendation | null;
  /** Partial trade levels when opened from a dashboard horizon pick. */
  tradeHints?: {
    entry: number | null;
    entryLow: number | null;
    entryHigh: number | null;
    primaryTarget: number | null;
  };
  /** Origin surface for analytics / future wiring. */
  openedFrom?: RecommendationDrawerSource;
}

export type RecommendationDrawerSource =
  | "dashboard"
  | "watchlist"
  | "portfolio"
  | "ai-screener"
  | "strategy-engine"
  | "research"
  | "validation"
  | "opportunities"
  | "other";

export function toDrawerAction(
  action: RecommendationAction
): RecommendationDrawerAction {
  return toDecisionAction(action);
}

export function fromSharedRecommendation(
  recommendation: SharedRecommendation,
  openedFrom?: RecommendationDrawerSource
): RecommendationDetailContext {
  return {
    id: recommendation.id,
    symbol: recommendation.symbol,
    company: recommendation.company,
    action: toDrawerAction(recommendation.action),
    confidence: recommendation.confidence,
    recommendationDate: recommendation.timestamp,
    /** Live quote enrichment is applied in the drawer via useMarketQuotes. */
    currentPrice: null,
    changePercent: null,
    changeAbsolute: null,
    marketCap: null,
    sector: null,
    industry: null,
    marketStatus: recommendation.marketRegime || null,
    source: recommendation,
    openedFrom,
  };
}

/** Dashboard horizon pick — hydrated to full SharedRecommendation when available. */
export function fromStrategyPick(
  pick: InstitutionalStrategyPick,
  openedFrom: RecommendationDrawerSource = "dashboard"
): RecommendationDetailContext {
  return {
    id: `dashboard:${pick.strategyId}:${pick.symbol}`,
    symbol: pick.symbol,
    company: pick.company,
    action: "HOLD",
    confidence: pick.conviction,
    recommendationDate: pick.lastScanTime,
    currentPrice:
      pick.currentPrice != null && pick.currentPrice > 0
        ? pick.currentPrice
        : pick.entry > 0
          ? pick.entry
          : null,
    changePercent: null,
    changeAbsolute: null,
    marketCap: null,
    sector: null,
    industry: null,
    marketStatus: null,
    source: null,
    tradeHints: {
      entry: pick.entry > 0 ? pick.entry : null,
      entryLow: pick.entryLow,
      entryHigh: pick.entryHigh,
      primaryTarget: pick.primaryTarget > 0 ? pick.primaryTarget : null,
    },
    openedFrom,
  };
}
