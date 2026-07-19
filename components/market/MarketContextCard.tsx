import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import type { MarketContextView } from "@/lib/market-intelligence";
import { StatusBadge, statusToneFromLabel } from "@/src/design";
import { Activity, Gauge, Waves } from "lucide-react";

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

function riskTone(risk: string): string {
  if (risk === "Risk On") return "text-gain";
  if (risk === "Risk Off") return "text-loss";
  return "text-amber-400";
}

function Metric({
  label,
  value,
  tone,
  tint,
}: {
  label: string;
  value: string;
  tone?: string;
  /** R4 subtle tinted surface (5–8% opacity). */
  tint?: string;
}) {
  return (
    <div
      className={`rounded-md border px-2.5 py-2 ${
        tint ?? "border-surface-border-subtle/70 bg-surface-overlay/40"
      }`}
    >
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
        <EmptyStatePanel
          message="Shared Market Context is warming up. Dashboard will refresh automatically once the Trading Pipeline publishes a snapshot."
          source="Trading Pipeline · Market Context"
          icon={Activity}
        />
      </Card>
    );
  }

  return (
    <Card padding="sm" accent="indigo" data-testid="market-context-card">
      <CardHeader
        title="Market Context"
        subtitle="Trend · volatility · breadth · risk"
        icon={<Activity className="h-4 w-4" />}
        timestamp={`Updated ${formatUpdated(context.timestamp)} IST`}
        badge={
          <StatusBadge tone="info" size="sm">
            Conf {Math.round(context.contextConfidence)}
          </StatusBadge>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <StatusBadge tone={statusToneFromLabel(context.marketTrend)}>
          {context.marketTrend}
        </StatusBadge>
        <StatusBadge tone={statusToneFromLabel(context.riskMode)} size="sm">
          {context.riskMode}
        </StatusBadge>
        <p className="text-[10px] text-text-muted">
          Score {Math.round(context.contextScore)} · Strength{" "}
          {Math.round(context.marketStrength)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric
          label="Risk"
          value={context.riskMode}
          tone={riskTone(context.riskMode)}
          tint="border-amber-500/15 bg-amber-500/5"
        />
        <Metric
          label="Volatility"
          value={context.volatilityRegime}
          tint="border-amber-500/15 bg-amber-500/5"
        />
        <Metric
          label="Breadth"
          value={`${Math.round(context.breadthScore)} · ${context.breadthQuality}`}
          tint="border-cyan-500/15 bg-cyan-500/5"
        />
        <Metric
          label="A/D"
          value={`${context.advanceCount}/${context.declineCount}`}
        />
        <Metric
          label="Momentum"
          value={String(Math.round(context.momentum))}
          tint="border-sky-500/15 bg-sky-500/5"
        />
        <Metric
          label="Liquidity"
          value={String(Math.round(context.liquidity))}
          tint="border-indigo-500/15 bg-indigo-500/5"
        />
        <Metric
          label="Participation"
          value={`${Math.round(context.institutionalParticipation)}%`}
          tint="border-violet-500/15 bg-violet-500/5"
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
