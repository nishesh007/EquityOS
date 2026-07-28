/**
 * Paper Trading Lab — service facade (SSR + API friendly).
 */

import { getOpportunityEngineState } from "@/lib/opportunity-engine/store";
import { readPublishedFromState } from "@/lib/recommendations/published/client";
import { fetchSharedRecommendationsFresh } from "@/services/opportunityEngine";
import {
  computeKpis,
  getPaperTradingState,
  isTradeClosed,
  isTradeOpen,
  PAPER_TRADING_CONFIG,
  runPaperTradingCycle,
  type PaperTradingDashboard,
  type PaperTradingState,
} from "@/lib/paper-trading";
import { runTradeOutcomeEngine } from "@/lib/paper-trading/outcomes";
import type { TradeOutcomeReport } from "@/lib/paper-trading/outcomes";

export function buildPaperTradingDashboard(
  state: PaperTradingState
): PaperTradingDashboard {
  const openTrades = state.trades
    .filter(isTradeOpen)
    .slice()
    .sort((a, b) => Date.parse(b.entryAt) - Date.parse(a.entryAt));
  const closedTrades = state.trades
    .filter(isTradeClosed)
    .slice()
    .sort(
      (a, b) =>
        Date.parse(b.exitAt ?? b.updatedAt) - Date.parse(a.exitAt ?? a.updatedAt)
    );

  return {
    state,
    kpis: computeKpis(state.trades),
    openTrades,
    closedTrades,
    config: {
      defaultShares: PAPER_TRADING_CONFIG.defaultShares,
      maxTradesPerStrategy: PAPER_TRADING_CONFIG.maxTradesPerStrategy,
      sharesDisplayLabel: PAPER_TRADING_CONFIG.sharesDisplayLabel,
    },
  };
}

export function fetchPaperTradingDashboard(): PaperTradingDashboard {
  return buildPaperTradingDashboard(getPaperTradingState());
}

export function fetchPaperTradingOutcomes(): TradeOutcomeReport {
  return runTradeOutcomeEngine();
}

export async function syncPaperTradingLab(): Promise<PaperTradingDashboard> {
  const recommendations = await fetchSharedRecommendationsFresh();
  const oeState = getOpportunityEngineState();
  const published = readPublishedFromState(oeState);
  const state = await runPaperTradingCycle(recommendations, {
    provenance: {
      sessionId: published?.sessionId ?? oeState.tradingDate ?? null,
      scanId: published?.scanId ?? null,
    },
  });
  return buildPaperTradingDashboard(state);
}
