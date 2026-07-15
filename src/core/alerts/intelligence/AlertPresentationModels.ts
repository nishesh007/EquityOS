/**
 * Alert intelligence presentation models (Sprint 9C.R2).
 * Opportunity / Portfolio / Watchlist alert kinds and empty-safe views.
 */

import type { InstitutionalAlert } from "../AlertModels";
import { safeAlertText } from "../AlertModels";

export const INTELLIGENCE_ALERT_EMPTY = {
  noOpportunities: "No Opportunities",
  noPortfolio: "No Portfolio Alerts",
  noWatchlist: "No Watchlist Alerts",
  awaitingAnalysis: "Awaiting Analysis",
} as const;

export type IntelligenceEmptyMessage =
  (typeof INTELLIGENCE_ALERT_EMPTY)[keyof typeof INTELLIGENCE_ALERT_EMPTY];

/** Opportunity alert kinds */
export const OPPORTUNITY_ALERT_KINDS = [
  "new_buy_opportunity",
  "high_conviction_opportunity",
  "conviction_increased",
  "conviction_dropped",
  "target_achieved",
  "target_revised",
  "stop_loss_revised",
  "risk_increased",
  "risk_reduced",
  "momentum_breakout",
  "trend_reversal",
  "strong_relative_strength",
  "weak_relative_strength",
  "institutional_grade_improved",
  "institutional_grade_reduced",
] as const;

export type OpportunityAlertKind = (typeof OPPORTUNITY_ALERT_KINDS)[number];

/** Portfolio alert kinds */
export const PORTFOLIO_ALERT_KINDS = [
  "portfolio_risk_increased",
  "portfolio_risk_reduced",
  "position_size_too_large",
  "diversification_warning",
  "target_achieved",
  "stop_loss_triggered",
  "new_high_conviction_holding",
  "weak_holding",
  "ai_recommendation_changed",
  "trust_score_changed",
  "validation_failed",
  "validation_passed",
] as const;

export type PortfolioAlertKind = (typeof PORTFOLIO_ALERT_KINDS)[number];

/** Watchlist alert kinds */
export const WATCHLIST_ALERT_KINDS = [
  "watchlist_opportunity",
  "watchlist_breakout",
  "watchlist_breakdown",
  "near_buy_zone",
  "near_target",
  "high_volume",
  "high_conviction",
  "ai_score_improved",
  "validation_updated",
  "trust_updated",
] as const;

export type WatchlistAlertKind = (typeof WATCHLIST_ALERT_KINDS)[number];

export type IntelligenceAlertKind =
  | OpportunityAlertKind
  | PortfolioAlertKind
  | WatchlistAlertKind;

export const OPPORTUNITY_KIND_LABELS: Record<OpportunityAlertKind, string> = {
  new_buy_opportunity: "New Buy Opportunity",
  high_conviction_opportunity: "High Conviction Opportunity",
  conviction_increased: "Conviction Increased",
  conviction_dropped: "Conviction Dropped",
  target_achieved: "Target Achieved",
  target_revised: "Target Revised",
  stop_loss_revised: "Stop Loss Revised",
  risk_increased: "Risk Increased",
  risk_reduced: "Risk Reduced",
  momentum_breakout: "Momentum Breakout",
  trend_reversal: "Trend Reversal",
  strong_relative_strength: "Strong Relative Strength",
  weak_relative_strength: "Weak Relative Strength",
  institutional_grade_improved: "Institutional Grade Improved",
  institutional_grade_reduced: "Institutional Grade Reduced",
};

export const PORTFOLIO_KIND_LABELS: Record<PortfolioAlertKind, string> = {
  portfolio_risk_increased: "Portfolio Risk Increased",
  portfolio_risk_reduced: "Portfolio Risk Reduced",
  position_size_too_large: "Position Size Too Large",
  diversification_warning: "Diversification Warning",
  target_achieved: "Target Achieved",
  stop_loss_triggered: "Stop Loss Triggered",
  new_high_conviction_holding: "New High Conviction Holding",
  weak_holding: "Weak Holding",
  ai_recommendation_changed: "AI Recommendation Changed",
  trust_score_changed: "Trust Score Changed",
  validation_failed: "Validation Failed",
  validation_passed: "Validation Passed",
};

export const WATCHLIST_KIND_LABELS: Record<WatchlistAlertKind, string> = {
  watchlist_opportunity: "Watchlist Opportunity",
  watchlist_breakout: "Watchlist Breakout",
  watchlist_breakdown: "Watchlist Breakdown",
  near_buy_zone: "Near Buy Zone",
  near_target: "Near Target",
  high_volume: "High Volume",
  high_conviction: "High Conviction",
  ai_score_improved: "AI Score Improved",
  validation_updated: "Validation Updated",
  trust_updated: "Trust Updated",
};

