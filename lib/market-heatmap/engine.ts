/**
 * Sector & Market Heatmap engine — Entire NSE / Nifty universes.
 * Quote-based sector tiles + stock cells; period returns from OHLC sample.
 */

import { lookupCompanyMaster } from "@/lib/company-master";
import type { EnrichedQuote } from "@/lib/market-data/enriched-quote";
import { marketDataService } from "@/lib/market-data";
import { rsi } from "@/lib/technical/math";
import {
  resolveBreadthUniverse,
  universeLabel,
} from "@/lib/market-breadth/universe";
import {
  average,
  classifyMoneyFlow,
  expansionRatio,
  median,
  momentumScore,
  parseMarketCapToCr,
  periodReturnPercent,
  relativeStrength,
} from "./metrics";
import type {
  HeatmapSectorTile,
  HeatmapStockCell,
  HeatmapUniverseId,
  MarketHeatmapSnapshot,
} from "./types";
import { toBreadthUniverseId } from "./types";

const QUOTE_CHUNK = 40;
const MAX_PERIOD_FETCHES = 100;
const PERIOD_CONCURRENCY = 6;
const WEEK_BARS = 5;
const MONTH_BARS = 21;

export interface HeatmapEngineOptions {
  universe?: HeatmapUniverseId;
}

interface RawRow {
  symbol: string;
  name: string;
  sector: string;
  quote: EnrichedQuote;
  changePercent: number;
  price: number;
  volume: number | null;
  deliveryPercent: number | null;
  marketCapCr: number | null;
  weeklyChangePercent: number | null;
  monthlyChangePercent: number | null;
  rsi: number | null;
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
  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, Math.max(1, items.length)) },
      () => run()
    )
  );
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
  await mapPool(chunks, 5, async (chunk) => {
    const map = await marketDataService.getEnrichedQuotes(chunk);
    for (const [key, value] of map) {
      out.set(key.toUpperCase(), value);
    }
  });
  return out;
}

async function enrichPeriods(rows: RawRow[]): Promise<number> {
  const ranked = rows
    .slice()
    .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))
    .slice(0, MAX_PERIOD_FETCHES);

  let ok = 0;
  await mapPool(ranked, PERIOD_CONCURRENCY, async (row) => {
    try {
      const candles = await marketDataService.getPriceHistory(row.symbol, "3M");
      if (!candles || candles.length < 10) return;
      const closes = candles.map((c) => c.close).filter((c) => c > 0);
      if (closes.length < 10) return;
      row.weeklyChangePercent = periodReturnPercent(closes, WEEK_BARS);
      row.monthlyChangePercent = periodReturnPercent(closes, MONTH_BARS);
      row.rsi = rsi(closes, 14);
      ok += 1;
    } catch {
      /* skip */
    }
  });
  return ok;
}

function buildSectorTiles(rows: RawRow[]): HeatmapSectorTile[] {
  const marketAvg =
    average(rows.map((r) => r.changePercent)) ?? 0;
  const volMedian = median(
    rows.map((r) => r.volume).filter((v): v is number => v != null && v > 0)
  );
  const delMedian = median(
    rows
      .map((r) => r.deliveryPercent)
      .filter((v): v is number => v != null && v >= 0)
  );

  const bySector = new Map<string, RawRow[]>();
  for (const row of rows) {
    const list = bySector.get(row.sector) ?? [];
    list.push(row);
    bySector.set(row.sector, list);
  }

  const tiles: HeatmapSectorTile[] = [];

  for (const [name, sectorRows] of bySector) {
    const advances = sectorRows.filter((r) => r.changePercent > 0).length;
    const declines = sectorRows.filter((r) => r.changePercent < 0).length;
    const unchanged = sectorRows.length - advances - declines;
    const dailyChangePercent =
      average(sectorRows.map((r) => r.changePercent)) ?? 0;
    const weeklyChangePercent = average(
      sectorRows
        .map((r) => r.weeklyChangePercent)
        .filter((v): v is number => v != null)
    );
    const monthlyChangePercent = average(
      sectorRows
        .map((r) => r.monthlyChangePercent)
        .filter((v): v is number => v != null)
    );
    const averageVolume = average(
      sectorRows
        .map((r) => r.volume)
        .filter((v): v is number => v != null && v > 0)
    );
    const averageDeliveryPercent = average(
      sectorRows
        .map((r) => r.deliveryPercent)
        .filter((v): v is number => v != null)
    );
    const marketCapCr = (() => {
      const caps = sectorRows
        .map((r) => r.marketCapCr)
        .filter((v): v is number => v != null && v > 0);
      return caps.length > 0 ? caps.reduce((s, v) => s + v, 0) : null;
    })();

    const rs = relativeStrength(dailyChangePercent, marketAvg);
    const volExp = expansionRatio(averageVolume, volMedian);
    const delExp = expansionRatio(averageDeliveryPercent, delMedian);
    const mom = momentumScore(dailyChangePercent, volExp);

    const stocksUnranked: Omit<HeatmapStockCell, "sectorRank">[] =
      sectorRows.map((row) => {
        const stockRs = relativeStrength(row.changePercent, marketAvg);
        const stockVolExp = expansionRatio(row.volume, volMedian);
        return {
          symbol: row.symbol,
          name: row.name,
          sector: row.sector,
          price: row.price,
          changePercent: row.changePercent,
          weeklyChangePercent: row.weeklyChangePercent,
          monthlyChangePercent: row.monthlyChangePercent,
          volume: row.volume,
          deliveryPercent: row.deliveryPercent,
          marketCapCr: row.marketCapCr,
          rsi: row.rsi,
          relativeStrength: stockRs,
          momentumScore: momentumScore(row.changePercent, stockVolExp),
        };
      });

    const stocks: HeatmapStockCell[] = stocksUnranked
      .slice()
      .sort((a, b) => b.changePercent - a.changePercent)
      .map((stock, index) => ({ ...stock, sectorRank: index + 1 }));

    tiles.push({
      name,
      dailyChangePercent: Math.round(dailyChangePercent * 100) / 100,
      weeklyChangePercent:
        weeklyChangePercent != null
          ? Math.round(weeklyChangePercent * 100) / 100
          : null,
      monthlyChangePercent:
        monthlyChangePercent != null
          ? Math.round(monthlyChangePercent * 100) / 100
          : null,
      breadthPercent:
        Math.round((advances / Math.max(1, sectorRows.length)) * 1000) / 10,
      advances,
      declines,
      unchanged,
      total: sectorRows.length,
      averageVolume:
        averageVolume != null ? Math.round(averageVolume) : null,
      averageDeliveryPercent:
        averageDeliveryPercent != null
          ? Math.round(averageDeliveryPercent * 10) / 10
          : null,
      marketCapCr:
        marketCapCr != null ? Math.round(marketCapCr * 10) / 10 : null,
      relativeStrength: rs,
      relativeStrengthRank: 0,
      relativeWeaknessRank: 0,
      momentumScore: mom,
      volumeExpansion: volExp,
      deliveryExpansion: delExp,
      moneyFlow: classifyMoneyFlow(dailyChangePercent, volExp),
      stocks,
    });
  }

  const byRs = tiles.slice().sort((a, b) => b.relativeStrength - a.relativeStrength);
  byRs.forEach((tile, index) => {
    tile.relativeStrengthRank = index + 1;
    tile.relativeWeaknessRank = tiles.length - index;
  });

  return tiles.sort((a, b) => b.dailyChangePercent - a.dailyChangePercent);
}

