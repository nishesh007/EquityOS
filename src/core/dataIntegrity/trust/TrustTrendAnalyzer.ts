/**
 * Trust Score trend analysis — 7/30/90-day windows, momentum, stability, deterioration.
 */

import type { TrustConfiguration } from "./TrustConfiguration";

/** Minimal history point for trend windows (avoids circular imports with TrustHistory). */
export interface TrustScoreTimePoint {
  timestamp: string;
  trustScore: number;
}

export interface TrustTrendSnapshot {
  currentScore: number;
  previousScore: number | null;
  trend7d: number | null;
  trend30d: number | null;
  trend90d: number | null;
  scoreMomentum: number;
  scoreStability: number;
  scoreVolatility: number;
  deteriorating: boolean;
}

export class TrustTrendAnalyzer {
  constructor(private readonly config: TrustConfiguration) {}

  analyze(
    currentScore: number,
    history: TrustScoreTimePoint[],
    now: Date = new Date()
  ): TrustTrendSnapshot {
    const previousScore =
      history.length > 0 ? history[history.length - 1]!.trustScore : null;

    const trend7d = this.windowDelta(
      currentScore,
      history,
      now,
      this.config.trendWindows.shortDays
    );
    const trend30d = this.windowDelta(
      currentScore,
      history,
      now,
      this.config.trendWindows.mediumDays
    );
    const trend90d = this.windowDelta(
      currentScore,
      history,
      now,
      this.config.trendWindows.longDays
    );

    const recentScores = this.scoresInWindow(
      history,
      now,
      this.config.trendWindows.mediumDays
    );
    recentScores.push(currentScore);

    const scoreVolatility = this.computeVolatility(recentScores);
    const scoreStability = Math.max(
      0,
      Math.min(100, 100 - scoreVolatility * this.config.trendVolatilityDivisor)
    );

    const scoreMomentum =
      previousScore === null
        ? 0
        : (currentScore - previousScore) * this.config.momentumScale;

    const deteriorating =
      (previousScore !== null &&
        previousScore - currentScore >= this.config.deteriorationDropThreshold) ||
      (trend7d !== null && trend7d <= -this.config.deteriorationDropThreshold) ||
      (trend30d !== null &&
        trend30d <= -this.config.deteriorationDropThreshold * 1.5);

    return {
      currentScore,
      previousScore,
      trend7d,
      trend30d,
      trend90d,
      scoreMomentum: round2(scoreMomentum),
      scoreStability: round2(scoreStability),
      scoreVolatility: round2(scoreVolatility),
      deteriorating,
    };
  }

  private windowDelta(
    currentScore: number,
    history: TrustScoreTimePoint[],
    now: Date,
    days: number
  ): number | null {
    const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;
    const inWindow = history.filter(
      (e) => new Date(e.timestamp).getTime() >= cutoff
    );
    if (inWindow.length === 0) return null;
    const oldest = inWindow[0]!.trustScore;
    return round2(currentScore - oldest);
  }

  private scoresInWindow(
    history: TrustScoreTimePoint[],
    now: Date,
    days: number
  ): number[] {
    const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;
    return history
      .filter((e) => new Date(e.timestamp).getTime() >= cutoff)
      .map((e) => e.trustScore);
  }

  private computeVolatility(scores: number[]): number {
    if (scores.length < 2) return 0;
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance =
      scores.reduce((acc, s) => acc + (s - mean) ** 2, 0) / scores.length;
    return Math.sqrt(variance);
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