export interface AlertPresentationCard {
  id: string;
  title: string;
  summary: string;
  reason: string;
  evidence: string[];
  confidence: string;
  priority: string;
  severity: string;
  category: string;
  sourceEngine: string;
  company: string;
  ticker: string;
  inPortfolio: boolean;
  inWatchlist: boolean;
  createdAt: string;
  kindLabel: string;
  ready: boolean;
  emptyMessage: IntelligenceEmptyMessage;
}

export interface IntelligenceAlertBatch {
  alerts: InstitutionalAlert[];
  cards: AlertPresentationCard[];
  total: number;
  created: number;
  deduplicated: number;
  grouped: number;
  empty: boolean;
  emptyMessage: IntelligenceEmptyMessage;
}

export function emptyIntelligenceBatch(
  message: IntelligenceEmptyMessage = INTELLIGENCE_ALERT_EMPTY.awaitingAnalysis
): IntelligenceAlertBatch {
  return {
    alerts: [],
    cards: [],
    total: 0,
    created: 0,
    deduplicated: 0,
    grouped: 0,
    empty: true,
    emptyMessage: message,
  };
}

export function toAlertPresentationCard(
  alert: InstitutionalAlert,
  kindLabel?: string
): AlertPresentationCard {
  const kind =
    kindLabel ??
    safeAlertText(alert.metadata.eventType, alert.category).replace(/_/g, " ");
  return {
    id: alert.id,
    title: safeAlertText(alert.title, "Alert"),
    summary: safeAlertText(alert.summary, alert.title),
    reason: safeAlertText(alert.reason, "Generated from alert intelligence"),
    evidence: alert.evidence.map((e) => safeAlertText(e, "")).filter(Boolean),
    confidence: safeAlertText(alert.confidence.label, "Unavailable"),
    priority: alert.priority,
    severity: alert.severity,
    category: alert.category,
    sourceEngine: alert.sourceEngine,
    company: safeAlertText(alert.company, alert.ticker || "Unknown Company"),
    ticker: safeAlertText(alert.ticker, ""),
    inPortfolio: alert.inPortfolio === true,
    inWatchlist: alert.inWatchlist === true,
    createdAt: alert.createdAt,
    kindLabel: capitalizeWords(kind),
    ready: true,
    emptyMessage: INTELLIGENCE_ALERT_EMPTY.awaitingAnalysis,
  };
}

function capitalizeWords(value: string): string {
  return value
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Snapshot of a research opportunity used for alert decisions (no engine rebuild). */
export interface OpportunitySnapshot {
  id: string;
  symbol: string;
  company: string;
  category: string;
  side: "Long" | "Short";
  aiConvictionScore: number;
  confidencePercent: number;
  entryZone: { low: number; high: number };
  stopLoss: number;
  target1: number;
  target2: number;
  riskReward: number;
  reason: string;
  momentum?: number | null;
  relativeStrength?: number | null;
  volumeRatio?: number | null;
  trendScore?: number | null;
  institutionalGrade?: number | null;
  currentPrice?: number | null;
  firstDetectedAt?: string | null;
  lastDetectedAt?: string | null;
  tradeStatus?: string | null;
}

export interface PortfolioHoldingSnapshot {
  symbol: string;
  name: string;
  weightPercent: number;
  quantity: number;
  currentPrice: number;
  changePercent: number;
  convictionScore?: number | null;
  recommendation?: string | null;
  qualityScore?: number | null;
  tradeStatus?: string | null;
  stopLoss?: number | null;
  target1?: number | null;
}

export interface PortfolioSnapshot {
  overallRisk: number;
  diversificationScore: number;
  healthScore: number;
  trustScore?: number | null;
  validationStatus?: string | null;
  aiRecommendationHash?: string | null;
  holdings: PortfolioHoldingSnapshot[];
}

export interface WatchlistItemSnapshot {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  volume?: number | null;
  convictionScore?: number | null;
  volumeRatio?: number | null;
  category?: string | null;
  entryLow?: number | null;
  entryHigh?: number | null;
  target1?: number | null;
  stopLoss?: number | null;
  side?: "Long" | "Short" | null;
  trustScore?: number | null;
  validationStatus?: string | null;
}

/** Prior-state record for delta detection. */
export interface IntelligencePriorState {
  opportunities: Record<string, OpportunitySnapshot>;
  portfolio: PortfolioSnapshot | null;
  watchlist: Record<string, WatchlistItemSnapshot>;
}
