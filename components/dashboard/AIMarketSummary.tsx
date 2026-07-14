import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ChangeIndicator } from "@/components/ui/ChangeIndicator";
import {
  formatOptionalText,
  formatOptionalTimestamp,
} from "@/lib/dashboard/display-value";
import type { AIMarketSummary as AIMarketSummaryType } from "@/types";
import { Bot, Sparkles } from "lucide-react";

interface AIMarketSummaryMeta {
  marketData?: string | null;
  news?: string | null;
  breadth?: string | null;
  trend?: string | null;
  generatedAt?: string | null;
}

interface AIMarketSummaryProps {
  summary: AIMarketSummaryType;
  meta?: AIMarketSummaryMeta;
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

function MetaChip({ label, value }: { label: string; value: string }) {
  const muted = value === "N/A" || value === "Unavailable";
  return (
    <div className="rounded-md border border-surface-border-subtle/70 bg-surface-hover/30 px-2.5 py-2">
      <p className="text-[9px] font-medium uppercase tracking-wider text-text-faint">
        {label}
      </p>
      <p
        className={`mt-0.5 font-mono text-xs font-medium tabular-nums ${
          muted ? "text-text-muted" : "text-text-secondary"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export function AIMarketSummary({ summary, meta }: AIMarketSummaryProps) {
  const sentiment = sentimentConfig[summary.sentiment];
  const confidence =
    Number.isFinite(summary.confidence) && summary.confidence > 0
      ? `${Math.round(summary.confidence)}%`
      : "N/A";

  return (
    <Card padding="lg" className="relative overflow-hidden">
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-accent/5 blur-2xl" />
      <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-gain/5 blur-2xl" />

      <CardHeader
        title="AI Market Summary"
        subtitle="Powered by EquityOS Intelligence"
        action={
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-surface-border-subtle bg-surface-overlay/60 px-2.5 py-1.5 text-right">
              <p className="text-[9px] font-medium uppercase tracking-wider text-text-faint">
                AI Outlook
              </p>
              <div className="mt-0.5 flex items-center justify-end gap-1.5">
                <Badge variant={sentiment.variant}>{sentiment.label}</Badge>
              </div>
              <p className="mt-1 text-[10px] text-text-muted">
                Generated:{" "}
                <span className="text-text-secondary">
                  {formatOptionalTimestamp(meta?.generatedAt, "N/A")}
                </span>
              </p>
              <p className="text-[10px] text-text-muted">
                Confidence:{" "}
                <span className="font-mono text-text-secondary">{confidence}</span>
              </p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
              <Bot className="h-4 w-4 text-accent" />
            </div>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <MetaChip label="AI Confidence" value={confidence} />
        <MetaChip
          label="Market Data"
          value={formatOptionalText(meta?.marketData, "N/A")}
        />
        <MetaChip label="News" value={formatOptionalText(meta?.news, "N/A")} />
        <MetaChip
          label="Breadth"
          value={formatOptionalText(meta?.breadth, "N/A")}
        />
        <MetaChip
          label="Trend"
          value={formatOptionalText(meta?.trend ?? sentiment.label, "N/A")}
        />
      </div>

      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-accent" />
        <span className="text-xs text-text-muted">
          Institutional market narrative from live index context
        </span>
      </div>

      <p className="text-sm leading-relaxed text-text-secondary">
        {summary.summary}
      </p>

      <div className="mt-5">
        <p className="mb-2 text-xs font-medium text-text-muted">Key Points</p>
        {summary.keyPoints.length > 0 ? (
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
        ) : (
          <p className="text-xs text-text-muted">N/A</p>
        )}
      </div>

      <div className="mt-5 border-t border-surface-border-subtle pt-4">
        <p className="mb-3 text-xs font-medium text-text-muted">
          Sector Outlook
        </p>
        {summary.sectors.length > 0 ? (
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
        ) : (
          <p className="text-xs text-text-muted">No dominant sector today.</p>
        )}
      </div>
    </Card>
  );
}
