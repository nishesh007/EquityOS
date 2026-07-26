"use client";

import { memo, useMemo } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { VirtualizedRows } from "@/components/backtesting/hardening/VirtualizedRows";
import { cn } from "@/lib/utils";
import type { ExperimentQueueItem, ExperimentStatus } from "@/lib/optimization";

function statusClass(status: ExperimentStatus): string {
  switch (status) {
    case "Completed":
      return "text-gain";
    case "Ready":
      return "text-accent";
    case "Cancelled":
      return "text-loss";
    default:
      return "text-text-muted";
  }
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

export interface ExperimentQueueProps {
  items: ExperimentQueueItem[];
}

export const ExperimentQueue = memo(function ExperimentQueue({
  items,
}: ExperimentQueueProps) {
  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [items]
  );

  return (
    <Card hover={false} padding="sm" data-testid="experiment-queue">
      <CardHeader
        title="Experiment Queue"
        subtitle="Mock queue for upcoming optimization runs — execution arrives in Sprint 11C.2"
      />
      <div className="mt-3">
        <div
          className="mb-1 hidden grid-cols-12 gap-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-text-faint sm:grid"
          aria-hidden
        >
          <span className="col-span-3">Experiment</span>
          <span className="col-span-2">Strategy</span>
          <span className="col-span-2">Created</span>
          <span className="col-span-2">Status</span>
          <span className="col-span-2">Est. Runtime</span>
          <span className="col-span-1">Priority</span>
        </div>
        <VirtualizedRows
          items={sorted}
          rowHeight={48}
          maxHeight={280}
          keyExtractor={(item) => item.id}
          labelledBy="experiment-queue-heading"
          emptyFallback={
            <p className="px-3 py-6 text-center text-xs text-text-muted">
              No experiments in queue.
            </p>
          }
          renderRow={(item) => (
            <div className="grid h-full grid-cols-1 items-center gap-1 py-1 text-xs sm:grid-cols-12 sm:gap-2">
              <span className="truncate font-semibold text-text-primary sm:col-span-3">
                {item.name}
              </span>
              <span className="truncate text-text-secondary sm:col-span-2">
                {item.strategy}
              </span>
              <span className="text-text-muted sm:col-span-2">
                {formatCreated(item.createdAt)}
              </span>
              <span
                className={cn(
                  "font-medium sm:col-span-2",
                  statusClass(item.status)
                )}
              >
                {item.status}
              </span>
              <span className="text-text-secondary sm:col-span-2">
                {item.estimatedRuntime}
              </span>
              <span className="text-text-muted sm:col-span-1">
                {item.priority}
              </span>
            </div>
          )}
        />
      </div>
    </Card>
  );
});
