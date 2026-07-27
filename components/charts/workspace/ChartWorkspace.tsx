"use client";

import type { EnrichedQuote } from "@/lib/market-data/enriched-quote";
import type { ChartTimeframe } from "@/types";
import type { OhlcBar } from "@/lib/providers/types";
import { cn } from "@/lib/utils";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ChartHeader } from "./ChartHeader";
import { ChartSidebar } from "./ChartSidebar";
import { ChartTimeframeBar } from "./ChartTimeframeBar";
import { ChartToolbar } from "./ChartToolbar";
import { ComparisonPanel, closesFromBars } from "./ComparisonPanel";
import { DrawingManager } from "./DrawingManager";
import { IndicatorDrawer } from "./IndicatorDrawer";
import { InstitutionalCandlestick } from "./InstitutionalCandlestick";
import {
  loadChartPrefs,
  loadDrawings,
  loadIndicators,
  saveChartPrefs,
  saveDrawings,
  saveIndicators,
} from "./persistence";
import {
  isPreloadedChartTimeframe,
  resolveOhlcTimeframe,
  type ChartDrawing,
  type ChartLayoutId,
  type ChartToolId,
  type ChartWorkspacePrefs,
  type IndicatorConfig,
  type WorkspaceTimeframe,
} from "./types";

export interface ChartWorkspaceProps {
  symbol: string;
  companyName: string;
  exchangeSymbol: string;
  priceHistory: Record<ChartTimeframe, OhlcBar[]>;
  liveQuote?: EnrichedQuote;
  /** Optional second series for relative comparison overlays. */
  comparePriceHistory?: Record<ChartTimeframe, OhlcBar[]>;
  overview?: ReactNode;
  aiSummary?: ReactNode;
  keyMetrics?: ReactNode;
}

function paneCount(layout: ChartLayoutId): number {
  if (layout === "dual") return 2;
  if (layout === "quad") return 4;
  return 1;
}

function layoutGridClass(layout: ChartLayoutId): string {
  if (layout === "dual") return "grid-cols-1 lg:grid-cols-2";
  if (layout === "quad") return "grid-cols-1 sm:grid-cols-2";
  return "grid-cols-1";
}

