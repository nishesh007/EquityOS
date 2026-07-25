import type {
  InstitutionalStrategyPick,
  RecommendationAction,
  SharedRecommendation,
} from "@/lib/recommendations";

/** Drawer action badge — HOLD presents engine WATCHLIST for institutional UI. */
export type RecommendationDrawerAction = "BUY" | "SELL" | "HOLD";

/**
 * Presentation context for the Recommendation Detail Drawer.
 * Sprint 11A.1 — framework only; market enrichment is optional until 11A.2.
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
  if (action === "SELL") return "SELL";
  if (action === "WATCHLIST") return "HOLD";
  return "BUY";
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
    /** Live quote enrichment lands in Sprint 11A.2 — do not invent from entry. */
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

/** Dashboard horizon pick — minimal context until full rec is resolved in 11A.2. */
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
    openedFrom,
  };
}
