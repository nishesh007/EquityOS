/**
 * Alert decision-support models (Sprint 9C.R6).
 * AI prioritization, explainability, and recommendation presentation.
 */

import { safeAlertText } from "../AlertModels";

export const DECISION_SUPPORT_EMPTY = {
  noRecommendation: "No AI Recommendation",
  noEvidence: "No Supporting Evidence",
  noHistoricalMatch: "No Historical Match",
  conflictUnavailable: "Conflict Analysis Unavailable",
  awaitingAnalysis: "Awaiting Analysis",
} as const;

export type DecisionSupportEmptyMessage =
  (typeof DECISION_SUPPORT_EMPTY)[keyof typeof DECISION_SUPPORT_EMPTY];

export type AlertRecommendationAction =
  | "Immediate Action"
  | "Monitor"
  | "Wait"
  | "Reduce Position"
  | "Increase Position"
  | "Research Required"
  | "Ignore"
  | "Archive";

export type AlertDecisionBadge =
  | "Critical"
  | "Highest Priority"
  | "Portfolio"
  | "Watchlist"
  | "AI Recommended"
  | "High Conviction"
  | "High Risk"
  | "Conflict"
  | "Historical Match";

export interface AlertPriorityFactorBreakdown {
  confidence: number;
  portfolioExposure: number;
  watchlistRelevance: number;
  marketCap: number;
  earningsProximity: number;
  risk: number;
  volatility: number;
  technicalStrength: number;
  fundamentalStrength: number;
  sectorImportance: number;
  newsImpact: number;
  corporateActionSeverity: number;
  marketRegime: number;
  trustScore: number;
  validationScore: number;
}

export interface AlertPriorityResult {
  score: number;
  band: "Critical" | "High" | "Medium" | "Low" | "Informational";
  factors: AlertPriorityFactorBreakdown;
  label: string;
  empty: boolean;
  emptyMessage: DecisionSupportEmptyMessage;
}

export interface AlertImpactResult {
  portfolioImpact: string;
  capitalRisk: string;
  opportunitySize: string;
  sectorImpact: string;
  marketImpact: string;
  expectedDuration: string;
  urgency: string;
  reactionWindow: string;
  score: number;
  empty: boolean;
  emptyMessage: DecisionSupportEmptyMessage;
}

export interface AlertRecommendationResult {
  action: AlertRecommendationAction;
  reasoning: string;
  alternateActions: AlertRecommendationAction[];
  badges: AlertDecisionBadge[];
  empty: boolean;
  emptyMessage: DecisionSupportEmptyMessage;
}

export interface AlertExplainabilityResult {
  whyTriggered: string;
  supportingEvidence: string[];
  ruleContribution: string[];
  confidenceContribution: string;
  positiveDrivers: string[];
  negativeDrivers: string[];
  historicalSimilarity: string;
  relatedAlerts: string[];
  decisionTrace: string[];
  empty: boolean;
  emptyMessage: DecisionSupportEmptyMessage;
}

export interface AlertEvidenceItem {
  source: string;
  label: string;
  detail: string;
}

export interface AlertEvidenceResult {
  indicators: AlertEvidenceItem[];
  fundamentals: AlertEvidenceItem[];
  earnings: AlertEvidenceItem[];
  news: AlertEvidenceItem[];
  corporateActions: AlertEvidenceItem[];
  technicalSignals: AlertEvidenceItem[];
  sectorSignals: AlertEvidenceItem[];
  validationEvidence: AlertEvidenceItem[];
  trustEvidence: AlertEvidenceItem[];
  empty: boolean;
  emptyMessage: DecisionSupportEmptyMessage;
}

export interface AlertConflictResult {
  hasConflict: boolean;
  conflictReason: string;
  confidencePenalty: number;
  dominantSignal: string;
  conflictingKinds: string[];
  empty: boolean;
  emptyMessage: DecisionSupportEmptyMessage;
}

export interface AlertSimilarityMatch {
  alertId: string;
  kind: string;
  ticker: string;
  previousOccurrence: string;
  outcome: string;
  successRate: string;
  averageMove: string;
  averageDuration: string;
}

export interface AlertSimilarityResult {
  matches: AlertSimilarityMatch[];
  empty: boolean;
  emptyMessage: DecisionSupportEmptyMessage;
}

export interface AlertTimelineEvent {
  label: string;
  at: string;
  detail: string;
}

export interface AlertTimelineResult {
  events: AlertTimelineEvent[];
  empty: boolean;
  emptyMessage: DecisionSupportEmptyMessage;
}

export interface AlertConfidenceBreakdownResult {
  overall: number;
  label: string;
  contributions: Array<{ factor: string; weight: number; score: number }>;
  empty: boolean;
  emptyMessage: DecisionSupportEmptyMessage;
}

/** Full AI decision-support panel for Alert Center drawer. */
export interface AlertDecisionSupportPanel {
  priority: AlertPriorityResult;
  impact: AlertImpactResult;
  recommendation: AlertRecommendationResult;
  explainability: AlertExplainabilityResult;
  evidence: AlertEvidenceResult;
  conflict: AlertConflictResult;
  similarity: AlertSimilarityResult;
  timeline: AlertTimelineResult;
  confidenceBreakdown: AlertConfidenceBreakdownResult;
  badges: AlertDecisionBadge[];
  empty: boolean;
  emptyMessage: DecisionSupportEmptyMessage;
}

export function safeScore(value: number | null | undefined, fallback = 0): number {
  if (value == null || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(100, Math.round(value * 100) / 100));
}

export function safeLabel(
  value: string | null | undefined,
  fallback: string
): string {
  return safeAlertText(value, fallback);
}

export function emptyEvidenceResult(): AlertEvidenceResult {
  return {
    indicators: [],
    fundamentals: [],
    earnings: [],
    news: [],
    corporateActions: [],
    technicalSignals: [],
    sectorSignals: [],
    validationEvidence: [],
    trustEvidence: [],
    empty: true,
    emptyMessage: DECISION_SUPPORT_EMPTY.noEvidence,
  };
}
