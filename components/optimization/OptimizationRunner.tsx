"use client";

import { memo } from "react";
import { Play } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { OptimizationEngineSettings, ValidationState } from "@/lib/optimization";

export interface OptimizationRunnerProps {
  validation: ValidationState;
  settings: OptimizationEngineSettings;
  running: boolean;
  onRun: () => void;
}

export const OptimizationRunner = memo(function OptimizationRunner({
  validation,
  settings,
  running,
  onRun,
}: OptimizationRunnerProps) {
  const canRun = validation.ready && !running;

  return (
    <Card hover={false} padding="sm" accent="violet" data-testid="optimization-runner">
      <CardHeader
        title="Optimization Runner"
        subtitle="Offline research engine — no live or paper trading"
      />
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg border border-surface-border-subtle bg-surface-overlay/30 px-2.5 py-2">
          <dt className="text-[10px] uppercase tracking-wider text-text-faint">
            Mode
          </dt>
          <dd className="mt-0.5 font-semibold capitalize text-text-primary">
            {settings.searchMode.replace("_", " ")}
          </dd>
        </div>
        <div className="rounded-lg border border-surface-border-subtle bg-surface-overlay/30 px-2.5 py-2">
          <dt className="text-[10px] uppercase tracking-wider text-text-faint">
            Ranking
          </dt>
          <dd className="mt-0.5 font-semibold capitalize text-text-primary">
            {settings.rankingMode.replace("_", " ")}
          </dd>
        </div>
      </dl>
      <button
        type="button"
        disabled={!canRun}
        onClick={onRun}
        aria-label="Run optimization"
        className={cn(
          "mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
          canRun
            ? "border border-accent/40 bg-accent/20 text-accent hover:bg-accent/30"
            : "cursor-not-allowed border border-surface-border-subtle bg-surface-overlay/40 text-text-faint"
        )}
      >
        <Play className="h-3.5 w-3.5" aria-hidden />
        {running ? "Optimization Running…" : "Run Optimization"}
      </button>
      {!validation.ready ? (
        <p className="mt-2 text-[11px] text-text-muted">
          Complete validation checks before running.
        </p>
      ) : null}
    </Card>
  );
});
