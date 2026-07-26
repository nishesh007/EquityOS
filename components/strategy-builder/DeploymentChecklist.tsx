"use client";

import { memo } from "react";
import { Card } from "@/components/ui/Card";
import type { BuiltStrategy } from "@/lib/strategy-builder";
import { CheckCircle2, CircleAlert, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export const DeploymentChecklist = memo(function DeploymentChecklist({
  strategy,
}: {
  strategy: BuiltStrategy | null;
}) {
  if (!strategy) {
    return (
      <Card padding="lg" data-testid="deployment-checklist">
        <h2 className="text-base font-semibold text-text-primary">
          Deployment Readiness
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          Select a strategy to evaluate paper-trading deployment readiness.
        </p>
      </Card>
    );
  }

  const { deployment } = strategy;
  const tone =
    deployment.status === "Ready"
      ? "text-gain"
      : deployment.status === "Needs Improvement"
        ? "text-amber-400"
        : "text-loss";

  return (
    <Card padding="lg" data-testid="deployment-checklist" accent="amber">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-text-primary">
            Deployment Readiness
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Checklist for Historical Backtesting, Optimization, Walk-Forward, Monte Carlo, and risk gates.
          </p>
        </div>
        <div className={cn("text-right", tone)}>
          <div className="text-xs uppercase tracking-wide opacity-80">
            Final Status
          </div>
          <div className="text-lg font-semibold">{deployment.status}</div>
          <div className="text-xs text-text-secondary">{deployment.summary}</div>
        </div>
      </div>

      <ul className="mt-4 space-y-2" aria-label="Deployment checklist">
        {deployment.items.map((item) => (
          <li
            key={item.id}
            className="flex items-start gap-3 rounded-lg border border-surface-border-subtle bg-surface-overlay/30 px-3 py-2"
          >
            {item.passed ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gain" aria-hidden />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-loss" aria-hidden />
            )}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-text-primary">
                {item.label}
              </div>
              <div className="text-xs text-text-secondary">{item.detail}</div>
            </div>
            <span className="sr-only">
              {item.passed ? "Passed" : "Failed"}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <Link
          href="/research/optimization"
          className="rounded-lg border border-surface-border-subtle px-3 py-1.5 text-text-secondary hover:bg-surface-raised"
        >
          Open Strategy Optimization
        </Link>
        <Link
          href="/backtesting"
          className="rounded-lg border border-surface-border-subtle px-3 py-1.5 text-text-secondary hover:bg-surface-raised"
        >
          Open Historical Backtesting
        </Link>
        <Link
          href="/paper-trading"
          className="inline-flex items-center gap-1 rounded-lg border border-surface-border-subtle px-3 py-1.5 text-text-secondary hover:bg-surface-raised"
        >
          <CircleAlert className="h-3.5 w-3.5" aria-hidden />
          Paper Trading Lab
        </Link>
      </div>
    </Card>
  );
});
