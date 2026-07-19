import { Card, CardHeader } from "@/components/ui/Card";
import type { MarketContextView } from "@/lib/market-intelligence";
import { Activity, Gauge, TrendingUp, Waves } from "lucide-react";

function formatUpdated(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function trendTone(trend: string): string {
  if (trend.includes("Bull")) return "text-gain";
  if (trend.includes("Bear")) return "text-loss";
  return "text-text-primary";
}

function riskTone(risk: string): string {
  if (risk === "Risk On") return "text-gain";
  if (risk === "Risk Off") return "text-loss";
  return "text-amber-400";
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-md border border-surface-border-subtle/70 bg-surface-overlay/40 px-2.5 py-2">
      <p className="text-[9px] font-medium uppercase tracking-wider text-text-faint">
        {label}
      </p>
      <p className={`mt-0.5 text-xs font-semibold ${tone ?? "text-text-primary"}`}>
        {value}
      </p>
    </div>
  );
}

export function MarketContextCard({
  context,
}: {
  context: MarketContextView | null;
}) {
  if (!context) {
    return (
      <Card padding="sm" data-testid="market-context-card-empty">
        <CardHeader title="Market Context" subtitle="Awaiting market data" />
        <p className="text-xs text-text-muted">No context available</p>
      </Card>
    );
  }

  return (
    <Card padding="sm" data-testid="market-context-card">
      <CardHeader
        title="Market Context"
        subtitle="Trend · volatility · breadth · risk"
        badge={
          <span className="rounded-full border border-surface-border-subtle px-2 py-0.5 text-[10px] font-medium text-text-muted">
            Conf {Math.round(context.contextConfidence)}
          </span>
        }
        action={
          <span className="text-[10px] text-text-faint">
            {formatUpdated(context.timestamp)}
          </span>
        }
      />

      <div className="mb-3 flex items-center gap-2">
        <TrendingUp className={`h-4 w-4 ${trendTone(context.marketTrend)}`} />
        <div>
          <p className={`text-sm font-semibold ${trendTone(context.marketTrend)}`}>
            {context.marketTrend}
          </p>
          <p className="text-[10px] text-text-muted">
            Score {Math.round(context.contextScore)} · Strength{" "}
            {Math.round(context.marketStrength)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric
          label="Risk"
          value={context.riskMode}
          tone={riskTone(context.riskMode)}
        />
        <Metric label="Volatility" value={context.volatilityRegime} />
        <Metric
          label="Breadth"
          value={`${Math.round(context.breadthScore)} · ${context.breadthQuality}`}
        />
        <Metric
          label="A/D"
          value={`${context.advanceCount}/${context.declineCount}`}
        />
        <Metric
          label="Momentum"
          value={String(Math.round(context.momentum))}
        />
        <Metric
          label="Liquidity"
          value={String(Math.round(context.liquidity))}
        />
        <Metric
          label="Participation"
          value={`${Math.round(context.institutionalParticipation)}%`}
        />
        <Metric
          label="Sector Breadth"
          value={String(Math.round(context.sectorBreadth))}
        />
      </div>

      {(context.leadingSectors.length > 0 || context.weakSectors.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-text-muted">
          {context.leadingSectors.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <Activity className="h-3 w-3 text-gain" />
              Lead: {context.leadingSectors.slice(0, 3).join(", ")}
            </span>
          )}
          {context.weakSectors.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <Waves className="h-3 w-3 text-loss" />
              Weak: {context.weakSectors.slice(0, 3).join(", ")}
            </span>
          )}
        </div>
      )}

      <p className="mt-2 flex items-center gap-1 text-[10px] text-text-faint">
        <Gauge className="h-3 w-3" />
        Last updated {formatUpdated(context.timestamp)} IST
      </p>
    </Card>
  );
}
