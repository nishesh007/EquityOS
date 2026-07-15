/**
 * Institutional Post Earnings Analysis — public exports (Sprint 9B.R3).
 */

export type {
  BeatMissLabel,
  GuidanceChange,
  PostEarningsVerdict,
  PostEarningsBadgeId,
  MetricComparison,
  EstimateComparisonView,
  GuidanceSummaryView,
  MarketReactionView,
  PostEarningsVerdictView,
  PostEarningsAnalysis,
  PostEarningsCardView,
  PostEarningsResearchReport,
  PostEarningsDrawerView,
  ReactionQuoteInput,
} from "./PostEarningsModels";

export { POST_EARNINGS_EMPTY } from "./PostEarningsModels";

export {
  compareEstimateVsActual as computeEstimateComparison,
  deriveHeuristicEstimate,
} from "./EstimateComparisonEngine";

export {
  buildActualsComparison,
  type ActualsComparisonView,
} from "./EarningsComparisonEngine";

export { getGuidanceSummary as computeGuidanceSummary } from "./GuidanceAnalysisEngine";

export { getMarketReaction as computeMarketReaction } from "./EarningsReactionEngine";

export {
  getPostEarningsVerdict as computePostEarningsVerdict,
  buildPostEarningsReport,
} from "./PostEarningsSummary";

export {
  toPostEarningsCardView,
  toPostEarningsDrawerView,
  postBadgeVariant,
  buildPostEarningsBadges,
} from "./PostEarningsPresenter";

export {
  EarningsPostAnalysisEngine,
  getPostEarningsEngine,
  resetPostEarningsEngine,
  getPostEarningsAnalysis,
} from "./EarningsPostAnalysisEngine";

import type { EarningsCalendarEvent } from "@/src/core/earnings/calendar";
import { getPostEarningsAnalysis } from "./EarningsPostAnalysisEngine";
import type {
  EstimateComparisonView,
  GuidanceSummaryView,
  MarketReactionView,
  PostEarningsVerdictView,
} from "./PostEarningsModels";

/** Public API — compareEstimateVsActual() */
export function compareEstimateVsActual(
  eventOrTicker: EarningsCalendarEvent | string,
  resultDate?: string
): EstimateComparisonView {
  return getPostEarningsAnalysis(eventOrTicker, resultDate).comparison;
}

/** Public API — getGuidanceSummary() */
export function getGuidanceSummary(
  eventOrTicker: EarningsCalendarEvent | string,
  resultDate?: string
): GuidanceSummaryView {
  return getPostEarningsAnalysis(eventOrTicker, resultDate).guidance;
}

/** Public API — getMarketReaction() */
export function getMarketReaction(
  eventOrTicker: EarningsCalendarEvent | string,
  resultDate?: string
): MarketReactionView {
  return getPostEarningsAnalysis(eventOrTicker, resultDate).reaction;
}

/** Public API — getPostEarningsVerdict() */
export function getPostEarningsVerdict(
  eventOrTicker: EarningsCalendarEvent | string,
  resultDate?: string
): PostEarningsVerdictView {
  return getPostEarningsAnalysis(eventOrTicker, resultDate).verdict;
}
