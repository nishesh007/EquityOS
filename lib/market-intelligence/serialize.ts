/**
 * Serialize Sprint 11B engine outputs into JSON-safe DTOs.
 * Never recalculates scores — presentation mapping only.
 */

import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import type {
  MarketRegime,
  RegimeConfidenceAnalysis,
} from "@/src/modules/marketRegime";
import type { TradingPipelineResult } from "@/src/modules/tradingPipeline";
import type {
  MarketContextView,
  MarketIntelligenceSnapshot,
  MarketRegimeView,
  RegimeComponentBreakdown,
} from "./types";

function toIso(value: Date | string | number | null | undefined): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }
  return new Date().toISOString();
}

function avgSectorScore(
  sectors: InstitutionalMarketContext["sectorStrength"]
): number {
  if (!sectors.length) return 50;
  const sum = sectors.reduce((acc, s) => acc + (Number.isFinite(s.score) ? s.score : 0), 0);
  return Math.round(sum / sectors.length);
}

export function serializeMarketContext(
  context: InstitutionalMarketContext
): MarketContextView {
  const breadth = context.marketBreadth;
  const vol = context.volatility;
  const participation = Number.isFinite(breadth.participationPercent)
    ? breadth.participationPercent
    : breadth.score;
  const momentum = Number.isFinite(breadth.breadthMomentum)
    ? breadth.breadthMomentum
    : context.marketStrength;
  const liquidity = Number.isFinite(vol.relativeVolatility)
    ? Math.max(0, Math.min(100, 100 - Math.abs(vol.relativeVolatility)))
    : breadth.score;
  const sectorBreadth = avgSectorScore(context.sectorStrength);
  const leading = context.sectorRotation?.leaders?.length
    ? context.sectorRotation.leaders
    : context.sectorStrength
        .filter((s) => s.score >= 60)
        .sort((a, b) => b.score - a.score)
        .map((s) => s.sector)
        .slice(0, 5);
  const weak = context.sectorRotation?.laggards?.length
    ? context.sectorRotation.laggards
    : context.sectorStrength
        .filter((s) => s.score < 40)
        .sort((a, b) => a.score - b.score)
        .map((s) => s.sector)
        .slice(0, 5);

  return {
    marketTrend: context.marketTrend,
    marketStrength: context.marketStrength,
    contextScore: context.healthScore,
    contextConfidence: context.confidence,
    riskMode: context.riskMode,
    volatilityRegime: vol.regime,
    volatilityScore: vol.score,
    breadthScore: breadth.score,
    breadthQuality: breadth.breadthQuality,
    advanceCount: breadth.advanceCount,
    declineCount: breadth.declineCount,
    advanceDeclineRatio: breadth.advanceDeclineRatio,
    sectorBreadth,
    momentum,
    liquidity,
    institutionalParticipation: participation,
    leadingSectors: leading,
    weakSectors: weak,
    summary: context.summary ?? [],
    warnings: context.warnings ?? [],
    components: {
      trend: context.marketTrend,
      volatility: vol.regime,
      breadthScore: breadth.score,
      breadthQuality: breadth.breadthQuality,
      advanceDeclineRatio: breadth.advanceDeclineRatio,
      marketStrength: context.marketStrength,
      riskMode: context.riskMode,
      momentumHint: momentum,
      liquidityHint: liquidity,
      institutionalParticipation: participation,
      leadingSectors: leading,
      weakSectors: weak,
      healthScore: context.healthScore,
      qualityGrade: context.qualityGrade,
    },
    timestamp: toIso(context.timestamp),
  };
}

function buildRegimeComponents(
  context: InstitutionalMarketContext | null,
  confidence: RegimeConfidenceAnalysis
): RegimeComponentBreakdown {
  return {
    trendStrength: context?.marketStrength ?? 50,
    momentum: context?.marketBreadth?.breadthMomentum ?? 0,
    volatility: context?.volatility?.score ?? 50,
    breadth: context?.marketBreadth?.score ?? 50,
    risk: context?.riskMode ?? "Neutral",
    contributions: (confidence.contributions ?? []).map((c) => ({
      factor: c.factor,
      title: c.title,
      score: c.score,
      contribution: c.contribution,
      direction: c.direction,
      reason: c.reason,
    })),
  };
}

export function serializeMarketRegime(
  regime: MarketRegime,
  context?: InstitutionalMarketContext | null
): MarketRegimeView {
  const confidence = regime.confidenceAnalysis;
  return {
    regime: regime.regime,
    confidence: regime.confidence,
    confidenceGrade: confidence.grade,
    priority: regime.priority,
    reasons: regime.reasons ?? [],
    triggeredRules: regime.triggeredRules ?? [],
    positiveReasons: confidence.positiveReasons ?? [],
    negativeReasons: confidence.negativeReasons ?? [],
    summary: confidence.summary ?? [],
    components: buildRegimeComponents(context ?? null, confidence),
    timestamp: toIso(regime.timestamp),
  };
}

export function serializePipelineSnapshot(
  pipeline: TradingPipelineResult
): MarketIntelligenceSnapshot {
  const contextView = serializeMarketContext(pipeline.context);
  const regimeView = serializeMarketRegime(pipeline.regime, pipeline.context);
  return {
    context: contextView,
    regime: regimeView,
    confidence: pipeline.confidence.score,
    confidenceGrade: pipeline.confidence.grade,
    pipelineHealth: pipeline.pipelineHealth,
    pipelineHealthGrade: pipeline.healthGrade,
    eligibleStrategyCount: pipeline.eligibleStrategies?.length ?? 0,
    timestamp: toIso(pipeline.timestamp),
    source: "trading-pipeline",
  };
}

export function serializeContextRegimeSnapshot(
  context: InstitutionalMarketContext,
  regime: MarketRegime
): MarketIntelligenceSnapshot {
  const contextView = serializeMarketContext(context);
  const regimeView = serializeMarketRegime(regime, context);
  return {
    context: contextView,
    regime: regimeView,
    confidence: regime.confidenceAnalysis.score,
    confidenceGrade: regime.confidenceAnalysis.grade,
    pipelineHealth: null,
    pipelineHealthGrade: null,
    eligibleStrategyCount: 0,
    timestamp: toIso(regime.timestamp ?? context.timestamp),
    source: "context-regime",
  };
}
