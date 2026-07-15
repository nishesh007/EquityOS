/**
 * Institutional Idea Engine — classify discovery categories (Sprint 9D.R6).
 */

import { safeScreenNumber, safeScreenText } from "../ScreenModels";
import {
  generateResearchPriority,
} from "../intelligence/ResearchPriorityEngine";
import {
  buildInstitutionalInsights,
} from "../intelligence/ScreenInsightEngine";
import {
  DISCOVERY_EMPTY,
  normalizeDiscoveryIdeaCard,
  type DiscoveryCandidate,
  type DiscoveryIdeaCard,
  type DiscoveryIdeaCategory,
  type DiscoveryKind,
} from "./DiscoveryPresentationModels";
import {
  composeDiscoveryScoreFactors,
  rankIdeas,
  toInstitutionalFromDiscovery,
} from "./IdeaRankingEngine";
import { matchThemes } from "./ThemeDiscoveryEngine";

export interface InstitutionalIdeaOptions {
  resultLimit?: number;
  minDiscoveryScore?: number;
}

function classifyCategory(
  candidate: DiscoveryCandidate,
  factors: ReturnType<typeof composeDiscoveryScoreFactors>
): DiscoveryIdeaCategory {
  if (candidate.inPortfolio) return "Portfolio Candidates";
  if (candidate.inWatchlist || candidate.domain === "watchlist") {
    return "Watchlist Candidates";
  }

  const score = factors.overallDiscoveryScore;
  const conviction = factors.aiConviction;
  const trust = factors.trust;
  const validation = factors.validation;

  // Prefer conviction band over growth/momentum specialty labels.
  if (
    conviction >= 80 &&
    trust >= 75 &&
    validation >= 75 &&
    score >= 70
  ) {
    return "Highest Conviction";
  }
  if (factors.growth >= 75 && factors.momentum >= 60) return "High Growth";
  if (factors.momentum >= 75) return "Strong Momentum";
  if (
    factors.fundamental >= 55 &&
    (safeScreenNumber(candidate.value, 0) >= 60 ||
      safeScreenNumber(
        typeof candidate.metrics?.value === "number"
          ? candidate.metrics.value
          : undefined,
        0
      ) >= 60 ||
      factors.fundamental >= 70) &&
    factors.momentum <= 55
  ) {
    return "Undervalued";
  }
  if (
    hasTag(candidate, "turnaround", "recovery") ||
    (factors.momentum >= 55 && factors.quality <= 45 && factors.growth >= 50)
  ) {
    return "Turnaround";
  }
  if (
    safeScreenNumber(candidate.income, 0) >= 60 ||
    factors.quality >= 70 &&
      safeScreenNumber(
        typeof candidate.metrics?.dividend_yield === "number"
          ? candidate.metrics.dividend_yield
          : undefined,
        0
      ) >= 2
  ) {
    // Prefer Safe Compounders when quality is elite
    if (factors.quality >= 80 && factors.risk >= 70) return "Safe Compounders";
    return "Income";
  }
  if (factors.quality >= 78 && factors.risk >= 70) return "Safe Compounders";
  if (
    (candidate.riskReward ?? 0) >= 2.5 ||
    (factors.momentum >= 80 && factors.risk <= 45)
  ) {
    return "High Risk High Reward";
  }
  if (
    factors.growth >= 65 &&
    factors.momentum >= 60 &&
    score >= 60 &&
    score < 85
  ) {
    return "Emerging Leaders";
  }
  return "Watchlist Candidates";
}

function hasTag(candidate: DiscoveryCandidate, ...needles: string[]): boolean {
  const tags = new Set(
    [...(candidate.tags ?? []), ...(candidate.themeTags ?? [])].map((t) =>
      String(t).toLowerCase()
    )
  );
  return needles.some((n) => tags.has(n.toLowerCase()));
}

function categoryBadges(
  category: DiscoveryIdeaCategory,
  kinds: DiscoveryKind[]
): string[] {
  const badges = [category, ...kinds.slice(0, 2)];
  return [...new Set(badges)];
}

export function generateInstitutionalIdeas(
  candidates: DiscoveryCandidate[],
  options?: InstitutionalIdeaOptions
): DiscoveryIdeaCard[] {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return [
      normalizeDiscoveryIdeaCard({
        empty: true,
        emptyMessage: DISCOVERY_EMPTY.noOpportunities,
      }),
    ];
  }

  const minScore = safeScreenNumber(options?.minDiscoveryScore, 0);
  const limit = Math.max(1, Math.floor(safeScreenNumber(options?.resultLimit, 50)));

  const cards: DiscoveryIdeaCard[] = [];
  for (const candidate of candidates) {
    const factors = composeDiscoveryScoreFactors(candidate);
    if (factors.overallDiscoveryScore < minScore) continue;

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
      overallInstitutionalScore: clampInstitutionalBlend(factors),
    };

    const priority = generateResearchPriority(institutionalFactors, {
      matchedSignals: candidate.tags ?? [],
      hasCatalyst: hasTag(candidate, "catalyst", "earnings", "breakout"),
    });
    const insight = buildInstitutionalInsights({
      candidate: institutional,
      factors: institutionalFactors,
      matchedSignals: candidate.tags ?? [],
    });

    const category = classifyCategory(candidate, factors);
    const themes = matchThemes(candidate);
    const kinds: DiscoveryKind[] = [];
    if (factors.aiConviction >= 75 && factors.trust >= 70) {
      kinds.push("High Conviction Buys");
    }
    if (factors.momentum >= 70) kinds.push("Momentum Leaders");
    if (factors.quality >= 75) kinds.push("Quality Compounders");

    cards.push(
      normalizeDiscoveryIdeaCard({
        company: candidate.company,
        ticker: candidate.ticker,
        sector: candidate.sector,
        industry: candidate.industry,
        category,
        kinds,
        themes,
        badges: [
          ...categoryBadges(category, kinds),
          ...insight.badges,
          priority,
        ],
        discoveryScore: factors.overallDiscoveryScore,
        institutionalScore: institutionalFactors.overallInstitutionalScore,
        confidence: factors.aiConviction,
        trust: factors.trust,
        validation: factors.validation,
        aiConviction: factors.aiConviction,
        reasonSummary:
          candidate.reasonSummary ??
          insight.headline ??
          `${safeScreenText(candidate.ticker, "—")} · ${category}`,
        drivers: insight.drivers,
        evidence: insight.evidence,
        factors,
        empty: false,
        emptyMessage: DISCOVERY_EMPTY.noOpportunities,
      })
    );
  }

  if (cards.length === 0) {
    return [
      normalizeDiscoveryIdeaCard({
        empty: true,
        emptyMessage: DISCOVERY_EMPTY.noOpportunities,
      }),
    ];
  }

  return rankIdeas(cards).slice(0, limit);
}

function clampInstitutionalBlend(
  factors: ReturnType<typeof composeDiscoveryScoreFactors>
): number {
  // Blended institutional-like score without re-running weights beyond compose.
  const n =
    factors.overallDiscoveryScore * 0.85 +
    factors.trust * 0.05 +
    factors.validation * 0.05 +
    factors.aiConviction * 0.05;
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n * 100) / 100));
}

export class InstitutionalIdeaEngine {
  generate(
    candidates: DiscoveryCandidate[],
    options?: InstitutionalIdeaOptions
  ): DiscoveryIdeaCard[] {
    try {
      return generateInstitutionalIdeas(candidates, options);
    } catch {
      return [
        normalizeDiscoveryIdeaCard({
          empty: true,
          emptyMessage: DISCOVERY_EMPTY.noOpportunities,
        }),
      ];
    }
  }
}
