/**
 * AI Event Intelligence models (Sprint 10D.4).
 * Deterministic, explainable decision-support contracts — no LLM.
 */

import type { MarketDirection } from "@/types/event";

export type Score0to100 = number;

export type RiskRating = "low" | "medium" | "high" | "very_high";

export type SectorImpactTone =
  | "strong_positive"
  | "positive"
  | "neutral"
  | "negative"
  | "strong_negative";

/** Canonical NSE sector set for the sector impact matrix. */
export type NseSector =
  | "Banking"
  | "IT"
  | "Auto"
  | "Pharma"
  | "FMCG"
  | "Capital Goods"
  | "Real Estate"
  | "Metals"
  | "Energy"
  | "Chemicals"
  | "Infrastructure"
  | "Telecom"
  | "Utilities"
  | "NBFC"
  | "Insurance";

export interface ScoreFactor {
  id: string;
  label: string;
  /** Signed contribution toward the composite score. */
  points: number;
  /** Max points this factor could contribute (for bar scaling). */
  maxPoints: number;
  rationale: string;
}

export interface ImpactAnalysis {
  score: Score0to100;
  factors: ScoreFactor[];
  formulaNote: string;
}

export interface ConfidenceBreakdown {
  score: Score0to100;
  factors: ScoreFactor[];
  formulaNote: string;
}

export interface MarketBiasAnalysis {
  bias: MarketDirection;
  confidence: Score0to100;
  rationale: string;
  factors: ScoreFactor[];
}

export interface SectorImpactRow {
  sector: NseSector;
  tone: SectorImpactTone;
  note: string;
}

export interface SectorImpactAnalysis {
  rows: SectorImpactRow[];
  primaryBeneficiaries: string[];
  primaryRisks: string[];
}

export interface PreparationChecklistItem {
  id: string;
  label: string;
  category: string;
  priority: "critical" | "high" | "medium";
}

export interface PreparationChecklist {
  title: string;
  items: PreparationChecklistItem[];
}

export interface HistoricalInsightMetric {
  label: string;
  value: string;
  interpretation: string;
}

export interface HistoricalInsight {
  seriesLabel: string;
  summary: string;
  metrics: HistoricalInsightMetric[];
  sampleSize: number;
}

export interface ExecutiveSummary {
  overview: string;
  whyItMatters: string;
  keyThingsToWatch: string[];
  primaryBeneficiaries: string[];
  primaryRisks: string[];
  narrative: string;
}

export interface RiskAnalysis {
  rating: RiskRating;
  score: Score0to100;
  rationale: string;
  factors: ScoreFactor[];
}

export interface EventVolatilityView {
  level: "low" | "medium" | "high";
  rationale: string;
}

/** Full intelligence payload for one event. */
export interface EventIntelligence {
  eventId: string;
  generatedAt: string;
  engineVersion: "10D.4";
  executiveSummary: ExecutiveSummary;
  impact: ImpactAnalysis;
  confidence: ConfidenceBreakdown;
  risk: RiskAnalysis;
  marketBias: MarketBiasAnalysis;
  expectedVolatility: EventVolatilityView;
  sectorMatrix: SectorImpactAnalysis;
  affectedSectors: string[];
  affectedStocks: string[];
  preparationChecklist: PreparationChecklist;
  historicalInsight: HistoricalInsight | null;
  importanceScore: Score0to100;
}

export const SECTOR_IMPACT_TONE_LABELS: Readonly<
  Record<SectorImpactTone, string>
> = Object.freeze({
  strong_positive: "Strong Positive",
  positive: "Positive",
  neutral: "Neutral",
  negative: "Negative",
  strong_negative: "Strong Negative",
});

export const RISK_RATING_LABELS: Readonly<Record<RiskRating, string>> =
  Object.freeze({
    low: "Low",
    medium: "Medium",
    high: "High",
    very_high: "Very High",
  });

export const NSE_SECTORS: readonly NseSector[] = Object.freeze([
  "Banking",
  "IT",
  "Auto",
  "Pharma",
  "FMCG",
  "Capital Goods",
  "Real Estate",
  "Metals",
  "Energy",
  "Chemicals",
  "Infrastructure",
  "Telecom",
  "Utilities",
  "NBFC",
  "Insurance",
]);
