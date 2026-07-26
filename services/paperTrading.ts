/**
 * Paper Trading Lab — service facade (SSR + API friendly).
 */

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

export async function syncPaperTradingLab(): Promise<PaperTradingDashboard> {
  const recommendations = await fetchSharedRecommendationsFresh();
  const state = await runPaperTradingCycle(recommendations);
  return buildPaperTradingDashboard(state);
}
