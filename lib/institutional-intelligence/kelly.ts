/**
 * MODULE 4 — Kelly Position Sizing (advisory only — never auto-applied)
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
import type { InstitutionalRiskLevel } from "@/lib/institutional-intelligence/types";

export interface KellyPositionSizingAdvice {
  recommendationId: string;
  symbol: string;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  expectancy: number;
  kellyPercent: number;
  halfKellyPercent: number;
  quarterKellyPercent: number;
  riskLevel: InstitutionalRiskLevel;
  recommendedPositionSizePercent: number;
  sampleSize: number;
  autoApply: false;
  approvalRequired: true;
  rationale: string[];
  notes: string[];
}

function riskLevelFromKelly(kelly: number): InstitutionalRiskLevel {
  if (kelly <= 0) return "Speculative";
  if (kelly < 5) return "Conservative";
  if (kelly < 12) return "Moderate";
  if (kelly < 20) return "Aggressive";
  return "Speculative";
}

/**
 * Classic Kelly for even odds generalized:
 * f* = W - (1-W)/(b) where b = avgWin/|avgLoss|
 */
export function calculateKellyFraction(
  winRateDecimal: number,
  averageWin: number,
  averageLossAbs: number
): number {
  if (!(averageWin > 0) || !(averageLossAbs > 0)) return 0;
  const b = averageWin / averageLossAbs;
  const w = clamp(winRateDecimal, 0, 1);
  const f = w - (1 - w) / b;
  return round2(clamp(f * 100, -50, 50));
}

export function buildKellyPositionSizing(
  rec: SharedRecommendation,
  tables: HistoricalExpectancyTables
): KellyPositionSizingAdvice {
  const keys = recommendationKeys(rec);
  const closed = loadClosedPaperTrades();
  const cohort = closed.filter((t) => t.strategy === keys.strategy);
  const stats = computeCohortStats(cohort.length >= 5 ? cohort : closed);
  const strategy = lookupExpectancy(tables, "byStrategy", keys.strategy);

  const winRate = stats.winRate || strategy.winRate || tables.overall.winRate;
  const averageWin = Math.abs(stats.averageWin) || 2;
  const averageLossAbs = Math.abs(stats.averageLoss) || 2;
  const expectancy =
    stats.expectancy || strategy.expectancy || tables.overall.expectancy;

  const kellyPercent = calculateKellyFraction(
    winRate / 100,
    averageWin,
    averageLossAbs
  );
  const halfKellyPercent = round2(kellyPercent / 2);
  const quarterKellyPercent = round2(kellyPercent / 4);
  const riskLevel = riskLevelFromKelly(Math.max(0, kellyPercent));

  // Advisory recommended size = half-Kelly floored at 0, capped at 10%.
  const recommendedPositionSizePercent = round2(
    clamp(Math.max(0, halfKellyPercent), 0, 10)
  );

  return {
    recommendationId: rec.id,
    symbol: rec.symbol,
    winRate: round2(winRate),
    averageWin: round2(averageWin),
    averageLoss: round2(-averageLossAbs),
    expectancy: round2(expectancy),
    kellyPercent,
    halfKellyPercent,
    quarterKellyPercent,
    riskLevel,
    recommendedPositionSizePercent,
    sampleSize: stats.trades,
    autoApply: false,
    approvalRequired: true,
    rationale: [
      `Win rate ${winRate}% · avg win ${averageWin}% · avg loss ${averageLossAbs}%`,
      `Full Kelly ${kellyPercent}% → Half ${halfKellyPercent}% → Quarter ${quarterKellyPercent}%`,
      `Recommended advisory size ${recommendedPositionSizePercent}% (${riskLevel})`,
    ],
    notes: [
      "Kelly position sizing is advisory only — never auto-applied to live or paper orders.",
      "Human approval required before any capital allocation change.",
    ],
  };
}

export function buildKellyPositionSizingReport(
  recommendations: readonly SharedRecommendation[],
  tables: HistoricalExpectancyTables
): {
  generatedAt: string;
  autoApply: false;
  approvalRequired: true;
  items: KellyPositionSizingAdvice[];
} {
  return {
    generatedAt: new Date().toISOString(),
    autoApply: false,
    approvalRequired: true,
    items: recommendations
      .filter((r) => r.action !== "WATCHLIST")
      .slice(0, 50)
      .map((r) => buildKellyPositionSizing(r, tables)),
  };
}
