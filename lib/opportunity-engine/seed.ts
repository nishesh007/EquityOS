/**
 * One-time Opportunity Engine → PostgreSQL seed.
 * Forces a full institutional scan even on weekends / market closed.
 */

import { countCategoryCandidates } from "@/lib/opportunity-engine/pipeline-telemetry";
import {
  ensurePersistedDataHydrated,
  isPostgresPersistenceEnabled,
  persistEngineDataAsync,
  peekMemoryPersistedData,
  resetPersistenceMemoryForTests,
} from "@/lib/opportunity-engine/persistence";
import { ensureOpportunityEngineHydrated, resetOpportunityEngineStoreForTests } from "@/lib/opportunity-engine/store";
import { selectInstitutionalStrategyDashboard } from "@/lib/recommendations/institutional-strategy-dashboard";
import { selectRecommendationsWithFallback } from "@/lib/recommendations/shared-recommendation";
import { INSTITUTIONAL_STRATEGY_IDS } from "@/lib/recommendations/horizons/ids";

export interface OpportunityEngineSeedSummary {
  recommendationsGenerated: number;
  categoryCandidatesGenerated: number;
  savedToPostgreSQL: number;
  hydratedFromPostgreSQL: number;
  apiReturned: number;
  slotsWithPick: number;
  byStrategy: Record<string, { recommendationCount: number; hasPick: boolean }>;
  symbolsScanned: number;
  durationMs: number;
  lastScannedAt: string | null;
  tradingDate: string | null;
  savedToPostgres: boolean;
  persistenceSourceAfterHydrate: string;
}

function countGenerated(state: {
  categories: Record<string, unknown[]>;
  recommendations?: unknown[];
}): number {
  const shared = selectRecommendationsWithFallback(state as never);
  return shared.length;
}

/**
 * Run forced OE scan, await Postgres persist, clear memory, re-hydrate, verify API projection.
 */
export async function seedOpportunityEngineToPostgres(): Promise<OpportunityEngineSeedSummary> {
  if (!isPostgresPersistenceEnabled()) {
    throw new Error(
      "DATABASE_URL is required to seed Opportunity Engine into PostgreSQL"
    );
  }

  const { runOpportunityScan } = await import("@/lib/opportunity-engine/engine");
  const started = Date.now();

  // force=true bypasses weekend / frozen guards.
  const scan = await runOpportunityScan(true);
  const generatedState = scan.state;
  const categoryCandidatesGenerated = countCategoryCandidates(
    generatedState.categories
  );
  const recommendationsGenerated = countGenerated(generatedState);

  const memory = peekMemoryPersistedData();
  if (!memory?.state) {
    throw new Error(
      "Scan completed but in-memory persistence is empty — cannot seed Postgres"
    );
  }

  const persistResult = await persistEngineDataAsync(memory);
  if (!persistResult.savedToPostgres) {
    throw new Error("Postgres persist did not confirm a write");
  }

  // Cold-start simulation: clear L1 + store, reload solely from PostgreSQL.
  resetPersistenceMemoryForTests();
  resetOpportunityEngineStoreForTests();
  const hydrated = await ensurePersistedDataHydrated();
  if (!hydrated?.state) {
    throw new Error("Hydrate from PostgreSQL returned empty state after seed");
  }

  const storeState = await ensureOpportunityEngineHydrated({ forceReload: true });
  const apiReturned = selectRecommendationsWithFallback(storeState).length;
  const slots = selectInstitutionalStrategyDashboard(storeState);
  const byStrategy = Object.fromEntries(
    INSTITUTIONAL_STRATEGY_IDS.map((id) => {
      const slot = slots.find((s) => s.strategyId === id);
      return [
        id,
        {
          recommendationCount: slot?.recommendationCount ?? 0,
          hasPick: slot?.pick != null,
        },
      ];
    })
  );

  const hydratedFromPostgreSQL = countGenerated(storeState);

  const summary: OpportunityEngineSeedSummary = {
    recommendationsGenerated,
    categoryCandidatesGenerated,
    // Whole OE state is written; report shared recommendation projection size.
    savedToPostgreSQL: recommendationsGenerated,
    hydratedFromPostgreSQL,
    apiReturned,
    slotsWithPick: slots.filter((s) => s.pick != null).length,
    byStrategy,
    symbolsScanned: scan.symbolsScanned,
    durationMs: Date.now() - started,
    lastScannedAt: storeState.lastScannedAt,
    tradingDate: storeState.tradingDate,
    savedToPostgres: true,
    persistenceSourceAfterHydrate: "postgres",
  };

  console.info(
    [
      `Recommendations generated: ${summary.recommendationsGenerated}`,
      `Category candidates generated: ${summary.categoryCandidatesGenerated}`,
      `Saved to PostgreSQL: ${summary.savedToPostgreSQL}`,
      `Hydrated from PostgreSQL: ${summary.hydratedFromPostgreSQL}`,
      `API returned: ${summary.apiReturned}`,
      `Slots with pick: ${summary.slotsWithPick}`,
      `Symbols scanned: ${summary.symbolsScanned}`,
      `Duration: ${summary.durationMs}ms`,
    ].join("\n")
  );

  return summary;
}

export function formatSeedSummary(summary: OpportunityEngineSeedSummary): string {
  return [
    `Recommendations generated: ${summary.recommendationsGenerated}`,
    `Saved to PostgreSQL: ${summary.savedToPostgreSQL}`,
    `Hydrated from PostgreSQL: ${summary.hydratedFromPostgreSQL}`,
    `API returned: ${summary.apiReturned}`,
  ].join("\n");
}
