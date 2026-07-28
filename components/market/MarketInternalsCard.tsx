/**
 * Sprint 10C.1 — Institutional Market Internals KPI tiles (UI only).
 * Same height · large numbers · no extra decorative borders.
 */

import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import type {
  MarketContextView,
  MarketIntelligenceSnapshot,
  MarketRegimeView,
} from "@/lib/market-intelligence";
import { formatIstShortDateTime } from "@/lib/market/format";
import { cn } from "@/lib/utils";
import { Activity } from "lucide-react";

function formatUpdated(iso: string): string {
  return formatIstShortDateTime(iso);
}

type ValueTone = "emerald" | "blue" | "amber" | "red" | "neutral";

const VALUE_CLASS: Record<ValueTone, string> = {
  emerald: "text-emerald-400",
  blue: "text-blue-400",
  amber: "text-amber-400",
  red: "text-red-400",
  neutral: "text-text-primary",
};

function biasTone(label: string): ValueTone {
  const n = label.toLowerCase();
  if (/\bbull|risk[- ]?on|uptrend/.test(n)) return "emerald";
  if (/\bbear|risk[- ]?off|downtrend/.test(n)) return "red";
  return "amber";
}

function scoreTone(value: number): ValueTone {
  if (value >= 60) return "emerald";
  if (value <= 40) return "red";
  return "blue";
}

function KpiTile({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail?: string;
  tone: ValueTone;
}) {
  return (
    <div className="flex min-h-[112px] flex-col justify-between rounded-xl bg-white/[0.03] px-4 py-3">
      <p className="data-label">{label}</p>
      <p
        className={cn(
          "mt-2 text-metric font-semibold tabular-nums leading-[1.3]",
          VALUE_CLASS[tone]
        )}
      >
        {value}
      </p>
      {detail ? <p className="data-secondary mt-1">{detail}</p> : null}
    </div>
  );
}

function resolveTimestamp(
  context: MarketContextView | null,
  regime: MarketRegimeView | null
): string | null {
  const stamps = [context?.timestamp, regime?.timestamp].filter(
    Boolean
  ) as string[];
  if (stamps.length === 0) return null;
  return stamps.sort().at(-1) ?? null;
}

export function MarketInternalsCard({
  snapshot,
  context: contextProp,
  regime: regimeProp,
  hideTimestamps = false,
}: {
  snapshot?: MarketIntelligenceSnapshot | null;
  context?: MarketContextView | null;
  regime?: MarketRegimeView | null;
  hideTimestamps?: boolean;
}) {
  const context = snapshot?.context ?? contextProp ?? null;
  const regime = snapshot?.regime ?? regimeProp ?? null;

  if (!context && !regime) {
    return (
      <Card padding="md" size="full" data-testid="market-internals-card-empty">
        <CardHeader
          title="Market Internals"
          subtitle="Institutional Market Health"
        />
        <EmptyStatePanel
          message="Market Intelligence temporarily unavailable"
          source="Market Internals"
          icon={Activity}
        />
      </Card>
    );
  }

  const overallBias =
    regime?.regime?.trim() || context?.marketTrend?.trim() || "Neutral";
  const trendStrength =
    regime?.components?.trendStrength ?? context?.marketStrength ?? null;
  const momentum =
    regime?.components?.momentum ?? context?.momentum ?? null;
  const volatility =
    regime?.components?.volatility ??
    (context?.volatilityScore != null ? context.volatilityScore : null);
  const volatilityLabel = context?.volatilityRegime?.trim() || undefined;
  const confidence =
    regime?.confidence ?? context?.contextConfidence ?? null;
  const updatedAt = resolveTimestamp(context, regime);

  return (
    <Card
      padding="md"
      size="full"
      data-testid="market-internals-card"
      className="shadow-none"
    >
      <CardHeader
        title="Market Internals"
        subtitle="Institutional Market Health"
        icon={<Activity className="h-5 w-5" />}
        timestamp={
          !hideTimestamps && updatedAt
            ? `Last Updated ${formatUpdated(updatedAt)} IST`
            : undefined
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <KpiTile
          label="Overall Bias"
          value={overallBias}
          tone={biasTone(overallBias)}
        />
        <KpiTile
          label="Trend Strength"
          value={
            trendStrength != null ? String(Math.round(trendStrength)) : "—"
          }
          tone={trendStrength != null ? scoreTone(trendStrength) : "neutral"}
        />
        <KpiTile
          label="Momentum"
          value={momentum != null ? String(Math.round(momentum)) : "—"}
          tone={momentum != null ? scoreTone(momentum) : "neutral"}
        />
        <KpiTile
          label="Volatility"
          value={
            volatility != null
              ? String(Math.round(volatility))
              : volatilityLabel || "—"
          }
          detail={volatility != null ? volatilityLabel : undefined}
          tone={
            volatility != null
              ? scoreTone(100 - Math.min(volatility, 100))
              : "neutral"
          }
        />
        <KpiTile
          label="Institutional Confidence"
          value={confidence != null ? String(Math.round(confidence)) : "—"}
          detail={regime?.confidenceGrade}
          tone={confidence != null ? scoreTone(confidence) : "neutral"}
        />
        <KpiTile
          label="Last Updated"
          value={updatedAt ? formatUpdated(updatedAt) : "—"}
          detail={updatedAt ? "IST" : undefined}
          tone="neutral"
        />
      </div>
    </Card>
  );
}
