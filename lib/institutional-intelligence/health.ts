/**
 * MODULE 8 — Institutional Health Dashboard
 */

import "server-only";

import { isDiskPersistenceEnabled } from "@/lib/platform/runtime-fs";
import { loadPaperTradingState } from "@/lib/paper-trading/persistence";
import { isTradeClosed } from "@/lib/paper-trading/kpis";
import type { OpportunityEngineState } from "@/lib/opportunity-engine/types";
import type { PublishedRecommendationsBundle } from "@/lib/recommendations/published/types";
import { isPublishedIntegrityValid } from "@/lib/recommendations/published/client";
import { QUALITY_GATE_THRESHOLDS } from "@/lib/recommendations/quality-gate";
import { buildPerformanceAnalytics } from "@/lib/institutional-intelligence/performance";
import { loadClosedPaperTrades } from "@/lib/institutional-intelligence/shared";

export type HealthStatus = "healthy" | "degraded" | "unavailable";

export interface HealthComponent {
  name: string;
  status: HealthStatus;
  score: number;
  detail: string;
}

function component(
  name: string,
  status: HealthStatus,
  score: number,
  detail: string
): HealthComponent {
  return { name, status, score, detail };
}

export function buildInstitutionalHealthReport(options: {
  state: OpportunityEngineState;
  published: PublishedRecommendationsBundle | null;
  breadthScore?: number | null;
  consumerSyncOk?: boolean;
  databaseOk?: boolean;
  calibrationConfidence?: number | null;
}) {
  const { state, published } = options;
  const closed = loadClosedPaperTrades();
  const paper = loadPaperTradingState();
  const perf = buildPerformanceAnalytics();

  const publishedValid =
    published != null && isPublishedIntegrityValid(published, state);
  const sessionOk = Boolean(state.tradingDate);
  const qg = state.qualityGate;

  const components: HealthComponent[] = [
    component(
      "Market State",
      sessionOk ? "healthy" : "degraded",
      sessionOk ? 90 : 50,
      `tradingDate=${state.tradingDate ?? "null"} marketOpen=${state.marketOpen}`
    ),
    component(
      "Recommendation Engine",
      state.lastScannedAt ? "healthy" : "degraded",
      state.lastScannedAt ? 88 : 45,
      `lastScannedAt=${state.lastScannedAt ?? "null"} scanCount=${state.scanCount}`
    ),
    component(
      "Quality Gate",
      qg ? "healthy" : "degraded",
      qg ? 85 : 55,
      qg
        ? `published=${qg.published} rejected=${qg.rejected} minConviction=${QUALITY_GATE_THRESHOLDS.minConviction}`
        : "No quality gate report on state"
    ),
    component(
      "Calibration",
      (options.calibrationConfidence ?? 0) >= 0.35 || closed.length > 0
        ? "healthy"
        : "degraded",
      Math.round(((options.calibrationConfidence ?? 0.3) * 100 + (closed.length > 0 ? 20 : 0)) / 1.2),
      `closedOutcomes=${closed.length} calibrationConfidence=${options.calibrationConfidence ?? "n/a"}`
    ),
    component(
      "Replay",
      publishedValid || closed.length > 0 ? "healthy" : "degraded",
      publishedValid ? 86 : closed.length > 0 ? 70 : 40,
      "Replay composes published snapshots + paper outcomes"
    ),
    component(
      "Outcome Engine",
      closed.length > 0 ? "healthy" : "degraded",
      closed.length > 0 ? 88 : 48,
      `closedTrades=${closed.length} open=${paper.trades.filter((t) => !isTradeClosed(t)).length}`
    ),
    component(
      "Ranking Engine",
      publishedValid ? "healthy" : "degraded",
      publishedValid ? 90 : 50,
      `publishedCount=${published?.recommendations.length ?? 0}`
    ),
    component(
      "Position Sizing",
      closed.length >= 3 ? "healthy" : "degraded",
      closed.length >= 3 ? 82 : 55,
      "Kelly advisory available when outcome sample ≥ 3"
    ),
    component(
      "Published Count",
      (published?.recommendations.length ?? 0) > 0 ? "healthy" : "unavailable",
      Math.min(100, (published?.recommendations.length ?? 0) * 4 + 20),
      `count=${published?.recommendations.length ?? 0} scanId=${published?.scanId ?? "null"}`
    ),
    component(
      "Consumer Sync",
      options.consumerSyncOk === false ? "degraded" : "healthy",
      options.consumerSyncOk === false ? 40 : 90,
      options.consumerSyncOk === false ? "Consumer integrity rejected" : "API consumer integrity ok"
    ),
    component(
      "Session Integrity",
      sessionOk && (!published || published.sessionId === state.tradingDate)
        ? "healthy"
        : "degraded",
      sessionOk ? 92 : 45,
      `session=${state.tradingDate ?? "null"} publishedSession=${published?.sessionId ?? "null"}`
    ),
    component(
      "Cache Integrity",
      typeof options.breadthScore === "number" ? "healthy" : "degraded",
      typeof options.breadthScore === "number" ? 80 : 55,
      `breadthScore=${options.breadthScore ?? "unavailable"}`
    ),
    component(
      "Database Integrity",
      options.databaseOk === false
        ? "unavailable"
        : isDiskPersistenceEnabled()
          ? "healthy"
          : "degraded",
      options.databaseOk === false ? 20 : isDiskPersistenceEnabled() ? 85 : 60,
      `diskPersistence=${isDiskPersistenceEnabled()} databaseOk=${options.databaseOk ?? "assumed"}`
    ),
  ];

  const overallHealth = Math.round(
    components.reduce((s, c) => s + c.score, 0) / components.length
  );

  return {
    generatedAt: new Date().toISOString(),
    overallHealthPercent: overallHealth,
    status:
      overallHealth >= 75
        ? ("healthy" as const)
        : overallHealth >= 50
          ? ("degraded" as const)
          : ("unavailable" as const),
    components,
    publishedCount: published?.recommendations.length ?? 0,
    closedOutcomes: closed.length,
    performanceSnapshot: {
      winRate: perf.overall.winRate,
      expectancy: perf.overall.expectancy,
      profitFactor: perf.overall.profitFactor,
    },
    notes: [
      "Institutional Health is diagnostic only — it does not mutate system state.",
    ],
  };
}
