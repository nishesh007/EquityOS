"use client";

import { memo } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { RuntimeEstimate } from "@/lib/optimization";

export interface RuntimeEstimatorProps {
  estimate: RuntimeEstimate;
}

function complexityClass(level: RuntimeEstimate["complexity"]): string {
  switch (level) {
    case "Very High":
      return "text-loss";
    case "High":
      return "text-amber-400";
    case "Moderate":
      return "text-accent";
    default:
      return "text-gain";
  }
}

export const RuntimeEstimator = memo(function RuntimeEstimator({
  estimate,
}: RuntimeEstimatorProps) {
  const metrics = [
    { label: "Parameter Count", value: String(estimate.parameterCount) },
    {
      label: "Combination Count",
      value: estimate.combinationCount.toLocaleString(),
    },
    { label: "Estimated Runtime", value: estimate.estimatedRuntime },
    { label: "CPU Estimate", value: estimate.cpuEstimate },
    { label: "Memory Estimate", value: estimate.memoryEstimate },
    {
      label: "Complexity Level",
      value: estimate.complexity,
      className: complexityClass(estimate.complexity),
    },
  ] as const;

  return (
    <Card hover={false} padding="sm" data-testid="runtime-estimator">
      <CardHeader
        title="Runtime Estimation"
        subtitle="Mock cost model based on enabled parameter ranges"
      />
      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-lg border border-surface-border-subtle bg-surface-overlay/30 px-3 py-2.5"
          >
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
              {m.label}
            </dt>
            <dd
              className={cn(
                "mt-1 text-sm font-semibold text-text-primary",
                "className" in m ? m.className : undefined
              )}
            >
              {m.value}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
});
