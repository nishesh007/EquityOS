/**
 * Quick valuation sanity check — run: npx tsx scripts/verify-valuation.ts
 */
import { MOCK_COMPANY_SEEDS } from "@/lib/fundamentals/mock-data";
import { createAnalysisContext } from "@/lib/engine/analysis-context";
import { calculateValuation } from "@/lib/engine/calculators/valuation-engine";
import { buildSwingSetup } from "@/lib/engine/calculators/swing";
import { buildTechnicalAnalysis } from "@/lib/engine/calculators/technical";
import { createRng, hashSeed } from "@/lib/random";
import type { CompanyProfile, TradingData } from "@/types";
import { isValidMarketPrice } from "@/lib/utils";

const SYMBOLS = ["TCS", "RELIANCE", "INFY", "HAPPSTMNDS", "HIGHNESS"];

function makeProfile(symbol: string): CompanyProfile | null {
  const seed = MOCK_COMPANY_SEEDS[symbol];
  if (seed) {
    return {
      ...seed,
      priceHistory: { "1D": [], "1W": [], "1M": [], "3M": [], "6M": [], "1Y": [], "5Y": [] },
    };
  }
  const { resolveFundamentalsSeed } = require("@/lib/fundamentals/dynamic-seed") as typeof import("@/lib/fundamentals/dynamic-seed");
  try {
    const dynamic = resolveFundamentalsSeed(symbol);
    return {
      ...dynamic,
      priceHistory: { "1D": [], "1W": [], "1M": [], "3M": [], "6M": [], "1Y": [], "5Y": [] },
    };
  } catch {
    return null;
  }
}

function makeTrading(price: number): TradingData {
  return {
    open: price * 0.99,
    high: price * 1.02,
    low: price * 0.97,
    close: price,
    previousClose: price * 0.995,
    volume: 1_000_000,
    turnover: "₹100 Cr",
    deliveryPercent: 45,
    vwap: price,
    weekHigh52: price * 1.2,
    weekLow52: price * 0.8,
    dividendYield: 1.2,
    upperCircuit: price * 1.1,
    lowerCircuit: price * 0.9,
  };
}

let failures = 0;

for (const symbol of SYMBOLS) {
  const profile = makeProfile(symbol);
  if (!profile) {
    console.log(`FAIL ${symbol}: no profile`);
    failures++;
    continue;
  }

  const ctx = createAnalysisContext(profile);
  const val = calculateValuation(ctx);
  const rng = createRng(hashSeed(symbol));
  const trading = makeTrading(profile.price);
  const tech = buildTechnicalAnalysis(profile, trading);
  const swing = buildSwingSetup(profile.price, tech.analysis, trading, rng);

  const priceOk = isValidMarketPrice(profile.price);
  const intrinsicOk = isValidMarketPrice(val.intrinsicValue);
  const ratio = intrinsicOk ? val.intrinsicValue / profile.price : 0;
  const ratioOk = !intrinsicOk || (ratio >= 0.2 && ratio <= 4.5);
  const swingOk = Number.isFinite(swing.setup.riskRewardRatio);

  const status = priceOk && ratioOk && swingOk ? "OK" : "FAIL";
  if (status === "FAIL") failures++;

  console.log(
    `${status} ${symbol} price=${profile.price} intrinsic=${val.intrinsicValue} mos=${val.marginOfSafety}% upside=${val.upsidePercent}% ratio=${ratio.toFixed(2)} swing-rr=${swing.setup.riskRewardRatio}`
  );

  if (symbol === "TCS") {
    for (const m of val.models) {
      console.log(`  ${m.key}: fair=${m.fairValue} (${m.fairValue > 0 ? (m.fairValue / profile.price).toFixed(2) : "N/A"}x)`);
    }
  }

  for (const m of val.models.filter((x) => x.fairValue > 0)) {
    const mr = m.fairValue / profile.price;
    if (mr < 0.15 || mr > 5) {
      console.log(`  WARN ${m.key} fair=${m.fairValue} ratio=${mr.toFixed(2)}`);
    }
  }
}

if (failures > 0) {
  console.error(`\n${failures} symbol(s) failed validation`);
  process.exit(1);
}
console.log("\nAll symbols passed valuation sanity checks");
