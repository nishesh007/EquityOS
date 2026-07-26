/**
 * Per-strategy recommendation stage counters for production diagnostics.
 */

import type { OpportunityEngineState } from "@/lib/opportunity-engine/types";
import {
  getPersistenceSource,
  peekMemoryPersistedData,
} from "@/lib/opportunity-engine/persistence";
import { INSTITUTIONAL_STRATEGY_IDS } from "@/lib/recommendations/horizons/ids";
import { runHorizonPipelines } from "@/lib/recommendations/horizons/pipeline";
import { selectInstitutionalStrategyDashboard } from "@/lib/recommendations/institutional-strategy-dashboard";
import type { SharedRecommendation } from "@/lib/recommendations/shared-recommendation";
import type { InstitutionalStrategySlot } from "@/lib/recommendations/institutional-strategy-dashboard";

export interface StrategyStageCounts {
  strategyId: string;
  persistenceLoaded: number;
  afterHydration: number;
  storePool: number;
  horizonRows: number;
  apiSharedMatching: number;
  slotRecommendationCount: number;
  pickRendered: number;
}

export interface RecommendationStageReport {
  persistenceSource: string;
  persistenceCategoryTotal: number;
  hydrationCategoryTotal: number;
  apiSharedTotal: number;
  slotsWithPick: number;
  firstZeroStage:
    | "persistence"
    | "hydration"
    | "api"
    | "dashboard"
    | "render"
    | null;
  byStrategy: StrategyStageCounts[];
}

function categoryTotal(state: OpportunityEngineState | null | undefined): number {
  if (!state?.categories) return 0;
  return Object.values(state.categories).reduce((n, list) => n + list.length, 0);
}

export function buildRecommendationStageReport(
  state: OpportunityEngineState,
  apiRecommendations: SharedRecommendation[],
  slots: InstitutionalStrategySlot[]
): RecommendationStageReport {
  const persisted = peekMemoryPersistedData()?.state ?? null;
  const persistenceCategoryTotal = categoryTotal(persisted);
  const hydrationCategoryTotal = categoryTotal(state);
  const horizons = runHorizonPipelines(state);

  const byStrategy: StrategyStageCounts[] = INSTITUTIONAL_STRATEGY_IDS.map(
    (strategyId) => {
      const slot = slots.find((s) => s.strategyId === strategyId);
      const horizonRows = horizons[strategyId]?.length ?? 0;
      const apiSharedMatching = apiRecommendations.filter(
        (r) => r.primaryStrategyId === strategyId
      ).length;

      return {
        strategyId,
        persistenceLoaded: persistenceCategoryTotal,
        afterHydration: hydrationCategoryTotal,
        storePool: hydrationCategoryTotal,
        horizonRows,
        apiSharedMatching,
        slotRecommendationCount: slot?.recommendationCount ?? 0,
        pickRendered: slot?.pick != null ? 1 : 0,
      };
    }
  );

  const slotsWithPick = slots.filter((s) => s.pick != null).length;
  let firstZeroStage: RecommendationStageReport["firstZeroStage"] = null;
  if (persistenceCategoryTotal === 0) firstZeroStage = "persistence";
  else if (hydrationCategoryTotal === 0) firstZeroStage = "hydration";
  else if (apiRecommendations.length === 0 && slotsWithPick === 0)
    firstZeroStage = "dashboard";
  else if (slotsWithPick === 0) firstZeroStage = "dashboard";
  else if (slotsWithPick === 0) firstZeroStage = "render";

  return {
    persistenceSource: getPersistenceSource(),
    persistenceCategoryTotal,
    hydrationCategoryTotal,
    apiSharedTotal: apiRecommendations.length,
    slotsWithPick,
    firstZeroStage,
    byStrategy,
  };
}

export function logRecommendationStageReport(
  label: string,
  report: RecommendationStageReport
): void {
  console.info(
    `[RecommendationStages] ${label}`,
    JSON.stringify({
      persistenceSource: report.persistenceSource,
      persistenceCategoryTotal: report.persistenceCategoryTotal,
      hydrationCategoryTotal: report.hydrationCategoryTotal,
      apiSharedTotal: report.apiSharedTotal,
      slotsWithPick: report.slotsWithPick,
      firstZeroStage: report.firstZeroStage,
      byStrategy: report.byStrategy,
    })
  );
}

/** Convenience: build slots + report from state/api list. */
export function reportRecommendationStages(
  label: string,
  state: OpportunityEngineState,
  apiRecommendations: SharedRecommendation[],
  shared?: Parameters<typeof selectInstitutionalStrategyDashboard>[1]
): {
  slots: InstitutionalStrategySlot[];
  report: RecommendationStageReport;
} {
  const slots = selectInstitutionalStrategyDashboard(state, shared);
  const report = buildRecommendationStageReport(
    state,
    apiRecommendations,
    slots
  );
  logRecommendationStageReport(label, report);
  return { slots, report };
}
