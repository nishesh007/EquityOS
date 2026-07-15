/**
 * Institutional AI Screener — fundamental filter evaluation (Sprint 9D.R2).
 * Evaluates precomputed Research / fundamentals metric bags only.
 * Does NOT recalculate ratios.
 */

import {
  safeScreenNumber,
  safeScreenText,
  type ScreenEngineScores,
  type ScreenUniverseCandidate,
} from "../ScreenModels";
import { buildExplainability } from "./ScreenExplainabilityEngine";
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

export const FUNDAMENTAL_FILTER_IDS = [
  "market_cap",
  "revenue_growth",
  "profit_growth",
  "eps_growth",
  "roe",
  "roce",
  "debt_equity",
  "current_ratio",
  "peg",
  "pe",
  "pb",
  "dividend_yield",
  "operating_margin",
  "net_margin",
  "promoter_holding",
  "fii_holding",
  "dii_holding",
  "cash_flow",
  "free_cash_flow",
] as const;

export type FundamentalFilterId = (typeof FUNDAMENTAL_FILTER_IDS)[number];

export interface FundamentalFilterSpec {
  id: FundamentalFilterId;
  label: string;
  test: (metrics: Record<string, number | string | null | undefined>) => boolean;
}

function num(
  metrics: Record<string, number | string | null | undefined>,
  ...keys: string[]
): number | null {
  for (const key of keys) {
    const raw = metrics[key];
    if (raw == null || raw === "") continue;
    const n = typeof raw === "number" ? raw : Number(raw);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export const FUNDAMENTAL_FILTERS: FundamentalFilterSpec[] = [
  {
    id: "market_cap",
    label: "Market Cap",
    test: (m) => {
      const cap = num(m, "market_cap", "marketCap");
      return cap != null && cap > 0;
    },
  },
  {
    id: "revenue_growth",
    label: "Revenue Growth",
    test: (m) => {
      const v = num(m, "revenue_yoy", "revenue_growth");
      return v != null && v >= 8;
    },
  },
  {
    id: "profit_growth",
    label: "Profit Growth",
    test: (m) => {
      const v = num(m, "profit_yoy", "profit_growth");
      return v != null && v >= 8;
    },
  },
  {
    id: "eps_growth",
    label: "EPS Growth",
    test: (m) => {
      const v = num(m, "eps_yoy", "eps_growth");
      return v != null && v >= 5;
    },
  },
  {
    id: "roe",
    label: "ROE",
    test: (m) => {
      const v = num(m, "roe");
      return v != null && v >= 12;
    },
  },
  {
    id: "roce",
    label: "ROCE",
    test: (m) => {
      const v = num(m, "roce");
      return v != null && v >= 12;
    },
  },
  {
    id: "debt_equity",
    label: "Debt/Equity",
    test: (m) => {
      const v = num(m, "debt_equity");
      return v != null && v <= 1.5;
    },
  },
  {
    id: "current_ratio",
    label: "Current Ratio",
    test: (m) => {
      const v = num(m, "current_ratio");
      return v != null && v >= 1;
    },
  },
  {
    id: "peg",
    label: "PEG",
    test: (m) => {
      const v = num(m, "peg");
      return v != null && v > 0 && v <= 1.5;
    },
  },
  {
    id: "pe",
    label: "PE",
    test: (m) => {
      const v = num(m, "pe");
      return v != null && v > 0 && v <= 40;
    },
  },
  {
    id: "pb",
    label: "PB",
    test: (m) => {
      const v = num(m, "pb");
      return v != null && v > 0 && v <= 8;
    },
  },
  {
    id: "dividend_yield",
    label: "Dividend Yield",
    test: (m) => {
      const v = num(m, "dividend_yield");
      return v != null && v >= 0.5;
    },
  },
  {
    id: "operating_margin",
    label: "Operating Margin",
    test: (m) => {
      const v = num(m, "operating_margin");
      return v != null && v >= 8;
    },
  },
  {
    id: "net_margin",
    label: "Net Margin",
    test: (m) => {
      const v = num(m, "net_margin");
      return v != null && v >= 5;
    },
  },
  {
    id: "promoter_holding",
    label: "Promoter Holding",
    test: (m) => {
      const v = num(m, "promoter_holding");
      return v != null && v >= 40;
    },
  },
  {
    id: "fii_holding",
    label: "FII Holding",
    test: (m) => {
      const v = num(m, "fii_holding");
      return v != null && v >= 5;
    },
  },
  {
    id: "dii_holding",
    label: "DII Holding",
    test: (m) => {
      const v = num(m, "dii_holding");
      return v != null && v >= 5;
    },
  },
  {
    id: "cash_flow",
    label: "Cash Flow",
    test: (m) => {
      const v = num(m, "operating_cash_flow", "cash_flow", "cash_conversion");
      return v != null && v > 0;
    },
  },
  {
    id: "free_cash_flow",
    label: "Free Cash Flow",
    test: (m) => {
      const v = num(m, "fcf", "free_cash_flow");
      return v != null && v > 0;
    },
  },
];

export interface FundamentalScreenOptions {
  universe?: ScreenUniverseCandidate[];
  engineScores?: ScreenEngineScores[];
  filters?: FundamentalFilterId[];
  minMatches?: number;
  rankingMode?: ScreenRankingMode;
  resultLimit?: number;
}

function evaluateFundamental(
  candidate: ScreenUniverseCandidate,
  filterIds: FundamentalFilterId[]
): { matched: string[]; failed: string[] } {
  const metrics = candidate.metrics ?? {};
  const matched: string[] = [];
  const failed: string[] = [];
  const active = FUNDAMENTAL_FILTERS.filter((f) => filterIds.includes(f.id));
  for (const filter of active) {
    try {
      if (filter.test(metrics)) matched.push(filter.label);
      else failed.push(filter.label);
    } catch {
      failed.push(filter.label);
    }
  }
  return { matched, failed };
}

export function runFundamentalScreen(
  options: FundamentalScreenOptions = {}
): IntelligenceScreenResult {
  const universe = options.universe ?? [];
  if (universe.length === 0) {
    return emptyIntelligenceResult(
      "fundamental",
      SCREEN_INTELLIGENCE_EMPTY.awaitingScreening,
      options.rankingMode ?? "Fundamental"
    );
  }

  const filterIds = options.filters ?? [...FUNDAMENTAL_FILTER_IDS];
  const minMatches = options.minMatches ?? 1;
  const scoreMap = new Map(
    (options.engineScores ?? []).map((s) => [s.ticker.toUpperCase(), s])
  );

  const cards: ScreenResultCard[] = [];
  for (const candidate of universe) {
    const ticker = safeScreenText(candidate.ticker, "").toUpperCase();
    if (!ticker) continue;
    const { matched, failed } = evaluateFundamental(candidate, filterIds);
    if (matched.length < minMatches) continue;

    const scores = scoreMap.get(ticker);
    const factors = scoreCandidate(candidate, scores);
    const explainability = buildExplainability({
      ticker,
      company: candidate.company,
      matchedRules: matched,
      failedRules: failed,
      factors,
      reasonSummary: scores?.reasonSummary,
      evidence: matched,
    });

    cards.push(
      normalizeResultCard({
        ticker,
        company: candidate.company,
        sector: candidate.sector,
        industry: candidate.industry,
        price: candidate.price ?? safeScreenNumber(num(candidate.metrics ?? {}, "cmp"), 0),
        aiScore: factors.finalAiScreenerScore,
        validation: factors.validationScore,
        trust: factors.trustScore,
        confidence: factors.aiConfidence,
        technicalGrade: gradeFromScore(factors.technicalStrength),
        fundamentalGrade: gradeFromScore(factors.fundamentalStrength),
        reasonSummary:
          matched.slice(0, 3).join(", ") || "Fundamental screen match",
        matchedFilters: matched,
        factors,
        explainability,
      })
    );
  }

  if (cards.length === 0) {
    return emptyIntelligenceResult(
      "fundamental",
      SCREEN_INTELLIGENCE_EMPTY.noFundamentalMatches,
      options.rankingMode ?? "Fundamental"
    );
  }

  const ranked = rankResults(cards, options.rankingMode ?? "Fundamental");
  const limited = ranked.slice(0, options.resultLimit ?? 50);
  return {
    mode: "fundamental",
    cards: limited,
    totalMatches: limited.length,
    empty: false,
    emptyMessage: SCREEN_INTELLIGENCE_EMPTY.awaitingScreening,
    rankingMode: options.rankingMode ?? "Fundamental",
    generatedAt: new Date().toISOString(),
  };
}

export class FundamentalScreenEngine {
  run(options?: FundamentalScreenOptions): IntelligenceScreenResult {
    return runFundamentalScreen(options);
  }
}
