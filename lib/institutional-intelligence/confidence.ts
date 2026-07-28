/**
 * MODULE 5 — Institutional Confidence Engine
 */

import "server-only";

import type { SharedRecommendation } from "@/lib/recommendations/shared-recommendation";
import type { HistoricalExpectancyTables } from "@/lib/recommendations/institutional-ranking/expectancy";
import { lookupExpectancy } from "@/lib/recommendations/institutional-ranking/expectancy";
import {
  clamp,
  recommendationKeys,
  round2,
} from "@/lib/institutional-intelligence/shared";
import type {
  ConfidenceAssessment,
  InstitutionalConfidenceBand,
  IntelligenceFactor,
} from "@/lib/institutional-intelligence/types";

function bandFromScore(score: number): InstitutionalConfidenceBand {
  if (score < 25) return "Very Low";
  if (score < 40) return "Low";
  if (score < 60) return "Medium";
  if (score < 78) return "High";
  return "Very High";
}

export function assessInstitutionalConfidence(
  rec: SharedRecommendation,
  tables: HistoricalExpectancyTables,
  options?: {
    breadthScore?: number | null;
    calibrationConfidence?: number | null;
  }
): ConfidenceAssessment {
  const keys = recommendationKeys(rec);
  const strategy = lookupExpectancy(tables, "byStrategy", keys.strategy);
  const sector = lookupExpectancy(tables, "bySector", keys.sector);
  const regime = lookupExpectancy(tables, "byRegime", keys.regime);
  const liquidity = lookupExpectancy(tables, "byLiquidity", keys.liquidity);
  const convictionHist = lookupExpectancy(
    tables,
    "byConviction",
    keys.conviction
  );

  const histSuccess = clamp(
    ((strategy.winRate || tables.overall.winRate) +
      (sector.winRate || tables.overall.winRate)) /
      2,
    0,
    100
  );
  const regimeScore = clamp(
    50 + (regime.expectancy || tables.overall.expectancy) * 5,
    0,
    100
  );
  const sectorQuality = clamp(
    rec.longTermRanking?.sectorStrength ??
      50 + (sector.expectancy || 0) * 4,
    0,
    100
  );
  const trendQuality = clamp(
    rec.frameworkScore * 0.5 + rec.opportunityScore * 0.5,
    0,
    100
  );
  const liquidityScore = clamp(
    50 + (liquidity.expectancy || tables.overall.expectancy) * 4,
    0,
    100
  );
  const expectancyScore = clamp(
    50 +
      ((strategy.expectancy +
        sector.expectancy +
        regime.expectancy +
        convictionHist.expectancy) /
        4 || tables.overall.expectancy) *
        5,
    0,
    100
  );
  const calibration = clamp(
    (options?.calibrationConfidence ?? 0.5) * 100,
    0,
    100
  );
  const breadth = clamp(options?.breadthScore ?? 50, 0, 100);

  const factors: IntelligenceFactor[] = [
    {
      label: "Historical success",
      score: round2(histSuccess),
      direction: histSuccess >= 55 ? "positive" : histSuccess < 45 ? "negative" : "neutral",
    },
    {
      label: "Market regime",
      score: round2(regimeScore),
      direction: regimeScore >= 55 ? "positive" : regimeScore < 45 ? "negative" : "neutral",
    },
    {
      label: "Sector quality",
      score: round2(sectorQuality),
      direction: sectorQuality >= 55 ? "positive" : sectorQuality < 45 ? "negative" : "neutral",
    },
    {
      label: "Trend quality",
      score: round2(trendQuality),
      direction: trendQuality >= 55 ? "positive" : trendQuality < 45 ? "negative" : "neutral",
    },
    {
      label: "Liquidity",
      score: round2(liquidityScore),
      direction: liquidityScore >= 55 ? "positive" : liquidityScore < 45 ? "negative" : "neutral",
    },
    {
      label: "Historical expectancy",
      score: round2(expectancyScore),
      direction: expectancyScore >= 55 ? "positive" : expectancyScore < 45 ? "negative" : "neutral",
    },
    {
      label: "Calibration confidence",
      score: round2(calibration),
      direction: calibration >= 55 ? "positive" : calibration < 40 ? "negative" : "neutral",
    },
    {
      label: "Market breadth",
      score: round2(breadth),
      direction: breadth >= 55 ? "positive" : breadth < 45 ? "negative" : "neutral",
    },
  ];

  const confidenceScore = round2(
    histSuccess * 0.18 +
      regimeScore * 0.14 +
      sectorQuality * 0.12 +
      trendQuality * 0.12 +
      liquidityScore * 0.1 +
      expectancyScore * 0.16 +
      calibration * 0.1 +
      breadth * 0.08
  );

  const band = bandFromScore(confidenceScore);
  const rationale = [
    `Confidence band ${band} (score ${confidenceScore})`,
    `Strategy win rate ${strategy.winRate || tables.overall.winRate}% · expectancy ${strategy.expectancy || tables.overall.expectancy}%`,
    `Regime ${keys.regime} · sector ${keys.sector} · liquidity ${keys.liquidity}`,
  ];

  return { band, confidenceScore, factors, rationale };
}
