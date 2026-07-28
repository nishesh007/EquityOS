/**
 * Sprint 9A / 9F / 9F.2 / 10C — AI Insights research-terminal presentation.
 *
 * Sprint 9F.2: Horizon-First pipelines independently select and construct
 * recommendations. OE state is a metrics universe provider only.
 */

import type {
  OpportunityCandidate,
  OpportunityEngineState,
} from "@/lib/opportunity-engine/types";
import {
  INSTITUTIONAL_STRATEGY_IDS,
  INSTITUTIONAL_STRATEGY_META,
  type InstitutionalStrategyId,
  type SharedMarketSnapshot,
  type SharedRecommendation,
} from "@/lib/recommendations";
import { STRATEGY_RECOMMENDATION_TITLES } from "@/lib/recommendations/institutional-horizons";
import {
  type HorizonRecommendation,
  type HorizonPipelineSnapshot,
} from "@/lib/recommendations/horizons";
import { resolvePrice } from "@/lib/recommendations/horizons/metrics";
import { readPublishedFromState } from "@/lib/recommendations/published/client";

/** @deprecated Use STRATEGY_RECOMMENDATION_TITLES — kept as alias for imports. */
export const STRATEGY_RESEARCH_TITLES = STRATEGY_RECOMMENDATION_TITLES;
export type InsightsResearchViewMode = "cards" | "table" | "detailed";

export interface InsightsResearchRow {
  id: string;
  strategyId: InstitutionalStrategyId;
  recommendation: SharedRecommendation;
  company: string;
  symbol: string;
  action: SharedRecommendation["action"];
  entryRangeLabel: string;
  entryLow: number | null;
  entryHigh: number | null;
  stopLoss: number;
  target1: number | null;
  target2: number | null;
  target3: number | null;
  supportsTarget3: boolean;
  expectedReturnPercent: number | null;
  riskReward: number;
  holdingPeriod: string;
  confidence: number;
  conviction: number;
  currentPrice: number | null;
  upsidePercent: number | null;
  volume: number | null;
  volumeLabel: string;
  liquidityLabel: string;
  sector: string;
  scanTime: string;
  primaryStrategy: string;
  supportingSignals: string[];
  matchedSignalCount: number;
  totalSignalCount: number;
  matchedConditions: string[];
  matchedIndicators: string[];
  aiExplanation: string;
  riskFactors: string[];
  reasonsFor: string[];
  reasonsAgainst: string[];
  expectedHoldingPeriod: string;
  expectedSuccessProbability: number | null;
}

export type InsightsResearchTerminal = Record<
  InstitutionalStrategyId,
  InsightsResearchRow[]
