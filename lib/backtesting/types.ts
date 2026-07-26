/**
 * Sprint 11B.1 — Historical Backtesting shared models.
 * Framework only — no UI, no provider implementations.
 */

import type { DateRange, TradeStatistics } from "@/lib/analytics/types";

export type BacktestSessionStatus =
  | "queued"
  | "running"
  | "completed"
  | "cancelled"
  | "failed";

export type BacktestTradeStatus =
  | "pending"
  | "open"
  | "closed"
  | "skipped"
  | "cancelled";

export type BacktestExitReason =
  | "target"
  | "stop_loss"
  | "time_exit"
  | "expiry"
  | "rule_exit"
  | "session_end"
  | "manual"
  | "unknown";

export type BacktestRuleKind =
  | "entry"
  | "exit"
  | "target"
  | "stop_loss"
  | "time_exit"
  | "expiry";

/** Strategy-independent rule definition. */
export interface BacktestRule {
  id: string;
  kind: BacktestRuleKind;
  name: string;
  description?: string;
  /** Opaque parameters interpreted by the rule evaluator. */
  params: Record<string, unknown>;
  enabled?: boolean;
}

export interface BacktestUniverse {
  /** Explicit symbols; empty = provider-defined universe later. */
  symbols: readonly string[];
  sectors?: readonly string[];
  exchanges?: readonly string[];
  label?: string;
}

export interface BacktestConfiguration {
  strategyId: string;
  strategyLabel: string;
  universe: BacktestUniverse;
  dateRange: DateRange;
  rules: readonly BacktestRule[];
  /** Starting notional for simulated position sizing. */
  initialCapital: number;
  /** Shares or notional per entry when sizing is flat. */
  positionSize?: number;
  /** Max concurrent open positions. */
  maxOpenPositions?: number;
  /** Slippage bps applied on entry/exit (architecture field). */
  slippageBps?: number;
  /** Commission per trade (architecture field). */
  commission?: number;
  metadata?: Record<string, unknown>;
}

export interface ReplayConfiguration {
  sessionId: string;
  /** Playback speed multiplier (1 = realtime simulation steps). */
  speed: number;
  startAt?: string;
  endAt?: string;
  includeCorporateActions?: boolean;
  includeEvents?: boolean;
  includeRegime?: boolean;
}

/** Single point-in-time frame for future replay UI (11B.2+). */
export interface ReplayFrame {
  id: string;
  sessionId: string;
  sequence: number;
  asOf: string;
  symbol?: string;
  openTradeIds: readonly string[];
  notes?: string;
  meta?: Record<string, unknown>;
}

export interface BacktestRecommendationSnapshot {
  recommendationId: string;
  symbol: string;
  company?: string;
  action: string;
  strategyId?: string;
  conviction?: number;
  confidence?: number;
  /** Historical recommendation score (0–100) captured at signal time. */
  recommendationScore?: number;
  riskLabel?: string;
  technicalSummary?: string;
  fundamentalSummary?: string;
  valuationSummary?: string;
  catalysts?: readonly string[];
  entry?: number | null;
  stopLoss?: number | null;
  targets?: readonly number[];
  asOf: string;
  marketRegime?: string;
  metadata?: Record<string, unknown>;
}

export interface BacktestTrade {
  id: string;
  sessionId: string;
  symbol: string;
  company?: string;
  status: BacktestTradeStatus;
  recommendationId?: string;
  entryAt?: string;
  exitAt?: string;
  entryPrice?: number;
  exitPrice?: number;
  shares: number;
  returnPercent?: number;
  pnl?: number;
  holdingMs?: number;
  exitReason?: BacktestExitReason;
  hitTarget?: boolean;
  hitStopLoss?: boolean;
  targetIndex?: number;
  rulesApplied: readonly string[];
  timeline: readonly BacktestTradeEvent[];
}

export interface BacktestTradeEvent {
  id: string;
  type: string;
  label: string;
  at: string;
  price?: number;
}

export interface BacktestSessionSummary {
  tradeCount: number;
  openCount: number;
  closedCount: number;
  skippedCount: number;
  statistics: TradeStatistics | null;
  notes?: string[];
}

export interface BacktestSession {
  id: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  strategyId: string;
  strategyLabel: string;
  universe: BacktestUniverse;
  startDate: string;
  endDate: string;
  configuration: BacktestConfiguration;
  status: BacktestSessionStatus;
  /** Wall-clock duration in ms once finished. */
  durationMs?: number;
  summary: BacktestSessionSummary;
  trades: readonly BacktestTrade[];
  errorMessage?: string;
  version: 1;
}

export interface ExecutionResult {
  session: BacktestSession;
  trades: readonly BacktestTrade[];
  frames: readonly ReplayFrame[];
  statistics: TradeStatistics;
  warnings: readonly string[];
}

export interface DatasetSlice {
  id: string;
  symbol?: string;
  start: string;
  end: string;
  asOf: string;
  quality?: DatasetQuality;
  meta?: Record<string, unknown>;
}

export interface DatasetQuality {
  completeness: number; // 0–100
  gaps: number;
  warnings: readonly string[];
  source?: string;
}

export interface SessionComparison {
  leftSessionId: string;
  rightSessionId: string;
  left: BacktestSessionSummary;
  right: BacktestSessionSummary;
  deltas: {
    winRate: number | null;
    profitFactor: number | null;
    averageReturn: number | null;
    maximumDrawdown: number | null;
    tradeCount: number;
  };
}
