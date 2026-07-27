/**
 * Cross-page parity helpers for Dashboard vs Markets intelligence.
 */

import type { DashboardContext } from "./dashboardContext";
import type { MarketSnapshot } from "./types";

export interface IntelligenceParityResult {
  identical: boolean;
  timestampMatch: boolean;
  contextMatch: boolean;
  regimeMatch: boolean;
  timestamp: string | null;
  dashboardTimestamp: string | null;
  marketsTimestamp: string | null;
}

/**
 * Prove Dashboard Context/Regime/timestamp === Markets Snapshot intelligence.
 */
export function compareDashboardMarketsIntelligence(
  dashboard: Pick<DashboardContext, "intelligence" | "timestamp">,
  markets: Pick<MarketSnapshot, "intelligence" | "timestamp">
): IntelligenceParityResult {
  const dCtx = dashboard.intelligence?.context ?? null;
  const mCtx = markets.intelligence?.context ?? null;
  const dReg = dashboard.intelligence?.regime ?? null;
  const mReg = markets.intelligence?.regime ?? null;

  const timestampMatch = dashboard.timestamp === markets.timestamp;
  const contextMatch = JSON.stringify(dCtx) === JSON.stringify(mCtx);
  const regimeMatch = JSON.stringify(dReg) === JSON.stringify(mReg);

  return {
    identical: timestampMatch && contextMatch && regimeMatch,
    timestampMatch,
    contextMatch,
    regimeMatch,
    timestamp: timestampMatch ? dashboard.timestamp : null,
    dashboardTimestamp: dashboard.timestamp,
    marketsTimestamp: markets.timestamp,
  };
}
