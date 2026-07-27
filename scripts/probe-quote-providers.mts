import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { marketDataService } from "../lib/market-data/service.ts";
import {
  getActiveMarketDataProviders,
  getProductionProviderChain,
} from "../lib/market-data/fallback.ts";
import { getMarketStatus } from "../lib/market/session.ts";

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

async function main() {
  console.log(
    JSON.stringify(
      {
        marketStatus: getMarketStatus(),
        chain: getProductionProviderChain(),
        active: getActiveMarketDataProviders().map((p) => ({
          name: p.name,
          available:
            typeof (p as { isAvailable?: () => boolean }).isAvailable ===
            "function"
              ? (p as { isAvailable: () => boolean }).isAvailable()
              : null,
        })),
      },
      null,
      2
    )
  );

  for (const s of ["RELIANCE", "TCS", "INFY", "HDFCBANK", "CAMS"]) {
    const q = await marketDataService.getEnrichedQuote(s);
    console.log(
      JSON.stringify({
        symbol: s,
        price: q.price,
        source: q.source,
        provider: q.provider,
        availability: q.availability,
        marketStatus: q.marketStatus,
      })
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
