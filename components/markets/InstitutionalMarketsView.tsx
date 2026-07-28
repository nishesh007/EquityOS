"use client";

import { MarketOverviewCards } from "@/components/dashboard/MarketOverviewCards";
import { MarketPulse } from "@/components/dashboard/MarketPulse";
import { MarketBreadth } from "@/components/dashboard/MarketBreadth";
import { MarketHeatmap } from "@/components/dashboard/market-heatmap";
import { MarketIntelligenceStrip } from "@/components/market";
import { MarketSessionBanner } from "@/components/market/MarketSessionBanner";
import { Card, CardHeader } from "@/components/ui/Card";
import {
  getMarketsRefreshIntervalMs,
  resolveMarketsRefreshMode,
  type MarketsRefreshMode,
} from "@/lib/market-orchestrator/marketsRefreshPolicy";
import type { MarketSnapshot } from "@/lib/market-orchestrator/types";
import { ArrowDownToLine, Gauge, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

function formatPageTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "Asia/Kolkata",
    });
  } catch {
    return iso;
  }
}

function formatFlow(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}₹${Math.abs(value).toLocaleString("en-IN")}Cr`;
}

function Section({
  id,
  title,
  subtitle,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="mb-8 scroll-mt-20 animate-fade-in-up"
      data-markets-section={id}
    >
      <div className="mb-3">
        <h2 className="text-sm font-semibold tracking-wide text-text-primary">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-text-muted">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function FiidiiCard({ snapshot }: { snapshot: MarketSnapshot }) {
  const flow = snapshot.pulse.institutionalFlow;
  const available =
    flow.asOf !== "Unavailable" &&
    flow.asOf !== "Data unavailable" &&
    (flow.fii !== 0 || flow.dii !== 0);

  return (
    <Card padding="lg" accent="emerald" data-snapshot-ts={snapshot.timestamp}>
      <CardHeader
        title="FII / DII"
        subtitle="Institutional cash flow"
        icon={<ArrowDownToLine className="h-4 w-4 text-emerald-400" />}
      />
      {available ? (
        <div className="flex flex-wrap items-center gap-4 font-mono text-sm tabular-nums">
          <span className={flow.fii >= 0 ? "text-gain" : "text-loss"}>
            FII {formatFlow(flow.fii)}
          </span>
          <span className={flow.dii >= 0 ? "text-gain" : "text-loss"}>
            DII {formatFlow(flow.dii)}
          </span>
          <span className="text-xs text-text-muted">Net cash flow</span>
        </div>
      ) : (
        <p className="text-sm text-text-muted">
          Institutional flow unavailable for this session.
        </p>
      )}
    </Card>
  );
}

function PcrCard({ snapshot }: { snapshot: MarketSnapshot }) {
  const pcr = snapshot.pulse.putCallRatio;
  return (
    <Card padding="lg" accent="orange" data-snapshot-ts={snapshot.timestamp}>
      <CardHeader
        title="PCR"
        subtitle="Put / Call ratio"
        icon={<Gauge className="h-4 w-4 text-orange-400" />}
      />
      <p className="font-mono text-2xl font-bold tabular-nums text-text-primary">
        {pcr > 0 ? pcr : "—"}
      </p>
      <p className="mt-1 text-xs text-text-muted">Options positioning</p>
    </Card>
  );
}

async function fetchSnapshot(force = false): Promise<MarketSnapshot | null> {
  const url = force
    ? "/api/market/snapshot?refresh=1"
    : "/api/market/snapshot";
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    snapshot?: MarketSnapshot;
  };
  return json.snapshot ?? null;
}

export function InstitutionalMarketsView({
  initial,
}: {
  initial: MarketSnapshot;
}) {
  const [snapshot, setSnapshot] = useState(initial);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMode, setRefreshMode] = useState<MarketsRefreshMode>(() =>
    resolveMarketsRefreshMode()
  );
  const finalRefreshDone = useRef(false);

  const applySnapshot = useCallback((next: MarketSnapshot) => {
    setSnapshot(next);
  }, []);

  const refresh = useCallback(async (force = false) => {
    setRefreshing(true);
    try {
      const next = await fetchSnapshot(force);
      if (next) applySnapshot(next);
    } finally {
      setRefreshing(false);
      setRefreshMode(resolveMarketsRefreshMode());
    }
  }, [applySnapshot]);

  useEffect(() => {
    setSnapshot(initial);
  }, [initial]);

  useEffect(() => {
    const mode = resolveMarketsRefreshMode();
    setRefreshMode(mode);

    if (mode === "final" && !finalRefreshDone.current) {
      finalRefreshDone.current = true;
      void refresh(true);
      return;
    }

    const intervalMs = getMarketsRefreshIntervalMs();
    if (intervalMs <= 0) return;

    const id = window.setInterval(() => {
      const nextMode = resolveMarketsRefreshMode();
      setRefreshMode(nextMode);
      if (nextMode === "poll") {
        void refresh(false);
        return;
      }
      if (nextMode === "final" && !finalRefreshDone.current) {
        finalRefreshDone.current = true;
        void refresh(true);
      }
      window.clearInterval(id);
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [refresh]);

  const pageTs = snapshot.timestamp;
  const hasIntelligence =
    Boolean(snapshot.intelligence?.context) ||
    Boolean(snapshot.intelligence?.regime);

  return (
    <div data-markets-page-timestamp={pageTs} data-refresh-mode={refreshMode}>
      <MarketSessionBanner session={snapshot.session} />
      <div className="mb-6 mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-surface-border-subtle bg-surface-elevated/40 px-4 py-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-text-faint">
            Market as-of
          </p>
          <p
            className="mt-0.5 font-mono text-sm tabular-nums text-text-primary"
            data-testid="markets-page-timestamp"
          >
            {formatPageTimestamp(pageTs)} IST
          </p>
          <p className="mt-0.5 text-[11px] text-text-muted">
            {snapshot.marketStatusLabel}
            {snapshot.tradingDate ? ` · Session ${snapshot.tradingDate}` : ""}
            {refreshMode === "poll"
              ? " · Refreshing every 2 min"
              : refreshMode === "final"
                ? " · Final post-close refresh"
                : " · Latest completed session"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border bg-surface-overlay px-3 py-1.5 text-[11px] font-semibold text-text-secondary transition-colors hover:bg-surface-hover disabled:opacity-60"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      <Section
        id="market-snapshot"
        title="Market Snapshot"
        subtitle="Indices · context · regime"
      >
        <div className="space-y-4" data-snapshot-ts={pageTs}>
          <MarketOverviewCards
            indices={snapshot.indices}
            snapshotLocked
            hideTimestamps
          />
          <MarketIntelligenceStrip
            snapshot={hasIntelligence ? snapshot.intelligence : null}
            hideTimestamps
          />
        </div>
      </Section>

      <Section
        id="market-pulse"
        title="Market Pulse"
        subtitle="Risk, trend and participation"
      >
        <div data-snapshot-ts={pageTs}>
          <MarketPulse
            pulse={snapshot.pulse}
            marketIntelligence={snapshot.intelligence}
            breadth={snapshot.breadth}
            marketStatus={snapshot.marketStatus}
            snapshotLocked
            hideTimestamps
            hideFlows
            hidePcr
          />
        </div>
      </Section>

      <Section
        id="breadth-analytics"
        title="Breadth Analytics"
        subtitle="Advances, declines and participation"
      >
        <div data-snapshot-ts={pageTs}>
          <MarketBreadth
            breadth={snapshot.breadth}
            snapshotLocked
            hideTimestamps
            institutionalSection="breadth"
          />
        </div>
      </Section>

      <Section
        id="strength-analytics"
        title="Strength Analytics"
        subtitle="Trend strength and market mood"
      >
        <div data-snapshot-ts={pageTs}>
          <MarketBreadth
            breadth={snapshot.breadth}
            snapshotLocked
            hideTimestamps
            institutionalSection="strength"
          />
        </div>
      </Section>

      <Section
        id="sector-intelligence"
        title="Sector Intelligence"
        subtitle="Heatmap and sector breadth"
      >
        <div className="space-y-4" data-snapshot-ts={pageTs}>
          <MarketHeatmap
            initial={snapshot.heatmap}
            snapshotLocked
            hideTimestamps
          />
          <MarketBreadth
            breadth={snapshot.breadth}
            snapshotLocked
            hideTimestamps
            institutionalSection="sector"
          />
        </div>
      </Section>

      <Section
        id="top-gainers"
        title="Top Gainers · Top Losers · Most Active · 52-Week Extremes"
        subtitle="Session leaders from the canonical breadth snapshot"
      >
        <div
          data-snapshot-ts={pageTs}
          id="market-movers"
          data-markets-section="movers"
        >
          <MarketBreadth
            breadth={snapshot.breadth}
            snapshotLocked
            hideTimestamps
            institutionalSection="movers"
          />
        </div>
      </Section>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <section id="fii-dii" className="scroll-mt-20" data-markets-section="fii-dii">
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-text-primary">
            FII/DII
          </h2>
          <FiidiiCard snapshot={snapshot} />
        </section>
        <section id="pcr" className="scroll-mt-20" data-markets-section="pcr">
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-text-primary">
            PCR
          </h2>
          <PcrCard snapshot={snapshot} />
        </section>
      </div>
    </div>
  );
}
