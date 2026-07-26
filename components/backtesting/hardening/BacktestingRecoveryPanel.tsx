"use client";

import { Card } from "@/components/ui/Card";
import { AlertTriangle, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";

export type BacktestingRecoveryKind =
  | "missing_dataset"
  | "corrupt_session"
  | "missing_report"
  | "export_failure"
  | "generic";

const TITLES: Record<BacktestingRecoveryKind, string> = {
  missing_dataset: "Missing dataset",
  corrupt_session: "Corrupt or incomplete session",
  missing_report: "Report unavailable",
  export_failure: "Export failed",
  generic: "Something went wrong",
};

const DEFAULT_MESSAGES: Record<BacktestingRecoveryKind, string> = {
  missing_dataset:
    "Required historical data could not be loaded. Retry or choose another session.",
  corrupt_session:
    "The selected backtest session is incomplete. Select another session or retry.",
  missing_report:
    "The institutional report could not be assembled. Reset filters and try again.",
  export_failure:
    "The export job did not complete. Retry the same format or switch to JSON/CSV.",
  generic: "An unexpected error interrupted this Historical Backtesting view.",
};

/**
 * Reusable recovery surface for backtesting UI failures (retry + guidance).
 */
export function BacktestingRecoveryPanel({
  kind,
  message,
  onRetry,
  secondaryAction,
  className,
}: {
  kind: BacktestingRecoveryKind;
  message?: string;
  onRetry?: () => void;
  secondaryAction?: ReactNode;
  className?: string;
}) {
  return (
    <div role="alert" data-testid="backtesting-recovery" className={className}>
      <Card hover={false} padding="md" className="border-loss/20">
        <div className="flex items-start gap-3">
          <AlertTriangle
            className="mt-0.5 h-5 w-5 shrink-0 text-loss"
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-text-primary">
              {TITLES[kind]}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-text-muted">
              {message ?? DEFAULT_MESSAGES[kind]}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {onRetry ? (
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border bg-surface-overlay px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                  Retry
                </button>
              ) : null}
              {secondaryAction}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