export async function runMarketHeatmapEngine(
  options: HeatmapEngineOptions = {}
): Promise<MarketHeatmapSnapshot> {
  const universeId = options.universe ?? "nse";
  const resolved = resolveBreadthUniverse(toBreadthUniverseId(universeId));

  const quoteMap = await fetchQuotesChunked(resolved.symbols);
  const rows: RawRow[] = [];

  for (const symbol of resolved.symbols) {
    const quote = quoteMap.get(symbol);
    if (!quote || quote.availability === "unavailable") continue;
    if (quote.price == null || !Number.isFinite(quote.changePercent)) continue;
    const master =
      resolved.recordsBySymbol.get(symbol) ?? lookupCompanyMaster(symbol);
    rows.push({
      symbol,
      name: master?.name ?? symbol,
      sector: master?.sector?.trim() || "Equities",
      quote,
      changePercent: quote.changePercent ?? 0,
      price: quote.price,
      volume: quote.volume,
      deliveryPercent: quote.deliveryPercent,
      marketCapCr: parseMarketCapToCr(quote.marketCap),
      weeklyChangePercent: null,
      monthlyChangePercent: null,
      rsi: null,
    });
  }

  const periodOk = await enrichPeriods(rows);
  const sectors = buildSectorTiles(rows);
  const marketAvg = average(rows.map((r) => r.changePercent)) ?? 0;

  const moneyInflowSectors = sectors
    .filter((s) => s.moneyFlow === "inflow")
    .map((s) => s.name);
  const moneyOutflowSectors = sectors
    .filter((s) => s.moneyFlow === "outflow")
    .map((s) => s.name);

  const totalStocks = resolved.symbols.length;
  const quotedStocks = rows.length;

  return {
    universe: universeId,
    universeLabel: universeLabel(toBreadthUniverseId(universeId)),
    totalStocks,
    quotedStocks,
    sectorCount: sectors.length,
    marketAvgChangePercent: Math.round(marketAvg * 100) / 100,
    sectors,
    moneyInflowSectors,
    moneyOutflowSectors,
    lastUpdated: new Date().toISOString(),
    dataSource: `Live quotes · ${universeLabel(toBreadthUniverseId(universeId))} · company master sectors`,
    quoteCoveragePercent:
      totalStocks > 0
        ? Math.round((quotedStocks / totalStocks) * 1000) / 10
        : 0,
    periodCoveragePercent:
      quotedStocks > 0
        ? Math.round((periodOk / quotedStocks) * 1000) / 10
        : 0,
  };
}

/** Lazy drilldown helper — sector slice from snapshot (no re-scan). */
export function getSectorDrilldown(
  snapshot: MarketHeatmapSnapshot,
  sectorName: string
): HeatmapSectorTile | null {
  return (
    snapshot.sectors.find(
      (s) => s.name.toLowerCase() === sectorName.toLowerCase()
    ) ?? null
  );
}
