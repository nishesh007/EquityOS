/**
 * Sprint 11B.1 — Backtest execution pipeline.
 *
 * Historical Data → Recommendation Snapshot → Entry Evaluation →
 * Trade Simulation → Exit Evaluation → Metrics → Session Results
 *
 * Framework only — no UI.
 */

import type { HistoricalDatasetBundle } from "@/lib/backtesting/dataset/types";
import {
  evaluateRules,
  firstTriggered,
} from "@/lib/backtesting/rules";
import {
  markSessionCompleted,
  markSessionFailed,
  markSessionRunning,
  summarizeTrades,
} from "@/lib/backtesting/session";
import { computeBacktestStatistics } from "@/lib/backtesting/metrics";
import {
  barsBySymbol,
  closeTrade,
  mapExitReason,
  openTrade,
} from "@/lib/backtesting/execution/simulation";
import type {
  BacktestSession,
  BacktestTrade,
  ExecutionResult,
  ReplayFrame,
} from "@/lib/backtesting/types";

export interface ExecutionPipelineInput {
  session: BacktestSession;
  dataset: HistoricalDatasetBundle;
  now?: Date;
}

function positionSize(session: BacktestSession, entryPrice: number): number {
  if (session.configuration.positionSize != null) {
    return Math.max(1, Math.floor(session.configuration.positionSize));
  }
  if (entryPrice <= 0) return 1;
  const capital = session.configuration.initialCapital;
  const maxOpen = session.configuration.maxOpenPositions ?? 1;
  const notional = capital / Math.max(1, maxOpen);
  return Math.max(1, Math.floor(notional / entryPrice));
}

/**
 * Run the full backtest pipeline against an in-memory dataset bundle.
 * Providers are not implemented in 11B.1 — callers supply the bundle.
 */
export function runBacktestExecution(
  input: ExecutionPipelineInput
): ExecutionResult {
  const warnings: string[] = [];
  let session = input.session;

  try {
    session = markSessionRunning(session, input.now);

    const { dataset } = input;
    if (dataset.quality.completeness < 100) {
      warnings.push(
        ...dataset.quality.warnings.map((w) => `Dataset: ${w}`)
      );
    }

    const barsMap = barsBySymbol(dataset.ohlcv);
    const recommendations = [...dataset.recommendations].sort((a, b) =>
      a.asOf.localeCompare(b.asOf)
    );

    const trades: BacktestTrade[] = [];
    const frames: ReplayFrame[] = [];
    let open: BacktestTrade | null = null;
    let frameSeq = 0;

    const maxOpen = session.configuration.maxOpenPositions ?? 1;
    const exitRuleKinds = new Set([
      "exit",
      "target",
      "stop_loss",
      "time_exit",
      "expiry",
    ]);

    for (const recommendation of recommendations) {
      const bars = barsMap.get(recommendation.symbol) ?? [];
      if (bars.length === 0) {
        warnings.push(
          `No OHLCV for ${recommendation.symbol}; recommendation skipped.`
        );
        continue;
      }

      const entryRules = session.configuration.rules.filter(
        (rule) => rule.kind === "entry"
      );
      const exitRules = session.configuration.rules.filter((rule) =>
        exitRuleKinds.has(rule.kind)
      );

      for (const bar of bars) {
        if (bar.timestamp < recommendation.asOf) continue;

        // Exit evaluation for open trade on this symbol.
        if (open && open.symbol === recommendation.symbol) {
          const exitResults = evaluateRules(exitRules, {
            market: {
              symbol: bar.symbol,
              asOf: bar.timestamp,
              price: bar.close,
              open: bar.open,
              high: bar.high,
              low: bar.low,
              close: bar.close,
            },
            position: {
              entryPrice: open.entryPrice ?? bar.close,
              entryAt: open.entryAt ?? bar.timestamp,
              shares: open.shares,
              stopLoss: recommendation.stopLoss,
              targets: recommendation.targets,
              recommendationAsOf: recommendation.asOf,
              expiresAt:
                (session.configuration.rules.find((r) => r.kind === "expiry")
                  ?.params.expiresAt as string | undefined) ?? undefined,
              maxHoldingMs:
                (session.configuration.rules.find((r) => r.kind === "time_exit")
                  ?.params.maxHoldingMs as number | undefined) ?? undefined,
            },
            recommendation: {
              action: recommendation.action,
              entry: recommendation.entry,
              stopLoss: recommendation.stopLoss,
              targets: recommendation.targets,
              asOf: recommendation.asOf,
            },
          });

          const triggered = firstTriggered(exitResults);
          if (triggered) {
            open = closeTrade(open, {
              bar,
              exitPrice: triggered.price ?? bar.close,
              exitReason: mapExitReason(triggered),
              hitTarget: triggered.kind === "target",
              hitStopLoss: triggered.kind === "stop_loss",
              targetIndex: triggered.targetIndex,
              ruleId: triggered.ruleId,
            });
            trades.push(open);
            open = null;
          }
        }

        // Entry evaluation when capacity allows.
        const openCount = open ? 1 : 0;
        if (!open && openCount < maxOpen) {
          const entryResults = evaluateRules(entryRules, {
            market: {
              symbol: bar.symbol,
              asOf: bar.timestamp,
              price: bar.close,
              open: bar.open,
              high: bar.high,
              low: bar.low,
              close: bar.close,
            },
            recommendation: {
              action: recommendation.action,
              entry: recommendation.entry,
              stopLoss: recommendation.stopLoss,
              targets: recommendation.targets,
              asOf: recommendation.asOf,
            },
          });
          const triggered = firstTriggered(entryResults);
          if (triggered) {
            const entryPrice = recommendation.entry ?? bar.close;
            open = openTrade({
              sessionId: session.id,
              recommendation,
              bar,
              shares: positionSize(session, entryPrice),
              rulesApplied: [triggered.ruleId],
            });
          }
        }

        frames.push({
          id: `frame_${frameSeq}`,
          sessionId: session.id,
          sequence: frameSeq,
          asOf: bar.timestamp,
          symbol: bar.symbol,
          openTradeIds: open ? [open.id] : [],
        });
        frameSeq += 1;
      }

      // Force close leftover at last bar for this recommendation path.
      if (open && open.symbol === recommendation.symbol) {
        const lastBar = bars[bars.length - 1];
        open = closeTrade(open, {
          bar: lastBar,
          exitPrice: lastBar.close,
          exitReason: "session_end",
        });
        trades.push(open);
        open = null;
        warnings.push(
          `Force-closed ${recommendation.symbol} at session end of recommendation path.`
        );
      }
    }

    if (recommendations.length === 0) {
      warnings.push("No recommendation snapshots in dataset.");
    }

    const statistics = computeBacktestStatistics(trades);
    const summary = summarizeTrades(trades, statistics, [...warnings]);
    session = markSessionCompleted(session, trades, summary, input.now);

    return {
      session,
      trades,
      frames,
      statistics,
      warnings,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Backtest execution failed";
    session = markSessionFailed(session, message, input.now);
    return {
      session,
      trades: session.trades,
      frames: [],
      statistics: computeBacktestStatistics(session.trades),
      warnings: [...warnings, message],
    };
  }
}
