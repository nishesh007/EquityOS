/**
 * Institutional Market Breadth Engine.
 * Quote-based A/D over the selected universe; technicals from OHLC when available.
 * Market mood is never inferred from partial / dashboard-only samples.
 */

import { lookupCompanyMaster } from "@/lib/company-master";
import type { EnrichedQuote } from "@/lib/market-data/enriched-quote";
import { marketDataService } from "@/lib/market-data";
import { ema, rsi } from "@/lib/technical/math";
import { formatVolume } from "@/lib/utils";
import type { MarketMover, SectorPerformance } from "@/types";
import { recordBreadthTrend } from "./trend-store";
import type {
  BreadthUniverseId,
  MarketBreadthSnapshot,
  MarketMood,
} from "./types";
import { resolveBreadthUniverse } from "./universe";

const QUOTE_CHUNK = 40;
/** Minimum quote coverage before mood is classified (not inferred from scraps). */
const MIN_MOOD_COVERAGE = 0.35;
/** Cap OHLC technical fetches per scan (honest coverage % reported). */
const MAX_TECHNICAL_FETCHES = 120;
const TECHNICAL_CONCURRENCY = 6;

export interface BreadthEngineOptions {
  universe?: BreadthUniverseId;
  portfolioSymbols?: readonly string[];
  watchlistSymbols?: readonly string[];
}

interface QuoteRow {
  symbol: string;
  name: string;
  quote: EnrichedQuote;
  changePercent: number;
  price: number;
  weekHigh52: number | null;
  weekLow52: number | null;
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function run(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index]);
    }
  }
  const agents = Array.from(
    { length: Math.min(concurrency, Math.max(1, items.length)) },
    () => run()
  );
  await Promise.all(agents);
  return results;
}

async function fetchQuotesChunked(
  symbols: string[]
): Promise<Map<string, EnrichedQuote>> {
  const out = new Map<string, EnrichedQuote>();
  const chunks: string[][] = [];
  for (let i = 0; i < symbols.length; i += QUOTE_CHUNK) {
    chunks.push(symbols.slice(i, i + QUOTE_CHUNK));
  }
  const CHUNK_CONCURRENCY = 5;
  await mapPool(chunks, CHUNK_CONCURRENCY, async (chunk) => {
    const map = await marketDataService.getEnrichedQuotes(chunk);
    for (const [key, value] of map) {
      out.set(key.toUpperCase(), value);
    }
  });
  return out;
}

function toMover(row: QuoteRow): MarketMover {
  return {
    symbol: row.symbol,
    name: row.name,
    price: row.price,
    changePercent: row.changePercent,
    volume: row.quote.volume ? formatVolume(row.quote.volume) : "—",
    quote: row.quote,
  };
}

function classifyMood(
  breadthPercent: number,
  coverage: number
): MarketMood {
  if (coverage < MIN_MOOD_COVERAGE) return "Insufficient Data";
  if (breadthPercent >= 65) return "Strong Bullish";
  if (breadthPercent >= 55) return "Bullish";
  if (breadthPercent <= 35) return "Strong Bearish";
  if (breadthPercent <= 45) return "Bearish";
  return "Neutral";
}

function buildSectors(rows: QuoteRow[]): SectorPerformance[] {
  const bySector = new Map<
    string,
    { changes: number[]; advances: number; total: number }
  >();

  for (const row of rows) {
    const sector =
      lookupCompanyMaster(row.symbol)?.sector?.trim() || "Equities";
    const bucket = bySector.get(sector) ?? {
      changes: [],
      advances: 0,
      total: 0,
    };
    bucket.changes.push(row.changePercent);
    bucket.total += 1;
    if (row.changePercent > 0) bucket.advances += 1;
    bySector.set(sector, bucket);
  }

  return [...bySector.entries()]
    .map(([name, bucket]) => {
      const avg =
        bucket.changes.reduce((sum, value) => sum + value, 0) /
        Math.max(1, bucket.changes.length);
      return {
        name,
        changePercent: Math.round(avg * 100) / 100,
        breadth: Math.round(
          (bucket.advances / Math.max(1, bucket.total)) * 100
        ),
      };
    })
    .sort((a, b) => b.changePercent - a.changePercent)
    .slice(0, 12);
}

