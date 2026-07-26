/**
 * Sprint 11B.1 — Session storage contracts (architecture).
 * Includes an in-memory implementation for tests / local orchestration.
 * Persistent backends belong to a later sprint.
 */

import type {
  BacktestSession,
  SessionComparison,
} from "@/lib/backtesting/types";

export interface BacktestSessionStore {
  saveSession(session: BacktestSession): Promise<BacktestSession>;
  loadSession(sessionId: string): Promise<BacktestSession | null>;
  deleteSession(sessionId: string): Promise<boolean>;
  listSessions(): Promise<readonly BacktestSession[]>;
  compareSessions(
    leftSessionId: string,
    rightSessionId: string
  ): Promise<SessionComparison | null>;
}

function delta(
  left: number | null | undefined,
  right: number | null | undefined
): number | null {
  if (left == null || right == null) return null;
  if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
  return right - left;
}

export function buildSessionComparison(
  left: BacktestSession,
  right: BacktestSession
): SessionComparison {
  const ls = left.summary.statistics;
  const rs = right.summary.statistics;
  return {
    leftSessionId: left.id,
    rightSessionId: right.id,
    left: left.summary,
    right: right.summary,
    deltas: {
      winRate: delta(ls?.winRate, rs?.winRate),
      profitFactor: delta(ls?.profitFactor, rs?.profitFactor),
      averageReturn: delta(ls?.averageReturn, rs?.averageReturn),
      maximumDrawdown: delta(ls?.maximumDrawdown, rs?.maximumDrawdown),
      tradeCount: right.summary.tradeCount - left.summary.tradeCount,
    },
  };
}

export class InMemoryBacktestSessionStore implements BacktestSessionStore {
  private readonly sessions = new Map<string, BacktestSession>();

  async saveSession(session: BacktestSession): Promise<BacktestSession> {
    const saved: BacktestSession = {
      ...session,
      updatedAt: new Date().toISOString(),
    };
    this.sessions.set(saved.id, saved);
    return saved;
  }

  async loadSession(sessionId: string): Promise<BacktestSession | null> {
    return this.sessions.get(sessionId) ?? null;
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    return this.sessions.delete(sessionId);
  }

  async listSessions(): Promise<readonly BacktestSession[]> {
    return [...this.sessions.values()].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
  }

  async compareSessions(
    leftSessionId: string,
    rightSessionId: string
  ): Promise<SessionComparison | null> {
    const left = await this.loadSession(leftSessionId);
    const right = await this.loadSession(rightSessionId);
    if (!left || !right) return null;
    return buildSessionComparison(left, right);
  }

  clear(): void {
    this.sessions.clear();
  }
}
