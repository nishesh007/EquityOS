/**
 * Executive Screener Overview — summary cards from metrics + health (9D.R8).
 */

import {
  EXECUTIVE_SCREENER_EMPTY,
  type ExecutiveScreenerOverview,
  type ScreenerHealthView,
} from "./ExecutiveScreenerModels";
import type { ExecutiveScreenerMetricBundle } from "./ExecutiveMetrics";
import {
  presentConfidenceCard,
  presentCountCard,
  presentHealthCard,
} from "./executive-screener-presentation";

export class ExecutiveOverview {
  build(
    metrics: ExecutiveScreenerMetricBundle,
    health: ScreenerHealthView
  ): ExecutiveScreenerOverview {
    const empty = health.empty;

    const cards = [
      presentHealthCard("overall_health", "Overall Screener Health", health.overallHealthScore),
      presentHealthCard(
        "institutional_score",
        "Institutional Score",
        metrics.institutionalScore
      ),
      presentConfidenceCard(
        "universe_coverage",
        "Universe Coverage",
        metrics.universeCoverage
      ),
      presentConfidenceCard(
        "screen_success",
        "Screen Success Rate",
        metrics.screenSuccessRate
      ),
      presentConfidenceCard("average_trust", "Average Trust", metrics.averageTrust),
      presentConfidenceCard(
        "average_validation",
        "Average Validation",
        metrics.averageValidation
      ),
      presentConfidenceCard("ai_confidence", "AI Confidence", metrics.aiConfidence),
      presentCountCard(
        "high_conviction",
        "High Conviction Count",
        metrics.highConvictionCount
      ),
      presentCountCard(
        "portfolio_candidates",
        "Portfolio Candidates",
        metrics.portfolioCandidates
      ),
      presentCountCard(
        "watchlist_candidates",
        "Watchlist Candidates",
        metrics.watchlistCandidates
      ),
      presentCountCard(
        "opportunity_count",
        "Opportunity Count",
        metrics.opportunityCount
      ),
      presentCountCard("theme_count", "Theme Count", metrics.themeCount),
    ];

    return {
      overallHealth: health.overallHealthScore,
      institutionalScore: metrics.institutionalScore,
      universeCoverage: metrics.universeCoverage,
      screenSuccessRate: metrics.screenSuccessRate,
      averageTrust: metrics.averageTrust,
      averageValidation: metrics.averageValidation,
      aiConfidence: metrics.aiConfidence,
      highConvictionCount: metrics.highConvictionCount,
      portfolioCandidates: metrics.portfolioCandidates,
      watchlistCandidates: metrics.watchlistCandidates,
      opportunityCount: metrics.opportunityCount,
      themeCount: metrics.themeCount,
      cards,
      empty,
      emptyMessage: empty
        ? EXECUTIVE_SCREENER_EMPTY.awaitingScan
        : EXECUTIVE_SCREENER_EMPTY.noScreeningResults,
    };
  }
}
