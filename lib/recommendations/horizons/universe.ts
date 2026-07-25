/**
 * Sprint 9F.2 — Horizon universe builder.
 *
 * Flattens OE state into a symbol-unique universe. OE categories are metric
 * providers only — they do NOT assign the investment horizon.
 */

import type { OpportunityEngineState } from "@/lib/opportunity-engine/types";
import type { HorizonUniverseMember } from "@/lib/recommendations/horizons/types";

function candidateRank(candidate: {
  opportunityScore?: number;
  aiConvictionScore?: number;
  confidencePercent?: number;
}): number {
  return Math.max(
    candidate.opportunityScore ?? 0,
    candidate.aiConvictionScore ?? 0,
    candidate.confidencePercent ?? 0
  );
}

/**
 * Build an independent search universe from one OE snapshot.
 * Every horizon pipeline evaluates this same universe with its own gates.
 */
export function buildHorizonUniverse(
  state: OpportunityEngineState
): HorizonUniverseMember[] {
  const bySymbol = new Map<string, HorizonUniverseMember>();

  for (const list of Object.values(state.categories)) {
    for (const candidate of list) {
      const symbol = candidate.symbol.toUpperCase();
      if (!symbol) continue;
      const existing = bySymbol.get(symbol);
      if (!existing) {
        bySymbol.set(symbol, {
          symbol,
          company: candidate.company,
          candidate,
          appearances: [candidate],
        });
        continue;
      }
      existing.appearances.push(candidate);
      if (candidateRank(candidate) > candidateRank(existing.candidate)) {
        existing.candidate = candidate;
        existing.company = candidate.company;
      }
    }
  }

  return [...bySymbol.values()];
}
