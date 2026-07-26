/**
 * Paper Trading Lab — internal configuration (Sprint 11E.1).
 * Position size is code-configurable; not user-editable in this sprint.
 */

export const PAPER_TRADING_CONFIG = {
  /** Default virtual share quantity per automated trade. */
  defaultShares: 100,
  /** Maximum concurrent open trades per strategy portfolio. */
  maxTradesPerStrategy: 7,
  /** Display label for position size. */
  sharesDisplayLabel: "100 Shares",
  /** Client sync / mark-to-market interval (ms). */
  clientSyncIntervalMs: 30_000,
  /**
   * Scalping: force-close this many minutes before official market close (15:30 IST).
   * Intraday closes at market close; scalping closes earlier.
   */
  scalpingCloseBeforeMinutes: 5,
  /** Holding-period expiry fallbacks when recommendation label is unparseable. */
  defaultExpiryMs: {
    intraday: 6.5 * 60 * 60 * 1000,
    scalping: 45 * 60 * 1000,
    swing: 20 * 24 * 60 * 60 * 1000,
  },
} as const;

export type PaperTradingConfig = typeof PAPER_TRADING_CONFIG;
