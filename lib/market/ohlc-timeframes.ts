/**
 * Canonical OHLC timeframe SSOT — institutional EquityOS market data.
 *
 * Rules:
 * - Every consumer requests an explicit timeframe.
 * - No cross-timeframe candle substitution.
 * - Cache keys include provider + symbol + timeframe + interval.
 */

export const CHART_TIMEFRAMES = [
  "1D",
  "5D",
  "1W",
  "1M",
  "3M",
  "6M",
  "1Y",
  "3Y",
  "5Y",
] as const;

export type ChartTimeframe = (typeof CHART_TIMEFRAMES)[number];

/** True intraday intervals (session bars — never mapped onto daily buckets). */
export const INTRADAY_INTERVALS = [
  "1m",
  "5m",
  "15m",
  "30m",
  "1H",
  "4H",
] as const;

export type IntradayInterval = (typeof INTRADAY_INTERVALS)[number];

/** Any timeframe the canonical OHLC engine accepts. */
export type OhlcTimeframe = ChartTimeframe | IntradayInterval;

export const ALL_OHLC_TIMEFRAMES: readonly OhlcTimeframe[] = [
  ...INTRADAY_INTERVALS,
  ...CHART_TIMEFRAMES,
];

export function isChartTimeframe(value: string): value is ChartTimeframe {
  return (CHART_TIMEFRAMES as readonly string[]).includes(value);
}

export function isIntradayInterval(value: string): value is IntradayInterval {
  return (INTRADAY_INTERVALS as readonly string[]).includes(value);
}

export function isOhlcTimeframe(value: string): value is OhlcTimeframe {
  return isChartTimeframe(value) || isIntradayInterval(value);
}

export function emptyPriceHistory(): Record<ChartTimeframe, []> {
  return CHART_TIMEFRAMES.reduce(
    (acc, tf) => {
      acc[tf] = [];
      return acc;
    },
    {} as Record<ChartTimeframe, []>
  );
}

/**
 * Provider range/interval for each canonical timeframe.
 * Yahoo chart API ranges: 1d,5d,1mo,3mo,6mo,1y,2y,5y,10y,ytd,max (no native 3y).
 */
export interface OhlcProviderSpec {
  /** Yahoo `range` query param. */
  yahooRange: string;
  /** Yahoo `interval` query param. */
  yahooInterval: string;
  /** Finnhub resolution. */
  finnhubResolution: string;
  /** Finnhub lookback window in days. */
  finnhubLookbackDays: number;
  /**
   * Optional post-fetch calendar-day trim (UTC), applied after daily collapse
   * when set. Used for 3Y (Yahoo has no native 3y range → fetch 5y daily, trim).
   */
  trimCalendarDays?: number;
  /** Whether bars should be collapsed to one candle per UTC day. */
  collapseToDaily?: boolean;
}

export const OHLC_PROVIDER_SPECS: Record<OhlcTimeframe, OhlcProviderSpec> = {
  "1m": {
    yahooRange: "1d",
    yahooInterval: "1m",
    finnhubResolution: "1",
    finnhubLookbackDays: 1,
  },
  "5m": {
    yahooRange: "1d",
    yahooInterval: "5m",
    finnhubResolution: "5",
    finnhubLookbackDays: 1,
  },
  "15m": {
    yahooRange: "5d",
    yahooInterval: "15m",
    finnhubResolution: "15",
    finnhubLookbackDays: 5,
  },
  "30m": {
    yahooRange: "5d",
    yahooInterval: "30m",
    finnhubResolution: "30",
    finnhubLookbackDays: 5,
  },
  "1H": {
    yahooRange: "1mo",
    yahooInterval: "60m",
    finnhubResolution: "60",
    finnhubLookbackDays: 30,
  },
  "4H": {
    yahooRange: "3mo",
    yahooInterval: "60m",
    finnhubResolution: "60",
    finnhubLookbackDays: 90,
  },
  "1D": {
    yahooRange: "1d",
    yahooInterval: "5m",
    finnhubResolution: "5",
    finnhubLookbackDays: 1,
  },
  "5D": {
    yahooRange: "5d",
    yahooInterval: "15m",
    finnhubResolution: "15",
    finnhubLookbackDays: 5,
  },
  "1W": {
    yahooRange: "5d",
    yahooInterval: "1d",
    finnhubResolution: "D",
    finnhubLookbackDays: 7,
    collapseToDaily: true,
    trimCalendarDays: 7,
  },
  "1M": {
    yahooRange: "1mo",
    yahooInterval: "1d",
    finnhubResolution: "D",
    finnhubLookbackDays: 31,
    collapseToDaily: true,
    trimCalendarDays: 31,
  },
  "3M": {
    yahooRange: "3mo",
    yahooInterval: "1d",
    finnhubResolution: "D",
    finnhubLookbackDays: 93,
    collapseToDaily: true,
    trimCalendarDays: 93,
  },
  "6M": {
    yahooRange: "6mo",
    yahooInterval: "1d",
    finnhubResolution: "D",
    finnhubLookbackDays: 186,
    collapseToDaily: true,
    trimCalendarDays: 186,
  },
  "1Y": {
    yahooRange: "1y",
    yahooInterval: "1d",
    finnhubResolution: "D",
    finnhubLookbackDays: 370,
    collapseToDaily: true,
    trimCalendarDays: 370,
  },
  "3Y": {
    // Yahoo has no native 3y — fetch 5y daily then trim to 3 calendar years.
    yahooRange: "5y",
    yahooInterval: "1d",
    finnhubResolution: "D",
    finnhubLookbackDays: 365 * 3 + 14,
    collapseToDaily: true,
    trimCalendarDays: 365 * 3 + 7,
  },
  "5Y": {
    yahooRange: "5y",
    yahooInterval: "1wk",
    finnhubResolution: "W",
    finnhubLookbackDays: 365 * 5 + 14,
  },
};

/**
 * Opportunity Engine — documented OHLC usage (no hidden fallbacks).
 *
 * | Purpose     | Timeframe | Module / fetch |
 * |-------------|-----------|----------------|
 * | Trend       | 1Y        | Scan `fetchTechnicalsCandles` / AI research technicals |
 * | Momentum    | 6M        | Momentum & RS fields — ~130-bar window of the daily series |
 * | Entry       | 3M        | `buildLiveMetrics` / Market Pulse index structure |
 * | Short-term  | 1M        | Short-horizon helpers — ~22-bar window of the daily series |
 * | Session     | 1D        | Scalp session bars only (never substituted with daily) |
 *
 * Windows (momentum / shortTerm) are calendar slices of the same daily
 * candle array already fetched for that pipeline stage — never a donor TF.
 */
export const OE_OHLC_USAGE = {
  trend: "1Y",
  momentum: "6M",
  entry: "3M",
  shortTerm: "1M",
  session: "1D",
} as const satisfies Record<string, ChartTimeframe>;

/** Approx trading-day windows for OE momentum / short-term slices. */
export const OE_OHLC_BAR_WINDOWS = {
  momentum: 130,
  shortTerm: 22,
} as const;

export type OeOhlcPurpose = keyof typeof OE_OHLC_USAGE;

export function oeOhlcTimeframe(purpose: OeOhlcPurpose): ChartTimeframe {
  return OE_OHLC_USAGE[purpose];
}