export function ChartWorkspace({
  symbol,
  companyName,
  exchangeSymbol,
  priceHistory,
  liveQuote,
  comparePriceHistory,
  overview,
  aiSummary,
  keyMetrics,
}: ChartWorkspaceProps) {
  const [prefs, setPrefs] = useState<ChartWorkspacePrefs>(() => ({
    ...loadChartPrefs(),
  }));
  const [indicators, setIndicators] = useState<IndicatorConfig[]>(() =>
    loadIndicators()
  );
  const [drawings, setDrawings] = useState<ChartDrawing[]>([]);
  const [indicatorsOpen, setIndicatorsOpen] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [fetchedBars, setFetchedBars] = useState<
    Partial<Record<WorkspaceTimeframe, OhlcBar[]>>
  >({});
  const [fetchStatus, setFetchStatus] = useState<
    "idle" | "loading" | "empty" | "error"
  >("idle");

  useEffect(() => {
    setPrefs(loadChartPrefs());
    setIndicators(loadIndicators());
    setDrawings(loadDrawings(symbol));
    setFetchedBars({});
    setHydrated(true);
  }, [symbol]);

  const updatePrefs = useCallback((next: ChartWorkspacePrefs) => {
    setPrefs(next);
    saveChartPrefs(next);
  }, []);

  const updateIndicators = useCallback((next: IndicatorConfig[]) => {
    setIndicators(next);
    saveIndicators(next);
  }, []);

  const updateDrawings = useCallback(
    (next: ChartDrawing[]) => {
      setDrawings(next);
      saveDrawings(symbol, next);
    },
    [symbol]
  );

  const exchange = exchangeSymbol.includes(":")
    ? exchangeSymbol.split(":")[0]
    : "NSE";

  const panes = paneCount(prefs.layout);
  const paneTfs = useMemo(() => {
    const base = prefs.paneTimeframes.length
      ? prefs.paneTimeframes
      : ([prefs.timeframe] as WorkspaceTimeframe[]);
    const list: WorkspaceTimeframe[] = [];
    for (let i = 0; i < panes; i++) {
      list.push(i === 0 ? prefs.timeframe : base[i] ?? prefs.timeframe);
    }
    return list;
  }, [panes, prefs.paneTimeframes, prefs.timeframe]);

  const resolveBars = useCallback(
    (tf: WorkspaceTimeframe): OhlcBar[] => {
      if (isPreloadedChartTimeframe(tf) && (priceHistory[tf]?.length ?? 0) > 0) {
        return priceHistory[tf];
      }
      return fetchedBars[tf] ?? [];
    },
    [priceHistory, fetchedBars]
  );

  // Exact-TF fetch only — never borrow another timeframe's candles.
  useEffect(() => {
    const needed = [...new Set([prefs.timeframe, ...paneTfs])];
    const missing = needed.filter((tf) => resolveBars(tf).length === 0);
    if (missing.length === 0) {
      setFetchStatus(resolveBars(prefs.timeframe).length === 0 ? "empty" : "idle");
      return;
    }

    let cancelled = false;
    setFetchStatus("loading");

    void (async () => {
      try {
        const results = await Promise.all(
          missing.map(async (tf) => {
            const ohlcTf = resolveOhlcTimeframe(tf);
            const res = await fetch(
              `/api/market/ohlc?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(ohlcTf)}`
            );
            if (!res.ok) throw new Error(`OHLC ${tf} failed`);
            const json = (await res.json()) as { candles?: OhlcBar[] };
            return [tf, json.candles ?? []] as const;
          })
        );
        if (cancelled) return;
        setFetchedBars((prev) => {
          const next = { ...prev };
          for (const [tf, candles] of results) next[tf] = candles;
          return next;
        });
        const primary = results.find(([tf]) => tf === prefs.timeframe)?.[1];
        setFetchStatus(
          (primary?.length ?? 0) === 0 &&
            resolveBars(prefs.timeframe).length === 0
            ? "empty"
            : "idle"
        );
      } catch {
        if (!cancelled) setFetchStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [symbol, prefs.timeframe, paneTfs, resolveBars]);

  const primaryBars = resolveBars(prefs.timeframe);
  const compareBars =
    comparePriceHistory && isPreloadedChartTimeframe(prefs.timeframe)
      ? comparePriceHistory[prefs.timeframe]
      : undefined;

  const onScreenshot = () => {
    setFlash(
      "Screenshot captured to clipboard layout — use OS snip for export."
    );
    window.setTimeout(() => setFlash(null), 2400);
  };

  const onToolChange = (tool: ChartToolId) => {
    updatePrefs({ ...prefs, tool });
  };

  if (!hydrated) {
    return (
      <div className="h-[520px] animate-pulse rounded-xl border border-surface-border bg-surface-overlay" />
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-surface-border bg-surface-raised shadow-card",
        prefs.layout === "fullscreen" &&
          "fixed inset-3 z-50 flex flex-col bg-surface p-3 shadow-2xl"
      )}
    >
      <div className="space-y-3 p-3 sm:p-4">
        <ChartHeader
          companyName={companyName}
          symbol={symbol}
          exchange={exchange}
          quote={liveQuote}
        />

        <ChartTimeframeBar
          timeframe={prefs.timeframe}
          layout={prefs.layout}
          onTimeframeChange={(timeframe) =>
            updatePrefs({ ...prefs, timeframe })
          }
          onLayoutChange={(layout) => updatePrefs({ ...prefs, layout })}
        />

        {fetchStatus === "loading" ? (
          <p className="text-[10px] text-text-muted">Loading {prefs.timeframe} candles…</p>
        ) : null}
        {fetchStatus === "empty" ||
        (fetchStatus === "idle" && primaryBars.length === 0) ? (
          <p className="text-[10px] text-amber-400/90">
            No data available for {prefs.timeframe}. Retry or pick another timeframe.
          </p>
        ) : null}
        {fetchStatus === "error" ? (
          <p className="text-[10px] text-rose-400/90">
            Failed to load {prefs.timeframe} candles. Retry shortly.
          </p>
        ) : null}

        {flash ? (
          <p role="status" className="text-[11px] text-accent">
            {flash}
          </p>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1 p-3 pt-0">
          <div className="absolute left-4 top-2 z-20 hidden sm:block">
            <ChartToolbar
              tool={prefs.tool}
              onToolChange={onToolChange}
              onScreenshot={onScreenshot}
            />
          </div>

          <div
            className={cn(
              "grid gap-3",
              layoutGridClass(prefs.layout),
              prefs.layout === "fullscreen" ? "h-[calc(100vh-12rem)]" : ""
            )}
          >
            {paneTfs.map((tf, index) => {
              const bars = resolveBars(tf);
              return (
                <div
                  key={`${tf}-${index}`}
                  className={cn(
                    "relative overflow-hidden rounded-lg border border-surface-border-subtle bg-surface",
                    prefs.layout === "fullscreen"
                      ? "h-full min-h-[420px]"
                      : panes > 1
                        ? "h-[280px] sm:h-[320px]"
                        : "h-[420px] sm:h-[480px]"
                  )}
                >
                  <InstitutionalCandlestick
                    candles={bars}
                    timeframe={tf}
                    symbol={symbol}
                    liveQuote={index === 0 ? liveQuote : undefined}
                    indicators={indicators}
                    drawings={index === 0 ? drawings : []}
                    tool={index === 0 ? prefs.tool : "cursor"}
                    compareMode={prefs.compareMode && index === 0}
                    compareCloses={
                      prefs.compareMode
                        ? closesFromBars(compareBars)
                        : undefined
                    }
                    onDrawingsChange={updateDrawings}
                    compact={panes > 1}
                  />
                </div>
              );
            })}
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-3">
              <IndicatorDrawer
                open={indicatorsOpen}
                onOpenChange={setIndicatorsOpen}
                indicators={indicators}
                onChange={updateIndicators}
              />
              <div className="rounded-xl border border-surface-border bg-card p-3">
                <p className="mb-2 text-[12px] font-semibold text-text-primary">
                  Drawing Manager
                </p>
                <DrawingManager
                  drawings={drawings}
                  onChange={updateDrawings}
                />
              </div>
            </div>
            <ComparisonPanel
              symbol={symbol}
              closes={closesFromBars(primaryBars)}
              compareSymbol={prefs.compareSymbols[0]}
              compareCloses={closesFromBars(compareBars)}
              enabled={prefs.compareMode}
              onEnabledChange={(compareMode) =>
                updatePrefs({ ...prefs, compareMode })
              }
              onCompareSymbolChange={(value) =>
                updatePrefs({
                  ...prefs,
                  compareSymbols: value ? [value] : [],
                })
              }
            />
          </div>
        </div>

        <ChartSidebar
          collapsed={prefs.sidebarCollapsed}
          onCollapsedChange={(sidebarCollapsed) =>
            updatePrefs({ ...prefs, sidebarCollapsed })
          }
          symbol={symbol}
          overview={overview}
          aiSummary={aiSummary}
          keyMetrics={keyMetrics}
        />
      </div>

      {prefs.layout === "fullscreen" ? (
        <div className="border-t border-surface-border-subtle p-2 text-center">
          <button
            type="button"
            onClick={() => updatePrefs({ ...prefs, layout: "single" })}
            className="text-[11px] font-semibold text-accent hover:underline"
          >
            Exit full screen
          </button>
        </div>
      ) : null}
    </div>
  );
}
