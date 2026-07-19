import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import type { MarketRegimeView } from "@/lib/market-intelligence";
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

function regimeTone(regime: string): string {
  if (regime.includes("Bull")) return "text-gain";
  if (regime.includes("Bear")) return "text-loss";
  if (regime.includes("Volatility") || regime === "Event Driven") {
    return "text-amber-400";
  }
  return "text-text-primary";
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
    <Card padding="sm" data-testid="market-regime-card">
      <CardHeader
        title="Market Regime"
        subtitle="Institutional classification · confidence"
        badge={
          <span className="rounded-full border border-surface-border-subtle px-2 py-0.5 text-[10px] font-medium text-text-muted">
            {regime.confidenceGrade}
          </span>
        }
        action={
          <span className="text-[10px] text-text-faint">
            {formatUpdated(regime.timestamp)}
          </span>
        }
      />

      <div className="mb-3 flex items-center gap-2">
        <Compass className={`h-4 w-4 ${regimeTone(regime.regime)}`} />
        <div>
          <p className={`text-sm font-semibold ${regimeTone(regime.regime)}`}>
            {regime.regime}
          </p>
          <p className="text-[10px] text-text-muted">
            Confidence {Math.round(regime.confidence)} · Priority {regime.priority}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Metric
          label="Trend Strength"
          value={String(Math.round(c.trendStrength))}
        />
        <Metric label="Momentum" value={String(Math.round(c.momentum))} />
        <Metric label="Volatility" value={String(Math.round(c.volatility))} />
        <Metric label="Breadth" value={String(Math.round(c.breadth))} />
        <Metric label="Risk" value={c.risk} />
        <Metric
          label="Confidence"
          value={`${Math.round(regime.confidence)} · ${regime.confidenceGrade}`}
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
