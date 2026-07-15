/**
 * Institutional AI Screener — technical filter evaluation (Sprint 9D.R2).
 * Evaluates precomputed Market / Opportunity technical metrics only.
 * Does NOT recalculate RSI, MACD, EMA, etc.
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

export const TECHNICAL_FILTER_IDS = [
  "rsi",
  "macd",
  "ma_crossover",
  "ema_alignment",
  "sma_alignment",
  "week52_high",
  "week52_low",
  "breakout",
  "volume_breakout",
  "relative_strength",
  "momentum",
  "adx",
  "atr",
  "bollinger",
  "supertrend",
  "price_above_50_dma",
  "price_above_200_dma",
  "golden_cross",
  "death_cross",
] as const;

export type TechnicalFilterId = (typeof TECHNICAL_FILTER_IDS)[number];

export interface TechnicalFilterSpec {
  id: TechnicalFilterId;
  label: string;
  /** Return true when the filter condition is satisfied from existing metrics. */
  test: (metrics: Record<string, number | string | null | undefined>, price: number) => boolean;
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

export const TECHNICAL_FILTERS: TechnicalFilterSpec[] = [
  {
    id: "rsi",
    label: "RSI",
    test: (m) => {
      const rsi = num(m, "rsi", "rsi_14");
      return rsi != null && rsi >= 40 && rsi <= 70;
    },
  },
  {
    id: "macd",
    label: "MACD",
    test: (m) => {
      const hist = num(m, "macd_histogram", "macd");
      return hist != null && hist > 0;
    },
  },
  {
    id: "ma_crossover",
    label: "Moving Average Crossovers",
    test: (m) => {
      const ema20 = num(m, "ema20");
      const ema50 = num(m, "ema50");
      return ema20 != null && ema50 != null && ema20 > ema50;
    },
  },
  {
    id: "ema_alignment",
    label: "EMA Alignment",
    test: (m) => {
      const e20 = num(m, "ema20");
      const e50 = num(m, "ema50");
      const e200 = num(m, "ema200");
      return e20 != null && e50 != null && e200 != null && e20 > e50 && e50 > e200;
    },
  },
  {
    id: "sma_alignment",
    label: "SMA Alignment",
    test: (m) => {
      const s50 = num(m, "sma50", "ema50");
      const s200 = num(m, "sma200", "ema200");
      return s50 != null && s200 != null && s50 > s200;
    },
  },
  {
    id: "week52_high",
    label: "52 Week High",
    test: (m, price) => {
      const high = num(m, "week52_high", "high_52w");
      if (high == null || high <= 0 || price <= 0) return false;
      return price / high >= 0.95;
    },
  },
  {
    id: "week52_low",
    label: "52 Week Low",
    test: (m, price) => {
      const low = num(m, "week52_low", "low_52w");
      if (low == null || low <= 0 || price <= 0) return false;
      return price / low <= 1.08;
    },
  },
  {
    id: "breakout",
    label: "Breakout",
    test: (m, price) => {
      const resistance = num(m, "resistance");
      const breakoutFlag = num(m, "breakout_signal", "breakout");
      if (breakoutFlag != null && breakoutFlag > 0) return true;
      return resistance != null && price > resistance;
    },
  },
  {
    id: "volume_breakout",
    label: "Volume Breakout",
    test: (m) => {
      const rvol = num(m, "relative_volume", "rvol", "volume_ratio");
      return rvol != null && rvol >= 1.5;
    },
  },
  {
    id: "relative_strength",
    label: "Relative Strength",
    test: (m) => {
      const rs = num(m, "relative_strength");
      return rs != null && rs >= 60;
    },
  },
  {
    id: "momentum",
    label: "Momentum",
    test: (m) => {
      const mom = num(m, "momentum", "momentum_score");
      return mom != null && mom > 0;
    },
  },
  {
    id: "adx",
    label: "ADX",
    test: (m) => {
      const adx = num(m, "adx");
      return adx != null && adx >= 25;
    },
  },
  {
    id: "atr",
    label: "ATR",
    test: (m) => {
      const atr = num(m, "atr", "volatility");
      return atr != null && atr > 0;
    },
  },
  {
    id: "bollinger",
    label: "Bollinger Bands",
    test: (m) => {
      const width = num(m, "bollinger_width");
      return width != null && width > 0;
    },
  },
  {
    id: "supertrend",
    label: "Supertrend",
    test: (m, price) => {
      const st = num(m, "supertrend");
      const dir = num(m, "supertrend_direction");
      if (dir != null && dir > 0) return true;
      return st != null && price > st;
    },
  },
  {
    id: "price_above_50_dma",
    label: "Price above 50 DMA",
    test: (m, price) => {
      const flag = num(m, "price_above_ema50");
      if (flag != null) return flag > 0;
      const ema50 = num(m, "ema50", "sma50");
      return ema50 != null && price > ema50;
    },
  },
  {
    id: "price_above_200_dma",
    label: "Price above 200 DMA",
    test: (m, price) => {
      const flag = num(m, "price_above_ema200");
      if (flag != null) return flag > 0;
      const ema200 = num(m, "ema200", "sma200");
      return ema200 != null && price > ema200;
    },
  },
  {
    id: "golden_cross",
    label: "Golden Cross",
    test: (m) => {
      const flag = num(m, "golden_cross");
      if (flag != null) return flag > 0;
      const s50 = num(m, "sma50", "ema50");
      const s200 = num(m, "sma200", "ema200");
      return s50 != null && s200 != null && s50 > s200;
    },
  },
  {
    id: "death_cross",
    label: "Death Cross",
    test: (m) => {
      const flag = num(m, "death_cross");
      if (flag != null) return flag > 0;
      const s50 = num(m, "sma50", "ema50");
      const s200 = num(m, "sma200", "ema200");
      return s50 != null && s200 != null && s50 < s200;
    },
  },
];

