/**
 * Overlay Market Context / Pulse metrics from usable breadth when MI
 * fallback left zeros (A/D 0/0, momentum 0, participation 0%).
 */

import type { MarketContextView } from "@/lib/market-intelligence";
import type { MarketBreadth } from "@/types";
import { isUsableMarketBreadth } from "./client-breadth";

function quotedCount(breadth: MarketBreadth): number {
  return (
    breadth.quotedStocks ??
    breadth.advances + breadth.declines + breadth.unchanged
  );
}

export function derivePulseMetricsFromBreadth(breadth: MarketBreadth): {
  breadthScore: number;
  momentum: number;
  participation: number;
  liquidity: number | null;
  sectorBreadth: number | null;
} | null {
  if (!isUsableMarketBreadth(breadth)) return null;
  const quoted = quotedCount(breadth);
  const ad = breadth.advances + breadth.declines;
  const breadthScore =
    breadth.breadthPercent != null
      ? Math.round(breadth.breadthPercent)
      : ad > 0
        ? Math.round((breadth.advances / ad) * 100)
        : quoted > 0
          ? Math.round((breadth.advances / quoted) * 100)
          : 50;

  const momentum =
    breadth.averageDailyReturn != null
      ? Math.max(
          0,
          Math.min(100, Math.round(50 + breadth.averageDailyReturn * 20))
        )
      : breadthScore;

  const participation =
    breadth.participationPercent != null
      ? Math.round(breadth.participationPercent)
      : breadth.quoteCoveragePercent != null
        ? Math.round(breadth.quoteCoveragePercent)
        : quoted > 0 && breadth.totalStocks > 0
          ? Math.round((quoted / breadth.totalStocks) * 100)
          : Math.max(breadthScore, 1);

  const sectorRows = breadth.sectors ?? [];
  const sectorBreadth =
    sectorRows.length > 0
      ? Math.round(
          sectorRows.reduce(
            (sum, row) =>
              sum +
              (row.breadthPercent ??
                (row.advances + row.declines > 0
                  ? (row.advances / (row.advances + row.declines)) * 100
                  : 50)),
            0
          ) / sectorRows.length
        )
      : breadth.breadthPercent != null
        ? Math.round(breadth.breadthPercent)
        : null;

  return {
    breadthScore: Math.max(breadthScore, 1),
    momentum: Math.max(momentum, 1),
    participation: Math.max(participation, 1),
    liquidity: null,
    sectorBreadth,
  };
}

export function enrichContextFromBreadth(
  context: MarketContextView | null | undefined,
  breadth: MarketBreadth | null | undefined
): MarketContextView | null {
  if (!context) return null;
  if (!breadth || !isUsableMarketBreadth(breadth)) return context;

  const derived = derivePulseMetricsFromBreadth(breadth);
  if (!derived) return context;

  const needsAd =
    (context.advanceCount ?? 0) === 0 && (context.declineCount ?? 0) === 0;
  const needsMomentum = (context.momentum ?? 0) === 0;
  const needsParticipation = (context.institutionalParticipation ?? 0) === 0;
  // Neutral fallback pipeline seeds breadthScore/sectorBreadth at 50 with empty A/D.
  const needsBreadth = needsAd && (context.breadthScore === 0 || context.breadthScore === 50);
  const needsSector = needsAd && (context.sectorBreadth === 0 || context.sectorBreadth === 50);

  return {
    ...context,
    advanceCount: needsAd ? breadth.advances : context.advanceCount,
    declineCount: needsAd ? breadth.declines : context.declineCount,
    advanceDeclineRatio: needsAd
      ? breadth.declines > 0
        ? breadth.advances / breadth.declines
        : breadth.advances
      : context.advanceDeclineRatio,
    breadthScore: needsBreadth ? derived.breadthScore : context.breadthScore,
    breadthQuality: needsBreadth
      ? derived.breadthScore >= 55
        ? "Constructive"
        : derived.breadthScore <= 45
          ? "Weak"
          : "Neutral"
      : context.breadthQuality,
    momentum: needsMomentum ? derived.momentum : context.momentum,
    institutionalParticipation: needsParticipation
      ? derived.participation
      : context.institutionalParticipation,
    sectorBreadth:
      needsSector && derived.sectorBreadth != null
        ? derived.sectorBreadth
        : context.sectorBreadth,
    leadingSectors:
      context.leadingSectors.length === 0 && breadth.strongestSector
        ? [breadth.strongestSector]
        : context.leadingSectors,
    weakSectors:
      context.weakSectors.length === 0 && breadth.weakestSector
        ? [breadth.weakestSector]
        : context.weakSectors,
  };
}
