import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ChangeIndicator } from "@/components/ui/ChangeIndicator";
import type { AIMarketSummary as AIMarketSummaryType } from "@/types";
import { Bot, Sparkles } from "lucide-react";

interface AIMarketSummaryProps {
  summary: AIMarketSummaryType;
}

const sentimentConfig = {
  bullish: { label: "Bullish", variant: "gain" as const },
  bearish: { label: "Bearish", variant: "loss" as const },
  neutral: { label: "Neutral", variant: "neutral" as const },
};

const outlookConfig = {
  positive: "gain" as const,
  negative: "loss" as const,
  neutral: "neutral" as const,
};

export function AIMarketSummary({ summary }: AIMarketSummaryProps) {
  const sentiment = sentimentConfig[summary.sentiment];

  return (
    <Card padding="lg" className="relative overflow-hidden">
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-accent/5 blur-2xl" />
      <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-gain/5 blur-2xl" />

      <CardHeader
        title="AI Market Summary"
        subtitle="Powered by EquityOS Intelligence"
        action={
          <div className="flex items-center gap-2">
            <Badge variant={sentiment.variant}>{sentiment.label}</Badge>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
              <Bot className="h-4 w-4 text-accent" />
            </div>
          </div>
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-accent" />
        <span className="text-xs text-text-muted">
          Confidence:{" "}
          <span className="font-mono font-medium text-text-secondary">
            {summary.confidence}%
          </span>
        </span>
      </div>

      <p className="text-sm leading-relaxed text-text-secondary">
        {summary.summary}
      </p>

      <div className="mt-5">
        <p className="mb-2 text-xs font-medium text-text-muted">Key Points</p>
        <ul className="space-y-2">
          {summary.keyPoints.map((point, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-xs text-text-secondary"
            >
              <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-accent" />
              {point}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 border-t border-surface-border-subtle pt-4">
        <p className="mb-3 text-xs font-medium text-text-muted">
          Sector Outlook
        </p>
        <div className="flex flex-wrap gap-2">
          {summary.sectors.map((sector) => (
            <div
              key={sector.name}
              className="flex items-center gap-2 rounded-lg border border-surface-border-subtle bg-surface-overlay/50 px-3 py-1.5"
            >
              <span className="text-xs font-medium text-text-secondary">
                {sector.name}
              </span>
              <Badge variant={outlookConfig[sector.outlook]} size="sm">
                <ChangeIndicator
                  value={sector.change}
                  size="sm"
                  showIcon={false}
                />
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
