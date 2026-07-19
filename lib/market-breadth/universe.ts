/**
 * Universe resolution for Market Breadth.
 * Entire NSE = company-master equities (INE), excluding funds / non-tradables.
 */

import { getCompanyMasterRecords } from "@/lib/company-master";
import type { CompanyMasterRecord } from "@/lib/company-master/types";
import {
  getNifty100,
  getNifty200,
  getNifty50,
  getNifty500,
} from "@/lib/market-breadth/nifty-constituents";
import type { BreadthUniverseId } from "@/lib/market-breadth/types";
import { BREADTH_UNIVERSE_OPTIONS } from "@/lib/market-breadth/types";

const NON_TRADABLE_NAME =
  /\b(FUND|ETF|SEGREGATED|LIQUIDATION|DELISTED|SUSPENDED|RIGHTS|WARRANT)\b/i;

/** Tradable NSE equity filter — presentation-agnostic master rules. */
export function isTradableNseEquity(record: CompanyMasterRecord): boolean {
  const isin = (record.isin || "").toUpperCase();
  if (!isin.startsWith("INE")) return false;
  if (/^\d/.test(record.symbol)) return false;
  if (NON_TRADABLE_NAME.test(record.name)) return false;
  // Prefer NSE-style tickers (letters / & / -), skip pure BSE numeric routing.
  if (!/^[A-Z][A-Z0-9&-]{0,20}$/i.test(record.symbol)) return false;
  return true;
}

export function getEntireNseEquityUniverse(): CompanyMasterRecord[] {
  return getCompanyMasterRecords().filter(isTradableNseEquity);
}

export function universeLabel(id: BreadthUniverseId): string {
  return (
    BREADTH_UNIVERSE_OPTIONS.find((option) => option.id === id)?.label ?? id
  );
}

export interface ResolvedUniverse {
  id: BreadthUniverseId;
  label: string;
  symbols: string[];
  recordsBySymbol: Map<string, CompanyMasterRecord>;
}

/**
 * Resolve symbols for a breadth universe.
 * Portfolio / watchlist symbols are injected by the caller (service layer).
 */
export function resolveBreadthUniverse(
  id: BreadthUniverseId,
  options?: {
    portfolioSymbols?: readonly string[];
    watchlistSymbols?: readonly string[];
  }
): ResolvedUniverse {
  const nse = getEntireNseEquityUniverse();
  const bySymbol = new Map(nse.map((r) => [r.symbol.toUpperCase(), r]));

  let symbols: string[];
  switch (id) {
    case "nse":
      symbols = nse.map((r) => r.symbol);
      break;
    case "nifty50":
      symbols = getNifty50().filter((s) => bySymbol.has(s));
      break;
    case "nifty100":
      symbols = getNifty100().filter((s) => bySymbol.has(s));
      break;
    case "nifty200":
      symbols = getNifty200().filter((s) => bySymbol.has(s));
      break;
    case "nifty500":
      symbols = getNifty500().filter((s) => bySymbol.has(s));
      // If curated list is short of membership, top up from NSE master (stable alpha order)
      // only for symbols already in the curated set intent — do not invent membership.
      break;
    case "portfolio":
      symbols = (options?.portfolioSymbols ?? [])
        .map((s) => s.toUpperCase())
        .filter(Boolean);
      break;
    case "watchlist":
      symbols = (options?.watchlistSymbols ?? [])
        .map((s) => s.toUpperCase())
        .filter(Boolean);
      break;
    default:
      symbols = nse.map((r) => r.symbol);
  }

  // Deduplicate while preserving order
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const symbol of symbols) {
    const key = symbol.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(key);
  }

  return {
    id,
    label: universeLabel(id),
    symbols: unique,
    recordsBySymbol: bySymbol,
  };
}
