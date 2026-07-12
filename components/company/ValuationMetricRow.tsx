import { Badge } from "@/components/ui/Badge";
import type { ValuationMetric } from "@/types";
import { cn } from "@/lib/utils";

interface ValuationMetricRowProps {
  metric: ValuationMetric;
}

const statusVariant = {
  undervalued: "gain" as const,
  fair: "neutral" as const,
  overvalued: "loss" as const,
};

const statusLabel = {
  undervalued: "Undervalued",
  fair: "Fair Value",
  overvalued: "Overvalued",
};

export function ValuationMetricRow({ metric }: ValuationMetricRowProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-surface-border-subtle bg-surface-overlay/30 px-4 py-3 transition-colors hover:bg-surface-overlay/50">
      <div>
        <p className="text-sm font-medium text-text-primary">{metric.label}</p>
        <p className="mt-0.5 text-xs text-text-muted">
          Industry avg:{" "}
          <span className="font-mono text-text-secondary">
            {metric.industryAvg}
          </span>
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold font-mono text-text-primary tabular-nums">
          {metric.value}
        </span>
        <Badge variant={statusVariant[metric.status]} size="sm">
          {statusLabel[metric.status]}
        </Badge>
      </div>
    </div>
  );
}
