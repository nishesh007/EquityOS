import { Card, CardHeader } from "@/components/ui/Card";
import { cn, formatPrice } from "@/lib/utils";
import type { AIAnalysis, RiskLevel } from "@/types";
import {
  BrainCircuit,
  LineChart,
  ShieldAlert,
  Sparkles,
  Waves,
} from "lucide-react";

interface AIAnalysisCardProps {
  analysis: AIAnalysis;
}

const riskStyles: Record<RiskLevel, string> = {
  Low: "border-gain/25 bg-gain-bg text-gain",
  Moderate: "border-accent/25 bg-accent/10 text-accent",
  High: "border-loss/25 bg-loss-bg text-loss",
};

export function AIAnalysisCard({ analysis }: AIAnalysisCardProps) {
  const insightRows = [
    { label: "Trend", value: analysis.trend, icon: LineChart },
    { label: "Momentum", value: analysis.momentum, icon: Waves },
    { label: "Volume Analysis", value: analysis.volumeAnalysis, icon: BrainCircuit },
  ];

  return (
    <Card padding="lg" className="animate-fade-in-up relative h-full overflow-hidden">
      <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />
      <div className="relative">
        <CardHeader
          title="AI Analysis"
          subtitle={analysis.generatedAt}
          action={
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent/25 to-accent/5 ring-1 ring-accent/25">
              <Sparkles className="h-4 w-4 text-accent" />
            </div>
          }
        />

        <div className="grid grid-cols-2 gap-3">
          <LevelTile label="Support" value={formatPrice(analysis.support)} tone="gain" />
          <LevelTile
            label="Resistance"
            value={formatPrice(analysis.resistance)}
            tone="loss"
          />
        </div>

        <div className="mt-4 space-y-3">
          {insightRows.map((row) => {
            const Icon = row.icon;
            return (
              <div
                key={row.label}
                className="rounded-lg border border-surface-border-subtle bg-surface-overlay/30 p-3"
              >
                <div className="mb-1.5 flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-accent" />
                  <p className="data-label text-[10px]">{row.label}</p>
                </div>
                <p className="text-xs leading-relaxed text-text-secondary">
                  {row.value}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-4 rounded-lg border border-accent/15 bg-accent/5 p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-accent">
              <Sparkles className="h-3.5 w-3.5" />
              <p className="text-xs font-semibold uppercase tracking-wider">
                Investment Thesis
              </p>
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold",
                riskStyles[analysis.riskLevel]
              )}
            >
              <ShieldAlert className="h-3 w-3" />
              {analysis.riskLevel} Risk
            </span>
          </div>
          <p className="text-sm leading-relaxed text-text-secondary">
            {analysis.investmentThesis}
          </p>
        </div>

        <p className="mt-3 text-[10px] text-text-faint">
          AI-generated from mock data. For research illustration only — verify before
          acting.
        </p>
      </div>
    </Card>
  );
}

function LevelTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "gain" | "loss";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        tone === "gain"
          ? "border-gain/15 bg-gain-bg"
          : "border-loss/15 bg-loss-bg"
      )}
    >
      <p
        className={cn(
          "text-[10px] uppercase tracking-wider",
          tone === "gain" ? "text-gain" : "text-loss"
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-mono text-sm font-semibold tabular-nums",
          tone === "gain" ? "text-gain" : "text-loss"
        )}
      >
        {value}
      </p>
    </div>
  );
}
