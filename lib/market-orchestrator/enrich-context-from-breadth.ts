/**
 * Overlay Market Context / Regime / Pulse metrics from usable breadth when MI
 * fallback left zeros (A/D 0/0, momentum 0, participation 0%).
 *
 * Presentation consistency only — does not re-run institutional engines.
 */

import type {
  MarketContextView,
  MarketIntelligenceSnapshot,
  MarketRegimeView,
} from "@/lib/market-intelligence";
import type { MarketBreadth } from "@/types";
import { isUsableMarketBreadth } from "./client-breadth";

function quotedCount(breadth: MarketBreadth): number {
  return (
    breadth.quotedStocks ??
    breadth.advances + breadth.declines + breadth.unchanged
  );
}

/**
 * Mover participation = (advances + declines) / total quoted.
 * Prefer this over quoteCoveragePercent, which can be ~1% while markets
 * still have nearly full A/D participation among printed quotes.
 */
function moverParticipationPercent(breadth: MarketBreadth): number | null {
  const total =
    breadth.advances + breadth.declines + (breadth.unchanged ?? 0);
  if (total <= 0) return null;
  return Math.round(((breadth.advances + breadth.declines) / total) * 100);
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

  /**
   * Participation priority:
   * 1) Engine participationPercent when it reflects movers (typically high)
   * 2) Computed (A+D)/total from counts
   * 3) Never prefer raw quoteCoverage alone when A/D counts exist
   *
   * Old: fell through to quoteCoveragePercent → ~1% mislabeled as participation.
   */
  const fromCounts = moverParticipationPercent(breadth);
  const engineParticipation = breadth.participationPercent;
  const participation =
    fromCounts != null
      ? fromCounts
      : engineParticipation != null && engineParticipation > 5
        ? Math.round(engineParticipation)
        : breadthScore;

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
    breadthScore,
    momentum,
    participation,
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
  const needsBreadth =
    needsAd && (context.breadthScore === 0 || context.breadthScore === 50);
  const needsSector =
    needsAd && (context.sectorBreadth === 0 || context.sectorBreadth === 50);

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

/**
 * Keep Regime component tiles aligned with Context after breadth hydrate.
 * Old: only Context was enriched → Breadth 48 vs Regime Breadth 50 split.
 */
export function enrichRegimeFromContext(
  regime: MarketRegimeView | null | undefined,
  context: MarketContextView | null | undefined
): MarketRegimeView | null {
  if (!regime) return null;
  if (!context) return regime;

  const components = regime.components;
  const fallbackBreadth =
    components.breadth === 0 || components.breadth === 50;
  const fallbackMomentum =
    components.momentum === 0 || components.momentum === 50;
  const contextHasAd =
    (context.advanceCount ?? 0) > 0 || (context.declineCount ?? 0) > 0;

  if (!contextHasAd && !fallbackBreadth && !fallbackMomentum) {
    return regime;
  }

  return {
    ...regime,
    components: {
      ...components,
      breadth: fallbackBreadth ? context.breadthScore : components.breadth,
      momentum: fallbackMomentum ? context.momentum : components.momentum,
      trendStrength:
        components.trendStrength === 50
          ? context.marketStrength
          : components.trendStrength,
      risk:
        components.risk === "Neutral" && context.riskMode
          ? context.riskMode
          : components.risk,
    },
  };
}

export function enrichSnapshotFromBreadth(
  snapshot: MarketIntelligenceSnapshot,
  breadth: MarketBreadth | null | undefined
): MarketIntelligenceSnapshot {
  const enrichedContext = enrichContextFromBreadth(snapshot.context, breadth);
  if (!enrichedContext || enrichedContext === snapshot.context) {
    return snapshot;
  }
  const enrichedRegime = enrichRegimeFromContext(snapshot.regime, enrichedContext);
  return {
    ...snapshot,
    context: enrichedContext,
    regime: enrichedRegime ?? snapshot.regime,
  };
}
