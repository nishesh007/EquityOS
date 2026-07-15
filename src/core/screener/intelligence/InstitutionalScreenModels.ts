/**
 * Institutional AI Screener — portfolio / watchlist / opportunity models (Sprint 9D.R4).
 * Presentation cards, grades, badges, empty states. Never surface null / undefined / NaN.
 */

import { safeScreenNumber, safeScreenText } from "../ScreenModels";
import { gradeFromScore, type ScreenGrade } from "./ScreenPresentationModels";

export const INSTITUTIONAL_SCREEN_EMPTY = {
  noPortfolioHoldings: "No Portfolio Holdings",
  noWatchlist: "No Watchlist",
  noInstitutionalOpportunities: "No Institutional Opportunities",
  noHighPriorityResearch: "No High Priority Research",
  awaitingScan: "Awaiting Scan",
} as const;

export type InstitutionalScreenEmptyMessage =
  (typeof INSTITUTIONAL_SCREEN_EMPTY)[keyof typeof INSTITUTIONAL_SCREEN_EMPTY];

export type InstitutionalRecommendation =
  | "Institutional Buy"
  | "Strong Buy"
  | "Accumulation"
  | "Watch"
  | "Avoid";

export type ResearchPriorityBand =
  | "Research Immediately"
  | "High Priority"
  | "Normal"
  | "Monitor"
  | "Ignore";

export type InstitutionalScreenMode =
  | "portfolio"
  | "watchlist"
  | "opportunity"
  | "institutional";

export const PORTFOLIO_SCREEN_IDS = [
  "high_conviction_holdings",
  "weakening_holdings",
  "broken_trend",
  "target_achieved",
  "sl_risk",
  "position_upgrade",
  "position_downgrade",
  "validation_failure",
  "trust_deterioration",
  "quality_improvement",
  "sector_rotation_impact",
] as const;

export type PortfolioScreenId = (typeof PORTFOLIO_SCREEN_IDS)[number];

export const PORTFOLIO_SCREEN_LABELS: Record<PortfolioScreenId, string> = {
  high_conviction_holdings: "High Conviction Holdings",
  weakening_holdings: "Weakening Holdings",
  broken_trend: "Broken Trend",
  target_achieved: "Target Achieved",
  sl_risk: "SL Risk",
  position_upgrade: "Position Upgrade",
  position_downgrade: "Position Downgrade",
  validation_failure: "Validation Failure",
  trust_deterioration: "Trust Deterioration",
  quality_improvement: "Quality Improvement",
  sector_rotation_impact: "Sector Rotation Impact",
};

export const WATCHLIST_SCREEN_IDS = [
  "best_watchlist_opportunity",
  "entry_zone_reached",
  "breakout_candidate",
  "accumulation",
  "momentum_pickup",
  "volume_confirmation",
  "value_opportunity",
  "near_ath_breakout",
  "oversold_quality",
  "upcoming_catalyst",
] as const;

export type WatchlistScreenId = (typeof WATCHLIST_SCREEN_IDS)[number];

export const WATCHLIST_SCREEN_LABELS: Record<WatchlistScreenId, string> = {
  best_watchlist_opportunity: "Best Watchlist Opportunity",
  entry_zone_reached: "Entry Zone Reached",
  breakout_candidate: "Breakout Candidate",
  accumulation: "Accumulation",
  momentum_pickup: "Momentum Pickup",
  volume_confirmation: "Volume Confirmation",
  value_opportunity: "Value Opportunity",
  near_ath_breakout: "Near ATH Breakout",
  oversold_quality: "Oversold Quality",
  upcoming_catalyst: "Upcoming Catalyst",
};

/** Injected candidate — composition from Portfolio / Watchlist / Opportunity / Research. */
export interface InstitutionalCandidate {
  ticker: string;
  company?: string | null;
  sector?: string | null;
  industry?: string | null;
  price?: number | null;
  weightPercent?: number | null;
  tags?: string[] | null;
  domain?: "portfolio" | "watchlist" | "opportunity" | null;
  inPortfolio?: boolean | null;
  inWatchlist?: boolean | null;
  opportunityScore?: number | null;
  aiConviction?: number | null;
  trustScore?: number | null;
  validationScore?: number | null;
  confidence?: number | null;
  riskReward?: number | null;
  momentum?: number | null;
  fundamentalStrength?: number | null;
  liquidity?: number | null;
  sectorStrength?: number | null;
  marketTrend?: number | null;
  technical?: number | null;
  growth?: number | null;
  quality?: number | null;
  income?: number | null;
  value?: number | null;
  risk?: number | null;
  filtersPassed?: number | null;
  filtersTotal?: number | null;
  evidence?: string[] | null;
  reasonSummary?: string | null;
}

export interface InstitutionalScoreFactors {
  technical: number;
  fundamental: number;
  growth: number;
  momentum: number;
  quality: number;
  income: number;
  value: number;
  risk: number;
  validation: number;
  trust: number;
  aiConfidence: number;
  /** Overall Institutional Score 0–100 */
  overallInstitutionalScore: number;
}

export interface InstitutionalInsight {
  headline: string;
  drivers: string[];
  evidence: string[];
  suggestedAction: string;
  badges: string[];
  empty: boolean;
  emptyMessage: InstitutionalScreenEmptyMessage;
}

