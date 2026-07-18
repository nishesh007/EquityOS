/**
 * Trading Pipeline utilities — Sprint 11B.2D.
 * Pure helpers for health/confidence scoring, fallbacks, and stage timing.
 */

import {
  aggregateInstitutionalMarketContext,
  type InstitutionalMarketContext,
} from "@/src/modules/marketContext";
import {
  createFallbackConfidenceAnalysis,
  createFallbackMarketRegime,
  type MarketRegime,
  type RegimeConfidenceAnalysis,
} from "@/src/modules/marketRegime";
import type { EligibleStrategy } from "@/src/modules/strategyEligibility";
import { clamp, round } from "@/lib/engine/utils";
import {
  DEFAULT_TRADING_PIPELINE_CONFIG,
  PIPELINE_STAGE_ORDER,
  type PipelineHealthGrade,
  type PipelineStageName,
  type PipelineStageRecord,
  type TradingPipelineConfig,
  type TradingPipelineResult,
  type TradingPipelineRunOptions,
} from "./TradingPipelineTypes";

export function resolveTradingPipelineConfig(
  partial?: Partial<TradingPipelineConfig> & {
    healthWeights?: Partial<TradingPipelineConfig["healthWeights"]>;
    confidenceWeights?: Partial<TradingPipelineConfig["confidenceWeights"]>;
  }
): TradingPipelineConfig {
  return {
    ...DEFAULT_TRADING_PIPELINE_CONFIG,
    ...partial,
    healthWeights: {
      ...DEFAULT_TRADING_PIPELINE_CONFIG.healthWeights,
      ...partial?.healthWeights,
    },
    confidenceWeights: {
      ...DEFAULT_TRADING_PIPELINE_CONFIG.confidenceWeights,
      ...partial?.confidenceWeights,
    },
  };
}

export function classifyPipelineHealthGrade(
  score: number,
  config: TradingPipelineConfig = DEFAULT_TRADING_PIPELINE_CONFIG
): PipelineHealthGrade {
  if (score >= config.excellentMin) return "Excellent";
  if (score >= config.goodMin) return "Good";
  if (score >= config.fairMin) return "Fair";
  return "Poor";
}

export function createFallbackInstitutionalContext(
  timestamp: Date = new Date(),
  reason = "Pipeline context unavailable — neutral institutional fallback applied."
): InstitutionalMarketContext {
  const context = aggregateInstitutionalMarketContext({
    context: null,
    breadth: null,
    sector: null,
    volatility: null,
    timestamp,
  });
  return {
    ...context,
    warnings: dedupe([...context.warnings, reason]),
  };
}

export function isContextUsable(
  context: InstitutionalMarketContext | null | undefined
): boolean {
  if (!context) return false;
  if (!context.marketBreadth || !Number.isFinite(context.marketBreadth.score)) {
    return false;
  }
  if (!context.volatility || !Number.isFinite(context.volatility.score)) {
    return false;
  }
  if (!Number.isFinite(context.marketStrength)) return false;
  if (!Number.isFinite(context.healthScore)) return false;
  return true;
}

export function hasMissingBreadth(context: InstitutionalMarketContext): boolean {
  return (
    context.warnings.some((w) => /breadth/i.test(w)) ||
    !Number.isFinite(context.marketBreadth?.score)
  );
}

export function hasMissingSector(context: InstitutionalMarketContext): boolean {
  return (
    context.sectorStrength.length === 0 ||
    context.warnings.some((w) => /sector/i.test(w))
  );
}

export function hasMissingVolatility(
  context: InstitutionalMarketContext
): boolean {
  return (
    context.warnings.some((w) => /volatilit|vix/i.test(w)) ||
    !Number.isFinite(context.volatility?.score)
  );
}

/**
 * Score pipeline health 0–100 from stage outcomes + data quality.
 */
export function calculatePipelineHealth(input: {
  context: InstitutionalMarketContext;
  regime: MarketRegime | null;
  confidence: RegimeConfidenceAnalysis | null;
  eligibleStrategies: EligibleStrategy[] | null;
  stages: PipelineStageRecord[];
  config?: TradingPipelineConfig;
}): number {
  const config = input.config ?? DEFAULT_TRADING_PIPELINE_CONFIG;
  const w = config.healthWeights;

  const contextScore = isContextUsable(input.context) ? 100 : 25;
  const regimeScore =
    input.regime && input.regime.regime ? 100 : 20;
  const confidenceScore =
    input.confidence &&
    Number.isFinite(input.confidence.score) &&
    input.confidence.score >= config.minValidConfidence
      ? clamp(input.confidence.score, 0, 100)
      : 20;
  const eligibilityScore = Array.isArray(input.eligibleStrategies) ? 100 : 20;

  let dataQuality = clamp(input.context.confidence, 0, 100);
  if (hasMissingBreadth(input.context)) dataQuality -= 15;
  if (hasMissingSector(input.context)) dataQuality -= 15;
  if (hasMissingVolatility(input.context)) dataQuality -= 15;
  dataQuality = clamp(dataQuality, 0, 100);

  let composite =
    contextScore * w.contextValid +
    regimeScore * w.regimeValid +
    confidenceScore * w.confidenceValid +
    eligibilityScore * w.eligibilityValid +
    dataQuality * w.dataQuality;

  const failedStages = input.stages.filter((s) => s.status === "failed").length;
  composite -= failedStages * config.stageFailureHealthPenalty;

  return clamp(round(composite, 1), config.healthFloor, 100);
}

