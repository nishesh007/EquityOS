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
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { MarketContextView } from "@/lib/market-intelligence";
import {
  fetchClientMarketBreadth,
  isUsableMarketBreadth,
} from "@/lib/market-orchestrator/client-breadth";
import {
  derivePulseMetricsFromBreadth,
  enrichContextFromBreadth,
} from "@/lib/market-orchestrator/enrich-context-from-breadth";
import type { MarketBreadth } from "@/types";

interface MarketPulseProps {
  pulse: MarketPulseType;
  marketIntelligence?: MarketIntelligenceSnapshot | null;
  /** Optional breadth from canonical snapshot (no client fetch). */
  breadth?: MarketBreadth | null;
  /** Session status from snapshot when locked. */
  marketStatus?: MarketStatus;
  /** Consume only props — no /api/market/context or breadth fetches. */
  snapshotLocked?: boolean;
  hideTimestamps?: boolean;
  hideFlows?: boolean;
  hidePcr?: boolean;
}

interface PulseMetricProps {
  label: string;
  children: ReactNode;
  detail: ReactNode;
  icon: ReactNode;
  tint?: string;
}

function formatFlow(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}₹${Math.abs(value).toLocaleString("en-IN")}Cr`;
}

function PulseMetric({ label, children, detail, icon, tint }: PulseMetricProps) {
  return (
    <div
      className={`group rounded-lg border p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${
        tint ?? "border-surface-border-subtle bg-surface-overlay/50"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="data-label">{label}</p>
        <div className="data-icon transition-opacity group-hover:opacity-100">
          {icon}
        </div>
      </div>
      <div className="mt-2.5 text-text-primary [&_.data-value]:text-[24px] [&_.data-value]:font-bold [&_.data-value]:leading-none [&_.data-value]:tracking-tight sm:[&_.data-value]:text-[26px]">
        {children}
      </div>
      <div className="data-secondary mt-1.5 leading-relaxed">{detail}</div>
    </div>
  );
}

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

