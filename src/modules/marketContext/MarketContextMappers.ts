/**
 * Maps EquityOS market payloads into breadth / sector engine inputs.
 * Uses in-memory company master / universe only — no extra network calls.
 */

import { getCompanyEnrichment } from "@/lib/company-master/enrichment";
import { getUniverse } from "@/lib/screener";
import type { MarketBreadth, MarketMover, SectorPerformance } from "@/types";
import {
  DEFAULT_BREADTH_CONFIG,
  type BreadthEngineInput,
  type CapTier,
  type ConstituentSnapshot,
  type MarketContextRawData,
  type SectorEngineInput,
} from "./MarketContextTypes";
import {
  classifyCapTier,
  normalizeSectorLabel,
  parseMarketCapToCr,
} from "./BreadthUtils";

function parseVolumeString(raw: string | undefined): number {
  if (!raw || raw === "—") return 0;
  const cleaned = raw.replace(/[₹,\s]/g, "");
  const match = cleaned.match(/^([\d.]+)([KMBL])?$/i);
  if (!match) {
    const numeric = Number.parseFloat(cleaned);
    return Number.isFinite(numeric) ? numeric : 0;
  }
  const value = Number.parseFloat(match[1]);
  if (!Number.isFinite(value)) return 0;
  const suffix = (match[2] ?? "").toUpperCase();
  const mult =
    suffix === "K"
      ? 1_000
      : suffix === "M" || suffix === "L"
        ? 100_000
        : suffix === "B"
          ? 1_000_000_000
          : 1;
  return value * mult;
}

function universeMetrics(symbol: string): {
  marketCapCr: number | null;
  avgVolume: number | null;
  sector: string | null;
} {
  try {
    const universe = getUniverse();
    const row = universe.rows.find(
      (entry) => entry.symbol.toUpperCase() === symbol.toUpperCase()
    );
    if (!row) return { marketCapCr: null, avgVolume: null, sector: null };
    const marketCap =
      typeof row.metrics.market_cap === "number" ? row.metrics.market_cap : null;
    const avgVolume =
      typeof row.metrics.avg_volume_20d === "number"
        ? row.metrics.avg_volume_20d
        : null;
    return {
      marketCapCr: marketCap,
      avgVolume,
      sector: row.sector || null,
    };
  } catch {
    return { marketCapCr: null, avgVolume: null, sector: null };
  }
}

function toConstituent(mover: MarketMover): ConstituentSnapshot {
  const symbol = mover.symbol.toUpperCase();
  const enrichment = getCompanyEnrichment(symbol);
  const uni = universeMetrics(symbol);

  const quoteVolume =
    mover.quote?.volume !== undefined && mover.quote.volume !== null
      ? mover.quote.volume
      : parseVolumeString(mover.volume);

  const marketCapCr =
    uni.marketCapCr ??
    parseMarketCapToCr(enrichment?.marketCap) ??
    parseMarketCapToCr(mover.quote?.marketCap ?? undefined);

  const capTier: CapTier | null = classifyCapTier(
    marketCapCr,
    DEFAULT_BREADTH_CONFIG
  );

  const relativeVolume =
    uni.avgVolume && uni.avgVolume > 0 && quoteVolume > 0
      ? quoteVolume / uni.avgVolume
      : null;

  const sector =
    enrichment?.sector ??
    uni.sector ??
    null;

  const available =
    Number.isFinite(mover.changePercent) &&
    (mover.quote?.availability !== "unavailable");

  return {
    symbol,
    name: mover.name,
    changePercent: mover.changePercent,
    volume: quoteVolume,
    relativeVolume,
    marketCapCr,
    capTier,
    sector: sector ? normalizeSectorLabel(sector) : null,
    available: Boolean(available || mover.price > 0 || quoteVolume > 0),
  };
}

/**
 * Builds a de-duplicated constituent universe from market movers.
 * Prefer live-enriched movers already present on MarketBreadth.
 */
export function buildConstituentsFromBreadth(
  breadth: MarketBreadth
): ConstituentSnapshot[] {
  const movers: MarketMover[] = [
    ...breadth.gainers,
    ...breadth.losers,
    ...breadth.weekHighs,
    ...breadth.weekLows,
    ...breadth.mostActive,
  ];

  const bySymbol = new Map<string, ConstituentSnapshot>();
  for (const mover of movers) {
    const snapshot = toConstituent(mover);
    const existing = bySymbol.get(snapshot.symbol);
    if (!existing || (!existing.available && snapshot.available)) {
      bySymbol.set(snapshot.symbol, snapshot);
    }
  }
  return [...bySymbol.values()];
}

export function buildBreadthEngineInputFromRaw(
  raw: MarketContextRawData,
  previousBreadthPercent: number | null = null
): BreadthEngineInput {
  return {
    advances: raw.breadth.advances,
    declines: raw.breadth.declines,
    unchanged: raw.breadth.unchanged,
    newHighs: raw.breadth.newHighs,
    newLows: raw.breadth.newLows,
    sectors: raw.breadth.sectors ?? [],
    constituents: buildConstituentsFromBreadth(raw.breadth),
    volumeChangePercent: estimateVolumeChange(raw),
    previousBreadthPercent,
    asOf: raw.fetchedAt,
  };
}

export function buildSectorEngineInputFromRaw(
  raw: MarketContextRawData,
  previousScores: Record<string, number> = {}
): SectorEngineInput {
  const nifty = raw.indices.find(
    (index) => index.symbol.toUpperCase() === "NIFTY"
  );

  return {
    sectors: (raw.breadth.sectors ?? []) as SectorPerformance[],
    constituents: buildConstituentsFromBreadth(raw.breadth),
    benchmarkChangePercent:
      nifty && Number.isFinite(nifty.changePercent) ? nifty.changePercent : null,
    marketVolumeChangePercent: estimateVolumeChange(raw),
    previousScores,
    asOf: raw.fetchedAt,
  };
}

function estimateVolumeChange(raw: MarketContextRawData): number | null {
  const candles = raw.niftyCandles;
  if (candles.length < 21) return null;
  const recent = candles.slice(-5);
  const prior = candles.slice(-20, -5);
  const recentAvg =
    recent.reduce((sum, bar) => sum + bar.volume, 0) / recent.length;
  const priorAvg =
    prior.reduce((sum, bar) => sum + bar.volume, 0) / prior.length;
  if (priorAvg <= 0) return null;
  return ((recentAvg - priorAvg) / priorAvg) * 100;
}
