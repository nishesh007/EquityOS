"use client";

import { cn, formatPercent } from "@/lib/utils";
import type { BacktestSession } from "@/lib/backtesting/types";
import { TABLE_CLASSES } from "@/src/design/layout/tableStyles";
import { BacktestingEmptyState } from "@/components/backtesting/hardening";
import type { KeyboardEvent } from "react";

interface SessionExplorerProps {
  sessions: readonly BacktestSession[];
  selectedId: string | null;
  onSelect: (sessionId: string) => void;
}

function shortId(id: string): string {
  return id.replace(/^bts_/, "").slice(0, 18);
}

function formatRange(start: string, end: string): string {
  const s = new Date(start).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "2-digit",
    timeZone: "Asia/Kolkata",
  });
  const e = new Date(end).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "2-digit",
    timeZone: "Asia/Kolkata",
  });
  return `${s} – ${e}`;
}

export function SessionExplorer({
  sessions,
  selectedId,
  onSelect,
}: SessionExplorerProps) {
  if (sessions.length === 0) {
    return (
      <section className="space-y-3" data-testid="session-explorer">
        <h2 className="text-sm font-semibold text-text-primary">
          Session Explorer
        </h2>
        <BacktestingEmptyState kind="no_sessions" />
      </section>
    );
  }

  function onRowKeyDown(e: KeyboardEvent<HTMLTableRowElement>, id: string) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(id);
    }
  }

  return (
    <section className="space-y-3" data-testid="session-explorer">
      <div>
        <h2
          id="session-explorer-heading"
          className="text-sm font-semibold text-text-primary"
        >
          Session Explorer
        </h2>
        <p className="mt-0.5 text-[11px] text-text-muted">
          Select a completed backtest session to load its historical replay.
        </p>
      </div>
      <div
        className={cn(TABLE_CLASSES.container, "max-h-64 overflow-auto")}
        role="region"
        aria-labelledby="session-explorer-heading"
      >
        <table className={TABLE_CLASSES.table}>
          <caption className="sr-only">
            Backtest sessions — use arrow keys within the table, Enter or Space
            to select
          </caption>
          <thead>
            <tr>
              <th scope="col">Session ID</th>
              <th scope="col">Strategy</th>
              <th scope="col">Universe</th>
              <th scope="col">Date Range</th>
              <th scope="col">Created</th>
              <th scope="col">Status</th>
              <th scope="col" className="text-right">
                Win Rate
              </th>
              <th scope="col" className="text-right">
                Net Return
              </th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => {
              const selected = session.id === selectedId;
              const winRate = session.summary.statistics?.winRate ?? null;
              const avgReturn =
                session.summary.statistics?.averageReturn ?? null;
              return (
                <tr
                  key={session.id}
                  tabIndex={0}
                  role="row"
                  aria-selected={selected}
                  onClick={() => onSelect(session.id)}
                  onKeyDown={(e) => onRowKeyDown(e, session.id)}
                  className={cn(
                    "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/50",
                    selected && "bg-accent/10"
                  )}
                >
                  <td className="font-mono text-[11px]">
                    {shortId(session.id)}
                  </td>
                  <td>{session.strategyLabel}</td>
                  <td>
                    {session.universe.label ??
                      session.universe.symbols.join(", ")}
                  </td>
                  <td className="text-[11px] text-text-secondary">
                    {formatRange(session.startDate, session.endDate)}
                  </td>
                  <td className="text-[11px] text-text-secondary">
                    {new Date(session.createdAt).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td>
                    <span className="rounded-full border border-surface-border-subtle px-2 py-0.5 text-[10px] uppercase tracking-wide text-text-secondary">
                      {session.status}
                    </span>
                  </td>
                  <td className={cn(TABLE_CLASSES.numericCell, "text-right")}>
                    {winRate == null ? "—" : `${winRate.toFixed(1)}%`}
                  </td>
                  <td
                    className={cn(
                      TABLE_CLASSES.numericCell,
                      "text-right font-medium",
                      avgReturn != null && avgReturn >= 0
                        ? "text-gain"
                        : avgReturn != null
                          ? "text-loss"
                          : undefined
                    )}
                  >
                    {avgReturn == null ? "—" : formatPercent(avgReturn)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
