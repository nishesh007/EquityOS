import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import type { MarketRegimeView } from "@/lib/market-intelligence";
import { StatusBadge, statusToneFromLabel } from "@/src/design";
import { Compass, Shield } from "lucide-react";

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

export function MarketRegimeCard({
  regime,
}: {
  regime: MarketRegimeView | null;
}) {
  if (!regime) {
    return (
      <Card padding="sm" data-testid="market-regime-card-empty">
        <CardHeader title="Market Regime" subtitle="Awaiting classification" />
        <EmptyStatePanel
          message="Shared Market Regime is warming up. Classification appears once the Trading Pipeline finishes."
          source="Trading Pipeline · Market Regime"
          icon={Compass}
        />
      </Card>
    );
  }

  const c = regime.components;

  return (
    <Card padding="sm" accent="indigo" data-testid="market-regime-card">
      <CardHeader
        title="Market Regime"
        subtitle="Institutional classification · confidence"
        icon={<Compass className="h-4 w-4" />}
        timestamp={`Updated ${formatUpdated(regime.timestamp)} IST`}
        badge={
          <StatusBadge
            tone={statusToneFromLabel(regime.confidenceGrade)}
            size="sm"
          >
            {regime.confidenceGrade}
          </StatusBadge>
        }
      />

      <div className="mb-3 flex items-center gap-2">
        <StatusBadge tone={statusToneFromLabel(regime.regime)}>
          {regime.regime}
        </StatusBadge>
        <p className="text-[10px] text-text-muted">
          Confidence {Math.round(regime.confidence)} · Priority {regime.priority}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Metric
          label="Trend Strength"
          value={String(Math.round(c.trendStrength))}
        />
        <Metric label="Momentum" value={String(Math.round(c.momentum))} />
        <Metric label="Volatility" value={String(Math.round(c.volatility))} />
        <Metric label="Breadth" value={String(Math.round(c.breadth))} />
        <Metric
          label="Risk"
          value={c.risk}
          tint="border-amber-500/15 bg-amber-500/5"
        />
        <Metric
          label="Confidence"
          value={`${Math.round(regime.confidence)} · ${regime.confidenceGrade}`}
          tint="border-indigo-500/15 bg-indigo-500/5"
        />
      </div>

      {regime.reasons.length > 0 && (
        <ul className="mt-3 space-y-1">
          {regime.reasons.slice(0, 3).map((reason) => (
            <li
              key={reason}
              className="flex items-start gap-1.5 text-[10px] text-text-muted"
            >
              <Shield className="mt-0.5 h-3 w-3 shrink-0 text-accent" />
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-2 text-[10px] text-text-faint">
        Last updated {formatUpdated(regime.timestamp)} IST
      </p>
    </Card>
  );
}
