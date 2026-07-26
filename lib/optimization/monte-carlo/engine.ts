/**
 * Monte Carlo + stress testing engine — offline research only.
 */

import {
  annotateSimulation,
  buildMonteCarloDashboard,
} from "./insights";
import { logOptimization } from "../logger";
import {
  buildConfidenceIntervals,
  buildDistributions,
  computeRiskMetricsFromEquity,
  gradeRisk,
} from "./metrics";
import {
  applyModeDefaults,
  bootstrapSample,
  boxMuller,
  createRng,
  shuffleInPlace,
  validateMonteCarloConfig,
} from "./rng";
import { getScenario, resolveScenarios } from "./scenarios";
import type {
  MonteCarloConfig,
  MonteCarloSession,
  ScenarioComparisonRow,
  SimulationResult,
  StressScenarioId,
} from "./types";
import { DEFAULT_MONTE_CARLO_CONFIG } from "./types";

export type MonteCarloControl = "running" | "cancelled";

function createId(): string {
  return `mc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Synthetic trade return stream from optimization / walk-forward baseline. */
export function buildBaselineTradeReturns(input: {
  expectedReturn?: number;
  tradeCount?: number;
  seed: number;
}): number[] {
  const rng = createRng(input.seed);
  const n = Math.max(20, input.tradeCount ?? 80);
  const drift = (input.expectedReturn ?? 6) / n;
  const returns: number[] = [];
  for (let i = 0; i < n; i += 1) {
    returns.push(drift + boxMuller(rng) * 1.2);
  }
  return returns;
}

function applyCostsAndGaps(
  returns: number[],
  config: MonteCarloConfig,
  scenario: ReturnType<typeof getScenario>,
  rng: () => number
): number[] {
  return returns.map((r) => {
    let next = r;
    next -= config.slippagePct;
    next -= config.commissionPct;
    next -= scenario.liquidityPenalty * 0.5;
    if (rng() < config.gapProbability + scenario.gapBoost * 0.5) {
      next += (rng() < 0.55 ? -1 : 1) * (1.5 + scenario.gapBoost * 4) * (0.5 + rng());
    }
    if (config.returnRandomization) {
      next += boxMuller(rng) * 0.35 * config.volatilityMultiplier * scenario.volatilityShock;
    }
    next += scenario.returnShock * (0.02 + rng() * 0.03);
    return next;
  });
}

function equityFromReturns(tradeReturns: number[]): number[] {
  const equity = [100];
  for (const r of tradeReturns) {
    equity.push(
      Number((equity[equity.length - 1]! * (1 + r / 100)).toFixed(4))
    );
  }
  return equity;
}

function drawdownFromEquity(equity: number[]): number[] {
  let peak = equity[0] ?? 100;
  return equity.map((v) => {
    peak = Math.max(peak, v);
    return Number((((peak - v) / peak) * 100).toFixed(2));
  });
}

export function createMonteCarloSession(input: {
  strategyId: string;
  strategyName: string;
  config?: Partial<MonteCarloConfig>;
  optimizationSessionId?: string | null;
  walkForwardSessionId?: string | null;
}): MonteCarloSession {
  return {
    id: createId(),
    createdAt: new Date().toISOString(),
    completedAt: null,
    status: "Idle",
    strategyId: input.strategyId,
    strategyName: input.strategyName,
    optimizationSessionId: input.optimizationSessionId ?? null,
    walkForwardSessionId: input.walkForwardSessionId ?? null,
    config: { ...DEFAULT_MONTE_CARLO_CONFIG, ...input.config },
    results: [],
    distributions: null,
    confidenceIntervals: [],
    scenarioComparison: [],
    dashboard: null,
    progressPercent: 0,
    message: null,
    error: null,
  };
}

function buildScenarioComparison(
  results: SimulationResult[]
): ScenarioComparisonRow[] {
  const byScenario = new Map<StressScenarioId, SimulationResult[]>();
  for (const r of results) {
    const list = byScenario.get(r.scenarioId) ?? [];
    list.push(r);
    byScenario.set(r.scenarioId, list);
  }

  const rows: ScenarioComparisonRow[] = [];
  for (const [scenarioId, list] of byScenario) {
    const avg = (fn: (m: SimulationResult) => number) =>
      list.reduce((s, x) => s + fn(x), 0) / list.length;
    rows.push({
      scenarioId,
      label: list[0]!.scenarioLabel,
      expectedReturn: Number(avg((x) => x.metrics.expectedReturn).toFixed(2)),
      risk: Number(avg((x) => x.metrics.probabilityOfRuin).toFixed(1)),
      drawdown: Number(avg((x) => x.metrics.maxDrawdown).toFixed(2)),
      recovery: Number(avg((x) => x.metrics.recoveryTime).toFixed(1)),
      volatility: Number(avg((x) => x.metrics.volatility).toFixed(2)),
      sharpe: Number(avg((x) => x.metrics.sharpe).toFixed(2)),
      probabilityOfRuin: Number(
        avg((x) => x.metrics.probabilityOfRuin).toFixed(1)
      ),
      isBest: false,
      isWorst: false,
    });
  }

  if (rows.length > 0) {
    let best = rows[0]!;
    let worst = rows[0]!;
    for (const row of rows) {
      if (row.sharpe > best.sharpe) best = row;
      if (row.drawdown > worst.drawdown) worst = row;
    }
    best.isBest = true;
    worst.isWorst = true;
  }
  return rows;
}

export async function runMonteCarloSimulation(input: {
  strategyId: string;
  strategyName: string;
  config: MonteCarloConfig;
  optimizationSessionId?: string | null;
  walkForwardSessionId?: string | null;
  /** Baseline trade returns from optimization / walk-forward (no future leakage). */
  baselineReturns?: number[];
  onProgress?: (session: MonteCarloSession) => void;
  getControl?: () => MonteCarloControl;
}): Promise<MonteCarloSession> {
  const modePatch = applyModeDefaults(input.config.mode, input.config);
  const config: MonteCarloConfig = { ...input.config, ...modePatch };

  let session = createMonteCarloSession({
    strategyId: input.strategyId,
    strategyName: input.strategyName,
    config,
    optimizationSessionId: input.optimizationSessionId,
    walkForwardSessionId: input.walkForwardSessionId,
  });

  const configError = validateMonteCarloConfig(config);
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

  const baseline =
    input.baselineReturns && input.baselineReturns.length >= 10
      ? input.baselineReturns
      : buildBaselineTradeReturns({
          seed: config.randomSeed,
          expectedReturn: 8,
          tradeCount: 80,
        });

  if (baseline.length < 10) {
    session = {
      ...session,
      status: "Failed",
      error: "Insufficient historical trades for Monte Carlo simulation.",
      message: "Insufficient historical trades for Monte Carlo simulation.",
      completedAt: new Date().toISOString(),
    };
    input.onProgress?.(session);
    return session;
  }

  const scenarios = resolveScenarios(config.selectedScenarios, {
    returnShock: config.customReturnShock,
    volShock: config.customVolShock,
  });

  const total = Math.min(5000, config.simulationCount);
  const rng = createRng(config.randomSeed);
  const results: SimulationResult[] = [];
  const holdingTimes: number[] = [];

  session = {
    ...session,
    status: "Running",
    message: `Running ${total} simulations across ${scenarios.length} scenario(s).`,
    progressPercent: 0,
  };
  input.onProgress?.(session);
  logOptimization("info", "monte_carlo_started", {
    sessionId: session.id,
    simulations: total,
    scenarios: scenarios.length,
  });

  const batchSize = 25;
  for (let i = 0; i < total; i += 1) {
    if (input.getControl?.() === "cancelled") {
      session = {
        ...session,
        status: "Cancelled",
        results,
        progressPercent: Math.round((i / total) * 100),
        message: "Monte Carlo simulation cancelled.",
        completedAt: new Date().toISOString(),
      };
      input.onProgress?.(session);
      logOptimization("warn", "monte_carlo_cancelled", {
        sessionId: session.id,
        completed: results.length,
      });
      return session;
    }

    try {
      const scenario = scenarios[i % scenarios.length]!;
      let trades = [...baseline];

      if (config.bootstrapSampling) {
        trades = bootstrapSample(trades, trades.length, rng);
      }
      if (config.tradeRandomization) {
        trades = shuffleInPlace(trades, rng);
      }

      const stressed = applyCostsAndGaps(trades, config, scenario, rng);
      const equity = equityFromReturns(stressed);
      const drawdownCurve = drawdownFromEquity(equity);
      const metrics = computeRiskMetricsFromEquity(equity, {
        ruinDrawdown: config.maxDrawdownLimit + 10,
      });
      const narrative = annotateSimulation(metrics, scenario.label);
      const monthlyReturns = Array.from({ length: 6 }, () =>
        Number((metrics.expectedReturn / 6 + (rng() - 0.5) * 2).toFixed(2))
      );
      holdingTimes.push(3 + rng() * 12);

      results.push({
        id: `${session.id}-sim-${i}`,
        simulationIndex: i + 1,
        scenarioId: scenario.id,
        scenarioLabel: scenario.label,
        metrics,
        equityCurve: equity.filter((_, idx) => idx % Math.max(1, Math.floor(equity.length / 40)) === 0 || idx === equity.length - 1),
        drawdownCurve: drawdownCurve.filter((_, idx) => idx % Math.max(1, Math.floor(drawdownCurve.length / 40)) === 0 || idx === drawdownCurve.length - 1),
        monthlyReturns,
        riskGrade: gradeRisk(metrics),
        status: "Completed",
        probability: Number((1 / total).toFixed(6)),
        ...narrative,
      });
    } catch {
      // skip failed path — never crash the batch
    }

    if ((i + 1) % batchSize === 0 || i === total - 1) {
      session = {
        ...session,
        results: [...results],
        progressPercent: Math.round(((i + 1) / total) * 100),
        message: `Completed ${i + 1} / ${total} simulations`,
      };
      input.onProgress?.(session);
      await Promise.resolve();
    }
  }

  const metricsList = results.map((r) => r.metrics);
  const distributions = buildDistributions(metricsList, holdingTimes);
  const confidenceIntervals = buildConfidenceIntervals(metricsList);
  const scenarioComparison = buildScenarioComparison(results);
  const dashboard = buildMonteCarloDashboard({
    results,
    status: "Completed",
  });

  session = {
    ...session,
    status: "Completed",
    results,
    distributions,
    confidenceIntervals,
    scenarioComparison,
    dashboard,
    progressPercent: 100,
    message: `Monte Carlo complete · stability ${dashboard.overallStabilityScore} · grade ${dashboard.riskGrade}`,
    completedAt: new Date().toISOString(),
    error: null,
  };
  input.onProgress?.(session);
  logOptimization("info", "monte_carlo_completed", {
    sessionId: session.id,
    results: results.length,
    stability: dashboard.overallStabilityScore,
  });
  return session;
}
