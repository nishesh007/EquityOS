/**
 * Institutional Post Earnings Analysis — domain models (Sprint 9B.R3).
 */

import type { EarningsCalendarEvent } from "@/src/core/earnings/calendar";
import type { EarningsQuarterPoint } from "@/src/core/earnings/intelligence";

export type BeatMissLabel =
  | "Strong Beat"
  | "Beat"
  | "Inline"
  | "Miss"
  | "Major Miss";

export type GuidanceChange = "Upgrade" | "Downgrade" | "No Change";

export type PostEarningsVerdict =
  | "Very Positive"
  | "Positive"
  | "Neutral"
  | "Negative"
  | "Very Negative";

export type PostEarningsBadgeId =
  | "Strong Beat"
  | "Beat"
  | "Inline"
  | "Miss"
  | "Major Miss"
  | "Guidance Upgrade"
  | "Guidance Cut"
  | "Margin Expansion"
  | "Margin Compression";

export const POST_EARNINGS_EMPTY = {
  awaitingResults: "Awaiting Results",
  resultsNotPublished: "Results Not Published",
  guidanceNotAvailable: "Guidance Not Available",
  commentaryPending: "Management Commentary Pending",
} as const;

export interface MetricComparison {
  label: string;
  actual: string;
  estimate: string;
  beatPercent: string;
  outcome: BeatMissLabel;
  available: boolean;
}

export interface EstimateComparisonView {
  revenue: MetricComparison;
  eps: MetricComparison;
  ebitda: MetricComparison;
  pat: MetricComparison;
  operatingMargin: MetricComparison;
  margin: MetricComparison;
  overallOutcome: BeatMissLabel;
  available: boolean;
  emptyMessage: string;
}

export interface GuidanceSummaryView {
  previous: string;
  current: string;
  change: GuidanceChange;
  available: boolean;
  emptyMessage: string;
  commentary: string;
}

export interface MarketReactionView {
  gapLabel: string;
  gapPercent: string;
  intradayReaction: string;
  volumeSpike: string;
  deliveryPercent: string;
  institutionalFlow: "Institutional Buying" | "Institutional Selling" | "Mixed";
  available: boolean;
  emptyMessage: string;
}

export interface PostEarningsVerdictView {
  verdict: PostEarningsVerdict;
  confidence: string;
  available: boolean;
  emptyMessage: string;
}

export interface PostEarningsAnalysis {
  ticker: string;
  resultDate: string;
  released: boolean;
  comparison: EstimateComparisonView;
  guidance: GuidanceSummaryView;
  reaction: MarketReactionView;
  verdict: PostEarningsVerdictView;
  badges: PostEarningsBadgeId[];
  revenueTrend: EarningsQuarterPoint[];
  epsTrend: EarningsQuarterPoint[];
  marginTrend: EarningsQuarterPoint[];
  surpriseTrend: Array<{ label: string; result: string }>;
}

export interface PostEarningsCardView {
  verdict: string;
  confidence: string;
  revenueBeat: string;
  epsBeat: string;
  guidance: string;
  gapReaction: string;
  badges: PostEarningsBadgeId[];
  ready: boolean;
  emptyMessage: string;
}

export interface PostEarningsResearchReport {
  executiveSummary: string;
  whatHappened: string;
  biggestPositives: string[];
  biggestNegatives: string[];
  estimateComparison: string;
  guidanceAnalysis: string;
  marginAnalysis: string;
  cashFlowHighlights: string;
  managementCommentary: string;
  aiVerdict: string;
  confidence: string;
  expectedMediumTermImpact: string;
  revenueTrend: EarningsQuarterPoint[];
  epsTrend: EarningsQuarterPoint[];
  marginTrend: EarningsQuarterPoint[];
  surpriseTrend: Array<{ label: string; result: string }>;
  empty: boolean;
  emptyMessage: string;
}

export interface PostEarningsDrawerView {
  title: string;
  subtitle: string;
  card: PostEarningsCardView;
  report: PostEarningsResearchReport;
  analysis: PostEarningsAnalysis;
  event: EarningsCalendarEvent;
}

export interface ReactionQuoteInput {
  open: number | null;
  previousClose: number | null;
  price: number | null;
  changePercent: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  deliveryPercent: number | null;
}