function selectMovers(
  rows: QuoteRow[],
  direction: "gainers" | "losers",
  limit = 5
): MarketMover[] {
  return rows
    .filter((row) =>
      direction === "gainers" ? row.changePercent > 0 : row.changePercent < 0
    )
    .sort((a, b) =>
      direction === "gainers"
        ? b.changePercent - a.changePercent
        : a.changePercent - b.changePercent
    )
    .slice(0, limit)
    .map(toMover);
}

function select52wExtremes(
  rows: QuoteRow[],
  direction: "high" | "low",
  limit = 5
): MarketMover[] {
  const threshold = 0.01; // within 1% of 52W extreme
  return rows
    .filter((row) => {
      if (direction === "high") {
        return (
          row.weekHigh52 != null &&
          row.weekHigh52 > 0 &&
          row.price > 0 &&
          Math.abs(row.price - row.weekHigh52) / row.weekHigh52 <= threshold
        );
      }
      return (
        row.weekLow52 != null &&
        row.weekLow52 > 0 &&
        row.price > 0 &&
        Math.abs(row.price - row.weekLow52) / row.weekLow52 <= threshold
      );
    })
    .sort((a, b) =>
      direction === "high"
        ? b.changePercent - a.changePercent
        : a.changePercent - b.changePercent
    )
    .slice(0, limit)
    .map(toMover);
}

async function computeTechnicals(symbols: string[]): Promise<{
  aboveEma20: number | null;
  aboveEma50: number | null;
  aboveEma200: number | null;
  averageRsi: number | null;
  coveragePercent: number;
}> {
  if (symbols.length === 0) {
    return {
      aboveEma20: null,
      aboveEma50: null,
      aboveEma200: null,
      averageRsi: null,
      coveragePercent: 0,
    };
  }

  const sample = symbols.slice(0, MAX_TECHNICAL_FETCHES);
  let above20 = 0;
  let above50 = 0;
  let above200 = 0;
  let rsiSum = 0;
  let rsiCount = 0;
  let ok = 0;

  await mapPool(sample, TECHNICAL_CONCURRENCY, async (symbol) => {
    try {
      const candles = await marketDataService.getPriceHistory(symbol, "1Y");
      if (!candles || candles.length < 30) return;
      const closes = candles.map((bar) => bar.close).filter((c) => c > 0);
      if (closes.length < 30) return;
      const price = closes[closes.length - 1];
      const e20 = ema(closes, 20);
      const e50 = ema(closes, 50);
      const e200 = ema(closes, 200);
      const r = rsi(closes, 14);
      ok += 1;
      if (e20 != null && price > e20) above20 += 1;
      if (e50 != null && price > e50) above50 += 1;
      if (e200 != null && price > e200) above200 += 1;
      if (r != null) {
        rsiSum += r;
        rsiCount += 1;
      }
    } catch {
      /* skip symbol */
    }
  });

  if (ok === 0) {
    return {
      aboveEma20: null,
      aboveEma50: null,
      aboveEma200: null,
      averageRsi: null,
      coveragePercent: 0,
    };
  }

  return {
    aboveEma20: above20,
    aboveEma50: above50,
    aboveEma200: above200,
    averageRsi:
      rsiCount > 0 ? Math.round((rsiSum / rsiCount) * 10) / 10 : null,
    coveragePercent: Math.round((ok / symbols.length) * 1000) / 10,
  };
}

function weekFields(quote: EnrichedQuote): {
  weekHigh52: number | null;
  weekLow52: number | null;
} {
  return {
    weekHigh52:
      quote.weekHigh52 != null && quote.weekHigh52 > 0
        ? quote.weekHigh52
        : null,
    weekLow52:
      quote.weekLow52 != null && quote.weekLow52 > 0 ? quote.weekLow52 : null,
  };
}

