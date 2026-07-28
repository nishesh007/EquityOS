/**
 * Recommendation Quality Gate v1 — final institutional filter before publish.
 * Evaluates horizon pipeline candidates; only QUALITY_PASSED rows are published.
 */

import type { OpportunityCandidate } from "@/lib/opportunity-engine/types";
import type { OpportunityEngineState } from "@/lib/opportunity-engine/types";
import { INSTITUTIONAL_STRATEGY_IDS } from "@/lib/recommendations/horizons/ids";
import type {
  HorizonId,
  HorizonPipelineSnapshot,
  HorizonRecommendation,
} from "@/lib/recommendations/horizons/types";
import type { SharedMarketSnapshot } from "@/lib/recommendations/shared-recommendation";
import { buildPublishedScanId } from "@/lib/recommendations/published/scan-id";

export type QualityRejectionReason =
  | "WEAK_MARKET_BREADTH"
  | "LOW_CONVICTION"
  | "LOW_LIQUIDITY"
  | "POOR_RISK_REWARD"
  | "REGIME_MISMATCH"
  | "WEAK_SECTOR_STRENGTH"
  | "TREND_MISALIGNMENT";

export const QUALITY_GATE_THRESHOLDS = {
  minConviction: 55,
  minRiskReward: 1.5,
  minVolumeRatio: 0.85,
  minRelativeStrengthLong: 48,
  minTrendScoreLong: 40,
  /** Breadth score below this rejects aggressive breakout / momentum longs. */
  minBreadthForBreakout: 45,
} as const;

export interface QualityGateMarketContext {
  regime?: string | null;
  marketTrend?: string | null;
  riskMode?: string | null;
  confidence?: number | null;
  /** Advance/participation breadth 0–100 when available. */
  breadthScore?: number | null;
}

export interface QualityGateRejection {
  id: string;
  symbol: string;
  horizonId: HorizonId;
  rejectionReason: QualityRejectionReason;
  detail: string;
  conviction: number;
  riskReward: number;
}

export interface QualityGateReport {
  sessionId: string;
  scanId: string;
  generatedAt: string;
  candidatesEvaluated: number;
  published: number;
  rejected: number;
  rejectionBreakdown: Partial<Record<QualityRejectionReason, number>>;
  averageConviction: number;
  averageRiskReward: number;
  /** Published cohort averages. */
  publishedAverageConviction: number;
  publishedAverageRiskReward: number;
  rejections: QualityGateRejection[];
}

export interface QualityGateResult {
  snapshot: HorizonPipelineSnapshot;
  report: QualityGateReport;
}

let lastQualityGateReport: QualityGateReport | null = null;

export function getLastQualityGateReport(): QualityGateReport | null {
  return lastQualityGateReport;
}

export function __resetQualityGateReportForTests(): void {
  lastQualityGateReport = null;
}

