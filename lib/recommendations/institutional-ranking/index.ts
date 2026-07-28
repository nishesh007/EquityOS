/**
 * Server-only Institutional Ranking Engine v2.
 * Do not re-export from the client-safe `@/lib/recommendations` barrel.
 */

export {
  INSTITUTIONAL_RANKING_WEIGHTS,
  INSTITUTIONAL_RANKING_FACTORS,
  scoreRecommendation,
  rankRecommendations,
  buildInstitutionalRankingReport,
  runInstitutionalRanking,
  selectInstitutionallyRankedStrategyDashboard,
} from "@/lib/recommendations/institutional-ranking/engine";
export {
  buildHistoricalExpectancyTables,
  mapRecommendationToPaperStrategy,
  convictionBucketKey,
  classifyRegimeText,
} from "@/lib/recommendations/institutional-ranking/expectancy";
export type {
  RankedRecommendation,
  RankingFactorContribution,
  RankingMarketContext,
  InstitutionalRankingReport,
  RankingScoreDistribution,
} from "@/lib/recommendations/institutional-ranking/types";
