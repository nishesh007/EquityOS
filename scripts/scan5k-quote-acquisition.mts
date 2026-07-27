/**
 * Forced 5000-symbol OE scan — prints institutional quote acquisition metrics.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { countCategoryCandidates } from "../lib/opportunity-engine/pipeline-telemetry.ts";
import { selectRecommendationsWithFallback } from "../lib/recommendations/shared-recommendation.ts";
import { printQuoteFreshnessStats } from "../lib/market-data/quote-acquisition.ts";

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
    if (!(key in process.env) || !process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadDotEnvLocal();
if (!process.env.QUOTE_MAX_AGE_HOURS) {
  process.env.QUOTE_MAX_AGE_HOURS = "72";
}

async function main() {
  const { runOpportunityScan } = await import(
    "../lib/opportunity-engine/engine.ts"
  );
  console.info("[scan5k] Starting forced Opportunity Engine scan…");
  const started = Date.now();
  const scan = await runOpportunityScan(true);
  const recommendationsGenerated = selectRecommendationsWithFallback(
    scan.state as never
  ).length;
  const categoryCandidates = countCategoryCandidates(scan.state.categories);
  const qf = scan.quoteFreshness;

  const out = {
    durationMs: Date.now() - started,
    quotesFetched: qf?.quotesFetched ?? scan.symbolsScanned,
    fresh: qf?.fresh ?? null,
    stale: qf?.stale ?? null,
    providerFailures: qf?.providerFailures ?? null,
    technicallyEnriched: scan.enrichedCount ?? 0,
    symbolsScanned: scan.symbolsScanned,
    categoryCandidates,
    recommendationsGenerated,
    quoteOnlyCount: scan.quoteOnlyCount ?? 0,
    cacheHitRatio: qf?.cacheHitRatio ?? null,
  };

  console.info("");
  console.info("quotes fetched:", out.quotesFetched);
  console.info("fresh:", out.fresh);
  console.info("stale:", out.stale);
  console.info("provider failures:", out.providerFailures);
  console.info("technically enriched:", out.technicallyEnriched);
  console.info("recommendations generated:", out.recommendationsGenerated);
  console.info("performance impact (durationMs):", out.durationMs);
  console.info("cache hit ratio:", out.cacheHitRatio);
  console.info("symbols scanned (OE metrics rows):", out.symbolsScanned);

  writeFileSync(".tmp-scan5k.json", JSON.stringify(out, null, 2));
}

main().catch((error) => {
  console.error("[scan5k] failed:", error);
  process.exit(1);
});
