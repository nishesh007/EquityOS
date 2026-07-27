import { NextRequest, NextResponse } from "next/server";
import { getOhlcCandles } from "@/lib/market/ohlc-engine";
import { isOhlcTimeframe } from "@/lib/market/ohlc-timeframes";
import { normalizeNseSymbol } from "@/lib/fundamentals/symbols";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Canonical OHLC fetch for charts / workspace (including true intraday).
 * GET /api/market/ohlc?symbol=RELIANCE&timeframe=5m
 */
export async function GET(request: NextRequest) {
  const symbolRaw = request.nextUrl.searchParams.get("symbol")?.trim() ?? "";
  const timeframeRaw =
    request.nextUrl.searchParams.get("timeframe")?.trim() ?? "";

  if (!symbolRaw || !timeframeRaw) {
    return NextResponse.json(
      { error: "symbol and timeframe are required" },
      { status: 400 }
    );
  }

  if (!isOhlcTimeframe(timeframeRaw)) {
    return NextResponse.json(
      { error: `Unsupported timeframe: ${timeframeRaw}` },
      { status: 400 }
    );
  }

  const symbol = normalizeNseSymbol(symbolRaw);
  const result = await getOhlcCandles(symbol, timeframeRaw);

  return NextResponse.json({
    symbol,
    timeframe: result.timeframe,
    interval: result.interval,
    provider: result.provider,
    source: result.source,
    attempted: result.attempted,
    count: result.data.length,
    candles: result.data,
  });
}
