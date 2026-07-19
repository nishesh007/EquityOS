/**
 * Unified Opportunity Score — Sprint 11B Prompt 3.
 * Combines Trading Pipeline (context / regime / eligibility) with
 * candidate-level conviction, validation, risk, and institutional factors.
 * Configurable weights — no hardcoded magic scores at call sites.
 */

export interface OpportunityScoreWeights {
  readonly strategy: number;
  readonly context: number;
  readonly regime: number;
  readonly validation: number;
  readonly risk: number;
  readonly institutional: number;
  readonly aiConviction: number;
}

export const DEFAULT_OPPORTUNITY_SCORE_WEIGHTS: OpportunityScoreWeights = {
  strategy: 0.25,
  context: 0.2,
  regime: 0.15,
  validation: 0.15,
  risk: 0.1,
  institutional: 0.1,
  aiConviction: 0.05,
};

export interface OpportunityScoreFactors {
  /** Strategy eligibility score 0–100. */
  strategy: number;
  /** Market context / strength score 0–100. */
  context: number;
  /** Regime confidence score 0–100. */
  regime: number;
  /** Validation score 0–100. */
  validation: number;
  /** Risk quality 0–100 (higher = safer / better risk profile). */
  risk: number;
  /** Institutional / pipeline health score 0–100. */
  institutional: number;
  /** AI conviction 0–100. */
  aiConviction: number;
}

export interface OpportunityScoreResult {
  score: number;
  factors: OpportunityScoreFactors;
  weights: OpportunityScoreWeights;
  breakdown: Array<{ factor: keyof OpportunityScoreFactors; weight: number; value: number; contribution: number }>;
}

function clamp(value: number, min = 0, max = 100): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

export function resolveOpportunityScoreWeights(
  overrides?: Partial<OpportunityScoreWeights> | null
): OpportunityScoreWeights {
  const merged: OpportunityScoreWeights = {
    ...DEFAULT_OPPORTUNITY_SCORE_WEIGHTS,
    ...(overrides ?? {}),
  };
  const sum =
    merged.strategy +
    merged.context +
    merged.regime +
    merged.validation +
    merged.risk +
    merged.institutional +
    merged.aiConviction;
  if (sum <= 0) return DEFAULT_OPPORTUNITY_SCORE_WEIGHTS;
  // Normalize so weights always sum to 1.0
  return {
    strategy: merged.strategy / sum,
    context: merged.context / sum,
    regime: merged.regime / sum,
    validation: merged.validation / sum,
    risk: merged.risk / sum,
    institutional: merged.institutional / sum,
    aiConviction: merged.aiConviction / sum,
  };
}

/**
 * Compute the unified Final Opportunity Score.
 */
export function computeOpportunityScore(
  factors: OpportunityScoreFactors,
  weights?: Partial<OpportunityScoreWeights> | null
): OpportunityScoreResult {
  const resolved = resolveOpportunityScoreWeights(weights);
  const normalized: OpportunityScoreFactors = {
    strategy: clamp(factors.strategy),
    context: clamp(factors.context),
    regime: clamp(factors.regime),
    validation: clamp(factors.validation),
    risk: clamp(factors.risk),
    institutional: clamp(factors.institutional),
    aiConviction: clamp(factors.aiConviction),
  };

  const breakdown: OpportunityScoreResult["breakdown"] = (
    Object.keys(resolved) as (keyof OpportunityScoreFactors)[]
  ).map((factor) => {
    const weight = resolved[factor];
    const value = normalized[factor];
    return {
      factor,
      weight,
      value,
      contribution: Math.round(weight * value * 100) / 100,
    };
  });

  const raw = breakdown.reduce((sum, row) => sum + row.contribution, 0);
  return {
    score: Math.round(clamp(raw) * 100) / 100,
    factors: normalized,
    weights: resolved,
    breakdown,
  };
}
