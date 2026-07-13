import {
  assignSymbolsToCategories,
  deduplicateCategoryCandidates,
} from "@/lib/opportunity-engine/deduplication";
import { buildIntradayOpportunities, flattenRankedPool } from "@/lib/opportunity-engine/ranking";
import type {
  OpportunityCandidate,
  OpportunityCategory,
  OpportunityEngineState,
} from "@/lib/opportunity-engine/types";
import { CATEGORY_LABELS, OPPORTUNITY_CATEGORIES } from "@/lib/opportunity-engine/types";

export const SECTION_SUBTITLES: Record<OpportunityCategory, string> = {
  intraday: "What should I trade now?",
  swing: "What should I hold?",
  breakout: "Which stocks are breaking out?",
  momentum: "Who is leading today's momentum?",
  relative_volume: "Where is unusual volume activity?",
  mean_reversion: "Which extremes are reverting?",
  ai_high_conviction: "What are today's highest conviction trades?",
};

export const POST_MARKET_SUBTITLES = {
  tomorrowWatchlist: "What should I monitor tomorrow?",
  missedOpportunities: "Signals that weakened before completion.",
  bestCallsOfDay: "What are today's highest probability trades?",
} as const;

export const CATEGORY_EMPTY_HEADLINE =
  "No institutional candidates satisfied today's strict filters.";

const CATEGORY_EMPTY_NOTE =
  "No stocks satisfied today's strict institutional filters for this category. Filters were relaxed once — the next scan may surface candidates.";

export interface NearestCandidate {
  symbol: string;
  company: string;
  conviction: number;
  filterFailures: string[];
}

function num(
  metrics: Record<string, number | string | null> | undefined,
  key: string
): number | null {
  if (!metrics) return null;
  const value = metrics[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function inferFilterFailures(
  candidate: OpportunityCandidate,
  category: OpportunityCategory
): string[] {
  const failures: string[] = [];
  const metrics = candidate.scanMetrics;
  const volumeRatio = num(metrics, "volume_ratio") ?? 0;
  const adx = num(metrics, "adx") ?? 0;
  const delivery = num(metrics, "delivery_percent") ?? 0;
  const fundamentalScore = num(metrics, "fundamental_score");
  const rsi = num(metrics, "rsi") ?? 50;
  const priceToHigh =
    num(metrics, "price_to_52w_high") ?? 0;

  if (candidate.aiConvictionScore < 65) failures.push("Conviction below threshold");
  if (volumeRatio < 1.2) failures.push("Volume below 1.2x average");
  if (adx < 20 && category !== "mean_reversion") failures.push("ADX trend too weak");
  if (delivery < 30 && category !== "intraday") failures.push("Delivery below institutional bar");
  if (category === "ai_high_conviction" && candidate.aiConvictionScore < 75) {
    failures.push("AI conviction below 75");
  }
  if (category === "breakout" && priceToHigh < 88) {
    failures.push("Not near breakout zone");
  }
  if (category === "mean_reversion" && rsi > 40 && rsi < 60) {
    failures.push("RSI not at extreme");
  }
  if (fundamentalScore !== null && fundamentalScore < 50 && category === "swing") {
    failures.push("Fundamentals below swing bar");
  }
  if (failures.length === 0) failures.push("Assigned to higher-priority category");

  return failures.slice(0, 3);
}

export function deriveCategoryCandidates(
  state: OpportunityEngineState,
  category: OpportunityCategory
): { candidates: OpportunityCandidate[]; emptyNote?: string; nearestCandidates: NearestCandidate[] } {
  if (category === "intraday") {
    const deduped = deduplicateCategoryCandidates(
      "intraday",
      buildIntradayOpportunities(state),
      assignSymbolsToCategories(state)
    ).map((candidate, index) => ({ ...candidate, rank: index + 1 }));

    return {
      candidates: deduped,
      emptyNote: deduped.length === 0 ? CATEGORY_EMPTY_NOTE : undefined,
      nearestCandidates: deduped.length === 0 ? deriveNearestCandidates(state, category, deduped) : [],
    };
  }

  const assignment = assignSymbolsToCategories(state);
  const candidates = deduplicateCategoryCandidates(
    category,
    state.categories[category] ?? [],
    assignment
  ).map((candidate, index) => ({ ...candidate, rank: index + 1 }));

  return {
    candidates,
    emptyNote: candidates.length === 0 ? CATEGORY_EMPTY_NOTE : undefined,
    nearestCandidates:
      candidates.length === 0 ? deriveNearestCandidates(state, category, candidates) : [],
  };
}

export function deriveCategoryCount(
  state: OpportunityEngineState,
  category: OpportunityCategory
): number {
  return deriveCategoryCandidates(state, category).candidates.length;
}

export function deriveNearestCandidates(
  state: OpportunityEngineState,
  category: OpportunityCategory,
  excluded: OpportunityCandidate[]
): NearestCandidate[] {
  const excludedSymbols = new Set(excluded.map((c) => c.symbol.toUpperCase()));
  const pool = flattenRankedPool(state);

  const fromCategory = (state.categories[category] ?? []).filter(
    (c) => !excludedSymbols.has(c.symbol.toUpperCase())
  );

  const source = fromCategory.length > 0 ? fromCategory : pool;

  return [...source]
    .sort((a, b) => b.aiConvictionScore - a.aiConvictionScore)
    .slice(0, 3)
    .map((candidate) => ({
      symbol: candidate.symbol,
      company: candidate.company,
      conviction: candidate.aiConvictionScore,
      filterFailures: inferFilterFailures(candidate, category),
    }));
}

export function getCategoryLabel(category: OpportunityCategory): string {
  return CATEGORY_LABELS[category];
}

export function getCategorySubtitle(category: OpportunityCategory): string {
  return SECTION_SUBTITLES[category];
}

export function countAllCategoryCandidates(state: OpportunityEngineState): number {
  return OPPORTUNITY_CATEGORIES.reduce(
    (sum, category) => sum + deriveCategoryCount(state, category),
    0
  );
}
