"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { QuoteDisplay } from "@/components/market/QuoteDisplay";
import { TabBar } from "@/components/ui/TabBar";
import { createUnavailableQuote } from "@/lib/market-data/enriched-quote";
import type { EnrichedQuote } from "@/lib/market-data/enriched-quote";
import type { ChartTimeframe, TradingViewTimeframe } from "@/types";
import type { OhlcBar } from "@/lib/providers/types";
import { CandlestickChart, Loader2 } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

interface TradingViewChartProps {
  exchangeSymbol: string;
  companyName: string;
  symbol: string;
  priceHistory?: Record<ChartTimeframe, OhlcBar[]>;
  liveQuote?: EnrichedQuote;
}

const TIMEFRAMES: TradingViewTimeframe[] = [
  "1D",
  "1W",
  "1M",
  "3M",
  "6M",
  "1Y",
  "5Y",
];

/** Map each terminal timeframe to a TradingView (interval, range) pair. */
const TF_CONFIG: Record<
  TradingViewTimeframe,
  { interval: string; range: string }
> = {
  "1D": { interval: "5", range: "1D" },
  "1W": { interval: "30", range: "5D" },
  "1M": { interval: "60", range: "1M" },
  "3M": { interval: "D", range: "3M" },
  "6M": { interval: "D", range: "6M" },
  "1Y": { interval: "D", range: "12M" },
  "5Y": { interval: "W", range: "60M" },
};

const TV_SCRIPT_SRC = "https://s3.tradingview.com/tv.js";
const TV_SYMBOL_SEARCH_URL = "https://symbol-search.tradingview.com/symbol_search/";
const WIDGET_READY_TIMEOUT_MS = 9000;
const TRADINGVIEW_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_TRADINGVIEW === "true";

const BSE_SYMBOLS: Record<string, string> = {
  ADANIENT: "BSE:512599",
  BHARTIARTL: "BSE:532454",
  HDFCBANK: "BSE:500180",
  ICICIBANK: "BSE:532174",
  INFY: "BSE:500209",
  LT: "BSE:500510",
  MARUTI: "BSE:532500",
  RELIANCE: "BSE:500325",
  SBIN: "BSE:500112",
  TCS: "BSE:532540",
  WIPRO: "BSE:507685",
};

const KNOWN_NSE_SYMBOLS = new Set(Object.keys(BSE_SYMBOLS));

type ChartStatus = "resolving" | "loading" | "ready" | "fallback" | "error";

interface TradingViewWidget {
  onChartReady?: (callback: () => void) => void;
}

interface TradingViewSearchResult {
  symbol?: string;
  ticker?: string;
  full_name?: string;
  exchange?: string;
}

declare global {
  interface Window {
    TradingView?: {
      widget: new (config: Record<string, unknown>) => TradingViewWidget;
    };
  }
}

let tvScriptPromise: Promise<void> | null = null;
const symbolAvailabilityCache = new Map<string, Promise<boolean>>();

function loadTradingViewScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.TradingView) return Promise.resolve();
  if (tvScriptPromise) return tvScriptPromise;

  tvScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${TV_SCRIPT_SRC}"]`
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load TradingView"))
      );
      return;
    }
    const script = document.createElement("script");
    script.src = TV_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load TradingView"));
    document.head.appendChild(script);
  });

  return tvScriptPromise;
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

function getTradingViewCandidates(symbol: string, exchangeSymbol: string): string[] {
  const normalized = normalizeSymbol(symbol);
  const nseSymbol = exchangeSymbol.startsWith("NSE:")
    ? exchangeSymbol
    : `NSE:${normalized}`;
  const bseSymbol = BSE_SYMBOLS[normalized];

  return [nseSymbol, bseSymbol].filter(
    (candidate, index, candidates): candidate is string =>
      Boolean(candidate) && candidates.indexOf(candidate) === index
  );
}

function isKnownFallbackSymbol(candidate: string): boolean {
  const [exchange, code] = candidate.split(":");
  if (exchange === "NSE") return KNOWN_NSE_SYMBOLS.has(code);
  return Object.values(BSE_SYMBOLS).includes(candidate);
}

