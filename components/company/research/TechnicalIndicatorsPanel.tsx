import { AskAIButton } from "@/components/ai/AskAIButton";
import { Card, CardHeader } from "@/components/ui/Card";
import { ScoreGauge } from "@/components/ui/ScoreGauge";
import { SignalBadge } from "@/components/ui/SignalBadge";
import { cn } from "@/lib/utils";
import type { TechnicalAnalysis } from "@/types";
import { Activity } from "lucide-react";

interface TechnicalIndicatorsPanelProps {
  symbol: string;
  technicals: TechnicalAnalysis;
}

export function TechnicalIndicatorsPanel({
  symbol,
  technicals,
}: TechnicalIndicatorsPanelProps) {
  const total = technicals.indicators.length;

  const distribution = [
    { label: "Bullish", count: technicals.bullishCount, color: "bg-gain" },
    { label: "Neutral", count: technicals.neutralCount, color: "bg-text-faint" },
    { label: "Bearish", count: technicals.bearishCount, color: "bg-loss" },
  ];

  return (
    <Card padding="lg" className="animate-fade-in-up">
      <CardHeader
        title="Technical Indicators"
        subtitle="Multi-factor signal analysis"
        action={
          <div className="flex items-center gap-2">
            <AskAIButton
              symbol={symbol}
              pageContext="company"
              variant="chip"
              explainTarget={{
                type: "score",
                key: "technical-score",
                label: "Technical Score",
                value: technicals.score,
                symbol,
                pageContext: "company",
                detail: `${technicals.bullishCount} bullish, ${technicals.bearishCount} bearish indicators`,
              }}
            />
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
              <Activity className="h-4 w-4 text-accent" />
            </div>
          </div>
        }
      />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
        <div className="flex flex-col items-center lg:w-52 lg:shrink-0">
          <ScoreGauge score={technicals.score} label="Technical Score" />
          <div className="mt-3">
            <SignalBadge signal={technicals.summary} />
          </div>
        </div>

        <div className="flex-1">
          <div className="mb-4 flex h-2 overflow-hidden rounded-full bg-surface-overlay">
            {distribution.map((d) =>
              d.count > 0 ? (
                <div
                  key={d.label}
                  className={cn(d.color, "h-full")}
                  style={{ width: `${(d.count / total) * 100}%` }}
                  title={`${d.label}: ${d.count}`}
                />
              ) : null
            )}
          </div>
          <div className="mb-4 flex items-center gap-4 text-[10px] text-text-muted">
            {distribution.map((d) => (
              <span key={d.label} className="flex items-center gap-1.5">
                <span className={cn("h-2 w-2 rounded-full", d.color)} />
                {d.label} · {d.count}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-surface-border-subtle bg-surface-border-subtle sm:grid-cols-2">
            {technicals.indicators.map((indicator) => (
              <div
                key={indicator.name}
                className="flex items-center justify-between gap-3 bg-surface-raised px-3.5 py-2.5 transition-colors hover:bg-surface-hover/40"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium text-text-primary">
                    {indicator.name}
                  </p>
                  <p className="truncate text-[10px] text-text-muted">
                    {indicator.detail}
                  </p>
                </div>
                <div className="flex flex-shrink-0 flex-col items-end gap-1">
                  <AskAIButton
                    symbol={symbol}
                    pageContext="company"
                    variant="chip"
                    className="mb-1"
                    explainTarget={{
                      type: "technical",
                      key: indicator.name.toLowerCase().replace(/\s+/g, "-"),
                      label: indicator.name,
                      value: indicator.value,
                      symbol,
                      pageContext: "company",
                      detail: `${indicator.detail} · Signal: ${indicator.signal}`,
                    }}
                  />
                  <span className="font-mono text-xs tabular-nums text-text-secondary">
                    {indicator.value}
                  </span>
                  <SignalBadge signal={indicator.signal} size="sm" showIcon={false} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
