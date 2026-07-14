/**
 * Multi-window trend analysis for validation analytics.
 */

import type { AnalyticsConfiguration } from "./AnalyticsConfiguration";
import type { AnalyticsObservation } from "./AnalyticsRegistry";
import {
  average,
  classifyDirection,
  clampScore,
  linearSlope,
  stdDev,
  type TrendDirection,
} from "./AnalyticsCalculator";

export interface TrendWindowResult {
  window: string;
  sampleSize: number;
  averageTrust: number;
  averageIntegrity: number;
  failureRate: number;
  averageRuntime: number;
  delta: number | null;
  direction: TrendDirection;
  strength: number;
  stability: number;
}

export interface TrendAnalyticsReport {
  hourly: TrendWindowResult;
  daily: TrendWindowResult;
  weekly: TrendWindowResult;
  monthly: TrendWindowResult;
  quarterly: TrendWindowResult;
  yearly: TrendWindowResult;
  rollingShort: TrendWindowResult;
  rollingMedium: TrendWindowResult;
  rollingLong: TrendWindowResult;
  overallDirection: TrendDirection;
  overallStrength: number;
  overallStability: number;
  deteriorating: boolean;
}

export class AnalyticsTrendAnalyzer {
  constructor(private readonly config: AnalyticsConfiguration) {}

  analyze(
    observations: AnalyticsObservation[],
    now: Date = new Date()
  ): TrendAnalyticsReport {
    const w = this.config.trendWindows;
    const hourly = this.window(observations, now, w.hourlyHours * 3_600_000, "hourly");
    const daily = this.window(observations, now, w.dailyDays * 86_400_000, "daily");
    const weekly = this.window(observations, now, w.weeklyDays * 86_400_000, "weekly");
    const monthly = this.window(observations, now, w.monthlyDays * 86_400_000, "monthly");
    const quarterly = this.window(
      observations,
      now,
      w.quarterlyDays * 86_400_000,
      "quarterly"
    );
    const yearly = this.window(observations, now, w.yearlyDays * 86_400_000, "yearly");
    const rollingShort = this.window(
      observations,
      now,
      w.rollingShortDays * 86_400_000,
      "rollingShort"
    );
    const rollingMedium = this.window(
      observations,
      now,
      w.rollingMediumDays * 86_400_000,
      "rollingMedium"
    );
    const rollingLong = this.window(
      observations,
      now,
      w.rollingLongDays * 86_400_000,
      "rollingLong"
    );

    const overallDirection = weekly.direction;
    const overallStrength = weekly.strength;
    const overallStability = weekly.stability;
    const deteriorating =
      weekly.direction === "DOWN" &&
      weekly.delta !== null &&
      Math.abs(weekly.delta) >= this.config.collapseDropThreshold / 3;

    return {
      hourly,
      daily,
      weekly,
      monthly,
      quarterly,
      yearly,
      rollingShort,
      rollingMedium,
      rollingLong,
      overallDirection,
      overallStrength,
      overallStability,
      deteriorating,
    };
  }

  private window(
    observations: AnalyticsObservation[],
    now: Date,
    windowMs: number,
    name: string
  ): TrendWindowResult {
    const cutoff = now.getTime() - windowMs;
    const inWindow = observations.filter(
      (o) => new Date(o.timestamp).getTime() >= cutoff
    );
    const trust = inWindow
      .map((o) => o.trustScore)
      .filter((v): v is number => typeof v === "number");
    const integrity = inWindow
      .map((o) => o.integrityScore)
      .filter((v): v is number => typeof v === "number");
    const runtimes = inWindow
      .map((o) => o.averageRuntimeMs)
      .filter((v): v is number => typeof v === "number");
    const failed = inWindow.reduce((a, o) => a + (o.failed ?? 0), 0);
    const total = inWindow.reduce((a, o) => a + (o.validationCount ?? 0), 0);

    const series = trust.length > 0 ? trust : integrity;
    let delta: number | null = null;
    if (series.length >= 2) {
      delta = round2(series[series.length - 1]! - series[0]!);
    }
    const slope = linearSlope(
      series.map((y, i) => ({ x: i, y }))
    );
    const direction = classifyDirection(delta ?? slope * series.length);
    const strength = clampScore(Math.abs(delta ?? slope * 10) * 5);
    const stability = clampScore(100 - stdDev(series) * 10);

    return {
      window: name,
      sampleSize: inWindow.length,
      averageTrust: clampScore(average(trust)),
      averageIntegrity: clampScore(average(integrity)),
      failureRate: total === 0 ? 0 : clampScore((failed / total) * 100),
      averageRuntime: round2(average(runtimes)),
      delta,
      direction,
      strength,
      stability,
    };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