>;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function metricNumber(
  metrics: OpportunityCandidate["scanMetrics"],
  key: string
): number | null {
  const value = metrics?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatVolume(value: number | null): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return "—";
  if (value >= 10_000_000) return `${(value / 10_000_000).toFixed(1)} Cr`;
  if (value >= 100_000) return `${(value / 100_000).toFixed(1)} L`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)} K`;
  return value.toLocaleString("en-IN");
}

function resolveLiquidityLabel(candidate: OpportunityCandidate): string {
  const ratio = metricNumber(candidate.scanMetrics, "volume_ratio");
  if (ratio != null) {
    if (ratio >= 2) return "High";
    if (ratio >= 1) return "Medium";
    return "Low";
  }
  return "—";
}

function resolveSector(candidate: OpportunityCandidate): string {
  const sector = candidate.scanMetrics?.sector;
  return typeof sector === "string" && sector.trim() ? sector.trim() : "—";
}

function toInsightsRow(
  row: HorizonRecommendation,
  lastScanTime: string
): InsightsResearchRow {
  const recommendation = row.recommendation;
  const candidate = row.selection.sourceCandidate;
  const currentPrice = resolvePrice(candidate);
  // Sprint 9F.4 — display sealed Entry Range from the trade engine only.
  // Do not remap via presentation planners (that invents a second Entry).
  const entryLow = row.trade.entryLow;
  const entryHigh = row.trade.entryHigh;
  const effectiveEntry = recommendation.entry;

  const volume =
    candidate.quote?.volume ?? metricNumber(candidate.scanMetrics, "volume");

  return {
    id: `${row.horizonId}:${recommendation.id}`,
    strategyId: row.horizonId,
    recommendation,
    company: recommendation.company,
    symbol: recommendation.symbol,
    action: recommendation.action,
    entryRangeLabel:
      entryLow !== entryHigh
        ? `₹${entryLow.toLocaleString("en-IN", { maximumFractionDigits: 2 })} – ₹${entryHigh.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
        : `₹${effectiveEntry.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`,
    entryLow,
    entryHigh,
    stopLoss: recommendation.stopLoss,
    target1: recommendation.targets[0] ?? null,
    target2: recommendation.targets[1] ?? null,
    target3: recommendation.targets[2] ?? null,
    supportsTarget3: recommendation.targets.length >= 3,
    expectedReturnPercent: recommendation.expectedReturnPercent ?? null,
    riskReward: round2(recommendation.riskReward),
    holdingPeriod: recommendation.holdingPeriod,
    confidence: recommendation.confidence,
    conviction: recommendation.conviction,
    currentPrice,
    upsidePercent: recommendation.expectedReturnPercent ?? null,
    volume: volume != null && volume > 0 ? volume : null,
    volumeLabel: formatVolume(volume != null && volume > 0 ? volume : null),
    liquidityLabel: resolveLiquidityLabel(candidate),
    sector: resolveSector(candidate),
    scanTime: recommendation.timestamp || lastScanTime,
    primaryStrategy: recommendation.primaryStrategy,
    supportingSignals: recommendation.supportingStrategies,
    matchedSignalCount:
      recommendation.matchedFactorCount ??
      row.quality.qualifiedFactors.length,
    totalSignalCount:
      recommendation.totalFactorCount ?? row.selection.factors.length,
    matchedConditions: [
      ...row.quality.whyThisHorizon,
      ...row.quality.qualifiedFactors,
    ].slice(0, 10),
    matchedIndicators: row.quality.qualifiedFactors.slice(0, 8),
    aiExplanation: [
      ...row.quality.whyThisHorizon,
      row.quality.targetMethodology,
      row.quality.holdingRationale,
    ].join(" · "),
    riskFactors: row.quality.rejectedFactors.slice(0, 6),
    reasonsFor: row.quality.qualifiedFactors.slice(0, 8),
    reasonsAgainst: [
      ...row.quality.rejectedFactors,
      ...row.quality.shorterLongerFit,
    ].slice(0, 8),
    expectedHoldingPeriod: recommendation.holdingPeriod,
    expectedSuccessProbability: round2(
      Math.min(95, Math.max(5, recommendation.confidence))
    ),
  };
}

/**
 * Research terminal from a pre-materialized horizon snapshot (published SSOT).
 */
export function selectInsightsResearchTerminalFromSnapshot(
  snapshot: HorizonPipelineSnapshot,
  lastScanTime: string
): InsightsResearchTerminal {
  const terminal = {} as InsightsResearchTerminal;
  for (const strategyId of INSTITUTIONAL_STRATEGY_IDS) {
    terminal[strategyId] = snapshot[strategyId].map((row) =>
      toInsightsRow(row, lastScanTime)
    );
  }
  return terminal;
}

/**
 * Read published research terminal — no request-time horizon pipeline.
 */
export function selectInsightsResearchTerminal(
  state: OpportunityEngineState,
  _shared?: SharedMarketSnapshot
): InsightsResearchTerminal {
  const published = readPublishedFromState(state);
  if (published?.researchTerminal) {
    return published.researchTerminal;
  }

  const terminal = {} as InsightsResearchTerminal;
  for (const strategyId of INSTITUTIONAL_STRATEGY_IDS) {
    terminal[strategyId] = [];
  }
  return terminal;
}

export function strategyResearchAnchorId(strategyId: InstitutionalStrategyId): string {
  return `strategy-research-${strategyId}`;
}

export function strategyResearchMeta(strategyId: InstitutionalStrategyId) {
  return {
    ...INSTITUTIONAL_STRATEGY_META[strategyId],
    title: STRATEGY_RECOMMENDATION_TITLES[strategyId],
    anchorId: strategyResearchAnchorId(strategyId),
  };
}

