/**
 * Sector Rotation Discovery — money-flow / leadership proxies (Sprint 9D.R6).
 * Compose only — uses injected momentum / liquidity / tags.
 */

import { safeScreenNumber, safeScreenText } from "../ScreenModels";
import {
  DISCOVERY_EMPTY,
  normalizeSectorRotationCard,
  type DiscoveryCandidate,
  type SectorRotationCard,
} from "./DiscoveryPresentationModels";
import { composeDiscoveryScoreFactors } from "./IdeaRankingEngine";

function hasAnyTag(
  candidate: DiscoveryCandidate,
  ...needles: string[]
): boolean {
  const tags = new Set(
    [...(candidate.tags ?? []), ...(candidate.themeTags ?? [])].map((t) =>
      String(t).toLowerCase()
    )
  );
  return needles.some((n) => tags.has(n.toLowerCase()));
}

export function discoverSectorRotation(
  candidates: DiscoveryCandidate[]
): SectorRotationCard[] {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return [
      normalizeSectorRotationCard({
        empty: true,
        emptyMessage: DISCOVERY_EMPTY.awaitingMarketData,
      }),
    ];
  }

  type Bucket = {
    flows: number[];
    strengths: number[];
    tickers: string[];
    leadershipChange: boolean;
    breakout: boolean;
    weakness: boolean;
  };

  const bySector = new Map<string, Bucket>();

  for (const candidate of candidates) {
    const sector = safeScreenText(candidate.sector, "").trim();
    if (!sector || sector === "—") continue;

    const factors = composeDiscoveryScoreFactors(candidate);
    const moneyFlow = clampFlow(
      (factors.momentum + factors.liquidity) / 2 +
        safeScreenNumber(candidate.sectorFlow, 0) * 0.15
    );
    const ticker = safeScreenText(candidate.ticker, "").toUpperCase();
    const bucket = bySector.get(sector) ?? {
      flows: [],
      strengths: [],
      tickers: [],
      leadershipChange: false,
      breakout: false,
      weakness: false,
    };

    bucket.flows.push(moneyFlow);
    bucket.strengths.push(factors.sectorStrength || factors.overallDiscoveryScore);
    if (ticker) bucket.tickers.push(ticker);

    if (
      hasAnyTag(
        candidate,
        "leadership_change",
        "sector_rotation",
        "rotation",
        "leader_change"
      )
    ) {
      bucket.leadershipChange = true;
    }
    if (
      hasAnyTag(candidate, "sector_breakout", "breakout", "fresh_breakout") ||
      factors.momentum >= 70
    ) {
      bucket.breakout = true;
    }
    if (
      hasAnyTag(candidate, "sector_weakness", "weakness", "distribution") ||
      factors.momentum <= 35
    ) {
      bucket.weakness = true;
    }

    bySector.set(sector, bucket);
  }

  if (bySector.size === 0) {
    return [
      normalizeSectorRotationCard({
        empty: true,
        emptyMessage: DISCOVERY_EMPTY.awaitingMarketData,
      }),
    ];
  }

  const cards: SectorRotationCard[] = [];
  for (const [sector, bucket] of bySector) {
    const avgFlow =
      bucket.flows.reduce((a, b) => a + b, 0) /
      Math.max(1, bucket.flows.length);
    const avgStrength =
      bucket.strengths.reduce((a, b) => a + b, 0) /
      Math.max(1, bucket.strengths.length);

    const pairs = bucket.tickers.map((t, i) => ({
      t,
      s: bucket.strengths[i] ?? 0,
    }));
    pairs.sort((a, b) => b.s - a.s);
    const leaders = [...new Set(pairs.map((p) => p.t))].slice(0, 5);

    cards.push(
      normalizeSectorRotationCard({
        sector,
        moneyFlow: safeScreenNumber(avgFlow, 0),
        strength: safeScreenNumber(avgStrength, 0),
        leadershipChange: bucket.leadershipChange,
        breakout: bucket.breakout && avgStrength >= 55,
        weakness: bucket.weakness && avgStrength <= 45,
        leaders,
        candidateCount: bucket.flows.length,
        empty: false,
        emptyMessage: DISCOVERY_EMPTY.awaitingMarketData,
      })
    );
  }

  return cards.sort((a, b) => b.moneyFlow - a.moneyFlow);
}

function clampFlow(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n * 100) / 100));
}

export class SectorRotationDiscoveryEngine {
  discover(candidates: DiscoveryCandidate[]): SectorRotationCard[] {
    try {
      return discoverSectorRotation(candidates);
    } catch {
      return [
        normalizeSectorRotationCard({
          empty: true,
          emptyMessage: DISCOVERY_EMPTY.awaitingMarketData,
        }),
      ];
    }
  }
}
