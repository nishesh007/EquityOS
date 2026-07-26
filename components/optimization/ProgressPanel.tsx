"use client";

import { memo } from "react";
import { Pause, Play, Square, X } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { OptimizationSession, RunnerControl } from "@/lib/optimization";

export interface ProgressPanelProps {
  session: OptimizationSession | null;
  runnerControl: RunnerControl;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
}

export const ProgressPanel = memo(function ProgressPanel({
  session,
  runnerControl,
  onPause,
  onResume,
  onCancel,
}: ProgressPanelProps) {
  if (!session) {
    return (
      <Card hover={false} padding="sm" data-testid="progress-panel">
        <CardHeader
          title="Progress"
          subtitle="Start an optimization run to stream live progress"
        />
        <p className="mt-3 text-xs text-text-muted">No active session.</p>
      </Card>
    );
  }

  const p = session.progress;
  const running = session.status === "Running";
  const paused = session.status === "Paused" || runnerControl === "paused";

  return (
    <Card hover={false} padding="sm" data-testid="progress-panel">
      <CardHeader
        title="Progress Engine"
        subtitle={`${session.searchMode} · ${session.strategyName}`}
        badge={
          <span className="rounded-full border border-surface-border-subtle px-2 py-0.5 text-[10px] font-semibold text-text-secondary">
            {session.status}
          </span>
        }
      />

      <div
        className="mt-3"
        role="progressbar"
        aria-valuenow={p.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Optimization progress"
      >
        <div className="h-2 overflow-hidden rounded-full bg-surface-overlay">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-300",
              session.status === "Failed" || session.status === "Cancelled"
                ? "bg-loss/70"
                : "bg-accent"
            )}
            style={{ width: `${p.percent}%` }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-text-muted">
          {p.percent}% · {p.message ?? ""}
        </p>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
        <div className="rounded-lg border border-surface-border-subtle bg-surface-overlay/30 px-2.5 py-2">
          <dt className="text-[10px] uppercase tracking-wider text-text-faint">
            Current
          </dt>
          <dd className="mt-0.5 line-clamp-2 font-medium text-text-primary">
            {p.currentCombinationLabel || "—"}
          </dd>
        </div>
        <div className="rounded-lg border border-surface-border-subtle bg-surface-overlay/30 px-2.5 py-2">
          <dt className="text-[10px] uppercase tracking-wider text-text-faint">
            Remaining
          </dt>
          <dd className="mt-0.5 font-semibold text-text-primary">
            {p.remaining.toLocaleString()}
          </dd>
        </div>
        <div className="rounded-lg border border-surface-border-subtle bg-surface-overlay/30 px-2.5 py-2">
          <dt className="text-[10px] uppercase tracking-wider text-text-faint">
            ETA
          </dt>
          <dd className="mt-0.5 font-semibold text-text-primary">
            {p.estimatedSecondsRemaining > 0
              ? `${p.estimatedSecondsRemaining}s`
              : "—"}
          </dd>
        </div>
        <div className="rounded-lg border border-surface-border-subtle bg-surface-overlay/30 px-2.5 py-2">
          <dt className="text-[10px] uppercase tracking-wider text-text-faint">
            Eval / sec
          </dt>
          <dd className="mt-0.5 font-semibold text-text-primary">
            {p.evaluationsPerSecond}
          </dd>
        </div>
        <div className="rounded-lg border border-surface-border-subtle bg-surface-overlay/30 px-2.5 py-2">
          <dt className="text-[10px] uppercase tracking-wider text-text-faint">
            Memory
          </dt>
          <dd className="mt-0.5 font-semibold text-text-primary">
            ~{p.memoryEstimateMb} MB
          </dd>
        </div>
        <div className="rounded-lg border border-surface-border-subtle bg-surface-overlay/30 px-2.5 py-2">
          <dt className="text-[10px] uppercase tracking-wider text-text-faint">
            CPU
          </dt>
          <dd className="mt-0.5 font-semibold text-text-primary">
            {p.cpuEstimate}
          </dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap gap-2">
        {paused ? (
          <button
            type="button"
            onClick={onResume}
            className="inline-flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/15 px-3 py-1.5 text-xs font-semibold text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            <Play className="h-3.5 w-3.5" aria-hidden />
            Resume
          </button>
        ) : (
          <button
            type="button"
            onClick={onPause}
            disabled={!running}
            className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border-subtle bg-surface-overlay/50 px-3 py-1.5 text-xs font-semibold text-text-secondary disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            <Pause className="h-3.5 w-3.5" aria-hidden />
            Pause
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          disabled={
            session.status === "Completed" ||
            session.status === "Cancelled" ||
            session.status === "Failed"
          }
          className="inline-flex items-center gap-1.5 rounded-lg border border-loss/30 bg-loss/10 px-3 py-1.5 text-xs font-semibold text-loss disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          <Square className="h-3.5 w-3.5" aria-hidden />
          Cancel
        </button>
        {session.error ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-loss">
            <X className="h-3 w-3" aria-hidden />
            {session.error}
          </span>
        ) : null}
      </div>
    </Card>
  );
});
