import { Card, CardHeader } from "@/components/ui/Card";
import { DataTransparencyBar } from "@/components/ui/DataTransparency";
import { Sparkline } from "@/components/ui/Sparkline";
import { cn } from "@/lib/utils";
import type { DataTransparency, FinancialHealthMetric } from "@/types";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CircleDollarSign,
  Gauge,
  Landmark,
  Minus,
  Percent,
  ReceiptIndianRupee,
  TrendingUp,
  WalletCards,
} from "lucide-react";

interface FinancialHealthGridProps {
  metrics: FinancialHealthMetric[];
  dataTransparency?: DataTransparency;
}

const metricIcons = {
  revenue: TrendingUp,
  profit: CircleDollarSign,
  eps: ReceiptIndianRupee,
  margin: Percent,
  roe: Gauge,
  roce: Activity,
  debt: Landmark,
  "cash-flow": Banknote,
  "free-cash-flow": WalletCards,
  "working-capital": Banknote,
};

export function FinancialHealthGrid({ metrics, dataTransparency }: FinancialHealthGridProps) {
  return (
    <Card padding="lg" className="animate-fade-in-up">
      <CardHeader
        title="Financial Health"
        subtitle="Growth, returns, balance sheet and cash conversion"
        action={<Activity className="h-4 w-4 text-accent" />}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => {
          const Icon = metricIcons[metric.key as keyof typeof metricIcons] ?? Activity;
          const isPositive = metric.key === "debt"
            ? metric.trend !== "up"
            : metric.trend !== "down";
          const TrendIcon =
            metric.trend === "up"
              ? ArrowUpRight
              : metric.trend === "down"
                ? ArrowDownRight
                : Minus;

          return (
            <div
              key={metric.key}
              className="group rounded-lg border border-surface-border-subtle bg-surface-overlay/30 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/20 hover:bg-surface-hover/40"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                  <Icon className="h-4 w-4 text-accent" />
                </div>
                <Sparkline data={metric.history} positive={isPositive} width={58} height={24} />
              </div>
              <p className="mt-3 data-label">{metric.label}</p>
              <p className="mt-1 truncate font-mono text-base font-semibold text-text-primary tabular-nums">
                {metric.value}
              </p>
              <div className={cn("mt-1.5 flex items-center gap-1 text-[10px]", isPositive ? "text-gain" : "text-loss")}>
                <TrendIcon className="h-3 w-3" />
                <span>{metric.trendLabel}</span>
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-text-faint">
                {metric.explanation}
              </p>
            </div>
          );
        })}
      </div>
      {dataTransparency && <DataTransparencyBar transparency={dataTransparency} className="mt-4" compact />}
    </Card>
  );
}
