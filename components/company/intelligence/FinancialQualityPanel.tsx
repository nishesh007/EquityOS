import { IntelligenceProgress } from "@/components/company/intelligence/IntelligenceProgress";
import { DataTransparencyBar } from "@/components/ui/DataTransparency";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { DataTransparency, FinancialQualityAnalysis } from "@/types";
import { ArrowDownRight, ArrowUpRight, Minus, ShieldCheck } from "lucide-react";

interface FinancialQualityPanelProps {
  analysis: FinancialQualityAnalysis;
  dataTransparency: DataTransparency;
}

export function FinancialQualityPanel({ analysis, dataTransparency }: FinancialQualityPanelProps) {
  return (
    <Card padding="lg" className="animate-fade-in-up">
      <CardHeader
        title="Financial Quality Engine"
        subtitle={`${analysis.scores.length} metrics scored · Overall ${analysis.overallScore}/100`}
        action={<ShieldCheck className="h-4 w-4 text-accent" />}
      />
      <div className="mb-4 rounded-lg border border-surface-border-subtle bg-surface-overlay/30 p-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="data-label">Composite Quality Score</p>
            <p className="mt-1 font-mono text-2xl font-semibold text-text-primary tabular-nums">
              {analysis.overallScore}
              <span className="text-xs text-text-faint"> / 100</span>
            </p>
          </div>
          <span className={cn("text-xs font-medium", analysis.overallScore >= 70 ? "text-gain" : analysis.overallScore >= 50 ? "text-accent" : "text-loss")}>
            {analysis.overallScore >= 70 ? "High Quality" : analysis.overallScore >= 50 ? "Average" : "Weak"}
          </span>
        </div>
        <IntelligenceProgress
          className="mt-3"
          value={analysis.overallScore}
          tone={analysis.overallScore >= 70 ? "gain" : analysis.overallScore >= 50 ? "accent" : "loss"}
          showValue={false}
        />
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {analysis.scores.map((item) => {
          const TrendIcon =
            item.trend === "up" ? ArrowUpRight : item.trend === "down" ? ArrowDownRight : Minus;
          const isPositive = item.key === "debt" ? item.trend !== "up" : item.trend !== "down";
          return (
            <div
              key={item.key}
              className="rounded-lg border border-surface-border-subtle bg-surface/50 p-3"
            >
              <div className="flex items-center justify-between">
                <p className="truncate text-xs font-medium text-text-primary">{item.label}</p>
                <span className={cn("font-mono text-xs font-semibold tabular-nums", item.score >= 70 ? "text-gain" : item.score >= 50 ? "text-accent" : "text-loss")}>
                  {item.score}
                </span>
              </div>
              <div className={cn("mt-1 flex items-center gap-1 text-[10px]", isPositive ? "text-gain" : "text-loss")}>
                <TrendIcon className="h-3 w-3" />
                <span className="truncate">{item.explanation.slice(0, 60)}...</span>
              </div>
            </div>
          );
        })}
      </div>
      <DataTransparencyBar transparency={dataTransparency} className="mt-4" compact />
    </Card>
  );
}
