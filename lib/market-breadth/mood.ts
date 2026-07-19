/**
 * Multi-factor Market Mood for Market Internals.
 * Never classifies from A/D (or breadth %) alone.
 */

import type { MarketMood } from "./types";

/** Minimum quote coverage before any mood is emitted. */
export const MIN_MOOD_COVERAGE = 0.35;

export type MoodFactorId =
  | "breadth"
  | "emaParticipation"
  | "highLowRatio"
  | "sectorBreadth"
  | "averageRsi";

export interface MoodFactorInput {
  /** Advances / quoted stocks, 0–100. */
  breadthPercent: number;
  quoteCoverage: number; // 0–1
  /** Mean of above-EMA % (20/50/200) when technicals available. */
  emaParticipationPercent: number | null;
  newHighs52w: number;
  newLows52w: number;
  /** Share of sectors with breadth ≥ 50%, 0–100. */
  sectorAdvanceSharePercent: number | null;
  averageRsi: number | null;
}

export interface MoodFactorScore {
  id: MoodFactorId;
  score: number; // −2 … +2
  label: string;
}

export interface MoodResult {
  mood: MarketMood;
  compositeScore: number | null;
  factors: MoodFactorScore[];
  gaugeValue: number; // 0–100 for visualization
}

function clampScore(value: number): number {
  return Math.max(-2, Math.min(2, value));
}

/** Map a 0–100 participation/breadth style metric onto −2…+2. */
export function scoreCenteredPercent(pct: number): number {
  if (pct >= 70) return 2;
  if (pct >= 55) return 1;
  if (pct > 45) return 0;
  if (pct > 30) return -1;
  return -2;
}

export function scoreHighLowRatio(highs: number, lows: number): number {
  if (highs === 0 && lows === 0) return 0;
  const ratio = highs / Math.max(1, lows);
  if (ratio >= 3) return 2;
  if (ratio >= 1.5) return 1;
  if (ratio >= 0.75) return 0;
  if (ratio >= 0.4) return -1;
  return -2;
}

export function scoreAverageRsi(rsi: number): number {
  if (rsi >= 65) return 2;
  if (rsi >= 55) return 1;
  if (rsi > 45) return 0;
  if (rsi > 35) return -1;
  return -2;
}

function moodFromComposite(score: number): MarketMood {
  if (score >= 1.25) return "Extremely Bullish";
  if (score >= 0.4) return "Bullish";
  if (score > -0.4) return "Neutral";
  if (score > -1.25) return "Bearish";
  return "Extremely Bearish";
}

/**
 * Classify market mood from multiple internals factors.
 * Requires adequate quote coverage and at least two scored factors
 * (breadth alone is never enough).
 */
export function classifyMarketMood(input: MoodFactorInput): MoodResult {
  if (input.quoteCoverage < MIN_MOOD_COVERAGE) {
    return {
      mood: "Insufficient Data",
      compositeScore: null,
      factors: [],
      gaugeValue: 50,
    };
  }

  const factors: MoodFactorScore[] = [
    {
      id: "breadth",
      score: clampScore(scoreCenteredPercent(input.breadthPercent)),
      label: "Breadth %",
    },
  ];

  if (input.emaParticipationPercent != null) {
    factors.push({
      id: "emaParticipation",
      score: clampScore(scoreCenteredPercent(input.emaParticipationPercent)),
      label: "EMA Participation",
    });
  }

  factors.push({
    id: "highLowRatio",
    score: clampScore(
      scoreHighLowRatio(input.newHighs52w, input.newLows52w)
    ),
    label: "High/Low Ratio",
  });

  if (input.sectorAdvanceSharePercent != null) {
    factors.push({
      id: "sectorBreadth",
      score: clampScore(scoreCenteredPercent(input.sectorAdvanceSharePercent)),
      label: "Sector Breadth",
    });
  }

  if (input.averageRsi != null) {
    factors.push({
      id: "averageRsi",
      score: clampScore(scoreAverageRsi(input.averageRsi)),
      label: "Average RSI",
    });
  }

  // Never mood from breadth alone.
  if (factors.length < 2) {
    return {
      mood: "Insufficient Data",
      compositeScore: null,
      factors,
      gaugeValue: 50,
    };
  }

  const composite =
    factors.reduce((sum, f) => sum + f.score, 0) / factors.length;
  const mood = moodFromComposite(composite);
  const gaugeValue = Math.round(((composite + 2) / 4) * 1000) / 10;

  return {
    mood,
    compositeScore: Math.round(composite * 100) / 100,
    factors,
    gaugeValue: Math.min(100, Math.max(0, gaugeValue)),
  };
}
