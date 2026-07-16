import type {
  OpportunityCandidate,
  OpportunityCategory,
  OpportunityEngineState,
} from "@/lib/opportunity-engine/types";
import { OPPORTUNITY_CATEGORIES } from "@/lib/opportunity-engine/types";

/**
 * Category priority for one-stock-one-category deduplication.
 * Highest Conviction Recommendations is a derived post-market section (handled separately in ranking).
 */
export const CATEGORY_DEDUP_PRIORITY: OpportunityCategory[] = [
  "intraday",
  "ai_high_conviction",
  "swing",
  "momentum",
  "breakout",
  "relative_volume",
  "mean_reversion",
];

export function assignSymbolsToCategories(
  state: OpportunityEngineState
): Map<string, OpportunityCategory> {
  const assignment = new Map<string, OpportunityCategory>();

  for (const category of CATEGORY_DEDUP_PRIORITY) {
    for (const candidate of state.categories[category] ?? []) {
      const symbol = candidate.symbol.toUpperCase();
      if (!assignment.has(symbol)) {
        assignment.set(symbol, category);
      }
    }
  }

  return assignment;
}

export function deduplicateCategoryCandidates(
  category: OpportunityCategory,
  candidates: OpportunityCandidate[],
  assignment: Map<string, OpportunityCategory>
): OpportunityCandidate[] {
  return candidates.filter(
    (candidate) => assignment.get(candidate.symbol.toUpperCase()) === category
  );
}

export function applyCategoryDeduplication(
  state: OpportunityEngineState
): OpportunityEngineState {
  const assignment = assignSymbolsToCategories(state);
  const categories = { ...state.categories };

  for (const category of OPPORTUNITY_CATEGORIES) {
    categories[category] = deduplicateCategoryCandidates(
      category,
      state.categories[category] ?? [],
      assignment
    ).map((candidate, index) => ({ ...candidate, rank: index + 1 }));
  }

  return { ...state, categories };
}

export function collectExcludedSymbols(
  sections: OpportunityCandidate[][]
): Set<string> {
  const excluded = new Set<string>();
  for (const section of sections) {
    for (const candidate of section) {
      excluded.add(candidate.symbol.toUpperCase());
    }
  }
  return excluded;
}
