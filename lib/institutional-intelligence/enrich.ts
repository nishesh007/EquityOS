/**
 * Presentation enrichment for API responses (never writes SSOT).
 */

import "server-only";

import type { RankedRecommendation } from "@/lib/recommendations/institutional-ranking/types";
import type { RankingMarketContext } from "@/lib/recommendations/institutional-ranking/types";
import { loadExpectancyTables } from "@/lib/institutional-intelligence/shared";
import { assessInstitutionalConfidence } from "@/lib/institutional-intelligence/confidence";
import { buildExplainability } from "@/lib/institutional-intelligence/explainability";

export function enrichRankedRecommendations(
  ranked: readonly RankedRecommendation[],
  options?: RankingMarketContext & { calibrationConfidence?: number | null }
) {
  const tables = loadExpectancyTables(options?.asOf);
  return ranked.map((rec) => {
    const confidence = assessInstitutionalConfidence(rec, tables, {
      breadthScore: options?.breadthScore,
      calibrationConfidence: options?.calibrationConfidence,
    });
    const explainability = buildExplainability(rec, tables, {
      breadthScore: options?.breadthScore,
      calibrationConfidence: options?.calibrationConfidence,
    });
    return {
      ...rec,
      institutionalRank: rec.institutionalRank,
      rankReason: rec.rankReason,
      expectedWinRate: rec.expectedWinRate,
      expectedExpectancy: rec.expectedExpectancy,
      rankingConfidence: rec.rankingConfidence,
      confidenceScore: confidence.confidenceScore,
      confidenceBand: confidence.band,
      explainability,
    };
  });
}
