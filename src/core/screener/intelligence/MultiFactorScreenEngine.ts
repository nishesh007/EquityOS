/**
 * Institutional AI Screener — multi-factor AI screening (Sprint 9D.R2).
 * Composes technical + fundamental filter matches with multi-factor AI score.
 */

import {
  safeScreenText,
  type ScreenEngineScores,
  type ScreenUniverseCandidate,
} from "../ScreenModels";
import { buildExplainability } from "./ScreenExplainabilityEngine";
import {
  FUNDAMENTAL_FILTER_IDS,
  FUNDAMENTAL_FILTERS,
  type FundamentalFilterId,
} from "./FundamentalScreenEngine";
import {
  SCREEN_INTELLIGENCE_EMPTY,
  emptyIntelligenceResult,
  gradeFromScore,
  normalizeResultCard,
  type IntelligenceScreenResult,
  type ScreenRankingMode,
  type ScreenResultCard,
} from "./ScreenPresentationModels";
import { rankResults } from "./ScreenRankingEngine";
import { scoreCandidate } from "./ScreenScoringEngine";
import {
  TECHNICAL_FILTER_IDS,
  TECHNICAL_FILTERS,
  type TechnicalFilterId,
} from "./TechnicalScreenEngine";

export interface MultiFactorScreenOptions {
  universe?: ScreenUniverseCandidate[];
  engineScores?: ScreenEngineScores[];
  technicalFilters?: TechnicalFilterId[];
  fundamentalFilters?: FundamentalFilterId[];
  /** Minimum AI screener score 0–100 (default 45) */
  minAiScore?: number;
  minTechnicalMatches?: number;
  minFundamentalMatches?: number;
  rankingMode?: ScreenRankingMode;
  resultLimit?: number;
}

function evalTech(
  metrics: Record<string, number | string | null | undefined>,
  price: number,
  ids: TechnicalFilterId[]
): { matched: string[]; failed: string[] } {
  const matched: string[] = [];
  const failed: string[] = [];
  for (const filter of TECHNICAL_FILTERS.filter((f) => ids.includes(f.id))) {
    try {
      if (filter.test(metrics, price)) matched.push(filter.label);
      else failed.push(filter.label);
    } catch {
      failed.push(filter.label);
    }
  }
  return { matched, failed };
}

function evalFund(
  metrics: Record<string, number | string | null | undefined>,
  ids: FundamentalFilterId[]
): { matched: string[]; failed: string[] } {
  const matched: string[] = [];
  const failed: string[] = [];
  for (const filter of FUNDAMENTAL_FILTERS.filter((f) => ids.includes(f.id))) {
    try {
      if (filter.test(metrics)) matched.push(filter.label);
      else failed.push(filter.label);
    } catch {
      failed.push(filter.label);
    }
  }
  return { matched, failed };
}

export function runMultiFactorScreen(
  options: MultiFactorScreenOptions = {}
): IntelligenceScreenResult {
  const universe = options.universe ?? [];
  if (universe.length === 0) {
    return emptyIntelligenceResult(
      "multi-factor",
      SCREEN_INTELLIGENCE_EMPTY.awaitingScreening,
      options.rankingMode ?? "Overall"
    );
  }

  const techIds =
    options.technicalFilters ??
    TECHNICAL_FILTER_IDS.filter((id) => id !== "death_cross" && id !== "week52_low");
  const fundIds = options.fundamentalFilters ?? [...FUNDAMENTAL_FILTER_IDS];
  const minAi = options.minAiScore ?? 45;
  const minTech = options.minTechnicalMatches ?? 1;
  const minFund = options.minFundamentalMatches ?? 1;
  const scoreMap = new Map(
    (options.engineScores ?? []).map((s) => [s.ticker.toUpperCase(), s])
  );

  const cards: ScreenResultCard[] = [];
  for (const candidate of universe) {
    const ticker = safeScreenText(candidate.ticker, "").toUpperCase();
    if (!ticker) continue;
    const metrics = candidate.metrics ?? {};
    const price =
      typeof candidate.price === "number" && Number.isFinite(candidate.price)
        ? candidate.price
        : 0;

    const tech = evalTech(metrics, price, techIds);
    const fund = evalFund(metrics, fundIds);
    if (tech.matched.length < minTech || fund.matched.length < minFund) continue;

    const scores = scoreMap.get(ticker);
    const factors = scoreCandidate(candidate, scores);
    if (factors.finalAiScreenerScore < minAi) continue;

    const matched = [...tech.matched, ...fund.matched];
    const failed = [...tech.failed, ...fund.failed];
    const explainability = buildExplainability({
      ticker,
      company: candidate.company,
      matchedRules: matched,
      failedRules: failed,
      factors,
      reasonSummary: scores?.reasonSummary,
      evidence: [
        `AI Screener ${factors.finalAiScreenerScore}`,
        ...matched.slice(0, 6),
      ],
    });

    cards.push(
      normalizeResultCard({
        ticker,
        company: candidate.company,
        sector: candidate.sector,
        industry: candidate.industry,
        price: candidate.price,
        aiScore: factors.finalAiScreenerScore,
        validation: factors.validationScore,
        trust: factors.trustScore,
        confidence: factors.aiConfidence,
        technicalGrade: gradeFromScore(factors.technicalStrength),
        fundamentalGrade: gradeFromScore(factors.fundamentalStrength),
        reasonSummary: `AI ${factors.finalAiScreenerScore} · ${matched.slice(0, 3).join(", ") || "Multi-factor AI match"}`,
        matchedFilters: matched,
        factors,
        explainability,
      })
    );
  }

  if (cards.length === 0) {
    return emptyIntelligenceResult(
      "multi-factor",
      SCREEN_INTELLIGENCE_EMPTY.noAIMatches,
      options.rankingMode ?? "Overall"
    );
  }

  const ranked = rankResults(cards, options.rankingMode ?? "Overall");
  const limited = ranked.slice(0, options.resultLimit ?? 50);
  return {
    mode: "multi-factor",
    cards: limited,
    totalMatches: limited.length,
    empty: false,
    emptyMessage: SCREEN_INTELLIGENCE_EMPTY.awaitingScreening,
    rankingMode: options.rankingMode ?? "Overall",
    generatedAt: new Date().toISOString(),
  };
}

export class MultiFactorScreenEngine {
  run(options?: MultiFactorScreenOptions): IntelligenceScreenResult {
    return runMultiFactorScreen(options);
  }
}
