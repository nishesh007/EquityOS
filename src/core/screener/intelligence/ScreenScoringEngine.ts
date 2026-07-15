/**
 * Institutional AI Screener — multi-factor scoring (Sprint 9D.R2).
 * Composes Opportunity / Validation / Trust / Confidence + strength factors.
 * No duplicated indicator or fundamental calculations.
 */

import {
  safeScreenNumber,
  type ScreenEngineScores,
  type ScreenUniverseCandidate,
} from "../ScreenModels";
import {
  emptyScoreFactors,
  type ScreenScoreFactors,
} from "./ScreenPresentationModels";

const WEIGHTS = {
  opportunityScore: 0.14,
  validationScore: 0.12,
  trustScore: 0.12,
  aiConfidence: 0.12,
  fundamentalStrength: 0.14,
  technicalStrength: 0.14,
  momentumStrength: 0.08,
  sectorStrength: 0.07,
  marketStrength: 0.07,
} as const;

function clamp(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n * 100) / 100));
}

function metricNum(
  metrics: ScreenUniverseCandidate["metrics"],
  key: string
): number | null {
  const raw = metrics?.[key];
  if (raw == null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Derive technical strength 0–100 from existing engine metric bag. */
export function deriveTechnicalStrength(
  candidate: ScreenUniverseCandidate
): number {
  const m = candidate.metrics;
  let score = 45;
  const rsi = metricNum(m, "rsi") ?? metricNum(m, "rsi_14");
  if (rsi != null) {
    if (rsi >= 45 && rsi <= 70) score += 12;
    else if (rsi < 30 || rsi > 75) score -= 8;
  }
  const momentum = metricNum(m, "momentum") ?? metricNum(m, "momentum_score");
  if (momentum != null) score += Math.max(-10, Math.min(15, momentum / 8));
  const rs = metricNum(m, "relative_strength");
  if (rs != null && rs > 0) score += Math.min(12, rs / 10);
  const adx = metricNum(m, "adx");
  if (adx != null && adx >= 25) score += 8;
  const above50 = metricNum(m, "price_above_ema50");
  if (above50 != null && above50 > 0) score += 8;
  const above200 = metricNum(m, "price_above_ema200");
  if (above200 != null && above200 > 0) score += 6;
  const macdHist = metricNum(m, "macd_histogram") ?? metricNum(m, "macd");
  if (macdHist != null && macdHist > 0) score += 6;
  const trend = metricNum(m, "trend_score");
  if (trend != null) score = (score + clamp(trend)) / 2;
  return clamp(score);
}

/** Derive fundamental strength 0–100 from existing metric bag. */
export function deriveFundamentalStrength(
  candidate: ScreenUniverseCandidate
): number {
  const m = candidate.metrics;
  let score = 45;
  const roe = metricNum(m, "roe");
  if (roe != null) score += Math.max(-10, Math.min(15, (roe - 10) / 2));
  const roce = metricNum(m, "roce");
  if (roce != null) score += Math.max(-8, Math.min(12, (roce - 12) / 2));
  const rev = metricNum(m, "revenue_yoy") ?? metricNum(m, "revenue_growth");
  if (rev != null) score += Math.max(-10, Math.min(12, rev / 3));
  const profit = metricNum(m, "profit_yoy") ?? metricNum(m, "profit_growth");
  if (profit != null) score += Math.max(-8, Math.min(10, profit / 4));
  const de = metricNum(m, "debt_equity");
  if (de != null) {
    if (de < 0.5) score += 8;
    else if (de > 2) score -= 10;
  }
  const pe = metricNum(m, "pe");
  if (pe != null && pe > 0 && pe < 25) score += 6;
  const quality = metricNum(m, "quality_score") ?? metricNum(m, "fundamental_score");
  if (quality != null) score = (score + clamp(quality)) / 2;
  return clamp(score);
}

export function deriveMomentumStrength(
  candidate: ScreenUniverseCandidate
): number {
  const m = candidate.metrics;
  const momentum =
    metricNum(m, "momentum_score") ??
    metricNum(m, "momentum") ??
    metricNum(m, "week52_momentum");
  if (momentum != null) return clamp(momentum > 100 ? momentum : 50 + momentum);
  const rsi = metricNum(m, "rsi");
  if (rsi != null) return clamp(rsi);
  return 50;
}

export function deriveSectorStrength(
  candidate: ScreenUniverseCandidate,
  scores?: ScreenEngineScores
): number {
  const fromMetrics = metricNum(candidate.metrics, "sector_strength");
  if (fromMetrics != null) return clamp(fromMetrics);
  // Soft prior from opportunity score when sector metrics absent
  return clamp(safeScreenNumber(scores?.opportunityScore, 50));
}

export function deriveMarketStrength(
  candidate: ScreenUniverseCandidate,
  scores?: ScreenEngineScores
): number {
  const fromMetrics =
    metricNum(candidate.metrics, "market_strength") ??
    metricNum(candidate.metrics, "trend_score");
  if (fromMetrics != null) return clamp(fromMetrics);
  return clamp(safeScreenNumber(scores?.aiScore, 50));
}

/**
 * Compose Final AI Screener Score 0–100 from existing engine outputs + derived strengths.
 */
export function composeScreenScoreFactors(
  candidate: ScreenUniverseCandidate,
  scores?: ScreenEngineScores
): ScreenScoreFactors {
  const opportunityScore = clamp(
    safeScreenNumber(
      scores?.opportunityScore ?? scores?.aiScore,
      metricNum(candidate.metrics, "overall_score") ?? 0
    )
  );
  const validationScore = clamp(
    safeScreenNumber(
      scores?.validationScore,
      metricNum(candidate.metrics, "validation_score") ?? 0
    )
  );
  const trustScore = clamp(
    safeScreenNumber(
      scores?.trustScore,
      metricNum(candidate.metrics, "trust_score") ?? 0
    )
  );
  const aiConfidence = clamp(
    safeScreenNumber(
      scores?.confidence,
      metricNum(candidate.metrics, "confidence_score") ??
        metricNum(candidate.metrics, "research_confidence") ??
        0
    )
  );

  const fundamentalStrength = deriveFundamentalStrength(candidate);
  const technicalStrength = deriveTechnicalStrength(candidate);
  const momentumStrength = deriveMomentumStrength(candidate);
  const sectorStrength = deriveSectorStrength(candidate, scores);
  const marketStrength = deriveMarketStrength(candidate, scores);

  const finalAiScreenerScore = clamp(
    opportunityScore * WEIGHTS.opportunityScore +
      validationScore * WEIGHTS.validationScore +
      trustScore * WEIGHTS.trustScore +
      aiConfidence * WEIGHTS.aiConfidence +
      fundamentalStrength * WEIGHTS.fundamentalStrength +
      technicalStrength * WEIGHTS.technicalStrength +
      momentumStrength * WEIGHTS.momentumStrength +
      sectorStrength * WEIGHTS.sectorStrength +
      marketStrength * WEIGHTS.marketStrength
  );

  return {
    opportunityScore,
    validationScore,
    trustScore,
    aiConfidence,
    fundamentalStrength,
    technicalStrength,
    momentumStrength,
    sectorStrength,
    marketStrength,
    finalAiScreenerScore,
  };
}

export class ScreenScoringEngine {
  score(
    candidate: ScreenUniverseCandidate,
    scores?: ScreenEngineScores
  ): ScreenScoreFactors {
    try {
      return composeScreenScoreFactors(candidate, scores);
    } catch {
      return emptyScoreFactors();
    }
  }

  scoreMany(
    candidates: ScreenUniverseCandidate[],
    scoreMap?: Map<string, ScreenEngineScores>
  ): Map<string, ScreenScoreFactors> {
    const out = new Map<string, ScreenScoreFactors>();
    for (const c of candidates) {
      const ticker = (c.ticker ?? "").toUpperCase();
      if (!ticker) continue;
      out.set(ticker, this.score(c, scoreMap?.get(ticker)));
    }
    return out;
  }
}

export function scoreCandidate(
  candidate: ScreenUniverseCandidate,
  scores?: ScreenEngineScores
): ScreenScoreFactors {
  return new ScreenScoringEngine().score(candidate, scores);
}