function metricNum(
  candidate: OpportunityCandidate | undefined,
  key: string
): number | null {
  const value = candidate?.scanMetrics?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeRegime(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function isBearishRegime(regime: string, trend: string): boolean {
  const blob = `${regime} ${trend}`;
  return /bear|risk.?off|weak/.test(blob) && !/bull/.test(blob);
}

function isAggressiveLongHorizon(horizonId: HorizonId): boolean {
  return (
    horizonId === "scalping" ||
    horizonId === "intraday" ||
    horizonId === "btst" ||
    horizonId === "short_term"
  );
}

function isBreakoutLike(row: HorizonRecommendation): boolean {
  const blob = [
    row.horizonId,
    row.selection.primaryStrategy,
    row.recommendation.primaryStrategy,
    row.recommendation.category,
    ...row.selection.belongsBecause,
  ]
    .join(" ")
    .toLowerCase();
  return /breakout|momentum|short_term|relative.?volume/.test(blob);
}

/**
 * Evaluate one horizon recommendation. Returns rejection reason or null if passed.
 */
export function evaluateRecommendationQuality(
  row: HorizonRecommendation,
  market: QualityGateMarketContext
): QualityRejectionReason | null {
  const recommendation = row.recommendation;
  const candidate = row.selection.sourceCandidate;
  const conviction = Math.max(
    recommendation.conviction,
    recommendation.confidence
  );
  const riskReward = recommendation.riskReward;
  const volumeRatio = metricNum(candidate, "volume_ratio");
  const relativeStrength = metricNum(candidate, "relative_strength");
  const trendScore = metricNum(candidate, "trend_score");
  const isLong = recommendation.action !== "SELL";
  const regime = normalizeRegime(market.regime ?? recommendation.marketRegime);
  const trend = normalizeRegime(market.marketTrend ?? recommendation.marketContext);
  const breadth =
    typeof market.breadthScore === "number" && Number.isFinite(market.breadthScore)
      ? market.breadthScore
      : null;

  if (conviction < QUALITY_GATE_THRESHOLDS.minConviction) {
    return "LOW_CONVICTION";
  }

  if (
    !Number.isFinite(riskReward) ||
    riskReward < QUALITY_GATE_THRESHOLDS.minRiskReward
  ) {
    return "POOR_RISK_REWARD";
  }

  if (
    volumeRatio != null &&
    volumeRatio < QUALITY_GATE_THRESHOLDS.minVolumeRatio
  ) {
    return "LOW_LIQUIDITY";
  }

  if (
    isLong &&
    isBearishRegime(regime, trend) &&
    isAggressiveLongHorizon(row.horizonId)
  ) {
    return "REGIME_MISMATCH";
  }

  if (
    isLong &&
    breadth != null &&
    breadth < QUALITY_GATE_THRESHOLDS.minBreadthForBreakout &&
    isBreakoutLike(row)
  ) {
    return "WEAK_MARKET_BREADTH";
  }

  if (
    isLong &&
    relativeStrength != null &&
    relativeStrength < QUALITY_GATE_THRESHOLDS.minRelativeStrengthLong
  ) {
    return "WEAK_SECTOR_STRENGTH";
  }

  if (
    isLong &&
    trendScore != null &&
    trendScore < QUALITY_GATE_THRESHOLDS.minTrendScoreLong &&
    isBreakoutLike(row)
  ) {
    return "TREND_MISALIGNMENT";
  }

  return null;
}

function rejectionDetail(
  reason: QualityRejectionReason,
  row: HorizonRecommendation,
  market: QualityGateMarketContext
): string {
  const candidate = row.selection.sourceCandidate;
  switch (reason) {
    case "LOW_CONVICTION":
      return `Conviction ${Math.max(row.recommendation.conviction, row.recommendation.confidence)} < ${QUALITY_GATE_THRESHOLDS.minConviction}`;
    case "POOR_RISK_REWARD":
      return `Risk/Reward ${row.recommendation.riskReward} < ${QUALITY_GATE_THRESHOLDS.minRiskReward}`;
    case "LOW_LIQUIDITY":
      return `volume_ratio ${metricNum(candidate, "volume_ratio")} < ${QUALITY_GATE_THRESHOLDS.minVolumeRatio}`;
    case "REGIME_MISMATCH":
      return `Aggressive long (${row.horizonId}) incompatible with regime=${market.regime ?? row.recommendation.marketRegime}`;
    case "WEAK_MARKET_BREADTH":
      return `Breakout/momentum with breadth ${market.breadthScore} < ${QUALITY_GATE_THRESHOLDS.minBreadthForBreakout}`;
    case "WEAK_SECTOR_STRENGTH":
      return `relative_strength ${metricNum(candidate, "relative_strength")} < ${QUALITY_GATE_THRESHOLDS.minRelativeStrengthLong}`;
    case "TREND_MISALIGNMENT":
      return `trend_score ${metricNum(candidate, "trend_score")} < ${QUALITY_GATE_THRESHOLDS.minTrendScoreLong}`;
    default:
      return reason;
  }
}

export function buildQualityGateMarketContext(
  state: OpportunityEngineState,
  shared?: SharedMarketSnapshot,
  breadthScore?: number | null
): QualityGateMarketContext {
  return {
    regime: state.pipeline?.regime ?? shared?.regime ?? null,
    marketTrend: state.pipeline?.marketTrend ?? shared?.marketTrend ?? null,
    riskMode: state.pipeline?.riskMode ?? shared?.riskMode ?? null,
    confidence: state.pipeline?.confidence ?? shared?.confidence ?? null,
    breadthScore: breadthScore ?? null,
  };
}

/**
 * Filter horizon snapshot — only QUALITY_PASSED rows remain.
 */
export function applyRecommendationQualityGate(
  snapshot: HorizonPipelineSnapshot,
  state: OpportunityEngineState,
  market: QualityGateMarketContext
): QualityGateResult {
  const sessionId = state.tradingDate ?? "unknown";
  const generatedAt = state.lastScannedAt ?? new Date().toISOString();
  const scanId = buildPublishedScanId(sessionId, state.scanCount);

  const filtered = {} as HorizonPipelineSnapshot;
  const rejections: QualityGateRejection[] = [];
  const breakdown: Partial<Record<QualityRejectionReason, number>> = {};
  let evaluated = 0;
  let convictionSum = 0;
  let rrSum = 0;
  let publishedConvictionSum = 0;
  let publishedRrSum = 0;
  let published = 0;

  for (const horizonId of INSTITUTIONAL_STRATEGY_IDS) {
    const kept: HorizonRecommendation[] = [];
    for (const row of snapshot[horizonId] ?? []) {
      evaluated += 1;
      const conviction = Math.max(
        row.recommendation.conviction,
        row.recommendation.confidence
      );
      const riskReward = row.recommendation.riskReward;
      convictionSum += conviction;
      rrSum += Number.isFinite(riskReward) ? riskReward : 0;

      const reason = evaluateRecommendationQuality(row, market);
      if (reason) {
        breakdown[reason] = (breakdown[reason] ?? 0) + 1;
        rejections.push({
          id: row.recommendation.id,
          symbol: row.recommendation.symbol,
          horizonId,
          rejectionReason: reason,
          detail: rejectionDetail(reason, row, market),
          conviction,
          riskReward,
        });
        continue;
      }

      kept.push(row);
      published += 1;
      publishedConvictionSum += conviction;
      publishedRrSum += Number.isFinite(riskReward) ? riskReward : 0;
    }
    filtered[horizonId] = kept;
  }

  const report: QualityGateReport = {
    sessionId,
    scanId,
    generatedAt,
    candidatesEvaluated: evaluated,
    published,
    rejected: rejections.length,
    rejectionBreakdown: breakdown,
    averageConviction:
      evaluated > 0 ? Math.round((convictionSum / evaluated) * 10) / 10 : 0,
    averageRiskReward:
      evaluated > 0 ? Math.round((rrSum / evaluated) * 100) / 100 : 0,
    publishedAverageConviction:
      published > 0
        ? Math.round((publishedConvictionSum / published) * 10) / 10
        : 0,
    publishedAverageRiskReward:
      published > 0
        ? Math.round((publishedRrSum / published) * 100) / 100
        : 0,
    rejections,
  };

  lastQualityGateReport = report;
  return { snapshot: filtered, report };
}
