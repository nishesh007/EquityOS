/**
 * Production validation runner — OE scan metrics (post-OHLC refactor).
 * Does NOT seed Postgres (that requires DATABASE_URL via seed script).
 */
import { runOpportunityScan } from "../lib/opportunity-engine/engine.ts";
import { countCategoryCandidates } from "../lib/opportunity-engine/pipeline-telemetry.ts";
import { selectRecommendationsWithFallback } from "../lib/recommendations/shared-recommendation.ts";
import { writeFileSync } from "node:fs";

async function main() {
  console.info("[pvalid] Starting forced Opportunity Engine scan…");
  const started = Date.now();
  const scan = await runOpportunityScan(true);
  const categoryCandidatesGenerated = countCategoryCandidates(scan.state.categories);
  const recommendationsGenerated = selectRecommendationsWithFallback(
    scan.state as never
  ).length;

  const out = {
    ok: true,
    durationMs: Date.now() - started,
    symbolsScanned: scan.symbolsScanned,
    quoteOnlyCount: scan.quoteOnlyCount ?? 0,
    enrichedCount: scan.enrichedCount ?? 0,
    rawCandidates: scan.rawCandidates ?? 0,
    pipelinePassed: scan.pipelinePassed ?? 0,
    categoryCandidatesGenerated,
    recommendationsGenerated,
    lastScannedAt: scan.state.lastScannedAt,
    tradingDate: scan.state.tradingDate,
    scanCount: scan.state.scanCount,
  };

  console.info(JSON.stringify(out, null, 2));
  writeFileSync(".tmp-pvalid-scan.json", JSON.stringify(out, null, 2));

  if (out.symbolsScanned <= 0) {
    console.error("[pvalid] FIRST ZERO: Universe scanned");
    process.exit(10);
  }
  if (out.enrichedCount <= 0) {
    console.error("[pvalid] FIRST ZERO: Universe technically enriched");
    process.exit(11);
  }
  if (out.categoryCandidatesGenerated <= 0) {
    console.error("[pvalid] FIRST ZERO: Category candidates generated");
    process.exit(12);
  }
  if (out.recommendationsGenerated <= 0) {
    console.error("[pvalid] FIRST ZERO: Recommendations generated");
    process.exit(13);
  }
}

main().catch((error) => {
  console.error("[pvalid] scan failed:", error);
  process.exit(1);
});