export interface InstitutionalResultCard {
  company: string;
  ticker: string;
  sector: string;
  grade: ScreenGrade;
  badges: string[];
  evidence: string[];
  drivers: string[];
  recommendation: InstitutionalRecommendation;
  priority: ResearchPriorityBand;
  confidence: number;
  institutionalScore: number;
  trust: number;
  validation: number;
  reasonSummary: string;
  matchedSignals: string[];
  rank: number;
  factors: InstitutionalScoreFactors;
  insight: InstitutionalInsight;
}

export interface InstitutionalScreenResult {
  mode: InstitutionalScreenMode;
  cards: InstitutionalResultCard[];
  totalMatches: number;
  empty: boolean;
  emptyMessage: InstitutionalScreenEmptyMessage;
  generatedAt: string;
}

export function recommendationFromScore(
  score: number
): InstitutionalRecommendation {
  const s = safeScreenNumber(score, 0);
  if (s >= 95) return "Institutional Buy";
  if (s >= 91) return "Strong Buy";
  if (s >= 84) return "Accumulation";
  if (s >= 77) return "Watch";
  return "Avoid";
}

export function emptyInstitutionalFactors(): InstitutionalScoreFactors {
  return {
    technical: 0,
    fundamental: 0,
    growth: 0,
    momentum: 0,
    quality: 0,
    income: 0,
    value: 0,
    risk: 0,
    validation: 0,
    trust: 0,
    aiConfidence: 0,
    overallInstitutionalScore: 0,
  };
}

export function emptyInstitutionalInsight(
  message: InstitutionalScreenEmptyMessage = INSTITUTIONAL_SCREEN_EMPTY.awaitingScan
): InstitutionalInsight {
  return {
    headline: message,
    drivers: [],
    evidence: [],
    suggestedAction: message,
    badges: [],
    empty: true,
    emptyMessage: message,
  };
}

export function emptyInstitutionalScreenResult(
  mode: InstitutionalScreenMode,
  message: InstitutionalScreenEmptyMessage = INSTITUTIONAL_SCREEN_EMPTY.awaitingScan
): InstitutionalScreenResult {
  return {
    mode,
    cards: [],
    totalMatches: 0,
    empty: true,
    emptyMessage: message,
    generatedAt: new Date().toISOString(),
  };
}

export function normalizeInstitutionalCard(
  input: {
    ticker: string;
    company?: string | null;
    sector?: string | null;
    grade?: ScreenGrade | null;
    badges?: string[] | null;
    evidence?: string[] | null;
    drivers?: string[] | null;
    recommendation?: InstitutionalRecommendation | null;
    priority?: ResearchPriorityBand | null;
    confidence?: number | null;
    institutionalScore?: number | null;
    trust?: number | null;
    validation?: number | null;
    reasonSummary?: string | null;
    matchedSignals?: string[] | null;
    rank?: number | null;
    factors?: InstitutionalScoreFactors | null;
    insight?: InstitutionalInsight | null;
  }
): InstitutionalResultCard {
  const factors = input.factors ?? emptyInstitutionalFactors();
  const score = safeScreenNumber(
    input.institutionalScore,
    factors.overallInstitutionalScore
  );
  return {
    company: safeScreenText(input.company, "—"),
    ticker: safeScreenText(input.ticker, "—").toUpperCase(),
    sector: safeScreenText(input.sector, "—"),
    grade: input.grade ?? gradeFromScore(score),
    badges: Array.isArray(input.badges)
      ? input.badges.map((b) => safeScreenText(b, "")).filter(Boolean)
      : [],
    evidence: Array.isArray(input.evidence)
      ? input.evidence.map((e) => safeScreenText(e, "")).filter(Boolean)
      : [],
    drivers: Array.isArray(input.drivers)
      ? input.drivers.map((d) => safeScreenText(d, "")).filter(Boolean)
      : [],
    recommendation:
      input.recommendation ?? recommendationFromScore(score),
    priority: input.priority ?? "Monitor",
    confidence: safeScreenNumber(input.confidence, factors.aiConfidence),
    institutionalScore: score,
    trust: safeScreenNumber(input.trust, factors.trust),
    validation: safeScreenNumber(input.validation, factors.validation),
    reasonSummary: safeScreenText(input.reasonSummary, "No reason available"),
    matchedSignals: Array.isArray(input.matchedSignals)
      ? input.matchedSignals.map((m) => safeScreenText(m, "")).filter(Boolean)
      : [],
    rank: Math.max(0, Math.floor(safeScreenNumber(input.rank, 0))),
    factors: {
      technical: safeScreenNumber(factors.technical, 0),
      fundamental: safeScreenNumber(factors.fundamental, 0),
      growth: safeScreenNumber(factors.growth, 0),
      momentum: safeScreenNumber(factors.momentum, 0),
      quality: safeScreenNumber(factors.quality, 0),
      income: safeScreenNumber(factors.income, 0),
      value: safeScreenNumber(factors.value, 0),
      risk: safeScreenNumber(factors.risk, 0),
      validation: safeScreenNumber(factors.validation, 0),
      trust: safeScreenNumber(factors.trust, 0),
      aiConfidence: safeScreenNumber(factors.aiConfidence, 0),
      overallInstitutionalScore: safeScreenNumber(
        factors.overallInstitutionalScore,
        score
      ),
    },
    insight: input.insight ?? emptyInstitutionalInsight(),
  };
}

export function hasTag(
  candidate: InstitutionalCandidate,
  ...needles: string[]
): boolean {
  const tags = new Set(
    (candidate.tags ?? []).map((t) => String(t).toLowerCase())
  );
  return needles.some((n) => tags.has(n.toLowerCase()));
}
