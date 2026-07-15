/**
 * Idea Ranking Engine — compose overall discovery score (Sprint 9D.R6).
 * Reuses scoreInstitutionalCandidate; adds sector/theme/liquidity/breadth overlays.
 */

import { safeScreenNumber } from "../ScreenModels";
import {
  scoreInstitutionalCandidate,
} from "../intelligence/InstitutionalRankingEngine";
import type { InstitutionalCandidate } from "../intelligence/InstitutionalScreenModels";
import {
  emptyDiscoveryScoreFactors,
  normalizeDiscoveryIdeaCard,
  type DiscoveryCandidate,
  type DiscoveryIdeaCard,
  type DiscoveryScoreFactors,
} from "./DiscoveryPresentationModels";

const OVERLAY_WEIGHTS = {
  institutional: 0.62,
  sectorStrength: 0.1,
  themeStrength: 0.08,
  liquidity: 0.1,
  marketBreadth: 0.1,
} as const;

function clamp(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n * 100) / 100));
}

function metricNumber(
  metrics: Record<string, number | string | null | undefined> | null | undefined,
  ...keys: string[]
): number | undefined {
  if (!metrics) return undefined;
  for (const key of keys) {
    const raw = metrics[key];
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
    if (typeof raw === "string" && raw.trim() !== "") {
      const n = Number(raw);
      if (Number.isFinite(n)) return n;
    }
  }
  return undefined;
}

/** Map discovery candidate → institutional candidate for compose scoring. */
export function toInstitutionalFromDiscovery(
  candidate: DiscoveryCandidate
): InstitutionalCandidate {
  const metrics = candidate.metrics ?? {};
  const pick = (
    keys: string[],
    direct?: number | null
  ): number | undefined => {
    if (direct != null && Number.isFinite(direct)) return direct;
    return metricNumber(metrics, ...keys);
  };

  return {
    ticker: candidate.ticker,
    company: candidate.company,
    sector: candidate.sector,
    industry: candidate.industry,
    price: candidate.price,
    tags: candidate.tags,
    domain: candidate.domain,
    inPortfolio: candidate.inPortfolio,
    inWatchlist: candidate.inWatchlist,
    trustScore: pick(["trust_score", "trust"], candidate.trustScore),
    validationScore: pick(
      ["validation_score", "validation"],
      candidate.validationScore
    ),
    confidence: pick(["confidence"], candidate.confidence),
    aiConviction: pick(["ai_conviction"], candidate.aiConviction),
    opportunityScore: pick(["opportunity_score"], candidate.opportunityScore),
    momentum: pick(["momentum"], candidate.momentum),
    technical: pick(["technical"], candidate.technical),
    growth: pick(["growth", "revenue_yoy", "eps_growth"], candidate.growth),
    quality: pick(["quality", "quality_score", "roce"], candidate.quality),
    risk: pick(["risk"], candidate.risk),
    fundamentalStrength: pick(
      ["fundamental_strength", "fundamental"],
      candidate.fundamentalStrength
    ),
    liquidity: pick(["liquidity"], candidate.liquidity),
    sectorStrength: pick(
      ["sector_strength", "sectorStrength"],
      candidate.sectorStrength
    ),
    income: pick(["income", "dividend_yield"], candidate.income),
    value: pick(["value"], candidate.value),
    riskReward: pick(["risk_reward"], candidate.riskReward),
    evidence: candidate.evidence,
    reasonSummary: candidate.reasonSummary,
  };
}

export function composeDiscoveryScoreFactors(
  candidate: DiscoveryCandidate
): DiscoveryScoreFactors {
  try {
    const institutional = toInstitutionalFromDiscovery(candidate);
    const base = scoreInstitutionalCandidate(institutional);
    const metrics = candidate.metrics ?? {};

    const sectorStrength = clamp(
      safeScreenNumber(
        candidate.sectorStrength,
        metricNumber(metrics, "sector_strength", "sectorStrength") ??
          candidate.sectorFlow ??
          50
      )
    );
    const themeStrength = clamp(
      safeScreenNumber(
        candidate.themeStrength,
        metricNumber(metrics, "theme_strength", "themeStrength") ?? 50
      )
    );
    const liquidity = clamp(
      safeScreenNumber(
        candidate.liquidity,
        metricNumber(metrics, "liquidity") ?? 50
      )
    );
    const marketBreadth = clamp(
      safeScreenNumber(
        candidate.marketBreadth,
        metricNumber(metrics, "market_breadth", "marketBreadth", "market_trend") ??
          safeScreenNumber(candidate.sectorFlow, 50)
      )
    );

    const overallDiscoveryScore = clamp(
      base.overallInstitutionalScore * OVERLAY_WEIGHTS.institutional +
        sectorStrength * OVERLAY_WEIGHTS.sectorStrength +
        themeStrength * OVERLAY_WEIGHTS.themeStrength +
        liquidity * OVERLAY_WEIGHTS.liquidity +
        marketBreadth * OVERLAY_WEIGHTS.marketBreadth
    );

    return {
      technical: base.technical,
      fundamental: base.fundamental,
      growth: base.growth,
      momentum: base.momentum,
      quality: base.quality,
      risk: base.risk,
      trust: base.trust,
      validation: base.validation,
      aiConviction: base.aiConfidence,
      sectorStrength,
      themeStrength,
      liquidity,
      marketBreadth,
      overallDiscoveryScore,
    };
  } catch {
    return emptyDiscoveryScoreFactors();
  }
}

export function rankIdeas(cards: DiscoveryIdeaCard[]): DiscoveryIdeaCard[] {
  const sorted = [...cards].sort((a, b) => {
    const diff = b.discoveryScore - a.discoveryScore;
    if (diff !== 0) return diff;
    return b.confidence - a.confidence;
  });
  return sorted.map((card, index) =>
    normalizeDiscoveryIdeaCard({
      ...card,
      rank: index + 1,
      empty: false,
    })
  );
}

export class IdeaRankingEngine {
  compose(candidate: DiscoveryCandidate): DiscoveryScoreFactors {
    return composeDiscoveryScoreFactors(candidate);
  }

  rank(cards: DiscoveryIdeaCard[]): DiscoveryIdeaCard[] {
    return rankIdeas(cards);
  }
}
