/**
 * Optimization progress engine — simulated async batches (no worker threads).
 */

import type {
  ConstraintDefinition,
  ParameterState,
} from "@/lib/optimization/types";
import { evaluateCombination } from "./evaluation";
import { rankResults } from "./ranking";
import { logOptimization } from "../logger";
import {
  estimateModeRuntimeSeconds,
  planSearchCombinations,
} from "./smart-search";
import { createSessionId } from "./session";
import type {
  OptimizationProgress,
  OptimizationResult,
  OptimizationSession,
  ParameterCombination,
  RankingMetric,
  RankingMode,
  RunnerControl,
  SearchMode,
  SmartSearchIntensity,
} from "./types";

export type { RunnerControl };

export interface RunOptimizationInput {
  strategyId: string;
  strategyName: string;
  parameters: ParameterState[];
  constraints: ConstraintDefinition[];
  searchMode: SearchMode;
  smartIntensity: SmartSearchIntensity;
  rankingMode: RankingMode;
  primaryMetric: RankingMetric;
  maxCombinations?: number;
  batchSize?: number;
  onProgress: (session: OptimizationSession) => void;
  getControl: () => RunnerControl;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildProgress(
  partial: Partial<OptimizationProgress> &
    Pick<OptimizationProgress, "status" | "totalCombinations" | "currentIndex">
): OptimizationProgress {
  const remaining = Math.max(
    0,
    partial.totalCombinations - partial.currentIndex
  );
  const percent =
    partial.totalCombinations === 0
      ? 0
      : Math.min(
          100,
          Math.round((partial.currentIndex / partial.totalCombinations) * 100)
        );
  return {
    remaining,
    percent,
    evaluationsPerSecond: 0,
    estimatedSecondsRemaining: 0,
    currentCombinationLabel: "",
    memoryEstimateMb: Math.round(
      (partial.totalCombinations * 0.4 + partial.currentIndex * 0.15) * 10
    ) / 10,
    cpuEstimate:
      partial.totalCombinations > 2000
        ? "6–12 cores"
        : partial.totalCombinations > 500
          ? "2–6 cores"
          : "1–2 cores",
    ...partial,
  };
}

function labelCombination(combo: ParameterCombination): string {
  return Object.entries(combo.labels)
    .slice(0, 4)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ");
}

export function createPendingSession(input: {
  strategyId: string;
  strategyName: string;
  parameters: ParameterState[];
  constraints: ConstraintDefinition[];
  searchMode: SearchMode;
  smartIntensity: SmartSearchIntensity;
  rankingMode: RankingMode;
  primaryMetric: RankingMetric;
  maxCombinations?: number;
}): OptimizationSession {
  const combinations = planSearchCombinations({
    parameters: input.parameters,
    searchMode: input.searchMode,
    smartIntensity: input.smartIntensity,
    maxCombinations: input.maxCombinations,
  });
  const now = new Date().toISOString();
  return {
    id: createSessionId(),
    createdAt: now,
    completedAt: null,
    strategyId: input.strategyId,
    strategyName: input.strategyName,
    parameterCount: input.parameters.filter((p) => p.enabled).length,
    combinationCount: combinations.length,
    evaluatedCount: 0,
    searchMode: input.searchMode,
    smartIntensity: input.smartIntensity,
    rankingMode: input.rankingMode,
    primaryMetric: input.primaryMetric,
    status: "Pending",
    topScore: null,
    parameters: input.parameters.map((p) => ({ ...p })),
    constraints: input.constraints.map((c) => ({ ...c })),
    results: [],
    progress: buildProgress({
      status: "Pending",
      currentIndex: 0,
      totalCombinations: combinations.length,
      currentCombinationLabel: "Awaiting start",
      estimatedSecondsRemaining: estimateModeRuntimeSeconds(
        combinations.length,
        input.searchMode
      ),
      message: `Planned ${combinations.length.toLocaleString()} combinations (${input.searchMode}).`,
    }),
  };
}

/**
 * Run optimization in async batches — supports pause / resume / cancel via getControl.
 */
export async function runOptimizationEngine(
  input: RunOptimizationInput
): Promise<OptimizationSession> {
  const combinations = planSearchCombinations({
    parameters: input.parameters,
    searchMode: input.searchMode,
    smartIntensity: input.smartIntensity,
    maxCombinations: input.maxCombinations,
  });

  const batchSize = input.batchSize ?? 24;
  const started = performance.now();
  let session = createPendingSession({
    ...input,
    maxCombinations: input.maxCombinations,
  });
  // Align id/count with planned set
  session = {
    ...session,
    combinationCount: combinations.length,
    status: "Running",
    progress: buildProgress({
      status: "Running",
      currentIndex: 0,
      totalCombinations: combinations.length,
      currentCombinationLabel: "Starting…",
      message: "Optimization engine running (offline simulation).",
    }),
  };
  input.onProgress(session);
  logOptimization("info", "optimization_started", {
    sessionId: session.id,
    mode: input.searchMode,
    combinations: combinations.length,
    strategy: input.strategyName,
  });

  const collected: OptimizationResult[] = [];
  let index = 0;

  while (index < combinations.length) {
    const control = input.getControl();
    if (control === "cancelled") {
      session = {
        ...session,
        status: "Cancelled",
        evaluatedCount: index,
        results: rankResults(
          collected,
          input.rankingMode,
          input.primaryMetric
        ),
        topScore: collected[0]?.score ?? null,
        completedAt: new Date().toISOString(),
        progress: buildProgress({
          status: "Cancelled",
          currentIndex: index,
          totalCombinations: combinations.length,
          currentCombinationLabel: "Cancelled by user",
          message: "Session cancelled.",
        }),
      };
      input.onProgress(session);
      logOptimization("warn", "optimization_cancelled", {
        sessionId: session.id,
        evaluated: index,
      });
      return session;
    }

    if (control === "paused") {
      session = {
        ...session,
        status: "Paused",
        evaluatedCount: index,
        results: rankResults(
          collected,
          input.rankingMode,
          input.primaryMetric
        ),
        progress: {
          ...session.progress,
          status: "Paused",
          message: "Paused — resume to continue.",
        },
      };
      input.onProgress(session);
      await sleep(120);
      continue;
    }

    const end = Math.min(index + batchSize, combinations.length);
    for (let i = index; i < end; i += 1) {
      const combo = combinations[i]!;
      try {
        const result = evaluateCombination({
          combination: combo,
          strategyId: input.strategyId,
          strategyName: input.strategyName,
          parameters: input.parameters,
          constraints: input.constraints,
        });
        if (result) collected.push(result);

        // Smart search early prune of weak accumulations periodically.
        if (
          (input.searchMode === "smart" || input.searchMode === "quick") &&
          collected.length > 40 &&
          i % 80 === 0
        ) {
          collected.sort((a, b) => b.score - a.score);
          const keep = Math.ceil(collected.length * 0.75);
          collected.splice(keep);
        }
      } catch {
        // Skip failed combination — never crash the run.
      }
    }

    index = end;
    const elapsedSec = Math.max(0.001, (performance.now() - started) / 1000);
    const eps = index / elapsedSec;
    const remaining = combinations.length - index;
    const rankedPreview = rankResults(
      collected,
      input.rankingMode,
      input.primaryMetric
    );

    session = {
      ...session,
      status: "Running",
      evaluatedCount: index,
      results: rankedPreview,
      topScore: rankedPreview[0]?.score ?? null,
      progress: buildProgress({
        status: "Running",
        currentIndex: index,
        totalCombinations: combinations.length,
        evaluationsPerSecond: Number(eps.toFixed(1)),
        estimatedSecondsRemaining: Number((remaining / Math.max(eps, 1)).toFixed(1)),
        currentCombinationLabel: labelCombination(
          combinations[Math.min(index, combinations.length - 1)]!
        ),
        message: `Evaluated ${index.toLocaleString()} / ${combinations.length.toLocaleString()}`,
      }),
    };
    input.onProgress(session);
  await sleep(0);
  }

  const ranked = rankResults(
    collected,
    input.rankingMode,
    input.primaryMetric
  );

  session = {
    ...session,
    status: "Completed",
    completedAt: new Date().toISOString(),
    evaluatedCount: combinations.length,
    results: ranked,
    topScore: ranked[0]?.score ?? null,
    progress: buildProgress({
      status: "Completed",
      currentIndex: combinations.length,
      totalCombinations: combinations.length,
      evaluationsPerSecond: Number(
        (combinations.length / Math.max(0.001, (performance.now() - started) / 1000)).toFixed(1)
      ),
      estimatedSecondsRemaining: 0,
      currentCombinationLabel: "Complete",
      message:
        ranked.length === 0
          ? "No combinations passed constraints."
          : `Completed with ${ranked.length.toLocaleString()} valid results.`,
    }),
  };
  input.onProgress(session);
  logOptimization("info", "optimization_completed", {
    sessionId: session.id,
    results: ranked.length,
    topScore: ranked[0]?.score ?? null,
  });
  return session;
}
