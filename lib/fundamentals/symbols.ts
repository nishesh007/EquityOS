/**
 * NSE symbol normalization and cross-provider ticker mappings.
 */

/** Known symbol aliases → canonical NSE ticker. */
const SYMBOL_ALIASES: Record<string, string> = {
  "TATA MOTORS": "TATAMOTORS",
  "TATA MOTORS PASSENGER": "TMPV",
  "TATA MOTORS COMMERCIAL": "TMCV",
  "HDFC BANK": "HDFCBANK",
  "ICICI BANK": "ICICIBANK",
  PIDILITE: "PIDILITIND",
  "MACROTECH": "LODHA",
  "LODHA GROUP": "LODHA",
  "INDIAN HOTELS": "INDHOTEL",
  "CG POWER": "CGPOWER",
  "KPIT": "KPITTECH",
  LTIM: "LTM",
  LTIMINDTREE: "LTM",
  "TATA ELXSI": "TATAELXSI",
  "POWER GRID": "POWERGRID",
  "COAL INDIA": "COALINDIA",
  "BANK OF BARODA": "BANKBARODA",
  "CANARA BANK": "CANBK",
  "PUNJAB NATIONAL BANK": "PNB",
  VEDANTA: "VEDL",
};

/**
 * Canonical symbols that no longer trade under their original NSE code
 * (demergers, renames). Maps internal symbol → live quote ticker used by
 * market data providers. Display/search URLs keep the canonical symbol.
 */
export const MARKET_DATA_SYMBOL_OVERRIDES: Readonly<Record<string, string>> = {
  TATAMOTORS: "TMPV",
};

/** Resolve the ticker used for live quotes/OHLC against external providers. */
export function resolveMarketDataSymbol(symbol: string): string {
  const normalized = normalizeNseSymbol(symbol);
  return MARKET_DATA_SYMBOL_OVERRIDES[normalized] ?? normalized;
}

/** Reverse lookup: live ticker → canonical symbol when overridden. */
export function canonicalizeMarketDataSymbol(symbol: string): string {
  const normalized = normalizeNseSymbol(symbol);
  for (const [canonical, live] of Object.entries(MARKET_DATA_SYMBOL_OVERRIDES)) {
    if (live === normalized) return canonical;
  }
  return normalized;
}

/** Reverse lookup for display tickers that differ from API tickers. */
const API_TO_NSE: Record<string, string> = {};

export function normalizeNseSymbol(symbol: string): string {
  const trimmed = symbol.trim().toUpperCase();
  return SYMBOL_ALIASES[trimmed] ?? trimmed;
}

export function toDisplaySymbol(symbol: string): string {
  const normalized = normalizeNseSymbol(symbol);
  return API_TO_NSE[normalized] ?? normalized;
}

/** Valid NSE equity tickers: 1–20 alphanumeric characters. */
export function isValidNseSymbol(symbol: string): boolean {
  const normalized = normalizeNseSymbol(symbol);
  if (!normalized || normalized.length > 20) return false;
  return /^[A-Z][A-Z0-9&-]*$/.test(normalized);
}

/** FMP uses NSE `.NS` suffix for Indian equities. */
export function toFmpSymbol(symbol: string): string {
  const normalized = resolveMarketDataSymbol(symbol);
  if (normalized.includes(".")) return normalized;
  return `${normalized}.NS`;
}

/** Alpha Vantage Indian listings use `.BSE` suffix in this codebase. */
export function toAlphaVantageSymbol(symbol: string): string {
  const normalized = resolveMarketDataSymbol(symbol);
  if (normalized === "NIFTY") return "NSEI.BSE";
  if (normalized === "SENSEX") return "BSESN.BSE";
  if (normalized === "BANKNIFTY") return "NSEBANK.BSE";
  if (normalized.includes(".")) return normalized;
  return `${normalized}.BSE`;
}

/** Finnhub uses `.NS` for NSE-listed equities. */
export function toFinnhubNseSymbol(symbol: string): string {
  const normalized = resolveMarketDataSymbol(symbol);
  if (normalized.includes(".")) return normalized;
  return `${normalized}.NS`;
}

/** Polygon ticker for NSE equities (Finnhub-style without exchange prefix). */
export function toPolygonNseSymbol(symbol: string): string {
  return toFinnhubNseSymbol(symbol);
}

export function providerSymbolMap(symbol: string): Record<string, string> {
  const nse = normalizeNseSymbol(symbol);
  return {
    nse,
    display: toDisplaySymbol(symbol),
    fmp: toFmpSymbol(symbol),
    alphaVantage: toAlphaVantageSymbol(symbol),
    finnhub: toFinnhubNseSymbol(symbol),
    polygon: toPolygonNseSymbol(symbol),
  };
}
