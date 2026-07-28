/**
 * Paper Trading Lab — domain types (Sprint 11E.1).
 * Isolated from the Recommendation Engine; consumes SharedRecommendation read-only.
 */

export type PaperStrategy = "intraday" | "scalping" | "swing";

/**
 * Supported trade statuses.
 * Open trades use `open`. Closed trades use the terminal status that caused exit.
 */
export type PaperTradeStatus =
  | "open"
  | "target_1_hit"
  | "target_2_hit"
  | "target_3_hit"
  | "stop_loss_hit"
  | "expired"
  | "closed";

export type PaperExitReason =
  | "stop_loss"
  | "target_1"
  | "target_2"
  | "target_3"
  | "recommendation_expired"
  | "market_close"
  | "session_end";

export type PaperTimelineEventType =
  | "recommendation_generated"
  | "buy_executed"
  | "target_1_hit"
  | "target_2_hit"
  | "target_3_hit"
  | "stop_loss_hit"
  | "market_close"
  | "session_end"
  | "recommendation_expired"
  | "closed";

export interface PaperTimelineEvent {
  id: string;
  type: PaperTimelineEventType;
  label: string;
  timestamp: string;
  price?: number;
}

export interface PaperRecommendationSnapshot {
  recommendationId: string;
  symbol: string;
  company: string;
  action: string;
  primaryStrategy: string;
  primaryStrategyId: string;
  conviction: number;
  confidence: number;
  opportunityScore: number;
  riskReward: number;
  entry: number;
  stopLoss: number;
  targets: number[];
  holdingPeriod: string;
  reasons: string[];
  evidence: string[];
  marketContext: string;
  marketRegime: string;
  timestamp: string;
  aiExplanation: string;
  /** Published recommendations session (trading date) when available. */
  sessionId?: string | null;
  /** Published recommendations scan id when available. */
  scanId?: string | null;
}

export interface PaperTrade {
  id: string;
  strategy: PaperStrategy;
  status: PaperTradeStatus;
  symbol: string;
  company: string;
  shares: number;
  entryPrice: number;
  entryAt: string;
  currentPrice: number;
  /** Highest target index breached so far (0 = none, 1–3 = T1–T3). */
  targetsHit: number;
  stopLoss: number;
  targets: number[];
  confidence: number;
  conviction: number;
  riskReward: number;
  recommendationScore: number;
  exitPrice?: number;
  exitAt?: string;
  exitReason?: PaperExitReason;
  pnl: number;
  returnPercent: number;
  holdingMs: number;
  recommendation: PaperRecommendationSnapshot;
  timeline: PaperTimelineEvent[];
  updatedAt: string;
  /** Published session id (trading date) stamped at entry. */
  sessionId?: string | null;
  /** Published scan id stamped at entry. */
  scanId?: string | null;
  /** Horizon label (holding period / strategy id). */
  horizon?: string;
  /** Peak favorable excursion % vs entry (long). */
  mfePercent?: number;
  /** Peak adverse excursion % vs entry (long, ≤ 0). */
  maePercent?: number;
  /** Peak-to-trough drawdown % while open. */
  maxDrawdownPercent?: number;
  /** Ms from entry to first target hit (when applicable). */
  timeToFirstTargetMs?: number | null;
  /** Ms from entry to stop-loss hit (when applicable). */
  timeToStopLossMs?: number | null;
}

export interface PaperTradingKpis {
  todaysTrades: number;
  openPositions: number;
  closedPositions: number;
  winRate: number;
  totalVirtualPnl: number;
  averageReturn: number;
}

export interface PaperTradingState {
  version: 1;
  updatedAt: string;
  lastSyncAt: string | null;
  trades: PaperTrade[];
  /** Recommendation IDs already opened (dedupe across strategies). */
  testedRecommendationIds: string[];
}

export interface PaperTradingDashboard {
  state: PaperTradingState;
  kpis: PaperTradingKpis;
  openTrades: PaperTrade[];
  closedTrades: PaperTrade[];
  config: {
    defaultShares: number;
    maxTradesPerStrategy: number;
    sharesDisplayLabel: string;
  };
}
