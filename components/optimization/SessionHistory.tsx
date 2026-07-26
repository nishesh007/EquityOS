"use client";

import { memo } from "react";
import { Copy, FolderOpen, Trash2 } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { VirtualizedRows } from "@/components/backtesting/hardening/VirtualizedRows";
import type { OptimizationSession } from "@/lib/optimization";

function formatDuration(session: OptimizationSession): string {
  if (!session.completedAt) return "—";
  const ms =
    new Date(session.completedAt).getTime() -
    new Date(session.createdAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)} min`;
}

function formatCreated(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export interface SessionHistoryProps {
  sessions: OptimizationSession[];
  activeSessionId: string | null;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

export const SessionHistory = memo(function SessionHistory({
  sessions,
  activeSessionId,
  onOpen,
  onDelete,
  onDuplicate,
}: SessionHistoryProps) {
  return (
    <Card hover={false} padding="sm" data-testid="session-history">
      <CardHeader
        title="Session History"
        subtitle="Recent optimization sessions persisted locally"
      />
      <div className="mt-3">
        <VirtualizedRows
          items={sessions}
          rowHeight={64}
          maxHeight={280}
          keyExtractor={(s) => s.id}
          labelledBy="session-history-heading"
          emptyFallback={
            <p className="px-3 py-6 text-center text-xs text-text-muted">
              No optimization sessions yet.
            </p>
          }
          renderRow={(session) => {
            const active = session.id === activeSessionId;
            return (
              <div
                className={`flex h-full items-center justify-between gap-2 py-1 ${
                  active ? "bg-accent/5" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-text-primary">
                    {session.strategyName}{" "}
                    <span className="font-medium text-text-muted">
                      · {session.searchMode}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[10px] text-text-faint">
                    {formatCreated(session.createdAt)} · {session.status} ·{" "}
                    {formatDuration(session)} · params{" "}
                    {session.parameterCount} · top{" "}
                    {session.topScore != null
                      ? session.topScore.toFixed(1)
                      : "—"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    aria-label={`Open session ${session.id}`}
                    onClick={() => onOpen(session.id)}
                    className="rounded-lg border border-surface-border-subtle p-1.5 text-text-muted hover:bg-surface-hover hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                  >
                    <FolderOpen className="h-3.5 w-3.5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    aria-label={`Duplicate session ${session.id}`}
                    onClick={() => onDuplicate(session.id)}
                    className="rounded-lg border border-surface-border-subtle p-1.5 text-text-muted hover:bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete session ${session.id}`}
                    onClick={() => onDelete(session.id)}
                    className="rounded-lg border border-surface-border-subtle p-1.5 text-text-muted hover:bg-surface-hover hover:text-loss focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              </div>
            );
          }}
        />
      </div>
    </Card>
  );
});