/**
 * Composite pipeline confidence from upstream confidence signals.
 */
export function calculatePipelineConfidence(input: {
  context: InstitutionalMarketContext;
  regime: MarketRegime;
  confidence: RegimeConfidenceAnalysis;
  eligibleStrategies: EligibleStrategy[];
  config?: TradingPipelineConfig;
}): number {
  const config = input.config ?? DEFAULT_TRADING_PIPELINE_CONFIG;
  const w = config.confidenceWeights;

  const coverage =
    input.eligibleStrategies.length > 0
      ? clamp(50 + input.eligibleStrategies.length * 2, 50, 100)
      : 35;

  const composite =
    clamp(input.context.confidence, 0, 100) * w.contextConfidence +
    clamp(input.regime.confidence, 0, 100) * w.regimeConfidence +
    clamp(input.confidence.score, 0, 100) * w.confidenceScore +
    coverage * w.eligibilityCoverage;

  return clamp(round(composite, 1), config.confidenceFloor, 100);
}

export function buildPipelineCacheKey(
  context: InstitutionalMarketContext,
  options?: TradingPipelineRunOptions
): string {
  if (options?.cacheKey) return options.cacheKey;
  return [
    context.timestamp.getTime(),
    context.marketTrend,
    context.marketStrength,
    context.riskMode,
    context.confidence,
    context.healthScore,
    context.marketBreadth.score,
    context.volatility.score,
    context.sectorStrength.length,
  ].join("|");
}

export function nowMs(): number {
  return typeof performance !== "undefined" && performance.now
    ? performance.now()
    : Date.now();
}

export function createStageRecord(
  stage: PipelineStageName,
  status: PipelineStageRecord["status"],
  durationMs: number,
  extras: Partial<Pick<PipelineStageRecord, "cacheHit" | "error" | "warning">> = {}
): PipelineStageRecord {
  return {
    stage,
    status,
    order: PIPELINE_STAGE_ORDER.indexOf(stage),
    durationMs: round(durationMs, 2),
    cacheHit: extras.cacheHit ?? false,
    error: extras.error,
    warning: extras.warning,
  };
}

export function createFallbackPipelineResult(
  timestamp: Date = new Date(),
  reason = "Trading pipeline failed — degraded result returned."
): TradingPipelineResult {
  const context = createFallbackInstitutionalContext(timestamp, reason);
  const regime = createFallbackMarketRegime(timestamp, reason);
  const confidence =
    regime.confidenceAnalysis ?? createFallbackConfidenceAnalysis(reason);

  const stages = PIPELINE_STAGE_ORDER.map((stage, index) =>
    createStageRecord(stage, index === 0 ? "failed" : "skipped", 0, {
      error: reason,
    })
  );

  const pipelineHealth = calculatePipelineHealth({
    context,
    regime,
    confidence,
    eligibleStrategies: [],
    stages,
  });

  return {
    context,
    regime,
    confidence,
    eligibleStrategies: [],
    pipelineHealth,
    healthGrade: classifyPipelineHealthGrade(pipelineHealth),
    pipelineConfidence: calculatePipelineConfidence({
      context,
      regime,
      confidence,
      eligibleStrategies: [],
    }),
    executionTime: 0,
    warnings: [reason],
    errors: [reason],
    timestamp,
    stages,
  };
}

export function collectPipelineWarnings(
  context: InstitutionalMarketContext,
  stages: PipelineStageRecord[],
  extra: string[] = []
): string[] {
  const warnings: string[] = [...context.warnings, ...extra];
  for (const stage of stages) {
    if (stage.warning) warnings.push(stage.warning);
    if (stage.status === "failed" && stage.error) {
      warnings.push(`${stage.stage} degraded: ${stage.error}`);
    }
  }
  if (hasMissingBreadth(context)) {
    warnings.push("Breadth data degraded or missing.");
  }
  if (hasMissingSector(context)) {
    warnings.push("Sector strength data degraded or missing.");
  }
  if (hasMissingVolatility(context)) {
    warnings.push("Volatility data degraded or missing.");
  }
  return dedupe(warnings);
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = value.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}
