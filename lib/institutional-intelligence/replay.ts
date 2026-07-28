/**
 * MODULE 2 — Recommendation Replay Engine
 * Composes published snapshot + paper outcome + market context (read-only).
 */

import "server-only";

import { isTradeClosed } from "@/lib/paper-trading/kpis";
import { loadPaperTradingState } from "@/lib/paper-trading/persistence";
import { toTradeOutcomeRecord } from "@/lib/paper-trading/outcomes/engine";
import { mapPaperExitReason } from "@/lib/paper-trading/outcomes/lifecycle";
import { resolveSector } from "@/lib/institutional-intelligence/shared";
import type { SharedRecommendation } from "@/lib/recommendations/shared-recommendation";
import { buildExplainability } from "@/lib/institutional-intelligence/explainability";
import { assessInstitutionalConfidence } from "@/lib/institutional-intelligence/confidence";
import { loadExpectancyTables } from "@/lib/institutional-intelligence/shared";

export interface RecommendationReplayBundle {
  recommendationId: string;
  found: boolean;
  snapshot: SharedRecommendation | null;
  indicators: {
    conviction: number | null;
    confidence: number | null;
    opportunityScore: number | null;
    frameworkScore: number | null;
    riskReward: number | null;
    agreementPercent: number | null;
    conflictPercent: number | null;
    matchedFactors: string[];
  };
  marketContext: string | null;
  sector: string | null;
  breadth: number | null;
  regime: string | null;
  entry: number | null;
  stopLoss: number | null;
  targets: number[];
  finalOutcome: {
    status: string | null;
    exitReason: string | null;
    exitPrice: number | null;
    exitTime: string | null;
    pnl: number | null;
    returnPercent: number | null;
    holdingDays: number | null;
    mfe: number | null;
    mae: number | null;
    maxDrawdown: number | null;
    paperTradeId: string | null;
  } | null;
  confidence: ReturnType<typeof assessInstitutionalConfidence> | null;
  explainability: ReturnType<typeof buildExplainability> | null;
  timeline: Array<{
    type: string;
    label: string;
    timestamp: string;
    price?: number;
  }>;
  notes: string[];
}

export function buildRecommendationReplay(options: {
  recommendationId: string;
  recommendations: readonly SharedRecommendation[];
  breadthScore?: number | null;
  calibrationConfidence?: number | null;
}): RecommendationReplayBundle {
  const { recommendationId, recommendations } = options;
  const snapshot =
    recommendations.find((r) => r.id === recommendationId) ?? null;

  const paperTrades = loadPaperTradingState().trades.filter(
    (t) => t.recommendation.recommendationId === recommendationId
  );
  const closed = paperTrades.filter(isTradeClosed);
  const latest = closed[0] ?? paperTrades[0] ?? null;
  const outcome = latest ? toTradeOutcomeRecord(latest) : null;
  const tables = loadExpectancyTables();

  const confidence = snapshot
    ? assessInstitutionalConfidence(snapshot, tables, {
        breadthScore: options.breadthScore,
        calibrationConfidence: options.calibrationConfidence,
      })
    : null;
  const explainability = snapshot
    ? buildExplainability(snapshot, tables, {
        breadthScore: options.breadthScore,
        calibrationConfidence: options.calibrationConfidence,
      })
    : null;

  return {
    recommendationId,
    found: Boolean(snapshot || latest),
    snapshot,
    indicators: {
      conviction: snapshot?.conviction ?? latest?.conviction ?? null,
      confidence: snapshot?.confidence ?? latest?.confidence ?? null,
      opportunityScore: snapshot?.opportunityScore ?? null,
      frameworkScore: snapshot?.frameworkScore ?? null,
      riskReward: snapshot?.riskReward ?? latest?.riskReward ?? null,
      agreementPercent: snapshot?.agreementPercent ?? null,
      conflictPercent: snapshot?.conflictPercent ?? null,
      matchedFactors: snapshot?.matchedFactors ?? [],
    },
    marketContext: snapshot?.marketContext ?? latest?.recommendation.marketContext ?? null,
    sector: snapshot
      ? resolveSector(snapshot.symbol)
      : latest
        ? resolveSector(latest.symbol)
        : null,
    breadth: options.breadthScore ?? null,
    regime:
      snapshot?.marketRegime ?? latest?.recommendation.marketRegime ?? null,
    entry: snapshot?.entry ?? latest?.entryPrice ?? null,
    stopLoss: snapshot?.stopLoss ?? latest?.stopLoss ?? null,
    targets: snapshot?.targets ?? latest?.targets ?? [],
    finalOutcome: latest
      ? {
          status: latest.status,
          exitReason: mapPaperExitReason(latest.exitReason),
          exitPrice: latest.exitPrice ?? null,
          exitTime: latest.exitAt ?? null,
          pnl: latest.pnl,
          returnPercent: latest.returnPercent,
          holdingDays: outcome?.holdingDays ?? null,
          mfe: outcome?.mfe ?? null,
          mae: outcome?.mae ?? null,
          maxDrawdown: outcome?.maxDrawdown ?? null,
          paperTradeId: latest.id,
        }
      : null,
    confidence,
    explainability,
    timeline: (latest?.timeline ?? []).map((e) => ({
      type: e.type,
      label: e.label,
      timestamp: e.timestamp,
      price: e.price,
    })),
    notes: [
      "Replay is read-only and does not rewrite Published SSOT or paper-trading state.",
      "Final outcome is sourced from Paper Trading when a matching recommendationId exists.",
    ],
  };
}
