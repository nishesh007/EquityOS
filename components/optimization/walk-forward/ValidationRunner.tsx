"use client";

import { memo } from "react";
import { Play, Square } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { WalkForwardSession } from "@/lib/optimization";

export interface ValidationRunnerProps {
  session: WalkForwardSession | null;
  running: boolean;
  canRun: boolean;
  onRun: () => void;
  onCancel: () => void;
}

export const ValidationRunner = memo(function ValidationRunner({
  session,
  running,
  canRun,
  onRun,
  onCancel,
}: ValidationRunnerProps) {
  return (
    <Card hover={false} padding="sm" accent="violet" data-testid="validation-runner">
      <CardHeader
        title="Walk-Forward Runner"
        subtitle="Train → freeze parameters → test on unseen data only"
      />
      {session ? (
        <div className="mt-3">
          <div
            className="h-2 overflow-hidden rounded-full bg-surface-overlay"
            role="progressbar"
            aria-valuenow={session.progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Walk-forward progress"
          >
            <div
              className="h-full rounded-full bg-accent transition-[width]"
              style={{ width: `${session.progressPercent}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-text-muted">
            {session.status} · {session.progressPercent}% · {session.message}
          </p>
        </div>
      ) : (
        <p className="mt-3 text-xs text-text-muted">
          No walk-forward session yet. Configure windows and run validation.
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!canRun || running}
          onClick={onRun}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
            canRun && !running
              ? "border border-accent/40 bg-accent/20 text-accent hover:bg-accent/30"
              : "cursor-not-allowed border border-surface-border-subtle text-text-faint"
          )}
        >
          <Play className="h-3.5 w-3.5" aria-hidden />
          {running ? "Validating…" : "Run Walk-Forward"}
        </button>
        <button
          type="button"
          disabled={!running}
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 rounded-lg border border-loss/30 bg-loss/10 px-3 py-2 text-xs font-semibold text-loss disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          <Square className="h-3.5 w-3.5" aria-hidden />
          Cancel
        </button>
      </div>
    </Card>
  );
});
