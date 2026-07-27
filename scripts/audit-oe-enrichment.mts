/**
 * OE enrichment quality audit — quote usability vs technical enrichment.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { getCompanyMasterRecords } from "../lib/company-master/index.ts";
import { marketDataService } from "../lib/market-data/service.ts";
import { getOhlcCandles } from "../lib/market/ohlc-engine.ts";
import { OE_OHLC_USAGE } from "../lib/market/ohlc-timeframes.ts";
import { getMarketStatus } from "../lib/market/session.ts";
import { buildQuoteOnlyMetrics } from "../lib/opportunity-engine/live-metrics.ts";

function loadDotEnvLocal(): void {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadDotEnvLocal();

function looksLikeFundOrSegregated(name: string, symbol: string): boolean {
  const n = name.toUpperCase();
  const s = symbol.toUpperCase();
  return (
    n.includes("SEGREGATED PORTFOLIO") ||
    n.includes("MUTUAL FUND") ||
    n.includes("ETF") ||
    /^0\d/.test(s) ||
    /^11[A-Z]/.test(s)
  );
}

async function main() {
  const records = getCompanyMasterRecords();
  const marketStatus = getMarketStatus(new Date());

  // Full-universe quote batch (same path as OE)
  const symbols = records.map((r) => r.displaySymbol.toUpperCase());
  const quoteMap = await marketDataService.getEnrichedQuotes(symbols);

  let missingQuoteEntry = 0;
  let nullPrice = 0;
  let validPrice = 0;
  let nullVolumeAmongValid = 0;
  const bySource: Record<string, number> = {};
  const byAvailability: Record<string, number> = {};
  const byProvider: Record<string, number> = {};
  let fundLikeNull = 0;
  let equityLikeNull = 0;
  let fundLikeValid = 0;
  let equityLikeValid = 0;

  const usableForMetrics: string[] = [];

  for (const rec of records) {
    const symbol = rec.displaySymbol.toUpperCase();
    const quote = quoteMap.get(symbol);
    const fundLike = looksLikeFundOrSegregated(rec.name, symbol);

    if (!quote) {
      missingQuoteEntry += 1;
      continue;
    }

    bySource[quote.source] = (bySource[quote.source] ?? 0) + 1;
    byAvailability[quote.availability] =
      (byAvailability[quote.availability] ?? 0) + 1;
    byProvider[String(quote.provider)] =
      (byProvider[String(quote.provider)] ?? 0) + 1;

    if (quote.price === null || quote.price <= 0) {
      nullPrice += 1;
      if (fundLike) fundLikeNull += 1;
      else equityLikeNull += 1;
      continue;
    }

    validPrice += 1;
    if (fundLike) fundLikeValid += 1;
    else equityLikeValid += 1;
    if (quote.volume === null) nullVolumeAmongValid += 1;

    const metrics = buildQuoteOnlyMetrics(
      {
        symbol,
        name: rec.name,
        sector: rec.sector || "Unknown",
        industry: rec.industry || "Unknown",
      },
      quote
    );
    if (metrics) usableForMetrics.push(symbol);
  }

  // OHLC probe on all usable quotes (same TECH path as OE — 1Y min 30 bars)
  let ohlcOk = 0;
  let ohlcMissing = 0;
  let ohlcShort = 0;
  const CONCURRENCY = 8;
  let cursor = 0;
  async function worker() {
    while (cursor < usableForMetrics.length) {
      const i = cursor;
      cursor += 1;
      const symbol = usableForMetrics[i]!;
      const result = await getOhlcCandles(symbol, OE_OHLC_USAGE.trend, {
        minBars: 30,
      });
      if (result.data.length >= 30) ohlcOk += 1;
      else if (result.data.length === 0) ohlcMissing += 1;
      else ohlcShort += 1;
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, usableForMetrics.length) }, () =>
      worker()
    )
  );

  const report = {
    generatedAt: new Date().toISOString(),
    marketStatus,
    totalSymbolsLoaded: records.length,
    quotesReceived: quoteMap.size,
    stage2_quoteUsability: {
      missingQuoteEntry,
      nullOrInvalidPrice: nullPrice,
      validPrice,
      usableForMetrics: usableForMetrics.length,
      nullVolumeAmongValidPrice: nullVolumeAmongValid,
    },
    quoteComposition: {
      bySource,
      byAvailability,
      byProvider,
      fundLikeNullPrice: fundLikeNull,
      equityLikeNullPrice: equityLikeNull,
      fundLikeValidPrice: fundLikeValid,
      equityLikeValidPrice: equityLikeValid,
    },
    stage3_ohlcTechnicals: {
      attempted: usableForMetrics.length,
      ohlcOkMin30Bars: ohlcOk,
      ohlcMissingEmpty: ohlcMissing,
      ohlcShortUnder30: ohlcShort,
      expectedEnrichedIfAllOk: ohlcOk,
    },
    priorSeedTelemetry: {
      note: "From last seed run (after-hours)",
      quotesReceived: 5011,
      metricsScanned: 25,
      enrichedCount: 25,
      rejectionCounts: {
        "Price unavailable": 4986,
        "Risk filter failed": 37,
      },
    },
  };

  writeFileSync(
    ".tmp-oe-enrichment-audit.json",
    JSON.stringify(report, null, 2)
  );
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
