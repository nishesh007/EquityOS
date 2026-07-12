import { createScoreResult } from "@/lib/engine/framework";
import type { ScoreResult } from "@/lib/engine/types";
import type { MarketBreadth } from "@/types";

/**
 * Computes market breadth score from advance/decline ratio,
 * sector breadth average, and new highs/lows participation.
 */
export function calculateBreadthScore(breadth: MarketBreadth): ScoreResult {
  const total = breadth.advances + breadth.declines + breadth.unchanged;
  const advanceRatio = total > 0 ? (breadth.advances / total) * 100 : 50;
  const sectorBreadthAvg =
    breadth.sectors.length > 0
      ? breadth.sectors.reduce((sum, sector) => sum + sector.breadth, 0) /
        breadth.sectors.length
      : 50;
  const highsTotal = breadth.newHighs + breadth.newLows;
  const highsRatio = highsTotal > 0 ? (breadth.newHighs / highsTotal) * 100 : 50;

  const rawScore =
    advanceRatio * 0.15 + sectorBreadthAvg * 0.15 + highsRatio * 0.7;

  return createScoreResult({
    key: "breadth",
    label: "Breadth Score",
    category: "breadth",
    rawScore,
    explanation: `${breadth.advances} advances vs ${breadth.declines} declines; ${breadth.newHighs} new highs vs ${breadth.newLows} new lows.`,
    contributingFactors: [
      { key: "advances", label: "Advance Ratio", value: Math.round(advanceRatio), weight: 0.15 },
      { key: "sector-breadth", label: "Sector Breadth Avg", value: Math.round(sectorBreadthAvg), weight: 0.15 },
      { key: "new-highs", label: "New Highs Ratio", value: Math.round(highsRatio), weight: 0.7 },
    ],
  });
}
