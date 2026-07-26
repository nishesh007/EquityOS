/**
 * Walk-Forward Validation engine — train on past, test on unseen future only.
 */

import {
  buildWalkForwardSplits,
  validateWalkForwardConfig,
} from "./data-split";
import { annotateCycleNarrative, generateWalkForwardInsights } from "./insights";
import { logOptimization } from "../logger";
import {
  evaluateOutOfSampleWindow,
  selectBestTrainingParameters,
} from "./metrics";
import { evaluatePassFail } from "./pass-fail";
import {
  buildWalkForwardDashboard,
  computeStabilityAnalysis,
} from "./robustness";
import type {
  WalkForwardConfig,
  WalkForwardCycleResult,
  WalkForwardSession,
} from "./types";
import { DEFAULT_WALK_FORWARD_CONFIG } from "./types";

export type WalkForwardControl = "running" | "cancelled";

function createId(): string {
  return `wfv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createWalkForwardSession(input: {
  strategyId: string;
  strategyName: string;
  config?: Partial<WalkForwardConfig>;
  optimizationSessionId?: string | null;
}): WalkForwardSession {
  return {
    id: createId(),
    createdAt: new Date().toISOString(),
    completedAt: null,
    status: "Idle",
    strategyId: input.strategyId,
    strategyName: input.strategyName,
    optimizationSessionId: input.optimizationSessionId ?? null,
    config: { ...DEFAULT_WALK_FORWARD_CONFIG, ...input.config },
    splits: [],
    cycles: [],
    dashboard: null,
    stability: null,
    progressPercent: 0,
    message: null,
    error: null,
  };
}

export async function runWalkForwardValidation(input: {
  strategyId: string;
  strategyName: string;
  config: WalkForwardConfig;
  optimizationSessionId?: string | null;
  /** Candidate parameter sets from optimization leaderboard (training selection only). */
  candidates?: Array<{
    values: Record<string, number | boolean | string>;
    labels: Record<string, string>;
  }>;
  onProgress?: (session: WalkForwardSession) => void;
  getControl?: () => WalkForwardControl;
}): Promise<WalkForwardSession> {
  let session = createWalkForwardSession({
    strategyId: input.strategyId,
    strategyName: input.strategyName,
    config: input.config,
    optimizationSessionId: input.optimizationSessionId,
  });

  const configError = validateWalkForwardConfig(input.config);
  if (configError) {
    session = {
      ...session,
      status: "Failed",
      error: configError,
      message: configError,
      completedAt: new Date().toISOString(),
    };
    input.onProgress?.(session);
    return session;
  }

  const { splits, error } = buildWalkForwardSplits(input.config);
  if (error || splits.length === 0) {
    session = {
      ...session,
      status: "Failed",
      error: error ?? "No splits produced.",
      message: error ?? "No splits produced.",
      completedAt: new Date().toISOString(),
    };
    input.onProgress?.(session);
    return session;
  }

  session = {
    ...session,
    status: "Running",
    splits,
    message: `Running ${splits.length} walk-forward cycles (${input.config.method}).`,
    progressPercent: 0,
  };
  input.onProgress?.(session);
  logOptimization("info", "walk_forward_started", {
    sessionId: session.id,
    cycles: splits.length,
    method: input.config.method,
  });

  const cycles: WalkForwardCycleResult[] = [];

  for (let i = 0; i < splits.length; i += 1) {
    if (input.getControl?.() === "cancelled") {
      session = {
        ...session,
        status: "Cancelled",
        cycles,
        progressPercent: Math.round((i / splits.length) * 100),
        message: "Walk-forward validation cancelled.",
        completedAt: new Date().toISOString(),
      };
      input.onProgress?.(session);
      logOptimization("warn", "walk_forward_cancelled", {
        sessionId: session.id,
        completedCycles: cycles.length,
      });
      return session;
    }

    const split = splits[i]!;

    try {
      // TRAIN — select best params on training window only
      const selected = selectBestTrainingParameters({
        strategyId: input.strategyId,
        candidates: input.candidates ?? [],
        trainingStart: split.training.start,
        trainingEnd: split.training.end,
        trainingBars: split.training.barCount,
      });

      // FREEZE + TEST — evaluate frozen params on unseen testing window
      const oos = evaluateOutOfSampleWindow({
        strategyId: input.strategyId,
        parameters: selected.values,
        testingStart: split.testing.start,
        testingEnd: split.testing.end,
        testingBars: split.testing.barCount,
        trainQuality: selected.trainQuality,
      });

      const passFail = evaluatePassFail(oos.metrics, input.config);
      let cycle: WalkForwardCycleResult = {
        id: `${session.id}-c${split.cycle}`,
        cycle: split.cycle,
        training: split.training,
        testing: split.testing,
        parameters: selected.values,
        parameterLabels: selected.labels,
        metrics: oos.metrics,
        monthlyReturns: oos.monthlyReturns,
        equityCurve: oos.equityCurve,
        drawdownCurve: oos.drawdownCurve,
        status: passFail.status,
        failedRules: passFail.rules.filter((r) => !r.passed),
        strengths: [],
        weaknesses: [],
        aiCommentary: "",
        suggestions: [],
      };
      cycle = { ...cycle, ...annotateCycleNarrative(cycle) };
      cycles.push(cycle);
    } catch {
      cycles.push({
        id: `${session.id}-c${split.cycle}-err`,
        cycle: split.cycle,
        training: split.training,
        testing: split.testing,
        parameters: {},
        parameterLabels: {},
        metrics: {
          totalTrades: 0,
          winRate: 0,
          profitFactor: 0,
          sharpe: 0,
          sortino: 0,
          maxDrawdown: 0,
          avgReturn: 0,
          cagr: 0,
          expectancy: 0,
          riskReward: 0,
          recoveryFactor: 0,
          calmarRatio: 0,
          totalReturn: 0,
        },
        monthlyReturns: [],
        equityCurve: [100],
        drawdownCurve: [0],
        status: "Failed",
        failedRules: [
          {
            id: "exception",
            label: "Unexpected evaluation exception",
            passed: false,
            actual: 0,
            threshold: 1,
            comparator: ">=",
          },
        ],
        strengths: [],
        weaknesses: ["Cycle failed due to an unexpected evaluation error."],
        aiCommentary: `Cycle ${split.cycle} failed unexpectedly.`,
        suggestions: ["Re-run validation or narrow the testing window."],
      });
    }

    session = {
      ...session,
      cycles: [...cycles],
      progressPercent: Math.round(((i + 1) / splits.length) * 100),
      message: `Completed cycle ${i + 1} / ${splits.length}`,
    };
    input.onProgress?.(session);
    await Promise.resolve();
  }

  const stability = computeStabilityAnalysis(cycles);
  const dashboardBase = buildWalkForwardDashboard(cycles, []);
  const insights = generateWalkForwardInsights({
    cycles,
    robustness: dashboardBase.robustness,
    stability,
  });
  const dashboard = { ...dashboardBase, insights };

  session = {
    ...session,
    status: "Completed",
    cycles,
    stability,
    dashboard,
    progressPercent: 100,
    message: `Walk-forward complete · robustness ${dashboard.robustness.score} (${dashboard.overallGrade})`,
    completedAt: new Date().toISOString(),
    error: null,
  };
  input.onProgress?.(session);
  logOptimization("info", "walk_forward_completed", {
    sessionId: session.id,
    cycles: cycles.length,
    robustness: dashboard.robustness.score,
  });
  return session;
}
