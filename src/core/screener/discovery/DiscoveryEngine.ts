/**
 * AI Discovery Engine — orchestrator façade (Sprint 9D.R6).
 * Composes institutional intelligence + theme / sector / idea discovery.
 */

import { safeScreenNumber, safeScreenText } from "../ScreenModels";
import type { InstitutionalCandidate } from "../intelligence/InstitutionalScreenModels";
import {
  generateResearchPriority,
} from "../intelligence/ResearchPriorityEngine";
import {
  buildInstitutionalInsights,
} from "../intelligence/ScreenInsightEngine";
import {
  DISCOVERY_EMPTY,
  emptyDiscoveryInsight,
  emptyDiscoveryResult,
  normalizeDiscoveryInsight,
  type DiscoveryCandidate,
  type DiscoveryIdeaCard,
  type DiscoveryInsight,
  type DiscoveryResult,
  type SectorRotationCard,
  type ThemeCard,
} from "./DiscoveryPresentationModels";
import {
  composeDiscoveryScoreFactors,
  rankIdeas,
  toInstitutionalFromDiscovery,
} from "./IdeaRankingEngine";
import {
  generateInstitutionalIdeas,
  type InstitutionalIdeaOptions,
} from "./InstitutionalIdeaEngine";
import {
  discoverIdeas,
  type OpportunityDiscoveryOptions,
} from "./OpportunityDiscoveryEngine";
import { discoverSectorRotation } from "./SectorRotationDiscovery";
import { discoverThemes, matchThemes } from "./ThemeDiscoveryEngine";

