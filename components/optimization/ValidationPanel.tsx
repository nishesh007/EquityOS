"use client";

import { memo } from "react";
import { AlertTriangle, Check, X } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { ValidationState } from "@/lib/optimization";

export interface ValidationPanelProps {
  validation: ValidationState;
  runMessage: string | null;
  onRun: () => void;
  running?: boolean;
}

function StatusIcon({ status }: { status: "pass" | "warn" | "fail" }) {
  if (status === "pass") {
    return <Check className="h-3.5 w-3.5 text-gain" aria-hidden />;
  }
  if (status === "warn") {
    return <AlertTriangle className="h-3.5 w-3.5 text-amber-400" aria-hidden />;
  }
  return <X className="h-3.5 w-3.5 text-loss" aria-hidden />;
}

export const ValidationPanel = memo(function ValidationPanel({
  validation,
  runMessage,
  onRun,
  running = false,
}: ValidationPanelProps) {
  const canRun = validation.ready && !running;

  return (
    <Card hover={false} padding="sm" accent="violet" data-testid="validation-panel">
      <CardHeader
        title="Validation Panel"
        subtitle="Live readiness checks before optimization execution"
      />
      <ul className="mt-3 space-y-2" aria-live="polite" aria-label="Validation checks">
        {validation.checks.map((check) => (
          <li
            key={check.id}
            className="flex items-start gap-2 rounded-lg border border-surface-border-subtle bg-surface-overlay/30 px-3 py-2"
          >
            <span className="mt-0.5 shrink-0">
              <StatusIcon status={check.status} />
            </span>
            <div className="min-w-0">
              <p
                className={cn(
                  "text-xs font-semibold",
                  check.status === "fail"
                    ? "text-loss"
                    : check.status === "warn"
                      ? "text-amber-400"
                      : "text-text-primary"
                )}
              >
                <span className="sr-only">
                  {check.status === "pass"
                    ? "Passed"
                    : check.status === "warn"
                      ? "Warning"
                      : "Failed"}
                  :{" "}
                </span>
                {check.status === "pass"
                  ? "✓ "
                  : check.status === "warn"
                    ? "⚠ "
                    : "✗ "}
                {check.label}
              </p>
              {check.message ? (
                <p className="mt-0.5 text-[11px] text-text-muted">{check.message}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          disabled={!canRun}
          onClick={onRun}
          aria-label="Run optimization"
          aria-disabled={!canRun}
          className={cn(
            "w-full rounded-lg px-3 py-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
            canRun
              ? "border border-accent/40 bg-accent/20 text-accent hover:bg-accent/30"
              : "cursor-not-allowed border border-surface-border-subtle bg-surface-overlay/40 text-text-faint"
          )}
        >
          {running ? "Optimization Running…" : "Run Optimization"}
        </button>
        {runMessage ? (
          <p role="status" className="text-center text-[11px] text-accent">
            {runMessage}
          </p>
        ) : null}
      </div>
    </Card>
  );
});
