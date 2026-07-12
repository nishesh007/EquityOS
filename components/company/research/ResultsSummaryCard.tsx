import { Card, CardHeader } from "@/components/ui/Card";
import { SignalBadge } from "@/components/ui/SignalBadge";
import { cn } from "@/lib/utils";
import type { ResultsSummary } from "@/types";
import { BarChart3 } from "lucide-react";

interface ResultsSummaryCardProps {
  results: ResultsSummary;
}

type ResultMetric =
  | {
      label: string;
      value: string;
      type: "growth";
      growth: number;
    }
  | {
      label: string;
      value: string;
      type: "margin";
      subValue: string;
    };

export function ResultsSummaryCard({ results }: ResultsSummaryCardProps) {
  const metrics: ResultMetric[] = [
    {
      label: "Revenue",
      value: results.revenue,
      type: "growth",
      growth: results.revenueGrowthYoY,
    },
    {
      label: "Profit",
      value: results.netProfit,
      type: "growth",
      growth: results.netProfitGrowthYoY,
    },
    {
      label: "EPS",
      value: `₹${results.eps.toLocaleString("en-IN")}`,
      type: "growth",
      growth: results.epsGrowthYoY,
    },
    {
      label: "Margins",
      value: `${results.netMargin}%`,
      type: "margin",
      subValue: `OPM ${results.operatingMargin}%`,
    },
  ];

  return (
    <Card padding="lg" className="animate-fade-in-up h-full">
      <CardHeader
        title="Quarterly Result Summary"
        subtitle={`${results.quarter} · Reported ${results.reportedOn}`}
        action={
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
            <BarChart3 className="h-4 w-4 text-accent" />
          </div>
        }
      />

      <div className="mb-4 flex items-center justify-between rounded-lg border border-surface-border-subtle bg-surface-overlay/30 p-3">
        <div>
          <p className="data-label text-[10px]">Result Verdict</p>
          <p className="mt-1 text-sm font-semibold text-text-primary">
            Earnings quality and growth check
          </p>
        </div>
        <SignalBadge signal={results.verdict} />
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-surface-border-subtle bg-surface-border-subtle">
        {metrics.map((metric) => (
          <div key={metric.label} className="bg-surface-raised p-3">
            <p className="data-label text-[10px]">{metric.label}</p>
            <p className="mt-1 font-mono text-base font-semibold tabular-nums text-text-primary">
              {metric.value}
            </p>
            {metric.type === "growth" ? (
              <p
                className={cn(
                  "mt-1 font-mono text-[11px] tabular-nums",
                  metric.growth >= 0 ? "text-gain" : "text-loss"
                )}
              >
                {metric.growth >= 0 ? "+" : ""}
                {metric.growth}% YoY growth
              </p>
            ) : (
              <p className="mt-1 font-mono text-[11px] tabular-nums text-text-muted">
                {metric.subValue}
              </p>
            )}
          </div>
        ))}
      </div>

      <p className="mt-4 text-sm leading-relaxed text-text-secondary">
        {results.commentary}
      </p>
    </Card>
  );
}