export interface DiscoveryUniverseCandidate {
  ticker: string;
  company?: string | null;
  sector?: string | null;
  industry?: string | null;
  price?: number | null;
  metrics?: Record<string, number | string | null | undefined> | null;
  tags?: string[] | null;
  themeTags?: string[] | null;
  domain?: "portfolio" | "watchlist" | "opportunity" | null;
  inPortfolio?: boolean | null;
  inWatchlist?: boolean | null;
  trustScore?: number | null;
  validationScore?: number | null;
  aiConviction?: number | null;
  opportunityScore?: number | null;
  confidence?: number | null;
  momentum?: number | null;
  technical?: number | null;
  growth?: number | null;
  quality?: number | null;
  risk?: number | null;
  fundamentalStrength?: number | null;
  liquidity?: number | null;
  sectorStrength?: number | null;
  themeStrength?: number | null;
  marketBreadth?: number | null;
  sectorFlow?: number | null;
  income?: number | null;
  value?: number | null;
  riskReward?: number | null;
  evidence?: string[] | null;
  reasonSummary?: string | null;
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

/** Map strategy / institutional / universe rows into discovery candidates. */
export function toDiscoveryCandidate(
  input: DiscoveryUniverseCandidate | InstitutionalCandidate | DiscoveryCandidate
): DiscoveryCandidate {
  const metrics =
    "metrics" in input && input.metrics ? input.metrics : undefined;
  const pick = (
    keys: string[],
    direct?: number | null
  ): number | undefined => {
    if (direct != null && Number.isFinite(direct)) return direct;
    return metricNumber(metrics, ...keys);
  };

  return {
    ticker: safeScreenText(input.ticker, "—").toUpperCase(),
    company: input.company,
    sector: input.sector,
    industry: input.industry,
    price: "price" in input ? input.price : undefined,
    metrics,
    tags: input.tags,
    themeTags: "themeTags" in input ? input.themeTags : undefined,
    domain: input.domain,
    inPortfolio: input.inPortfolio,
    inWatchlist: input.inWatchlist,
    trustScore: pick(["trust_score", "trust"], input.trustScore),
    validationScore: pick(
      ["validation_score", "validation"],
      input.validationScore
    ),
    aiConviction: pick(
      ["ai_conviction"],
      "aiConviction" in input ? input.aiConviction : undefined
    ),
    opportunityScore: pick(["opportunity_score"], input.opportunityScore),
    confidence: pick(["confidence"], input.confidence),
    momentum: pick(["momentum"], input.momentum),
    technical: pick(["technical"], input.technical),
    growth: pick(["growth", "revenue_yoy", "eps_growth"], input.growth),
    quality: pick(
      ["quality", "quality_score", "roce"],
      "quality" in input ? input.quality : undefined
    ),
    risk: pick(["risk"], input.risk),
    fundamentalStrength: pick(
      ["fundamental_strength"],
      input.fundamentalStrength
    ),
    liquidity: pick(["liquidity"], input.liquidity),
    sectorStrength: pick(["sector_strength"], input.sectorStrength),
    themeStrength: pick(
      ["theme_strength"],
      "themeStrength" in input ? input.themeStrength : undefined
    ),
    marketBreadth: pick(
      ["market_breadth", "market_trend"],
      "marketBreadth" in input
        ? input.marketBreadth
        : "marketTrend" in input
          ? (input as InstitutionalCandidate).marketTrend
          : undefined
    ),
    sectorFlow: pick(
      ["sector_flow"],
      "sectorFlow" in input ? input.sectorFlow : undefined
    ),
    income: pick(["income", "dividend_yield"], input.income),
    value: pick(["value"], input.value),
    riskReward: pick(["risk_reward"], input.riskReward),
    evidence: input.evidence,
    reasonSummary: input.reasonSummary,
  };
}

export function mapToDiscoveryCandidates(
  inputs: Array<
    DiscoveryUniverseCandidate | InstitutionalCandidate | DiscoveryCandidate
  >
): DiscoveryCandidate[] {
  if (!Array.isArray(inputs)) return [];
  return inputs
    .map((c) => toDiscoveryCandidate(c))
    .filter((c) => c.ticker && c.ticker !== "—");
}

function horizonFromScore(score: number, momentum: number): string {
  if (momentum >= 75 && score >= 70) return "Short-term (2–6 weeks)";
  if (score >= 80) return "Medium-term (1–3 months)";
  if (score >= 60) return "Medium-term (3–6 months)";
  return "Long-term (6–12 months)";
}

function allocationFromScore(
  score: number,
  risk: number,
  categoryHint?: string
): string {
  if (score >= 88 && risk >= 70) return "Core — 3–5%";
  if (score >= 80) return "Satellite — 2–3%";
  if (score >= 70) return "Starter — 1–2%";
  if (categoryHint === "High Risk High Reward") return "Tactical — ≤1%";
  return "Watch only — 0% until confirmation";
}

/**
 * Explainability for discovered ideas — composes institutional insight + discovery factors.
 */
export function buildDiscoveryInsights(
  cardOrCandidate: DiscoveryIdeaCard | DiscoveryCandidate,
  options?: { matchedSignals?: string[] }
): DiscoveryInsight {
  try {
    const isCard =
      "discoveryScore" in cardOrCandidate &&
      "kinds" in cardOrCandidate &&
      Array.isArray(cardOrCandidate.kinds);

    const candidate: DiscoveryCandidate = isCard
      ? {
          ticker: cardOrCandidate.ticker,
          company: cardOrCandidate.company,
          sector: cardOrCandidate.sector,
          industry: cardOrCandidate.industry,
          trustScore: cardOrCandidate.trust,
          validationScore: cardOrCandidate.validation,
          aiConviction: cardOrCandidate.aiConviction,
          evidence: cardOrCandidate.evidence,
          reasonSummary: cardOrCandidate.reasonSummary,
          tags: cardOrCandidate.kinds.map(String),
        }
      : (cardOrCandidate as DiscoveryCandidate);

    const factors = isCard
      ? cardOrCandidate.factors
      : composeDiscoveryScoreFactors(candidate);

    if (
      factors.overallDiscoveryScore === 0 &&
      !(options?.matchedSignals?.length) &&
      !((candidate.tags ?? []).length)
    ) {
      return emptyDiscoveryInsight(
        candidate.ticker,
        DISCOVERY_EMPTY.awaitingMarketData
      );
    }

    const institutional = toInstitutionalFromDiscovery(candidate);
    const institutionalFactors = {
      technical: factors.technical,
      fundamental: factors.fundamental,
      growth: factors.growth,
      momentum: factors.momentum,
      quality: factors.quality,
      income: safeScreenNumber(candidate.income, 40),
      value: safeScreenNumber(candidate.value, 45),
      risk: factors.risk,
      validation: factors.validation,
      trust: factors.trust,
      aiConfidence: factors.aiConviction,
      overallInstitutionalScore: factors.overallDiscoveryScore,
    };

    const matched =
      options?.matchedSignals ??
      (isCard
        ? [
            ...cardOrCandidate.kinds.map(String),
            ...cardOrCandidate.badges,
          ]
        : (candidate.tags ?? []));

    const institutionalInsight = buildInstitutionalInsights({
      candidate: institutional,
      factors: institutionalFactors,
      matchedSignals: matched,
    });
    const priority = generateResearchPriority(institutionalFactors, {
      matchedSignals: matched.length,
      hasCatalyst: matched.some((m) =>
        /breakout|catalyst|earnings/i.test(m)
      ),
    });

    const themes = isCard
      ? cardOrCandidate.themes
      : matchThemes(candidate);
    const kinds = isCard ? cardOrCandidate.kinds : [];

    const supportingFactors: string[] = [];
    if (factors.technical >= 60)
      supportingFactors.push(`Technical ${Math.round(factors.technical)}`);
    if (factors.fundamental >= 60)
      supportingFactors.push(
        `Fundamental ${Math.round(factors.fundamental)}`
      );
    if (factors.growth >= 60)
      supportingFactors.push(`Growth ${Math.round(factors.growth)}`);
    if (factors.momentum >= 60)
      supportingFactors.push(`Momentum ${Math.round(factors.momentum)}`);
    if (factors.sectorStrength >= 60)
      supportingFactors.push(
        `Sector strength ${Math.round(factors.sectorStrength)}`
      );
    if (factors.themeStrength >= 60)
      supportingFactors.push(
        `Theme strength ${Math.round(factors.themeStrength)}`
      );
    if (themes.length)
      supportingFactors.push(`Themes: ${themes.join(", ")}`);

    const why =
      kinds.length > 0
        ? `Tagged as ${kinds.slice(0, 3).join(", ")} with discovery score ${Math.round(factors.overallDiscoveryScore)}`
        : institutionalInsight.headline;

    const riskNote =
      factors.risk >= 70
        ? `Favorable risk profile (${Math.round(factors.risk)})`
        : factors.risk >= 45
          ? `Moderate risk (${Math.round(factors.risk)})`
          : `Elevated risk (${Math.round(factors.risk)}) — size carefully`;

    return normalizeDiscoveryInsight({
      ticker: candidate.ticker,
      whyDiscovered: why,
      supportingFactors: supportingFactors.length
        ? supportingFactors
        : ["Baseline discovery composition"],
      drivers: institutionalInsight.drivers,
      validation:
        factors.validation >= 70
          ? `Validation strong (${Math.round(factors.validation)})`
          : `Validation ${Math.round(factors.validation)}`,
      trust:
        factors.trust >= 70
          ? `Trust strong (${Math.round(factors.trust)})`
          : `Trust ${Math.round(factors.trust)}`,
      evidence: [
        ...institutionalInsight.evidence,
        priority,
        ...(candidate.evidence ?? []),
      ],
      risk: riskNote,
      expectedHorizon: horizonFromScore(
        factors.overallDiscoveryScore,
        factors.momentum
      ),
      confidence: factors.aiConviction,
      suggestedAllocation: allocationFromScore(
        factors.overallDiscoveryScore,
        factors.risk,
        isCard ? cardOrCandidate.category : undefined
      ),
      empty: false,
      emptyMessage: DISCOVERY_EMPTY.awaitingMarketData,
    });
  } catch {
    return emptyDiscoveryInsight(
      "ticker" in cardOrCandidate ? cardOrCandidate.ticker : "—",
      DISCOVERY_EMPTY.awaitingMarketData
    );
  }
}

export function discoverIdeasPublic(
  candidates: DiscoveryCandidate[],
  options?: OpportunityDiscoveryOptions
): DiscoveryResult {
  try {
    const mapped = mapToDiscoveryCandidates(candidates);
    const result = discoverIdeas(mapped, options);
    if (result.empty) return result;
    const insights = result.ideas
      .slice(0, 12)
      .map((card) => buildDiscoveryInsights(card));
    return { ...result, insights };
  } catch {
    return emptyDiscoveryResult(DISCOVERY_EMPTY.awaitingMarketData);
  }
}

export function generateInstitutionalIdeasPublic(
  candidates: DiscoveryCandidate[],
  options?: InstitutionalIdeaOptions
): DiscoveryIdeaCard[] {
  try {
    return generateInstitutionalIdeas(
      mapToDiscoveryCandidates(candidates),
      options
    );
  } catch {
    return [];
  }
}

export function discoverThemesPublic(
  candidates: DiscoveryCandidate[]
): ThemeCard[] {
  try {
    return discoverThemes(mapToDiscoveryCandidates(candidates));
  } catch {
    return [];
  }
}

export function discoverSectorRotationPublic(
  candidates: DiscoveryCandidate[]
): SectorRotationCard[] {
  try {
    return discoverSectorRotation(mapToDiscoveryCandidates(candidates));
  } catch {
    return [];
  }
}

export function rankIdeasPublic(
  cards: DiscoveryIdeaCard[]
): DiscoveryIdeaCard[] {
  try {
    return rankIdeas(cards);
  } catch {
    return cards;
  }
}

export class DiscoveryEngine {
  discoverIdeas(
    candidates: DiscoveryCandidate[],
    options?: OpportunityDiscoveryOptions
  ): DiscoveryResult {
    return discoverIdeasPublic(candidates, options);
  }

