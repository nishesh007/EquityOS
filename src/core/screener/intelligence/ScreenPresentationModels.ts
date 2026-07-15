/**
 * Institutional AI Screener — intelligence presentation models (Sprint 9D.R2).
 * Result cards, grades, and empty-safe views. Never surface null / undefined / NaN.
 */

import {
  safeScreenNumber,
  safeScreenText,
} from "../ScreenModels";

export const SCREEN_INTELLIGENCE_EMPTY = {
  noTechnicalMatches: "No Technical Matches",
  noFundamentalMatches: "No Fundamental Matches",
  noAIMatches: "No AI Matches",
  awaitingScreening: "Awaiting Screening",
} as const;

export type ScreenIntelligenceEmptyMessage =
  (typeof SCREEN_INTELLIGENCE_EMPTY)[keyof typeof SCREEN_INTELLIGENCE_EMPTY];

export const SCREEN_GRADES = ["A+", "A", "B+", "B", "C", "D", "F"] as const;
export type ScreenGrade = (typeof SCREEN_GRADES)[number];

export type ScreenRankingMode =
  | "Overall"
  | "Technical"
  | "Fundamental"
  | "Momentum"
  | "Growth"
  | "Value"
  | "Quality"
  | "Income"
  | "Turnaround";

export const SCREEN_RANKING_MODES: ScreenRankingMode[] = [
  "Overall",
  "Technical",
  "Fundamental",
  "Momentum",
  "Growth",
  "Value",
  "Quality",
  "Income",
  "Turnaround",
];

export interface ScreenScoreFactors {
  opportunityScore: number;
  validationScore: number;
  trustScore: number;
  aiConfidence: number;
  fundamentalStrength: number;
  technicalStrength: number;
  momentumStrength: number;
  sectorStrength: number;
  marketStrength: number;
  /** Final AI Screener Score 0–100 */
  finalAiScreenerScore: number;
}

export interface ScreenExplainability {
  whyMatched: string;
  matchedRules: string[];
  failedRules: string[];
  aiReasoning: string;
  positiveFactors: string[];
  negativeFactors: string[];
  confidenceBreakdown: string;
  supportingEvidence: string[];
  empty: boolean;
  emptyMessage: ScreenIntelligenceEmptyMessage;
}

export interface ScreenResultCard {
  company: string;
  ticker: string;
  sector: string;
  industry: string;
  price: number;
  aiScore: number;
  validation: number;
  trust: number;
  confidence: number;
  technicalGrade: ScreenGrade;
  fundamentalGrade: ScreenGrade;
  reasonSummary: string;
  matchedFilters: string[];
  rank: number;
  factors: ScreenScoreFactors;
  explainability: ScreenExplainability;
}

export interface IntelligenceScreenResult {
  mode: "technical" | "fundamental" | "multi-factor";
  cards: ScreenResultCard[];
  totalMatches: number;
  empty: boolean;
  emptyMessage: ScreenIntelligenceEmptyMessage;
  rankingMode: ScreenRankingMode;
  generatedAt: string;
}

export function gradeFromScore(score: number | null | undefined): ScreenGrade {
  const s = safeScreenNumber(score, 0);
  if (s >= 90) return "A+";
  if (s >= 80) return "A";
  if (s >= 70) return "B+";
  if (s >= 60) return "B";
  if (s >= 45) return "C";
  if (s >= 30) return "D";
  return "F";
}

export function emptyScoreFactors(): ScreenScoreFactors {
  return {
    opportunityScore: 0,
    validationScore: 0,
    trustScore: 0,
    aiConfidence: 0,
    fundamentalStrength: 0,
    technicalStrength: 0,
    momentumStrength: 0,
    sectorStrength: 0,
    marketStrength: 0,
    finalAiScreenerScore: 0,
  };
}

export function emptyExplainability(
  message: ScreenIntelligenceEmptyMessage = SCREEN_INTELLIGENCE_EMPTY.awaitingScreening
): ScreenExplainability {
  return {
    whyMatched: message,
    matchedRules: [],
    failedRules: [],
    aiReasoning: message,
    positiveFactors: [],
    negativeFactors: [],
    confidenceBreakdown: "Awaiting Screening",
    supportingEvidence: [],
    empty: true,
    emptyMessage: message,
  };
}

export function emptyIntelligenceResult(
  mode: IntelligenceScreenResult["mode"],
  message: ScreenIntelligenceEmptyMessage = SCREEN_INTELLIGENCE_EMPTY.awaitingScreening,
  rankingMode: ScreenRankingMode = "Overall"
): IntelligenceScreenResult {
  return {
    mode,
    cards: [],
    totalMatches: 0,
    empty: true,
    emptyMessage: message,
    rankingMode,
    generatedAt: new Date().toISOString(),
  };
}

export function normalizeResultCard(
  input: {
    ticker: string;
    company?: string | null;
    sector?: string | null;
    industry?: string | null;
    price?: number | null;
    aiScore?: number | null;
    validation?: number | null;
    trust?: number | null;
    confidence?: number | null;
    technicalGrade?: ScreenGrade | null;
    fundamentalGrade?: ScreenGrade | null;
    reasonSummary?: string | null;
    matchedFilters?: string[] | null;
    rank?: number | null;
    factors?: ScreenScoreFactors | null;
    explainability?: ScreenExplainability | null;
  }
): ScreenResultCard {
  const factors = input.factors ?? emptyScoreFactors();
  return {
    company: safeScreenText(input.company, "—"),
    ticker: safeScreenText(input.ticker, "—").toUpperCase(),
    sector: safeScreenText(input.sector, "—"),
    industry: safeScreenText(input.industry, "—"),
    price: safeScreenNumber(input.price, 0),
    aiScore: safeScreenNumber(input.aiScore, factors.finalAiScreenerScore),
    validation: safeScreenNumber(input.validation, factors.validationScore),
    trust: safeScreenNumber(input.trust, factors.trustScore),
    confidence: safeScreenNumber(input.confidence, factors.aiConfidence),
    technicalGrade: input.technicalGrade ?? gradeFromScore(factors.technicalStrength),
    fundamentalGrade:
      input.fundamentalGrade ?? gradeFromScore(factors.fundamentalStrength),
    reasonSummary: safeScreenText(input.reasonSummary, "No reason available"),
    matchedFilters: Array.isArray(input.matchedFilters)
      ? input.matchedFilters.map((f) => safeScreenText(f, "")).filter(Boolean)
      : [],
    rank: Math.max(0, Math.floor(safeScreenNumber(input.rank, 0))),
    factors: {
      opportunityScore: safeScreenNumber(factors.opportunityScore, 0),
      validationScore: safeScreenNumber(factors.validationScore, 0),
      trustScore: safeScreenNumber(factors.trustScore, 0),
      aiConfidence: safeScreenNumber(factors.aiConfidence, 0),
      fundamentalStrength: safeScreenNumber(factors.fundamentalStrength, 0),
      technicalStrength: safeScreenNumber(factors.technicalStrength, 0),
      momentumStrength: safeScreenNumber(factors.momentumStrength, 0),
      sectorStrength: safeScreenNumber(factors.sectorStrength, 0),
      marketStrength: safeScreenNumber(factors.marketStrength, 0),
      finalAiScreenerScore: safeScreenNumber(factors.finalAiScreenerScore, 0),
    },
    explainability: input.explainability ?? emptyExplainability(),
  };
}
