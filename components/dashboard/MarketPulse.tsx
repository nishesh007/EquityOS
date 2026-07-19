"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { ChangeIndicator } from "@/components/ui/ChangeIndicator";
import { MarketSessionIndicator } from "@/components/market/MarketSessionIndicator";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { useMarketQuotes } from "@/hooks/useMarketQuotes";
import {
  createUnavailableQuote,
  type EnrichedQuote,
} from "@/lib/market-data/enriched-quote";
import type { MarketIntelligenceSnapshot } from "@/lib/market-intelligence";
import type { MarketStatus } from "@/lib/market/session";
import { getMarketStatusLabel } from "@/lib/market/session";
import type { MarketPulse as MarketPulseType } from "@/types";
import {
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  Droplets,
  Gauge,
  Radio,
  Users,
  Waves,
} from "lucide-react";
import { useMemo, type ReactNode } from "react";

interface MarketPulseProps {
  pulse: MarketPulseType;
  marketIntelligence?: MarketIntelligenceSnapshot | null;
}

interface PulseMetricProps {
  label: string;
  children: ReactNode;
  detail: ReactNode;
  icon: ReactNode;
  /** R4 subtle tinted background (5–8% opacity), dark theme preserved. */
  tint?: string;
}

function formatFlow(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}₹${Math.abs(value).toLocaleString("en-IN")}Cr`;
}

function PulseMetric({ label, children, detail, icon, tint }: PulseMetricProps) {
  return (
    <div
      className={`group rounded-lg border p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/20 hover:bg-surface-hover/60 ${
        tint ?? "border-surface-border-subtle bg-surface-overlay/50"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="data-label">{label}</p>
        <div className="text-text-faint transition-colors group-hover:text-accent">
          {icon}
        </div>
      </div>
      <div className="mt-2">{children}</div>
      <div className="mt-1 text-[10px] text-text-muted">{detail}</div>
    </div>
  );
}

/** Per-metric tinted surfaces (5–8% opacity) — presentation only. */
const METRIC_TINTS = {
  vix: "border-emerald-500/15 bg-emerald-500/5",
  flow: "border-emerald-500/15 bg-emerald-500/5",
  pcr: "border-orange-500/15 bg-orange-500/5",
  trend: "border-emerald-500/15 bg-emerald-500/5",
  breadth: "border-cyan-500/15 bg-cyan-500/5",
  momentum: "border-sky-500/15 bg-sky-500/5",
  volatility: "border-amber-500/15 bg-amber-500/5",
  liquidity: "border-indigo-500/15 bg-indigo-500/5",
  participation: "border-violet-500/15 bg-violet-500/5",
} as const;

function resolveVixQuote(
  polled: EnrichedQuote | undefined,
  loading: boolean,
  initial?: EnrichedQuote
): EnrichedQuote {
  return (
    polled ??
    (loading ? initial : undefined) ??
    createUnavailableQuote("INDIAVIX")
  );
}