export function MarketPulse({
  pulse,
  marketIntelligence,
  breadth: snapshotBreadth = null,
  marketStatus: snapshotMarketStatus,
  snapshotLocked = false,
  hideTimestamps = false,
  hideFlows = false,
  hidePcr = false,
}: MarketPulseProps) {
  const flow = pulse.institutionalFlow;
  const flowAvailable =
    flow.asOf !== "Unavailable" &&
    flow.asOf !== "Data unavailable" &&
    (flow.fii !== 0 || flow.dii !== 0);

  const [liveContext, setLiveContext] = useState<MarketContextView | null>(
    null
  );
  const [breadthOverlay, setBreadthOverlay] = useState<MarketBreadth | null>(
    null
  );
  const seedContext = marketIntelligence?.context ?? null;
  const needsMetricHydrate =
    !snapshotLocked &&
    (!seedContext ||
      (seedContext.momentum ?? 0) === 0 ||
      (seedContext.institutionalParticipation ?? 0) === 0 ||
      (seedContext.advanceCount ?? 0) === 0);

  useEffect(() => {
    if (!needsMetricHydrate) return;
    let cancelled = false;
    void Promise.all([
      fetch("/api/market/context", { cache: "no-store" })
        .then(async (res) => {
          if (!res.ok) return null;
          return (await res.json()) as { context?: MarketContextView | null };
        })
        .catch(() => null),
      fetchClientMarketBreadth("nse").catch(() => null),
    ]).then(([json, breadth]) => {
      if (cancelled) return;
      if (json?.context) setLiveContext(json.context);
      if (breadth && isUsableMarketBreadth(breadth)) {
        setBreadthOverlay(breadth);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [needsMetricHydrate]);

  const lockedBreadth =
    snapshotLocked && snapshotBreadth && isUsableMarketBreadth(snapshotBreadth)
      ? snapshotBreadth
      : null;

  const context = enrichContextFromBreadth(
    liveContext ?? seedContext,
    lockedBreadth ?? breadthOverlay
  );
  const derived = lockedBreadth
    ? derivePulseMetricsFromBreadth(lockedBreadth)
    : breadthOverlay
      ? derivePulseMetricsFromBreadth(breadthOverlay)
      : null;

  const initialQuotes = useMemo(() => {
    const map: Record<string, EnrichedQuote> = {};
    if (pulse.vixQuote) {
      map.INDIAVIX = pulse.vixQuote;
    }
    return map;
  }, [pulse.vixQuote]);

  const { quotes, marketStatus, loading } = useMarketQuotes(["INDIAVIX"], {
    initialQuotes,
    enabled: !snapshotLocked,
  });

  const vixQuote = resolveVixQuote(
    snapshotLocked ? undefined : quotes.get("INDIAVIX"),
    snapshotLocked ? false : loading,
    pulse.vixQuote
  );
  const vixAvailable =
    vixQuote.availability !== "unavailable" &&
    vixQuote.price !== null &&
    vixQuote.price > 0;

  const vixUpdated = vixQuote.lastUpdatedIST?.replace("\n", " ");
  const resolvedStatus =
    snapshotMarketStatus ?? (marketStatus as MarketStatus);
  const sessionLabel = getMarketStatusLabel(resolvedStatus);

  const breadthScore =
    pulse.breadthScore > 0
      ? pulse.breadthScore
      : context && context.breadthScore > 0
        ? Math.round(context.breadthScore)
        : derived?.breadthScore ?? 0;
  const momentumRaw = context ? Math.round(context.momentum) : null;
  const momentum =
    momentumRaw != null && momentumRaw > 0
      ? momentumRaw
      : derived?.momentum ?? null;
  const liquidity = context ? Math.round(context.liquidity) : null;
  const participationRaw = context
    ? Math.round(context.institutionalParticipation)
    : null;
  const participation =
    participationRaw != null && participationRaw > 0
      ? participationRaw
      : derived?.participation ?? null;
  const volatility = context?.volatilityRegime ?? null;

  return (
    <Card padding="lg" accent="emerald" className="relative overflow-hidden">
      <div className="pointer-events-none absolute left-0 top-0 h-px w-full animate-terminal-scan bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
      <CardHeader
        title="Market Pulse"
        subtitle="Live risk, positioning and participation snapshot"
        icon={<Activity className="h-4 w-4 text-emerald-400" />}
        badge={
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
            {sessionLabel}
          </span>
        }
        action={
          <MarketSessionIndicator
            marketStatus={resolvedStatus}
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
            hideTimestamps
              ? vixAvailable
                ? "Volatility index"
                : "Data unavailable"
              : vixUpdated
                ? <>Updated {vixUpdated}</>
                : "Data unavailable"
          }
        >
          <div className="flex items-end gap-2">
            {vixAvailable ? (
              <>
                <p className="data-value">{vixQuote.price!.toFixed(2)}</p>
                <ChangeIndicator value={vixQuote.changePercent ?? 0} size="sm" />
              </>
            ) : (
              <p className="text-xl font-semibold text-text-muted">
                Data unavailable
              </p>
            )}
          </div>
        </PulseMetric>

        {!hideFlows ? (
          <PulseMetric
            label="FII / DII"
            tint={METRIC_TINTS.flow}
            icon={<ArrowDownToLine className="h-4 w-4" />}
            detail={
              flowAvailable
                ? `Net cash flow · ${flow.asOf}`
                : "Data unavailable"
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
                Data unavailable
              </p>
            )}
          </PulseMetric>
        ) : null}

        {!hidePcr ? (
          <PulseMetric
            label="Put Call Ratio"
            tint={METRIC_TINTS.pcr}
            icon={<Gauge className="h-4 w-4" />}
            detail={
              pulse.putCallRatio > 0
                ? "Options positioning"
                : "Data unavailable"
            }
          >
            <p className="data-value">
              {pulse.putCallRatio > 0
                ? pulse.putCallRatio
                : "Data unavailable"}
            </p>
          </PulseMetric>
        ) : null}

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
              : "Data unavailable"
          }
        >
          <div className="flex items-center gap-3">
            <p className="data-value">
              {breadthScore > 0 ? breadthScore : "Data unavailable"}
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
              : "Data unavailable"
          }
        >
          <p className="data-value">
            {momentum != null ? momentum : "Data unavailable"}
          </p>
        </PulseMetric>

        <PulseMetric
          label="Volatility"
          tint={METRIC_TINTS.volatility}
          icon={<Activity className="h-4 w-4" />}
          detail={
            volatility
              ? "Shared Market Context"
              : "Data unavailable"
          }
        >
          <p className="text-sm font-semibold text-text-primary">
            {volatility ?? "Data unavailable"}
          </p>
        </PulseMetric>

        <PulseMetric
          label="Liquidity"
          tint={METRIC_TINTS.liquidity}
          icon={<Droplets className="h-4 w-4" />}
          detail={
            liquidity != null
              ? "Shared Market Context"
              : "Data unavailable"
          }
        >
          <p className="data-value">
            {liquidity != null ? liquidity : "Data unavailable"}
          </p>
        </PulseMetric>

        <PulseMetric
          label="Participation"
          tint={METRIC_TINTS.participation}
          icon={<Users className="h-4 w-4" />}
          detail={
            participation != null
              ? "Institutional participation score"
              : "Data unavailable"
          }
        >
          <p className="data-value">
            {participation != null
              ? `${participation}%`
              : "Data unavailable"}
          </p>
        </PulseMetric>
      </div>

      {!context && !vixAvailable && !flowAvailable ? (
        <div className="mt-4">
          <EmptyStatePanel
            message="Market Pulse is waiting on live quotes and institutional feeds."
            source="Market Context · India VIX · FII/DII"
          />
        </div>
      ) : null}
    </Card>
  );
}
