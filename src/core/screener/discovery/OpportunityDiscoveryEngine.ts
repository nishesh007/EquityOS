/**
 * Opportunity Discovery Engine — auto-tag discovery kinds (Sprint 9D.R6).
 * Heuristics compose injected metrics / tags only — no indicator recalculation.
 */

import { safeScreenNumber, safeScreenText } from "../ScreenModels";
import {
  DISCOVERY_EMPTY,
  DISCOVERY_KINDS,
  emptyDiscoveryResult,
  normalizeDiscoveryIdeaCard,
  type DiscoveryCandidate,
  type DiscoveryIdeaCard,
  type DiscoveryKind,
  type DiscoveryResult,
} from "./DiscoveryPresentationModels";
import {
  composeDiscoveryScoreFactors,
  rankIdeas,
} from "./IdeaRankingEngine";
import { generateInstitutionalIdeas } from "./InstitutionalIdeaEngine";
import { discoverSectorRotation } from "./SectorRotationDiscovery";
import { discoverThemes, matchThemes } from "./ThemeDiscoveryEngine";

export interface OpportunityDiscoveryOptions {
  resultLimit?: number;
  kinds?: DiscoveryKind[];
  minDiscoveryScore?: number;
}

function metricFlag(
  candidate: DiscoveryCandidate,
  ...keys: string[]
): number | undefined {
  const metrics = candidate.metrics ?? {};
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

function hasTag(candidate: DiscoveryCandidate, ...needles: string[]): boolean {
  const tags = new Set(
    [...(candidate.tags ?? []), ...(candidate.themeTags ?? [])].map((t) =>
      String(t).toLowerCase()
    )
  );
  return needles.some((n) => tags.has(n.toLowerCase()));
}

export function classifyDiscoveryKinds(
  candidate: DiscoveryCandidate
): DiscoveryKind[] {
  const factors = composeDiscoveryScoreFactors(candidate);
  const kinds: DiscoveryKind[] = [];

  const priceAboveEma50 =
    metricFlag(candidate, "price_above_ema50", "above_ema50") ?? 0;
  const breakout =
    hasTag(candidate, "breakout", "fresh_breakout", "near_ath_breakout") ||
    (priceAboveEma50 >= 1 && factors.momentum >= 60);
  if (breakout) kinds.push("Fresh Breakouts");

  if (
    factors.aiConviction >= 75 &&
    factors.trust >= 70 &&
    factors.validation >= 70
  ) {
    kinds.push("High Conviction Buys");
  }

  if (
    hasTag(candidate, "accumulation", "accumulate") ||
    (factors.liquidity >= 60 && factors.momentum >= 55 && factors.momentum < 75)
  ) {
    kinds.push("Accumulation Candidates");
  }

  if (factors.momentum >= 72) kinds.push("Momentum Leaders");

  if (
    hasTag(candidate, "reversal", "early_trend", "trend_reversal") ||
    (factors.momentum >= 50 &&
      factors.momentum < 70 &&
      factors.technical >= 55 &&
      (metricFlag(candidate, "rsi") ?? 50) <= 45)
  ) {
    kinds.push("Early Trend Reversals");
  }

  if (factors.quality >= 75 && factors.risk >= 65) {
    kinds.push("Quality Compounders");
  }

  const valueScore =
    safeScreenNumber(candidate.value, metricFlag(candidate, "value") ?? 0);
  if (valueScore >= 65 || (factors.fundamental >= 60 && factors.momentum <= 50)) {
    kinds.push("Deep Value Opportunities");
  }

  if (factors.growth >= 70) kinds.push("Growth Leaders");

  if (
    factors.sectorStrength >= 70 ||
    hasTag(candidate, "sector_leader", "sector_leaders")
  ) {
    kinds.push("Sector Leaders");
  }

  if (
    hasTag(
      candidate,
      "institutional_buying",
      "fii_buying",
      "dii_buying",
      "smart_money"
    ) ||
    (factors.liquidity >= 70 && factors.aiConviction >= 65)
  ) {
    kinds.push("Institutional Buying");
  }

  if (factors.trust >= 80) kinds.push("High Trust Opportunities");
  if (factors.validation >= 80) kinds.push("High Validation Opportunities");

  if (factors.risk >= 75 && factors.momentum >= 50) {
    kinds.push("Low Risk Entries");
  }

  if (
    hasTag(candidate, "multi_bagger", "multibagger", "high_upside") ||
    (factors.growth >= 75 &&
      factors.momentum >= 65 &&
      (candidate.riskReward ?? 0) >= 2)
  ) {
    kinds.push("Multi-bagger Candidates");
  }

  return kinds;
}

export function discoverIdeas(
  candidates: DiscoveryCandidate[],
  options?: OpportunityDiscoveryOptions
): DiscoveryResult {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return emptyDiscoveryResult(DISCOVERY_EMPTY.awaitingMarketData);
  }

  const minScore = safeScreenNumber(options?.minDiscoveryScore, 0);
  const limit = Math.max(
    1,
    Math.floor(safeScreenNumber(options?.resultLimit, 50))
  );
  const filterKinds = options?.kinds?.length
    ? new Set(options.kinds)
    : null;

  const baseCards = generateInstitutionalIdeas(candidates, {
    minDiscoveryScore: minScore,
    resultLimit: 500,
  }).filter((c) => !c.empty);

  const ideas: DiscoveryIdeaCard[] = [];
  for (const candidate of candidates) {
    const factors = composeDiscoveryScoreFactors(candidate);
    if (factors.overallDiscoveryScore < minScore) continue;

    const kinds = classifyDiscoveryKinds(candidate);
    if (filterKinds) {
      const hit = kinds.some((k) => filterKinds.has(k));
      if (!hit) continue;
    }
    if (kinds.length === 0 && factors.overallDiscoveryScore < 40) continue;

    const existing = baseCards.find(
      (c) =>
        c.ticker === safeScreenText(candidate.ticker, "").toUpperCase()
    );
    const themes = matchThemes(candidate);

    ideas.push(
      normalizeDiscoveryIdeaCard({
        company: candidate.company ?? existing?.company,
        ticker: candidate.ticker,
        sector: candidate.sector ?? existing?.sector,
        industry: candidate.industry ?? existing?.industry,
        category: existing?.category ?? "Watchlist Candidates",
        kinds: kinds.length ? kinds : existing?.kinds ?? [],
        themes,
        badges: [
          ...(kinds.slice(0, 3) as string[]),
          ...(existing?.badges ?? []),
        ],
        discoveryScore: factors.overallDiscoveryScore,
        institutionalScore:
          existing?.institutionalScore ?? factors.overallDiscoveryScore,
        confidence: factors.aiConviction,
        trust: factors.trust,
        validation: factors.validation,
        aiConviction: factors.aiConviction,
        reasonSummary:
          candidate.reasonSummary ??
          existing?.reasonSummary ??
          (kinds.length
            ? kinds.slice(0, 2).join(" · ")
            : "Discovery candidate"),
        drivers: existing?.drivers ?? [],
        evidence: [
          ...kinds.map((k) => String(k)),
          ...(candidate.evidence ?? []),
          ...(existing?.evidence ?? []),
        ],
        factors,
        empty: false,
        emptyMessage: DISCOVERY_EMPTY.noOpportunities,
      })
    );
  }

  if (ideas.length === 0) {
    return emptyDiscoveryResult(DISCOVERY_EMPTY.noOpportunities);
  }

  const ranked = rankIdeas(ideas).slice(0, limit);
  const themes = discoverThemes(candidates);
  const sectorRotation = discoverSectorRotation(candidates);

  return {
    ideas: ranked,
    themes: themes.filter((t) => !t.empty),
    sectorRotation: sectorRotation.filter((s) => !s.empty),
    insights: [],
    totalIdeas: ranked.length,
    empty: false,
    emptyMessage: DISCOVERY_EMPTY.noOpportunities,
    generatedAt: new Date().toISOString(),
  };
}

export { DISCOVERY_KINDS };

export class OpportunityDiscoveryEngine {
  discover(
    candidates: DiscoveryCandidate[],
    options?: OpportunityDiscoveryOptions
  ): DiscoveryResult {
    try {
      return discoverIdeas(candidates, options);
    } catch {
      return emptyDiscoveryResult(DISCOVERY_EMPTY.awaitingMarketData);
    }
  }

  classify(candidate: DiscoveryCandidate): DiscoveryKind[] {
    return classifyDiscoveryKinds(candidate);
  }
}
