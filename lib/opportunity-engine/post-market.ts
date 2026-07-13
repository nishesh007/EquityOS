import type {
  OpportunityCandidate,
  OpportunityCategory,
  OpportunityEngineState,
  PostMarketReport,
} from "@/lib/opportunity-engine/types";
import { OPPORTUNITY_CATEGORIES } from "@/lib/opportunity-engine/types";

function flattenCandidates(
  state: OpportunityEngineState
): OpportunityCandidate[] {
  const all: OpportunityCandidate[] = [];
  for (const category of OPPORTUNITY_CATEGORIES) {
    all.push(...state.categories[category]);
  }
  return all;
}

function uniqueBySymbol(
  candidates: OpportunityCandidate[],
  limit: number
): OpportunityCandidate[] {
  const seen = new Set<string>();
  const result: OpportunityCandidate[] = [];
  const sorted = [...candidates].sort(
    (a, b) => b.aiConvictionScore - a.aiConvictionScore
  );

  for (const candidate of sorted) {
    const key = candidate.symbol.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(candidate);
    if (result.length >= limit) break;
  }
  return result;
}

export function generatePostMarketReport(
  state: OpportunityEngineState,
  sessionDate: string
): PostMarketReport {
  const all = flattenCandidates(state);

  const bestCallsOfDay = [...all]
    .sort((a, b) => b.aiConvictionScore - a.aiConvictionScore)
    .slice(0, 10)
    .map((c, i) => ({ ...c, rank: i + 1 }));

  const tomorrowWatchlist = uniqueBySymbol(
    all.filter((c) => c.aiConvictionScore >= 70 && c.confidencePercent >= 65),
    15
  ).map((c, i) => ({ ...c, rank: i + 1 }));

  const missedOpportunities = all
    .filter((c) => {
      const detected = new Date(c.firstDetectedAt);
      const scanned = state.lastScannedAt ? new Date(state.lastScannedAt) : new Date();
      const hoursActive =
        (scanned.getTime() - detected.getTime()) / (1000 * 60 * 60);
      return hoursActive >= 2 && c.aiConvictionScore >= 75;
    })
    .sort((a, b) => b.confidencePercent - a.confidencePercent)
    .slice(0, 10)
    .map((c, i) => ({ ...c, rank: i + 1 }));

  return {
    tomorrowWatchlist,
    missedOpportunities,
    bestCallsOfDay,
    generatedAt: new Date().toISOString(),
    sessionDate,
  };
}

export function getCategoryCandidates(
  state: OpportunityEngineState,
  category: OpportunityCategory
): OpportunityCandidate[] {
  return state.categories[category] ?? [];
}
