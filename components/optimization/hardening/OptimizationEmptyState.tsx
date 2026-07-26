/**
 * Sprint 11C.5 — shared empty / recovery chrome for Strategy Optimization Lab.
 */

import { memo } from "react";
import { AlertTriangle, Inbox, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/Card";

export const OptimizationEmptyState = memo(function OptimizationEmptyState({
  title,
  message,
  actionLabel,
  onAction,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Card
      hover={false}
      padding="md"
      className="border-dashed"
      data-testid="optimization-empty-state"
    >
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <Inbox className="h-8 w-8 text-text-faint" aria-hidden />
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        <p className="max-w-md text-xs text-text-muted">{message}</p>
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/15 px-3 py-1.5 text-xs font-semibold text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            {actionLabel}
          </button>
        ) : null}
      </div>
    </Card>
  );
});

export const OptimizationRecoveryBanner = memo(
  function OptimizationRecoveryBanner({
    message,
    onDismiss,
  }: {
    message: string;
    onDismiss?: () => void;
  }) {
    return (
      <div
        role="alert"
        className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-loss/30 bg-loss/5 px-3 py-2.5"
        data-testid="optimization-recovery-banner"
      >
        <div className="flex items-start gap-2">
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-loss"
            aria-hidden
          />
          <p className="text-xs text-loss">{message}</p>
        </div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg border border-surface-border-subtle px-2 py-1 text-[10px] font-semibold text-text-secondary hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            Dismiss
          </button>
        ) : null}
      </div>
    );
  }
);