export function MarketPulse({ pulse, marketIntelligence }: MarketPulseProps) {
  const flow = pulse.institutionalFlow;
  const flowAvailable =
    flow.asOf !== "Unavailable" &&
    flow.asOf !== "Coming in Sprint 10D" &&
    (flow.fii !== 0 || flow.dii !== 0);
  const context = marketIntelligence?.context ?? null;
  const initialQuotes = useMemo(() => {
    const map: Record<string, EnrichedQuote> = {};
    if (pulse.vixQuote) {
      map.INDIAVIX = pulse.vixQuote;
    }
    return map;
  }, [pulse.vixQuote]);

  const { quotes, marketStatus, loading } = useMarketQuotes(["INDIAVIX"], {
    initialQuotes,
  });

  const vixQuote = resolveVixQuote(
    quotes.get("INDIAVIX"),
    loading,
    pulse.vixQuote
  );
  const vixAvailable =
    vixQuote.availability !== "unavailable" &&
    vixQuote.price !== null &&
    vixQuote.price > 0;

  const vixUpdated = vixQuote.lastUpdatedIST?.replace("\n", " ");
  const sessionLabel = getMarketStatusLabel(marketStatus as MarketStatus);

  const breadthScore =
    pulse.breadthScore > 0
      ? pulse.breadthScore
      : context
        ? Math.round(context.breadthScore)
        : 0;
  const momentum = context ? Math.round(context.momentum) : null;
  const liquidity = context ? Math.round(context.liquidity) : null;
  const participation = context
    ? Math.round(context.institutionalParticipation)
    : null;
  const volatility = context?.volatilityRegime ?? null;

  return (
    <Card padding="lg" accent="emerald" className="relative overflow-hidden">
      <div className="pointer-events-none absolute left-0 top-0 h-px w-full animate-terminal-scan bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
      <CardHeader
        title="Market Pulse"
        subtitle="Live risk, positioning and participation snapshot"
        icon={<Activity className="h-4 w-4 text-emerald-400" />}
        badge={
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
            {sessionLabel}
          </span>
        }
        action={
          <MarketSessionIndicator
            marketStatus={marketStatus}
            marketStatusLabel={sessionLabel}
          />
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <PulseMetric
          label="India VIX"
          tint={METRIC_TINTS.vix}
          icon={<Activity className="h-4 w-4" />}
          detail={
            vixUpdated ? (
              <>Updated {vixUpdated}</>
            ) : (
              "Coming in Sprint 10D · data source pending"
            )
          }
        >
          <div className="flex items-end gap-2">
            {vixAvailable ? (
              <>
                <p className="data-value text-xl font-semibold font-mono tabular-nums">
                  {vixQuote.price!.toFixed(2)}
                </p>
                <ChangeIndicator value={vixQuote.changePercent ?? 0} size="sm" />
              </>
            ) : (
              <p className="text-xl font-semibold text-text-muted">
                Coming in Sprint 10D
              </p>
            )}
          </div>
        </PulseMetric>

        <PulseMetric
          label="FII / DII"
          tint={METRIC_TINTS.flow}
          icon={<ArrowDownToLine className="h-4 w-4" />}
          detail={
            flowAvailable
              ? `Net cash flow · ${flow.asOf}`
              : "Coming in Sprint 10D · data source pending"
          }
        >
          {flowAvailable ? (
            <div className="flex items-center gap-3 font-mono text-xs tabular-nums">
              <span className={flow.fii >= 0 ? "text-gain" : "text-loss"}>
                FII {formatFlow(flow.fii)}
              </span>
              <span className={flow.dii >= 0 ? "text-gain" : "text-loss"}>
                DII {formatFlow(flow.dii)}
              </span>
            </div>
          ) : (
            <p className="text-xl font-semibold text-text-muted">
              Coming in Sprint 10D
            </p>
          )}
        </PulseMetric>

        <PulseMetric
          label="Put Call Ratio"
          tint={METRIC_TINTS.pcr}
          icon={<Gauge className="h-4 w-4" />}
          detail={
            pulse.putCallRatio > 0
              ? "Options positioning"
              : "Coming in Sprint 10D · data source pending"
          }
        >
          <p className="data-value text-xl font-semibold">
            {pulse.putCallRatio > 0
              ? pulse.putCallRatio
              : "Coming in Sprint 10D"}
          </p>
        </PulseMetric>

        <PulseMetric
          label="Market Trend"
          tint={METRIC_TINTS.trend}
          icon={<ArrowUpFromLine className="h-4 w-4" />}
          detail={
            context
              ? `Regime ${marketIntelligence?.regime.regime ?? "—"}`
              : "Derived from live benchmark direction"
          }
        >
          <p className="text-sm font-semibold text-gain">
            {context?.marketTrend ?? pulse.marketTrend}
          </p>
        </PulseMetric>

        <PulseMetric
          label="Breadth"
          tint={METRIC_TINTS.breadth}
          icon={<Radio className="h-4 w-4" />}
          detail={
            breadthScore > 0
              ? (context?.breadthQuality ?? "Tracked-universe participation")
              : "Coming in Sprint 10D · data source pending"
          }
        >
          <div className="flex items-center gap-3">
            <p className="data-value text-xl font-semibold">
              {breadthScore > 0 ? breadthScore : "Coming in Sprint 10D"}
            </p>
            {breadthScore > 0 ? (
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-border">
                <div
                  className="h-full rounded-full bg-gain transition-[width] duration-1000 ease-out"
                  style={{ width: `${breadthScore}%` }}
                />
              </div>
            ) : null}
          </div>
        </PulseMetric>

        <PulseMetric
          label="Momentum"
          tint={METRIC_TINTS.momentum}
          icon={<Waves className="h-4 w-4" />}
          detail={
            momentum != null
              ? "Shared Market Context"
              : "Coming in Sprint 10D · data source pending"
          }
        >
          <p className="data-value text-xl font-semibold">
            {momentum != null ? momentum : "Coming in Sprint 10D"}
          </p>
        </PulseMetric>

        <PulseMetric
          label="Volatility"
          tint={METRIC_TINTS.volatility}
          icon={<Activity className="h-4 w-4" />}
          detail={
            volatility
              ? "Shared Market Context"
              : "Coming in Sprint 10D · data source pending"
          }
        >
          <p className="text-sm font-semibold text-text-primary">
            {volatility ?? "Coming in Sprint 10D"}
          </p>
        </PulseMetric>

        <PulseMetric
          label="Liquidity"
          tint={METRIC_TINTS.liquidity}
          icon={<Droplets className="h-4 w-4" />}
          detail={
            liquidity != null
              ? "Shared Market Context"
              : "Coming in Sprint 10D · data source pending"
          }
        >
          <p className="data-value text-xl font-semibold">
            {liquidity != null ? liquidity : "Coming in Sprint 10D"}
          </p>
        </PulseMetric>

        <PulseMetric
          label="Participation"
          tint={METRIC_TINTS.participation}
          icon={<Users className="h-4 w-4" />}
          detail={
            participation != null
              ? "Institutional participation score"
              : "Coming in Sprint 10D · data source pending"
          }
        >
          <p className="data-value text-xl font-semibold">
            {participation != null
              ? `${participation}%`
              : "Coming in Sprint 10D"}
          </p>
        </PulseMetric>
      </div>

      {!context && !vixAvailable && !flowAvailable ? (
        <div className="mt-4">
          <EmptyStatePanel
            message="Market Pulse is waiting on live quotes and Sprint 10D institutional feeds."
            source="Market Context · India VIX · FII/DII"
          />
        </div>
      ) : null}
    </Card>
  );
}
