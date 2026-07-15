/**
 * Institutional impact / scorecard calculation — reuses R2–R4 signals (no new AI).
 */

import type { EarningsCalendarEvent } from "@/src/core/earnings/calendar";
import { buildEarningsCountdown } from "@/src/core/earnings/calendar";
import {
  buildEarningsResearchContext,
  computeHistoricalBeatRate,
  getEarningsPreview,
} from "@/src/core/earnings/intelligence";
import { hasTranscriptSeed } from "@/src/core/earnings/transcripts";
import type {
  AttentionLevel,
  EarningsScorecard,
  PriorityTier,
} from "./EarningsDashboardModels";

function clamp(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function marketCapScore(bucket: EarningsCalendarEvent["marketCapBucket"]): number {
  switch (bucket) {
    case "large":
      return 90;
    case "mid":
      return 70;
    case "small":
      return 50;
    case "micro":
      return 30;
    default:
      return 40;
  }
}

function liquidityScore(event: EarningsCalendarEvent): number {
  let score = 40;
  if (event.fno) score += 30;
  if (event.highImpact) score += 20;
  if (event.marketCapBucket === "large") score += 10;
  return clamp(score);
}

function volatilityScore(event: EarningsCalendarEvent): number {
  if (event.highImpact && event.fno) return 85;
  if (event.highImpact || event.fno) return 70;
  if (event.marketCapBucket === "small" || event.marketCapBucket === "micro") {
    return 65;
  }
  return 45;
}

function attentionFromScore(score: number): AttentionLevel {
  if (score >= 80) return "Critical";
  if (score >= 65) return "High";
  if (score >= 45) return "Medium";
  return "Low";
}

function priorityFromScore(score: number): PriorityTier {
  if (score >= 80) return "P1";
  if (score >= 65) return "P2";
  if (score >= 45) return "P3";
  return "P4";
}

export function buildEarningsScorecard(
  event: EarningsCalendarEvent,
  now = new Date()
): EarningsScorecard {
  const preview = getEarningsPreview(event);
  const context = buildEarningsResearchContext(event);
  const beat = computeHistoricalBeatRate(context);
  const countdown = buildEarningsCountdown(
    event.resultDate,
    event.resultTime,
    now
  );

  const aiConfidence = preview.confidence.available
    ? preview.confidence.score ?? 0
    : 0;
  const beatProbability =
    beat.rate != null
      ? beat.rate
      : preview.surprise.direction === "Expected Beat"
        ? 62
        : preview.surprise.direction === "Miss"
          ? 35
          : 50;

  const institutionalInterest =
    preview.risk.available && preview.risk.institutionalInterest === "High"
      ? 85
      : preview.risk.available && preview.risk.institutionalInterest === "Medium"
        ? 60
        : 35;

  const historicalSurprise = beat.rate ?? 50;
  const expectedVol = volatilityScore(event);
  const riskScore = clamp(
    expectedVol * 0.45 +
      (100 - aiConfidence) * 0.25 +
      (event.highImpact ? 15 : 0) +
      (preview.outlook === "Bearish" ? 10 : 0)
  );

  const mcap = marketCapScore(event.marketCapBucket);
  const liquidity = liquidityScore(event);
  const portfolioImpact = event.inPortfolio ? 90 : 0;
  const watchlistImpact = event.inWatchlist ? 75 : 0;

  const opportunityScore = clamp(
    aiConfidence * 0.35 +
      beatProbability * 0.3 +
      institutionalInterest * 0.15 +
      (preview.outlook === "Bullish" ? 15 : preview.outlook === "Bearish" ? 0 : 8) +
      (event.highConviction ? 10 : 0)
  );

  const institutionalScore = clamp(
    aiConfidence * 0.22 +
      beatProbability * 0.18 +
      institutionalInterest * 0.12 +
      historicalSurprise * 0.1 +
      (100 - riskScore) * 0.08 +
      mcap * 0.08 +
      liquidity * 0.07 +
      portfolioImpact * 0.08 +
      watchlistImpact * 0.07
  );

  return {
    institutionalScore,
    aiConfidence: clamp(aiConfidence),
    beatProbability: clamp(beatProbability),
    riskScore,
    opportunityScore,
    attentionLevel: attentionFromScore(institutionalScore),
    priority: priorityFromScore(institutionalScore),
    portfolioImpact,
    watchlistImpact,
    historicalBeatRate: clamp(historicalSurprise),
    expectedVolatilityScore: expectedVol,
    institutionalInterestScore: institutionalInterest,
    outlook: preview.outlook,
    transcriptAvailable: hasTranscriptSeed(event.ticker),
    resultsReleased: countdown.isReleased || countdown.isExpired,
    available: preview.confidence.available || preview.expectation.available,
  };
}
