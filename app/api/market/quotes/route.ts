import { NextRequest, NextResponse } from "next/server";
import { marketDataService } from "@/lib/market-data";
import { enrichedQuoteToJSON } from "@/lib/market-data/enriched-quote";
import {
  getMarketStatus,
  getMarketStatusLabel,
  getQuotePollIntervalMs,
  isMarketOpen,
} from "@/lib/market/session";

export async function GET(request: NextRequest) {
  const symbolsParam = request.nextUrl.searchParams.get("symbols");
  if (!symbolsParam) {
    return NextResponse.json({ error: "symbols query parameter required" }, { status: 400 });
  }

  const symbols = symbolsParam
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  if (symbols.length === 0) {
    return NextResponse.json({ error: "at least one symbol required" }, { status: 400 });
  }

  if (symbols.length > 50) {
    return NextResponse.json({ error: "maximum 50 symbols per request" }, { status: 400 });
  }

  const now = new Date();
  const quotes = await marketDataService.getEnrichedQuotes(symbols);
  const payload = Object.fromEntries(
    Array.from(quotes.entries()).map(([symbol, quote]) => [
      symbol,
      enrichedQuoteToJSON(quote),
    ])
  );

  return NextResponse.json({
    quotes: payload,
    marketOpen: isMarketOpen(now),
    marketStatus: getMarketStatus(now),
    marketStatusLabel: getMarketStatusLabel(getMarketStatus(now)),
    pollIntervalMs: getQuotePollIntervalMs(now),
    serverTime: now.toISOString(),
  });
}