  generateInstitutionalIdeas(
    candidates: DiscoveryCandidate[],
    options?: InstitutionalIdeaOptions
  ): DiscoveryIdeaCard[] {
    return generateInstitutionalIdeasPublic(candidates, options);
  }

  discoverThemes(candidates: DiscoveryCandidate[]): ThemeCard[] {
    return discoverThemesPublic(candidates);
  }

  discoverSectorRotation(
    candidates: DiscoveryCandidate[]
  ): SectorRotationCard[] {
    return discoverSectorRotationPublic(candidates);
  }

  rankIdeas(cards: DiscoveryIdeaCard[]): DiscoveryIdeaCard[] {
    return rankIdeasPublic(cards);
  }

  buildDiscoveryInsights(
    cardOrCandidate: DiscoveryIdeaCard | DiscoveryCandidate
  ): DiscoveryInsight {
    return buildDiscoveryInsights(cardOrCandidate);
  }

  mapCandidates(
    inputs: Array<
      DiscoveryUniverseCandidate | InstitutionalCandidate | DiscoveryCandidate
    >
  ): DiscoveryCandidate[] {
    return mapToDiscoveryCandidates(inputs);
  }
}

export {
  composeDiscoveryScoreFactors,
  rankIdeas,
  discoverThemes,
  discoverSectorRotation,
  generateInstitutionalIdeas,
  discoverIdeas,
};
