import { buildIntradayOpportunities } from "@/lib/opportunity-engine/ranking";
import type {
  OpportunityCandidate,
  OpportunityCategory,
  OpportunityEngineState,
} from "@/lib/opportunity-engine/types";
import { CATEGORY_LABELS } from "@/lib/opportunity-engine/types";

export const SECTION_SUBTITLES: Record<OpportunityCategory, string> = {
  intraday: "What can I trade now?",
  swing: "What can I hold?",
  breakout: "Which stocks are breaking out?",
  momentum: "Who is leading today's momentum?",
  relative_volume: "Where is unusual volume activity?",
  mean_reversion: "Which extremes are reverting?",
  ai_high_conviction: "What are today's highest conviction trades?",
};

export const POST_MARKET_SUBTITLES = {
  tomorrowWatchlist: "What should I monitor tomorrow morning?",
  missedOpportunities: "What worked today that I missed?",
  bestCallsOfDay: "What are today's highest conviction trades?",
} as const;

const CATEGORY_EMPTY_NOTE =
  "No stocks satisfied today's strict institutional filters for this category. Filters were relaxed once — the next scan may surface candidates.";

export function deriveCategoryCandidates(
  state: OpportunityEngineState,
  category: OpportunityCategory
): { candidates: OpportunityCandidate[]; emptyNote?: string } {
  if (category === "intraday") {
    const candidates = buildIntradayOpportunities(state);
    return {
      candidates,
      emptyNote: candidates.length === 0 ? CATEGORY_EMPTY_NOTE : undefined,
    };
  }

  const candidates = state.categories[category] ?? [];
  return {
    candidates,
    emptyNote: candidates.length === 0 ? CATEGORY_EMPTY_NOTE : undefined,
  };
}

export function getCategoryLabel(category: OpportunityCategory): string {
  return CATEGORY_LABELS[category];
}

export function getCategorySubtitle(category: OpportunityCategory): string {
  return SECTION_SUBTITLES[category];
}
