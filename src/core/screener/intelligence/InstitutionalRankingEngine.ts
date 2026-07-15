/**
 * Institutional Ranking Engine — Overall Institutional Score (Sprint 9D.R4).
 * Reuses Validation / Trust / Opportunity / Research strength fields — no recalculation.
 */

import { safeScreenNumber } from "../ScreenModels";
import {
  emptyInstitutionalFactors,
  recommendationFromScore,
  type InstitutionalCandidate,
  type InstitutionalRecommendation,
  type InstitutionalResultCard,
  type InstitutionalScoreFactors,
} from "./InstitutionalScreenModels";

const WEIGHTS = {
  technical: 0.1,
  fundamental: 0.1,
  growth: 0.08,
  momentum: 0.08,
  quality: 0.1,
  income: 0.05,
  value: 0.07,
  risk: 0.08,
  validation: 0.12,
  trust: 0.12,
  aiConfidence: 0.1,
} as const;

function clamp(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n * 100) / 100));
}

export function composeInstitutionalScoreFactors(
  candidate: InstitutionalCandidate
): InstitutionalScoreFactors {
  const technical = clamp(
    safeScreenNumber(candidate.technical, candidate.momentum ?? 50)
  );
  const fundamental = clamp(
    safeScreenNumber(candidate.fundamentalStrength, 50)
  );
  const growth = clamp(safeScreenNumber(candidate.growth, fundamental));
  const momentum = clamp(
    safeScreenNumber(candidate.momentum, candidate.opportunityScore ?? 50)
  );
  const quality = clamp(safeScreenNumber(candidate.quality, fundamental));
  const income = clamp(safeScreenNumber(candidate.income, 40));
  const value = clamp(safeScreenNumber(candidate.value, 45));
  // Higher risk score = better risk profile (invert raw risk if needed by callers)
  const risk = clamp(safeScreenNumber(candidate.risk, 50));
  const validation = clamp(safeScreenNumber(candidate.validationScore, 0));
  const trust = clamp(safeScreenNumber(candidate.trustScore, 0));
  const aiConfidence = clamp(
    safeScreenNumber(
      candidate.confidence ?? candidate.aiConviction,
      candidate.opportunityScore ?? 0
    )
  );

  const overallInstitutionalScore = clamp(
    technical * WEIGHTS.technical +
      fundamental * WEIGHTS.fundamental +
      growth * WEIGHTS.growth +
      momentum * WEIGHTS.momentum +
      quality * WEIGHTS.quality +
      income * WEIGHTS.income +
      value * WEIGHTS.value +
      risk * WEIGHTS.risk +
      validation * WEIGHTS.validation +
      trust * WEIGHTS.trust +
      aiConfidence * WEIGHTS.aiConfidence
  );

  return {
    technical,
    fundamental,
    growth,
    momentum,
    quality,
    income,
    value,
    risk,
    validation,
    trust,
    aiConfidence,
    overallInstitutionalScore,
  };
}

export function scoreInstitutionalCandidate(
  candidate: InstitutionalCandidate
): InstitutionalScoreFactors {
  try {
    return composeInstitutionalScoreFactors(candidate);
  } catch {
    return emptyInstitutionalFactors();
  }
}

export function classifyInstitutionalRecommendation(
  score: number
): InstitutionalRecommendation {
  return recommendationFromScore(score);
}

export function rankInstitutionalResults(
  cards: InstitutionalResultCard[]
): InstitutionalResultCard[] {
  const sorted = [...cards].sort((a, b) => {
    const diff = b.institutionalScore - a.institutionalScore;
    if (diff !== 0) return diff;
    return b.confidence - a.confidence;
  });
  return sorted.map((card, index) => ({ ...card, rank: index + 1 }));
}

export class InstitutionalRankingEngine {
  score(candidate: InstitutionalCandidate): InstitutionalScoreFactors {
    return scoreInstitutionalCandidate(candidate);
  }

  rank(cards: InstitutionalResultCard[]): InstitutionalResultCard[] {
    return rankInstitutionalResults(cards);
  }

  classify(score: number): InstitutionalRecommendation {
    return classifyInstitutionalRecommendation(score);
  }
}
