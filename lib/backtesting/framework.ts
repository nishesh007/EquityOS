/**
 * Sprint 11B.1 — High-level backtesting framework façade.
 */

import type { HistoricalDatasetBundle } from "@/lib/backtesting/dataset";
import { runBacktestExecution } from "@/lib/backtesting/execution";
import {
  createBacktestSession,
  markSessionCancelled,
} from "@/lib/backtesting/session";
import type { BacktestSessionStore } from "@/lib/backtesting/storage";
import { InMemoryBacktestSessionStore } from "@/lib/backtesting/storage";
import type {
  BacktestConfiguration,
  BacktestSession,
  ExecutionResult,
} from "@/lib/backtesting/types";

export interface BacktestingFrameworkOptions {
  store?: BacktestSessionStore;
}

/**
 * Orchestrates session creation, execution, and storage.
 * Dataset providers are injected by the caller (architecture only in 11B.1).
 */
export class BacktestingFramework {
  private readonly store: BacktestSessionStore;

  constructor(options: BacktestingFrameworkOptions = {}) {
    this.store = options.store ?? new InMemoryBacktestSessionStore();
  }

  getSessionStore(): BacktestSessionStore {
    return this.store;
  }

  async createSession(
    configuration: BacktestConfiguration
  ): Promise<BacktestSession> {
    const session = createBacktestSession(configuration);
    return this.store.saveSession(session);
  }

  async runSession(
    sessionId: string,
    dataset: HistoricalDatasetBundle
  ): Promise<ExecutionResult> {
    const existing = await this.store.loadSession(sessionId);
    if (!existing) {
      throw new Error(`Backtest session not found: ${sessionId}`);
    }
    const result = runBacktestExecution({ session: existing, dataset });
    await this.store.saveSession(result.session);
    return result;
  }

  async createAndRun(
    configuration: BacktestConfiguration,
    dataset: HistoricalDatasetBundle
  ): Promise<ExecutionResult> {
    const session = await this.createSession(configuration);
    return this.runSession(session.id, dataset);
  }

  async cancelSession(sessionId: string): Promise<BacktestSession | null> {
    const existing = await this.store.loadSession(sessionId);
    if (!existing) return null;
    if (existing.status !== "queued" && existing.status !== "running") {
      return existing;
    }
    const cancelled = markSessionCancelled(existing);
    return this.store.saveSession(cancelled);
  }

  async listSessions(): Promise<readonly BacktestSession[]> {
    return this.store.listSessions();
  }
}
