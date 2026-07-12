import { Card, CardHeader } from "@/components/ui/Card";
import { ChangeIndicator } from "@/components/ui/ChangeIndicator";
import type { QuarterlyAnalysis } from "@/types";
import { BarChart3, Sparkles } from "lucide-react";

interface QuarterlyIntelligenceProps {
  quarterly: QuarterlyAnalysis;
}

export function QuarterlyIntelligence({ quarterly }: QuarterlyIntelligenceProps) {
  return (
    <Card padding="lg" className="animate-fade-in-up">
      <CardHeader
        title="Quarterly Analysis"
        subtitle="Sequential earnings, margin and growth timeline"
        action={<BarChart3 className="h-4 w-4 text-accent" />}
      />

      <div className="overflow-x-auto pb-2">
        <div className="relative grid min-w-[840px] grid-cols-4 gap-4">
          <div className="absolute left-[12.5%] right-[12.5%] top-3 h-px bg-surface-border" />
          {quarterly.points.map((point, index) => (
            <div key={point.quarter} className="relative pt-8">
              <div className="absolute left-1/2 top-1 h-4 w-4 -translate-x-1/2 rounded-full border-4 border-surface-raised bg-accent shadow-glow" />
              <div className="rounded-lg border border-surface-border-subtle bg-surface-overlay/30 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/20">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-xs font-semibold text-text-primary">{point.quarter}</p>
                  {index === quarterly.points.length - 1 && (
                    <span className="rounded-md border border-accent/20 bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                      Latest
                    </span>
                  )}
                </div>
                <div className="space-y-3">
                  <QuarterMetric label="Revenue" value={point.revenue} growth={point.revenueGrowth} />
                  <QuarterMetric label="Net Profit" value={point.profit} growth={point.profitGrowth} />
                  <div className="grid grid-cols-2 gap-3 border-t border-surface-border-subtle pt-3">
                    <div>
                      <p className="text-[10px] text-text-faint">EPS</p>
                      <p className="mt-0.5 font-mono text-xs font-semibold text-text-secondary">₹{point.eps}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-text-faint">Margin</p>
                      <p className="mt-0.5 font-mono text-xs font-semibold text-text-secondary">{point.margin}%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-accent/15 bg-accent/5 p-4">
        <div className="mb-2 flex items-center gap-2 text-accent">
          <Sparkles className="h-3.5 w-3.5" />
          <p className="text-xs font-semibold uppercase tracking-wider">AI Quarterly Summary</p>
        </div>
        <p className="text-sm leading-relaxed text-text-secondary">{quarterly.summary}</p>
      </div>
    </Card>
  );
}

function QuarterMetric({
  label,
  value,
  growth,
}: {
  label: string;
  value: string;
  growth: number;
}) {
  return (
    <div className="flex items-end justify-between gap-2">
      <div>
        <p className="text-[10px] text-text-faint">{label}</p>
        <p className="mt-0.5 font-mono text-xs font-semibold text-text-primary">{value}</p>
      </div>
      {growth !== 0 && <ChangeIndicator value={growth} size="sm" showIcon={false} />}
    </div>
  );
}
