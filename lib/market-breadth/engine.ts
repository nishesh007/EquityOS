/**
 * Institutional Market Breadth / Market Internals Engine.
 * Quote-based A/D over the selected universe; technicals from OHLC when available.
 * Market mood uses multiple factors — never A/D alone or partial samples.
 */

import { lookupCompanyMaster } from "@/lib/company-master";
import type { EnrichedQuote } from "@/lib/market-data/enriched-quote";
import { marketDataService } from "@/lib/market-data";
import {
  getMarketStatus,
  getMarketStatusLabel,
} from "@/lib/market/session";
import { ema, rsi } from "@/lib/technical/math";
import { formatVolume } from "@/lib/utils";
import type { MarketMover } from "@/types";
import { classifyMarketMood } from "./mood";
import {
  recordBreadthTrend,
  recordParticipationTrend,
} from "./trend-store";
import type {
  BreadthUniverseId,
  MarketBreadthSnapshot,
  SectorBreadthRow,
} from "./types";
import { resolveBreadthUniverse } from "./universe";

const QUOTE_CHUNK = 40;
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

function pctOf(count: number | null, sample: number): number | null {
  if (count == null || sample <= 0) return null;
  return Math.round((count / sample) * 1000) / 10;
}

function buildSectors(rows: QuoteRow[]): SectorBreadthRow[] {
  const bySector = new Map<
    string,
    { advances: number; declines: number; unchanged: number; total: number; changes: number[] }
  >();

  for (const row of rows) {
    const sector =
      lookupCompanyMaster(row.symbol)?.sector?.trim() || "Equities";
    const bucket = bySector.get(sector) ?? {
      advances: 0,
      declines: 0,
      unchanged: 0,
      total: 0,
      changes: [],
    };
    bucket.changes.push(row.changePercent);
    bucket.total += 1;
    if (row.changePercent > 0) bucket.advances += 1;
    else if (row.changePercent < 0) bucket.declines += 1;
    else bucket.unchanged += 1;
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
          (bucket.advances / Math.max(1, bucket.total)) * 1000
        ) / 10,
        advances: bucket.advances,
        declines: bucket.declines,
        unchanged: bucket.unchanged,
        total: bucket.total,
      };
    })
    .sort((a, b) => b.breadth - a.breadth);
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
  const threshold = 0.01;
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
  sampleSize: number;
  coveragePercent: number;
}> {
  if (symbols.length === 0) {
    return {
      aboveEma20: null,
      aboveEma50: null,
      aboveEma200: null,
      averageRsi: null,
      sampleSize: 0,
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
      sampleSize: 0,
      coveragePercent: 0,
    };
  }

  return {
    aboveEma20: above20,
    aboveEma50: above50,
    aboveEma200: above200,
    averageRsi:
      rsiCount > 0 ? Math.round((rsiSum / rsiCount) * 10) / 10 : null,
    sampleSize: ok,
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

function near52w(row: QuoteRow, direction: "high" | "low"): boolean {
  const threshold = 0.01;
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

  const avgReturn =
    quotedStocks > 0
      ? Math.round(
          (rows.reduce((sum, row) => sum + row.changePercent, 0) /
            quotedStocks) *
            100
        ) / 100
      : null;

  const technicalSymbols = rows
    .slice()
    .sort((a, b) => (b.quote.volume ?? 0) - (a.quote.volume ?? 0))
    .map((row) => row.symbol);

  const technicals = await computeTechnicals(technicalSymbols);
  const aboveEma20Pct = pctOf(technicals.aboveEma20, technicals.sampleSize);
  const aboveEma50Pct = pctOf(technicals.aboveEma50, technicals.sampleSize);
  const aboveEma200Pct = pctOf(technicals.aboveEma200, technicals.sampleSize);

  const emaParts = [aboveEma20Pct, aboveEma50Pct, aboveEma200Pct].filter(
    (v): v is number => v != null
  );
  const emaParticipationPercent =
    emaParts.length > 0
      ? Math.round(
          (emaParts.reduce((s, v) => s + v, 0) / emaParts.length) * 10
        ) / 10
      : null;

  const weekHighs = select52wExtremes(rows, "high");
  const weekLows = select52wExtremes(rows, "low");
  const newHighs52w = rows.filter((row) => near52w(row, "high")).length;
  const newLows52w = rows.filter((row) => near52w(row, "low")).length;
  const highLowRatio =
    newLows52w > 0
      ? Math.round((newHighs52w / newLows52w) * 100) / 100
      : newHighs52w > 0
        ? newHighs52w
        : 0;

  const sectorBreadth = buildSectors(rows);
  const sectorAdvanceSharePercent =
    sectorBreadth.length > 0
      ? Math.round(
          (sectorBreadth.filter((s) => s.breadth >= 50).length /
            sectorBreadth.length) *
            1000
        ) / 10
      : null;

  const moodResult = classifyMarketMood({
    breadthPercent,
    quoteCoverage: quoteCoveragePercent / 100,
    emaParticipationPercent,
    newHighs52w,
    newLows52w,
    sectorAdvanceSharePercent,
    averageRsi: technicals.averageRsi,
  });

  const { trend5d, trend20d } = recordBreadthTrend(
    universeId,
    breadthPercent,
    netAdvances
  );

  const participationTrends = recordParticipationTrend(universeId, {
    aboveEma20Pct,
    aboveEma50Pct,
    aboveEma200Pct,
  });

  const marketStatus = getMarketStatus();
  const strongestSector = sectorBreadth[0]?.name ?? null;
  const weakestSector =
    sectorBreadth.length > 0
      ? sectorBreadth[sectorBreadth.length - 1]?.name ?? null
      : null;

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
    marketMood: moodResult.mood,
    moodGauge: moodResult.gaugeValue,
    moodFactors: moodResult.factors,
    participationPercent: emaParticipationPercent ?? quoteCoveragePercent,
    highLowRatio,
    newHighs52w,
    newLows52w,
    aboveEma20: technicals.aboveEma20,
    aboveEma50: technicals.aboveEma50,
    aboveEma200: technicals.aboveEma200,
    aboveEma20Pct,
    aboveEma50Pct,
    aboveEma200Pct,
    aboveEma20Trend: participationTrends.aboveEma20Trend,
    aboveEma50Trend: participationTrends.aboveEma50Trend,
    aboveEma200Trend: participationTrends.aboveEma200Trend,
    technicalSampleSize: technicals.sampleSize,
    averageRsi: technicals.averageRsi,
    averageDailyReturn: avgReturn,
    sectorBreadth,
    strongestSector,
    weakestSector,
    breadthTrend5d: trend5d,
    breadthTrend20d: trend20d,
    technicalCoveragePercent: technicals.coveragePercent,
    quoteCoveragePercent,
    marketStatus,
    marketStatusLabel: getMarketStatusLabel(marketStatus),
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
