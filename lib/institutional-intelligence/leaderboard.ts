/**
 * MODULE 7 — Recommendation Leaderboard
 */

import "server-only";

import type { SharedRecommendation } from "@/lib/recommendations/shared-recommendation";
import {
  rankRecommendations,
} from "@/lib/recommendations/institutional-ranking/engine";
import type { RankingMarketContext } from "@/lib/recommendations/institutional-ranking/types";
import { assessInstitutionalConfidence } from "@/lib/institutional-intelligence/confidence";
import { loadExpectancyTables } from "@/lib/institutional-intelligence/shared";
import { buildPerformanceAnalytics } from "@/lib/institutional-intelligence/performance";

export function buildRecommendationLeaderboard(
  recommendations: readonly SharedRecommendation[],
  market?: RankingMarketContext & { calibrationConfidence?: number | null }
) {
  const tables = loadExpectancyTables(market?.asOf);
  const ranked = rankRecommendations(recommendations, { market });
  const withConfidence = ranked.map((rec) => {
    const confidence = assessInstitutionalConfidence(rec, tables, {
      breadthScore: market?.breadthScore,
      calibrationConfidence: market?.calibrationConfidence,
    });
    return {
      ...rec,
      confidenceScore: confidence.confidenceScore,
      confidenceBand: confidence.band,
    };
  });

  const perf = buildPerformanceAnalytics(market?.asOf);

  const byExpectancy = [...withConfidence].sort(
    (a, b) => b.expectedExpectancy - a.expectedExpectancy
  );
  const byConfidence = [...withConfidence].sort(
    (a, b) => b.confidenceScore - a.confidenceScore
  );

  return {
    generatedAt: new Date().toISOString(),
    top20Recommendations: withConfidence.slice(0, 20).map((r) => ({
      id: r.id,
      symbol: r.symbol,
      company: r.company,
      institutionalRank: r.institutionalRank,
      expectedWinRate: r.expectedWinRate,
      expectedExpectancy: r.expectedExpectancy,
      confidenceScore: r.confidenceScore,
      confidenceBand: r.confidenceBand,
      conviction: r.conviction,
      riskReward: r.riskReward,
      rankReason: r.rankReason,
    })),
    topStrategies: perf.byStrategy.slice(0, 10),
    topSectors: perf.bySector.slice(0, 10),
    topRegimes: perf.byMarketRegime.slice(0, 10),
    bestPerformingRecommendation: withConfidence[0]
      ? {
          id: withConfidence[0].id,
          symbol: withConfidence[0].symbol,
          institutionalRank: withConfidence[0].institutionalRank,
          expectedExpectancy: withConfidence[0].expectedExpectancy,
        }
      : null,
    worstRecommendation: withConfidence.length
      ? {
          id: withConfidence[withConfidence.length - 1].id,
          symbol: withConfidence[withConfidence.length - 1].symbol,
          institutionalRank:
            withConfidence[withConfidence.length - 1].institutionalRank,
          expectedExpectancy:
            withConfidence[withConfidence.length - 1].expectedExpectancy,
        }
      : null,
    highestConfidenceRecommendation: byConfidence[0]
      ? {
          id: byConfidence[0].id,
          symbol: byConfidence[0].symbol,
          confidenceScore: byConfidence[0].confidenceScore,
          confidenceBand: byConfidence[0].confidenceBand,
        }
      : null,
    highestExpectancyRecommendation: byExpectancy[0]
      ? {
          id: byExpectancy[0].id,
          symbol: byExpectancy[0].symbol,
          expectedExpectancy: byExpectancy[0].expectedExpectancy,
          expectedWinRate: byExpectancy[0].expectedWinRate,
        }
      : null,
  };
}