export async function runMarketBreadthEngine(
  options: BreadthEngineOptions = {}
): Promise<MarketBreadthSnapshot> {
  const universeId = options.universe ?? "nse";
  const resolved = resolveBreadthUniverse(universeId, {
    portfolioSymbols: options.portfolioSymbols,
    watchlistSymbols: options.watchlistSymbols,
  });

  const quoteMap = await fetchQuotesChunked(resolved.symbols);
  const rows: QuoteRow[] = [];

  for (const symbol of resolved.symbols) {
    const quote = quoteMap.get(symbol);
    if (!quote || quote.availability === "unavailable") continue;
    if (quote.price == null || !Number.isFinite(quote.changePercent)) continue;
    const master = resolved.recordsBySymbol.get(symbol);
    const { weekHigh52, weekLow52 } = weekFields(quote);
    rows.push({
      symbol,
      name: master?.name ?? symbol,
      quote,
      changePercent: quote.changePercent ?? 0,
      price: quote.price,
      weekHigh52,
      weekLow52,
    });
  }

  const totalStocks = resolved.symbols.length;
  const quotedStocks = rows.length;
  const advances = rows.filter((row) => row.changePercent > 0).length;
  const declines = rows.filter((row) => row.changePercent < 0).length;
  const unchanged = quotedStocks - advances - declines;
  const advanceDeclineRatio =
    declines > 0 ? advances / declines : advances > 0 ? advances : 0;
  const breadthPercent =
    quotedStocks > 0
      ? Math.round((advances / quotedStocks) * 1000) / 10
      : 0;
  const netAdvances = advances - declines;
  const quoteCoveragePercent =
    totalStocks > 0
      ? Math.round((quotedStocks / totalStocks) * 1000) / 10
      : 0;
  const participationPercent = quoteCoveragePercent;
  const marketMood = classifyMood(
    breadthPercent,
    quoteCoveragePercent / 100
  );

  const avgReturn =
    quotedStocks > 0
      ? Math.round(
          (rows.reduce((sum, row) => sum + row.changePercent, 0) /
            quotedStocks) *
            100
        ) / 100
      : null;

  // Prefer higher-volume names for technical sample when universe is large.
  const technicalSymbols = rows
    .slice()
    .sort((a, b) => (b.quote.volume ?? 0) - (a.quote.volume ?? 0))
    .map((row) => row.symbol);

  const technicals = await computeTechnicals(technicalSymbols);
  const weekHighs = select52wExtremes(rows, "high");
  const weekLows = select52wExtremes(rows, "low");
  // Count all near-52W, not just displayed list
  const newHighs52w = rows.filter((row) => {
    return (
      row.weekHigh52 != null &&
      row.weekHigh52 > 0 &&
      row.price > 0 &&
      Math.abs(row.price - row.weekHigh52) / row.weekHigh52 <= 0.01
    );
  }).length;
  const newLows52w = rows.filter((row) => {
    return (
      row.weekLow52 != null &&
      row.weekLow52 > 0 &&
      row.price > 0 &&
      Math.abs(row.price - row.weekLow52) / row.weekLow52 <= 0.01
    );
  }).length;

  const { trend5d, trend20d } = recordBreadthTrend(
    universeId,
    breadthPercent,
    netAdvances
  );

  return {
    universe: universeId,
    universeLabel: resolved.label,
    totalStocks,
    quotedStocks,
    advances,
    declines,
    unchanged,
    advanceDeclineRatio: Math.round(advanceDeclineRatio * 100) / 100,
    breadthPercent,
    netAdvances,
    marketMood,
    participationPercent,
    newHighs52w,
    newLows52w,
    aboveEma20: technicals.aboveEma20,
    aboveEma50: technicals.aboveEma50,
    aboveEma200: technicals.aboveEma200,
    averageRsi: technicals.averageRsi,
    averageDailyReturn: avgReturn,
    sectorBreadth: buildSectors(rows),
    breadthTrend5d: trend5d,
    breadthTrend20d: trend20d,
    technicalCoveragePercent: technicals.coveragePercent,
    quoteCoveragePercent,
    lastUpdated: new Date().toISOString(),
    dataSource: `Live quotes · ${resolved.label} · company master equities`,
    gainers: selectMovers(rows, "gainers"),
    losers: selectMovers(rows, "losers"),
    weekHighs,
    weekLows,
    mostActive: rows
      .slice()
      .sort((a, b) => (b.quote.volume ?? 0) - (a.quote.volume ?? 0))
      .slice(0, 5)
      .map(toMover),
  };
}
