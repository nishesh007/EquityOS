/**
 * Daily market session metadata — every market-derived module exposes this.
 */

/** Hard cap — UI must never stay on "Updating…" longer than this. */
export const MARKET_REBUILD_MAX_MS = 5_000;

/** NSE trading session id: YYYY-MM-DD (IST session owner). */
export type TradingSessionId = string;

export type MarketStatePhase = "ready" | "updating";

/** Per-module freshness contract (Context, Regime, Breadth, etc.). */
export interface ModuleFreshness {
  sessionDate: TradingSessionId;
  generatedAt: string;
  /** ISO close time for the owning session (15:30 IST). */
  marketCloseTime: string;
  /** Upstream engine timestamp (quote / pipeline / breadth). */
  sourceTimestamp: string;
  ageMinutes: number;
}

/** Snapshot-level session envelope attached to canonical MarketSnapshot. */
export interface MarketSessionEnvelope {
  sessionId: TradingSessionId;
  phase: MarketStatePhase;
  freshness: ModuleFreshness;
  /** True when all sub-modules belong to sessionId. */
  sessionValid: boolean;
}
