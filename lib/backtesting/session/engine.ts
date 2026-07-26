/**
 * Sprint 11B.1 — Backtest session lifecycle engine.
 */

import type {
  BacktestConfiguration,
  BacktestSession,
  BacktestSessionStatus,
  BacktestSessionSummary,
  BacktestTrade,
} from "@/lib/backtesting/types";
import { emptyTradeStatistics } from "@/lib/backtesting/metrics/integration";

function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptySessionSummary(): BacktestSessionSummary {
  return {
    tradeCount: 0,
    openCount: 0,
    closedCount: 0,
    skippedCount: 0,
    statistics: emptyTradeStatistics(),
    notes: [],
  };
}

export function createBacktestSession(
  configuration: BacktestConfiguration,
  now: Date = new Date()
): BacktestSession {
  const iso = now.toISOString();
  return {
    id: createId("bts"),
    createdAt: iso,
    updatedAt: iso,
    strategyId: configuration.strategyId,
    strategyLabel: configuration.strategyLabel,
    universe: configuration.universe,
    startDate: configuration.dateRange.start,
    endDate: configuration.dateRange.end,
    configuration,
    status: "queued",
    summary: createEmptySessionSummary(),
    trades: [],
    version: 1,
  };
}

const ALLOWED_TRANSITIONS: Record<
  BacktestSessionStatus,
  readonly BacktestSessionStatus[]
> = {
  queued: ["running", "cancelled", "failed"],
  running: ["completed", "cancelled", "failed"],
  completed: [],
  cancelled: [],
  failed: [],
};

export function canTransition(
  from: BacktestSessionStatus,
  to: BacktestSessionStatus
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function transitionSession(
  session: BacktestSession,
  status: BacktestSessionStatus,
  options: {
    now?: Date;
    errorMessage?: string;
    trades?: readonly BacktestTrade[];
    summary?: BacktestSessionSummary;
  } = {}
): BacktestSession {
  if (!canTransition(session.status, status)) {
    throw new Error(
      `Invalid backtest session transition: ${session.status} → ${status}`
    );
  }

  const now = options.now ?? new Date();
  const iso = now.toISOString();
  const next: BacktestSession = {
    ...session,
    status,
    updatedAt: iso,
    errorMessage: options.errorMessage ?? session.errorMessage,
    trades: options.trades ?? session.trades,
    summary: options.summary ?? session.summary,
  };

  if (status === "running") {
    next.startedAt = iso;
  }

  if (status === "completed" || status === "cancelled" || status === "failed") {
    next.completedAt = iso;
    if (next.startedAt) {
      next.durationMs =
        new Date(iso).getTime() - new Date(next.startedAt).getTime();
    }
  }

  return next;
}

export function markSessionRunning(
  session: BacktestSession,
  now?: Date
): BacktestSession {
  return transitionSession(session, "running", { now });
}

export function markSessionCompleted(
  session: BacktestSession,
  trades: readonly BacktestTrade[],
  summary: BacktestSessionSummary,
  now?: Date
): BacktestSession {
  return transitionSession(session, "completed", { now, trades, summary });
}

export function markSessionFailed(
  session: BacktestSession,
  errorMessage: string,
  now?: Date
): BacktestSession {
  return transitionSession(session, "failed", { now, errorMessage });
}

export function markSessionCancelled(
  session: BacktestSession,
  now?: Date
): BacktestSession {
  return transitionSession(session, "cancelled", { now });
}

export function summarizeTrades(
  trades: readonly BacktestTrade[],
  statistics: BacktestSessionSummary["statistics"],
  notes: string[] = []
): BacktestSessionSummary {
  return {
    tradeCount: trades.length,
    openCount: trades.filter((t) => t.status === "open").length,
    closedCount: trades.filter((t) => t.status === "closed").length,
    skippedCount: trades.filter((t) => t.status === "skipped").length,
    statistics,
    notes,
  };
}
