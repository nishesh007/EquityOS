/**
 * Overlay Market Context / Regime / Pulse metrics from usable breadth when MI
 * fallback left zeros (A/D 0/0, momentum 0, participation 0%).
 *
 * Prefers engine-published fields from lib/market-breadth/metrics.ts.
 * Does not invent an alternate breadth % formula (never A/(A+D)).
 */

import type {
  MarketContextView,
  MarketIntelligenceSnapshot,
  MarketRegimeView,
} from "@/lib/market-intelligence";
import { computeBreadthCoreMetrics } from "@/lib/market-breadth/metrics";
import type { MarketBreadth } from "@/types";
import { isUsableMarketBreadth } from "./client-breadth";

function coreFromPublishedCounts(breadth: MarketBreadth) {
  return computeBreadthCoreMetrics([
    ...Array.from({ length: breadth.advances }, () => ({ changePercent: 1 })),
    ...Array.from({ length: breadth.declines }, () => ({ changePercent: -1 })),
    ...Array.from({ length: breadth.unchanged ?? 0 }, () => ({
      changePercent: 0,
    })),
  ]);
}

export function derivePulseMetricsFromBreadth(breadth: MarketBreadth): {
  breadthScore: number;
  momentum: number;
  participation: number;
  liquidity: number | null;
  sectorBreadth: number | null;
} | null {
  if (!isUsableMarketBreadth(breadth)) return null;
  const core = coreFromPublishedCounts(breadth);
  const breadthScore =
    breadth.breadthPercent != null
      ? Math.round(breadth.breadthPercent)
      : Math.round(core.breadthPercent);

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
      : Math.round(core.moverParticipationPercent);

  const sectorRows = breadth.sectors ?? [];
  const sectorBreadth =
    sectorRows.length > 0
      ? Math.round(
          sectorRows.reduce((sum, row) => sum + (row.breadth ?? 0), 0) /
            sectorRows.length
        )
      : breadth.breadthPercent != null
        ? Math.round(breadth.breadthPercent)
        : Math.round(core.breadthPercent);

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
      ? (breadth.advanceDeclineRatio ??
        (breadth.declines > 0
          ? breadth.advances / breadth.declines
          : breadth.advances))
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
