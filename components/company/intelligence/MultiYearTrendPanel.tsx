import { DataTransparencyBar } from "@/components/ui/DataTransparency";
import { Card, CardHeader } from "@/components/ui/Card";
import { Sparkline } from "@/components/ui/Sparkline";
import { cn } from "@/lib/utils";
import type { DataTransparency, MultiYearTrendAnalysis } from "@/types";
import { TrendingUp } from "lucide-react";

interface MultiYearTrendPanelProps {
  trends: MultiYearTrendAnalysis;
  dataTransparency: DataTransparency;
}

const directionStyles = {
  improving: "text-gain",
  deteriorating: "text-loss",
  stable: "text-accent",
};

export function MultiYearTrendPanel({ trends, dataTransparency }: MultiYearTrendPanelProps) {
  return (
    <Card padding="lg" className="animate-fade-in-up">
      <CardHeader
        title="Multi-Year Trend Engine"
        subtitle="5–10 year financial trajectory analysis"
        action={<TrendingUp className="h-4 w-4 text-accent" />}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {trends.metrics.map((metric) => {
          const isPositive = metric.key === "debt"
            ? metric.direction === "deteriorating"
            : metric.direction === "improving";
          return (
            <div
              key={metric.key}
              className="rounded-lg border border-surface-border-subtle bg-surface-overlay/30 p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="data-label">{metric.label}</p>
                  <p className={cn("mt-1 text-[10px] font-medium uppercase tracking-wider", directionStyles[metric.direction])}>
                    {metric.direction}
                  </p>
                </div>
                <Sparkline
                  data={metric.points.map((p) => p.value)}
                  positive={isPositive}
                  width={58}
                  height={24}
                />
              </div>
              <p className="mt-2 font-mono text-sm font-semibold text-text-primary tabular-nums">
                {metric.points.at(-1)?.value ?? "—"}
                <span className="ml-1 text-[10px] font-normal text-text-faint">{metric.unit}</span>
              </p>
              <p className="mt-2 text-[10px] leading-relaxed text-text-faint">
                {metric.explanation}
              </p>
            </div>
          );
        })}
      </div>
      <DataTransparencyBar transparency={dataTransparency} className="mt-4" compact />
    </Card>
  );
}
