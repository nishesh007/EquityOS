/**
 * Institutional Intelligence Pack v1 — server-only barrel.
 * Additive layer over Ranking / Calibration / Outcomes / Paper Trading.
 */

export { enrichRankedRecommendations } from "@/lib/institutional-intelligence/enrich";
export { assessInstitutionalConfidence } from "@/lib/institutional-intelligence/confidence";
export { buildExplainability } from "@/lib/institutional-intelligence/explainability";
export {
  buildKellyPositionSizing,
  buildKellyPositionSizingReport,
  calculateKellyFraction,
} from "@/lib/institutional-intelligence/kelly";
export { buildPerformanceAnalytics } from "@/lib/institutional-intelligence/performance";
export { buildRecommendationReplay } from "@/lib/institutional-intelligence/replay";
export { buildRecommendationLeaderboard } from "@/lib/institutional-intelligence/leaderboard";
export { buildInstitutionalHealthReport } from "@/lib/institutional-intelligence/health";
export type {
  InstitutionalConfidenceBand,
  InstitutionalRiskLevel,
  ExplainabilityPayload,
  ConfidenceAssessment,
  IntelligenceFactor,
} from "@/lib/institutional-intelligence/types";
export type { KellyPositionSizingAdvice } from "@/lib/institutional-intelligence/kelly";
export type { RecommendationReplayBundle } from "@/lib/institutional-intelligence/replay";