export interface TechnicalScreenOptions {
  universe?: ScreenUniverseCandidate[];
  engineScores?: ScreenEngineScores[];
  /** Subset of filters; default all bullish-leaning except death_cross */
  filters?: TechnicalFilterId[];
  /** Minimum matched filters required (default 1) */
  minMatches?: number;
  rankingMode?: ScreenRankingMode;
  resultLimit?: number;
}

function evaluateTechnical(
  candidate: ScreenUniverseCandidate,
  filterIds: TechnicalFilterId[]
): { matched: string[]; failed: string[] } {
  const metrics = candidate.metrics ?? {};
  const price = safeScreenNumber(candidate.price, num(metrics, "cmp", "price") ?? 0);
  const matched: string[] = [];
  const failed: string[] = [];
  const active = TECHNICAL_FILTERS.filter((f) => filterIds.includes(f.id));
  for (const filter of active) {
    try {
      if (filter.test(metrics, price)) matched.push(filter.label);
      else failed.push(filter.label);
    } catch {
      failed.push(filter.label);
    }
  }
  return { matched, failed };
}

export function runTechnicalScreen(
  options: TechnicalScreenOptions = {}
): IntelligenceScreenResult {
  const universe = options.universe ?? [];
  if (universe.length === 0) {
    return emptyIntelligenceResult(
      "technical",
      SCREEN_INTELLIGENCE_EMPTY.awaitingScreening,
      options.rankingMode ?? "Technical"
    );
  }

  const filterIds =
    options.filters ??
    TECHNICAL_FILTER_IDS.filter((id) => id !== "death_cross" && id !== "week52_low");
  const minMatches = options.minMatches ?? 1;
  const scoreMap = new Map(
    (options.engineScores ?? []).map((s) => [s.ticker.toUpperCase(), s])
  );

  const cards: ScreenResultCard[] = [];
  for (const candidate of universe) {
    const ticker = safeScreenText(candidate.ticker, "").toUpperCase();
    if (!ticker) continue;
    const { matched, failed } = evaluateTechnical(candidate, filterIds);
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
        price: candidate.price,
        aiScore: factors.finalAiScreenerScore,
        validation: factors.validationScore,
        trust: factors.trustScore,
        confidence: factors.aiConfidence,
        technicalGrade: gradeFromScore(factors.technicalStrength),
        fundamentalGrade: gradeFromScore(factors.fundamentalStrength),
        reasonSummary:
          matched.slice(0, 3).join(", ") || "Technical screen match",
        matchedFilters: matched,
        factors,
        explainability,
      })
    );
  }

  if (cards.length === 0) {
    return emptyIntelligenceResult(
      "technical",
      SCREEN_INTELLIGENCE_EMPTY.noTechnicalMatches,
      options.rankingMode ?? "Technical"
    );
  }

  const ranked = rankResults(cards, options.rankingMode ?? "Technical");
  const limited = ranked.slice(0, options.resultLimit ?? 50);
  return {
    mode: "technical",
    cards: limited,
    totalMatches: limited.length,
    empty: false,
    emptyMessage: SCREEN_INTELLIGENCE_EMPTY.awaitingScreening,
    rankingMode: options.rankingMode ?? "Technical",
    generatedAt: new Date().toISOString(),
  };
}

export class TechnicalScreenEngine {
  run(options?: TechnicalScreenOptions): IntelligenceScreenResult {
    return runTechnicalScreen(options);
  }
}
