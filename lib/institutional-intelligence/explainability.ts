/**
 * MODULE 6 — Explainable AI Upgrade
 */

import "server-only";

import type { SharedRecommendation } from "@/lib/recommendations/shared-recommendation";
import type { HistoricalExpectancyTables } from "@/lib/recommendations/institutional-ranking/expectancy";
import { lookupExpectancy } from "@/lib/recommendations/institutional-ranking/expectancy";
import {
  clamp,
  computeCohortStats,
  loadClosedPaperTrades,
  recommendationKeys,
  round2,
} from "@/lib/institutional-intelligence/shared";
import { assessInstitutionalConfidence } from "@/lib/institutional-intelligence/confidence";
import type {
  ExplainabilityPayload,
  IntelligenceFactor,
} from "@/lib/institutional-intelligence/types";
import { mapPaperExitReason } from "@/lib/paper-trading/outcomes/lifecycle";

export function buildExplainability(
  rec: SharedRecommendation,
  tables: HistoricalExpectancyTables,
  options?: {
    breadthScore?: number | null;
    calibrationConfidence?: number | null;
  }
): ExplainabilityPayload {
  const confidence = assessInstitutionalConfidence(rec, tables, options);
  const positives = confidence.factors
    .filter((f) => f.direction === "positive")
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  const negatives = confidence.factors
    .filter((f) => f.direction === "negative")
    .sort((a, b) => a.score - b.score)
    .slice(0, 5);

  // Pad with neutrals if needed so consumers always get lists.
  const pad = (list: IntelligenceFactor[], from: IntelligenceFactor[]) => {
    const out = [...list];
    for (const f of from) {
      if (out.length >= 3) break;
      if (!out.some((x) => x.label === f.label)) out.push(f);
    }
    return out.slice(0, 5);
  };

  const keys = recommendationKeys(rec);
  const closed = loadClosedPaperTrades();
  const cohort = closed.filter((t) => {
    const strategyMatch = t.strategy === keys.strategy;
    const regimeMatch =
      `${t.recommendation.marketRegime} ${t.recommendation.marketContext}`
        .toLowerCase()
        .includes(keys.regime === "neutral" ? "" : keys.regime);
    return strategyMatch || regimeMatch;
  });
  const stats = computeCohortStats(cohort.length >= 3 ? cohort : closed);

  const targetHits = (cohort.length >= 3 ? cohort : closed).filter((t) => {
    const reason = mapPaperExitReason(t.exitReason);
    return reason === "TARGET_1" || reason === "TARGET_2" || reason === "TARGET_3";
  }).length;
  const stopHits = (cohort.length >= 3 ? cohort : closed).filter((t) => {
    return mapPaperExitReason(t.exitReason) === "STOP_LOSS";
  }).length;
  const n = Math.max(1, (cohort.length >= 3 ? cohort : closed).length);

  const strategy = lookupExpectancy(tables, "byStrategy", keys.strategy);
  const historicalProbability = round2(
    strategy.winRate || tables.overall.winRate || confidence.confidenceScore
  );

  // Holding period from recommendation text mid-point when present.
  let expectedHoldingPeriodDays = stats.averageHoldingDays || 3;
  const dayMatch = rec.holdingPeriod.match(
    /(\d+)\s*[–-]\s*(\d+)\s*(?:Trading\s+)?Days/i
  );
  if (dayMatch) {
    expectedHoldingPeriodDays = round2(
      (Number(dayMatch[1]) + Number(dayMatch[2])) / 2
    );
  }

  return {
    topPositiveFactors: pad(positives, confidence.factors),
    topNegativeFactors: pad(
      negatives,
      [...confidence.factors].sort((a, b) => a.score - b.score)
    ),
    historicalProbability,
    expectedHoldingPeriodDays,
    expectedDrawdown: round2(Math.max(0, stats.averageDrawdown)),
    expectedMfe: round2(Math.max(0, stats.averageMfe)),
    expectedMae: round2(Math.min(0, stats.averageMae)),
    probabilityTarget1: round2((targetHits / n) * 100),
    probabilityStopLoss: round2((stopHits / n) * 100),
  };
}