function searchResultMatches(
  result: TradingViewSearchResult,
  exchange: string,
  code: string
) {
  const normalizedTicker = `${exchange}:${code}`;
  return (
    result.exchange?.toUpperCase() === exchange &&
    (result.symbol?.toUpperCase() === code ||
      result.ticker?.toUpperCase() === normalizedTicker ||
      result.full_name?.toUpperCase() === normalizedTicker)
  );
}

function verifyTradingViewSymbol(candidate: string): Promise<boolean> {
  const cacheKey = candidate.toUpperCase();
  const cached = symbolAvailabilityCache.get(cacheKey);
  if (cached) return cached;

  const promise = (async () => {
    const [exchange, code] = cacheKey.split(":");
    if (!exchange || !code) return false;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 2500);

    try {
      const params = new URLSearchParams({
        text: code,
        exchange,
        type: "stock",
      });
      const response = await fetch(`${TV_SYMBOL_SEARCH_URL}?${params}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) return false;

      const results = (await response.json()) as TradingViewSearchResult[];
      return (
        results.some((result) => searchResultMatches(result, exchange, code)) ||
        isKnownFallbackSymbol(cacheKey)
      );
    } catch {
      // If TradingView symbol search is unreachable, only allow curated symbols.
      return isKnownFallbackSymbol(cacheKey);
    } finally {
      window.clearTimeout(timeout);
    }
  })();

  symbolAvailabilityCache.set(cacheKey, promise);
  return promise;
}

function toPriceHistoryKey(timeframe: TradingViewTimeframe): ChartTimeframe {
  return timeframe;
}

export function TradingViewChart({
  exchangeSymbol,
  companyName,
  symbol,
  priceHistory,
  liveQuote,
}: TradingViewChartProps) {
  const [timeframe, setTimeframe] = useState<TradingViewTimeframe>("6M");
  const [status, setStatus] = useState<ChartStatus>("resolving");
  const [activeSymbol, setActiveSymbol] = useState<string | null>(null);
  const rawId = useId();
  const containerId = `tv_${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const containerRef = useRef<HTMLDivElement>(null);

  const fallbackPoints =
    priceHistory?.[toPriceHistoryKey(timeframe)] ?? priceHistory?.["6M"] ?? [];

  useEffect(() => {
    let cancelled = false;

    async function mountWidget(candidate: string) {
      if (!window.TradingView || !containerRef.current) {
        throw new Error("TradingView is not available");
      }

      const { interval, range } = TF_CONFIG[timeframe];
      containerRef.current.innerHTML = "";

      await new Promise<void>((resolve, reject) => {
        let settled = false;
        let iframeReadyTimer: number | null = null;
        const targetContainer = containerRef.current;
        const timeout = window.setTimeout(() => {
          if (settled) return;
          settled = true;
          observer.disconnect();
          if (iframeReadyTimer) window.clearTimeout(iframeReadyTimer);
          reject(new Error("TradingView widget timed out"));
        }, WIDGET_READY_TIMEOUT_MS);

        const finish = () => {
          if (settled) return;
          settled = true;
          observer.disconnect();
          if (iframeReadyTimer) window.clearTimeout(iframeReadyTimer);
          window.clearTimeout(timeout);
          resolve();
        };

        const observer = new MutationObserver(() => {
          if (!targetContainer?.querySelector("iframe") || iframeReadyTimer) return;
          iframeReadyTimer = window.setTimeout(finish, 1400);
        });

        if (targetContainer) {
          observer.observe(targetContainer, { childList: true, subtree: true });
        }

        try {
          const widget = new window.TradingView!.widget({
            container_id: containerId,
            symbol: candidate,
            interval,
            range,
            autosize: true,
            timezone: "Asia/Kolkata",
            theme: "dark",
            style: "1",
            locale: "in",
            toolbar_bg: "#0c0c10",
            enable_publishing: false,
            hide_side_toolbar: false,
            allow_symbol_change: false,
            withdateranges: true,
            details: false,
            calendar: false,
            backgroundColor: "#0c0c10",
            gridColor: "rgba(255, 255, 255, 0.04)",
            studies: ["STD;EMA"],
            disabled_features: [
              "header_symbol_search",
              "symbol_search_hot_key",
              "popup_hints",
            ],
            overrides: {
              "paneProperties.background": "#0c0c10",
              "paneProperties.backgroundType": "solid",
            },
          });

          if (typeof widget.onChartReady === "function") {
            widget.onChartReady(finish);
          } else {
            window.setTimeout(finish, 1800);
          }
        } catch (error) {
          observer.disconnect();
          if (iframeReadyTimer) window.clearTimeout(iframeReadyTimer);
          window.clearTimeout(timeout);
          reject(error);
        }
      });
    }

    async function render() {
      setStatus("resolving");
      setActiveSymbol(null);

      // The local chart is the production-safe default. TradingView can be
      // enabled explicitly in environments where its third-party endpoints
      // are guaranteed to be reachable.
      if (!TRADINGVIEW_ENABLED) {
        setStatus(fallbackPoints.length ? "fallback" : "error");
        return;
      }

      try {
        await loadTradingViewScript();
        if (cancelled || !window.TradingView || !containerRef.current) return;

        const candidates = getTradingViewCandidates(symbol, exchangeSymbol);
        for (const candidate of candidates) {
          if (cancelled) return;
          const isAvailable = await verifyTradingViewSymbol(candidate);
          if (!isAvailable) continue;

          try {
            if (cancelled) return;
            setStatus("loading");
            setActiveSymbol(candidate);
            await mountWidget(candidate);
            if (!cancelled) setStatus("ready");
            return;
          } catch {
            if (containerRef.current) containerRef.current.innerHTML = "";
          }
        }

        if (!cancelled) {
          if (containerRef.current) containerRef.current.innerHTML = "";
          setActiveSymbol(null);
          setStatus(fallbackPoints.length ? "fallback" : "error");
        }
      } catch {
        if (!cancelled) {
          if (containerRef.current) containerRef.current.innerHTML = "";
          setActiveSymbol(null);
          setStatus(fallbackPoints.length ? "fallback" : "error");
        }
      }
    }

    const currentContainer = containerRef.current;
    render();
    return () => {
      cancelled = true;
      if (currentContainer) currentContainer.innerHTML = "";
    };
  }, [timeframe, exchangeSymbol, symbol, containerId, fallbackPoints.length]);

  return (
    <Card padding="lg" className="animate-fade-in-up">
      <CardHeader
        title="Advanced Chart"
        subtitle={`${companyName} · ${activeSymbol ?? exchangeSymbol}`}
        action={
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
            <CandlestickChart className="h-4 w-4 text-accent" />
          </div>
        }
      />

      <div className="mb-4">
        <TabBar
          tabs={TIMEFRAMES.map((tf) => ({ id: tf, label: tf }))}
          activeTab={timeframe}
          onTabChange={setTimeframe}
          size="sm"
          className="flex-wrap"
        />
      </div>

      <div className="relative h-[440px] w-full overflow-hidden rounded-lg border border-surface-border-subtle bg-surface">
        {status === "fallback" ? (
          <CustomCandlestickChart
            candles={fallbackPoints}
            timeframe={timeframe}
            symbol={symbol}
            liveQuote={liveQuote}
          />
        ) : (
          <div ref={containerRef} id={containerId} className="h-full w-full" />
        )}

        {status !== "ready" && status !== "fallback" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surface/80 backdrop-blur-sm">
            {status === "resolving" || status === "loading" ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-accent" />
                <p className="text-xs text-text-muted">
                  {status === "resolving"
                    ? "Resolving NSE/BSE chart symbol…"
                    : "Loading live chart…"}
                </p>
              </>
            ) : (
              <div className="text-center">
                <p className="text-sm font-medium text-text-secondary">
                  Chart unavailable
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  Historical data unavailable
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <p className="mt-3 text-[10px] text-text-faint">
        {status === "fallback"
          ? "TradingView did not confirm NSE/BSE availability, so EquityOS is showing provider historical candles."
          : "Interactive charting powered by TradingView. Timeframes update the visible range in real time."}
      </p>
    </Card>
  );
}

function CustomCandlestickChart({
  candles: providerCandles,
  timeframe,
  symbol,
  liveQuote,
}: {
  candles: OhlcBar[];
  timeframe: TradingViewTimeframe;
  symbol: string;
  liveQuote?: EnrichedQuote;
}) {
  const candles = useMemo(() => providerCandles.slice(-64), [providerCandles]);

  if (candles.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <p className="text-sm font-medium text-text-secondary">Chart unavailable</p>
        <p className="mt-1 text-xs text-text-muted">
          Historical data unavailable
        </p>
      </div>
    );
  }

  const width = 920;
  const height = 360;
  const chartTop = 24;
  const chartBottom = 280;
  const volumeTop = 304;
  const volumeBottom = 344;
  const minLow = Math.min(...candles.map((candle) => candle.low));
  const maxHigh = Math.max(...candles.map((candle) => candle.high));
  const maxVolume = Math.max(...candles.map((candle) => candle.volume), 1);
  const priceRange = Math.max(maxHigh - minLow, 1);
  const step = width / candles.length;
  const candleWidth = Math.max(4, Math.min(12, step * 0.55));

  const yForPrice = (price: number) =>
    chartBottom - ((price - minLow) / priceRange) * (chartBottom - chartTop);

  const formatAxisPrice = (price: number) =>
    `₹${price.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  const axisPrices = [maxHigh, (maxHigh + minLow) / 2, minLow];

  const quote = liveQuote ?? createUnavailableQuote(symbol, new Date());

  return (
    <div className="relative h-full w-full bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.08),transparent_35%)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-text-primary">
            EquityOS Candles · {timeframe}
          </p>
          <p className="text-[10px] text-text-muted">
            Provider OHLC from historical data
          </p>
        </div>
        <QuoteDisplay
          quote={quote}
          size="sm"
          align="right"
          showTimestamp
        />
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[340px] w-full overflow-visible"
        role="img"
        aria-label={`Custom candlestick chart for ${timeframe}`}
      >
        {axisPrices.map((price) => {
          const y = yForPrice(price);
          return (
            <g key={price}>
              <line
                x1={0}
                x2={width}
                y1={y}
                y2={y}
                stroke="rgba(255,255,255,0.06)"
                strokeDasharray="4 6"
              />
              <text
                x={width - 4}
                y={y - 6}
                textAnchor="end"
                fill="rgba(161,161,170,0.75)"
                fontSize="11"
                fontFamily="ui-monospace, monospace"
              >
                {formatAxisPrice(price)}
              </text>
            </g>
          );
        })}

        {candles.map((candle, index) => {
          const x = index * step + step / 2;
          const openY = yForPrice(candle.open);
          const closeY = yForPrice(candle.close);
          const highY = yForPrice(candle.high);
          const lowY = yForPrice(candle.low);
          const bodyTop = Math.min(openY, closeY);
          const bodyHeight = Math.max(Math.abs(closeY - openY), 2);
          const volumeHeight =
            (candle.volume / maxVolume) * (volumeBottom - volumeTop);
          const bullish = candle.close >= candle.open;
          const color = bullish ? "#22c55e" : "#ef4444";

          return (
            <g key={`${candle.timestamp}-${index}`}>
              <line
                x1={x}
                x2={x}
                y1={highY}
                y2={lowY}
                stroke={color}
                strokeWidth="1.5"
                opacity="0.85"
              />
              <rect
                x={x - candleWidth / 2}
                y={bodyTop}
                width={candleWidth}
                height={bodyHeight}
                rx="1.5"
                fill={bullish ? "rgba(34,197,94,0.9)" : "rgba(239,68,68,0.9)"}
              />
              <rect
                x={x - candleWidth / 2}
                y={volumeBottom - volumeHeight}
                width={candleWidth}
                height={volumeHeight}
                rx="1"
                fill={bullish ? "rgba(34,197,94,0.22)" : "rgba(239,68,68,0.22)"}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
