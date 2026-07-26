/**
 * One-time OE → PostgreSQL seed (forced scan, works on weekends).
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/seed-opportunity-engine.mts
 *   npm run seed:opportunity-engine
 */

import {
  formatSeedSummary,
  seedOpportunityEngineToPostgres,
} from "../lib/opportunity-engine/seed.ts";

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  console.info("[seed] Starting forced Opportunity Engine scan → PostgreSQL…");
  const summary = await seedOpportunityEngineToPostgres();
  console.info("\n=== Seed Summary ===");
  console.info(formatSeedSummary(summary));
  console.info(
    JSON.stringify(
      {
        categoryCandidatesGenerated: summary.categoryCandidatesGenerated,
        slotsWithPick: summary.slotsWithPick,
        byStrategy: summary.byStrategy,
        symbolsScanned: summary.symbolsScanned,
        durationMs: summary.durationMs,
        lastScannedAt: summary.lastScannedAt,
        tradingDate: summary.tradingDate,
      },
      null,
      2
    )
  );

  if (summary.apiReturned <= 0 && summary.recommendationsGenerated <= 0) {
    console.error(
      "[seed] Completed but produced zero recommendations — check market data providers"
    );
    process.exit(2);
  }
}

main().catch((error) => {
  console.error("[seed] failed:", error);
  process.exit(1);
});
