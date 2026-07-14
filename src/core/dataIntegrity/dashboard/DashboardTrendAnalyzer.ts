/**
 * Validation quality trend analysis across configured time windows.
 */

import type { DashboardConfiguration } from "./DashboardConfiguration";
import { clampScore } from "./DashboardSummary";

export interface DashboardTrendPoint {
  timestamp: string;
  healthScore: number;
  averageIntegrityScore: number;
  averageTrustScore: number;
  totalValidations: number;
  failedValidations: number;
}

export type TrendDirection = "UP" | "DOWN" | "FLAT";

export interface DashboardTrendAnalysis {
  today: number | null;
  yesterday: number | null;
  trend7d: number | null;
  trend30d: number | null;
  trend90d: number | null;
  trendDirection: TrendDirection;
  trendStrength: number;
  trendStability: number;
  deteriorating: boolean;
  currentScore: number;
  previousScore: number | null;
}

export class DashboardTrendAnalyzer {
  private readonly history: DashboardTrendPoint[] = [];

  constructor(private readonly config: DashboardConfiguration) {}

  record(point: DashboardTrendPoint): void {
    this.history.push(point);
    const maxPoints = Math.max(
      this.config.trendWindows.longDays * 4,
      100
    );
    if (this.history.length > maxPoints) {
      this.history.splice(0, this.history.length - maxPoints);
    }
  }

  getHistory(): DashboardTrendPoint[] {
    return [...this.history];
  }

  clear(): void {
    this.history.length = 0;
  }

  analyze(
    current: DashboardTrendPoint,
    now: Date = new Date()
  ): DashboardTrendAnalysis {
    const prior = this.history.filter(
      (p) => p.timestamp !== current.timestamp
    );
    const previousScore =
      prior.length > 0 ? prior[prior.length - 1]!.healthScore : null;

    const today = this.windowAverage(
      [...prior, current],
      now,
      this.config.trendWindows.todayHours * 60 * 60 * 1000
    );
    const yesterdayWindowMs =
      this.config.trendWindows.yesterdayHours * 60 * 60 * 1000;
    const yesterday = this.windowAverageExclusive(
      prior,
      now,
      this.config.trendWindows.todayHours * 60 * 60 * 1000,
      yesterdayWindowMs
    );

    const trend7d = this.windowDelta(
      current.healthScore,
      prior,
      now,
      this.config.trendWindows.shortDays
    );
    const trend30d = this.windowDelta(
      current.healthScore,
      prior,
      now,
      this.config.trendWindows.mediumDays
    );
    const trend90d = this.windowDelta(
      current.healthScore,
      prior,
      now,
      this.config.trendWindows.longDays
    );

    const recent = this.scoresInWindow(
      [...prior, current],
      now,
      this.config.trendWindows.mediumDays
    );
    const volatility = this.computeVolatility(recent);
    const trendStability = clampScore(100 - volatility * 10);

    const delta =
      previousScore === null ? 0 : current.healthScore - previousScore;
    let trendDirection: TrendDirection = "FLAT";
    if (delta > 0.5) trendDirection = "UP";
    else if (delta < -0.5) trendDirection = "DOWN";

    const trendStrength = clampScore(Math.abs(delta) * 5);

    const deteriorating =
      (previousScore !== null &&
        previousScore - current.healthScore >=
          this.config.deteriorationDropThreshold) ||
      (trend7d !== null &&
        trend7d <= -this.config.deteriorationDropThreshold);

    return {
      today,
      yesterday,
      trend7d,
      trend30d,
      trend90d,
      trendDirection,
      trendStrength,
      trendStability,
      deteriorating,
      currentScore: current.healthScore,
      previousScore,
    };
  }

  private windowDelta(
    current: number,
    history: DashboardTrendPoint[],
    now: Date,
    days: number
  ): number | null {
    const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;
    const inWindow = history.filter(
      (p) => new Date(p.timestamp).getTime() >= cutoff
    );
    if (inWindow.length === 0) return null;
    return round2(current - inWindow[0]!.healthScore);
  }

  private scoresInWindow(
    history: DashboardTrendPoint[],
    now: Date,
    days: number
  ): number[] {
    const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;
    return history
      .filter((p) => new Date(p.timestamp).getTime() >= cutoff)
      .map((p) => p.healthScore);
  }

  private windowAverage(
    history: DashboardTrendPoint[],
    now: Date,
    windowMs: number
  ): number | null {
    const cutoff = now.getTime() - windowMs;
    const pts = history.filter(
      (p) => new Date(p.timestamp).getTime() >= cutoff
    );
    if (pts.length === 0) return null;
    return round2(
      pts.reduce((a, p) => a + p.healthScore, 0) / pts.length
    );
  }

  private windowAverageExclusive(
    history: DashboardTrendPoint[],
    now: Date,
    innerMs: number,
    outerMs: number
  ): number | null {
    const outerCutoff = now.getTime() - outerMs;
    const innerCutoff = now.getTime() - innerMs;
    const pts = history.filter((p) => {
      const t = new Date(p.timestamp).getTime();
      return t >= outerCutoff && t < innerCutoff;
    });
    if (pts.length === 0) return null;
    return round2(
      pts.reduce((a, p) => a + p.healthScore, 0) / pts.length
    );
  }

  private computeVolatility(scores: number[]): number {
    if (scores.length < 2) return 0;
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance =
      scores.reduce((acc, s) => acc + (s - mean) ** 2, 0) / scores.length;
    return Math.sqrt(variance);
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
