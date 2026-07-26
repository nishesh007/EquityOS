/**
 * Deterministic performance + institutional scoring + improvements + deployment.
 */

import type {
  BuiltStrategy,
  DeploymentChecklistItem,
  DeploymentReadiness,
  DeploymentStatus,
  ImprovementSuggestion,
  StrategyGrade,
  StrategyPerformance,
  StrategyScores,
} from "./types";
import { clamp, hashString, round, seededUnit } from "./utils";

export function simulatePerformance(
  strategy: Pick<BuiltStrategy, "id" | "name" | "blocks" | "rules" | "tags">
): StrategyPerformance {
  const seed = hashString(`${strategy.id}|${strategy.name}|${strategy.rules.stopLossPct}`);
  const u = (s: number) => seededUnit(seed, s);

  const rr = Math.max(
    0.8,
    strategy.rules.targetPct / Math.max(0.5, strategy.rules.stopLossPct)
  );
  const regimeBoost =
    strategy.blocks.marketRegime === "Bull"
      ? 1.08
      : strategy.blocks.marketRegime === "Bear"
        ? 0.88
        : strategy.blocks.marketRegime === "High Volatility"
          ? 0.92
          : 1;

  const winRate = clamp(42 + u(1) * 28 + (rr - 1.5) * 4, 35, 72);
  const profitFactor = clamp(0.9 + u(2) * 1.4 + (rr - 1) * 0.15, 0.85, 2.8);
  const sharpe = clamp(0.4 + u(3) * 1.6 * regimeBoost, 0.2, 2.4);
  const sortino = clamp(sharpe * (1.1 + u(4) * 0.4), 0.3, 3.2);
  const maxDrawdown = clamp(8 + u(5) * 18 - (strategy.rules.positionSizePct < 4 ? 2 : 0), 5, 32);
  const historicalReturn = clamp(
    (profitFactor - 1) * 22 * regimeBoost + u(6) * 12,
    -8,
    48
  );
  const cagr = clamp(historicalReturn * 0.85 + u(7) * 3, -10, 42);
  const expectancy = round((winRate / 100) * rr - (1 - winRate / 100) * 1, 3);
  const averageHoldingDays = round(
    (strategy.rules.holdingMinDays + strategy.rules.holdingMaxDays) / 2 +
      (u(8) - 0.5) * 2,
    1
  );
  const tradeCount = Math.round(40 + u(9) * 160);

  return {
    historicalReturn: round(historicalReturn),
    winRate: round(winRate, 1),
    profitFactor: round(profitFactor, 2),
    sharpe: round(sharpe, 2),
    sortino: round(sortino, 2),
    maxDrawdown: round(maxDrawdown, 1),
    expectancy: round(expectancy, 3),
    averageHoldingDays,
    riskReward: round(rr, 2),
    cagr: round(cagr, 1),
    tradeCount,
  };
}

function gradeFromScore(overall: number): StrategyGrade {
  if (overall >= 90) return "A+";
  if (overall >= 80) return "A";
  if (overall >= 65) return "B";
  if (overall >= 50) return "C";
  return "D";
}

export function calculateScores(
  strategy: Pick<BuiltStrategy, "blocks" | "rules" | "tags">,
  performance: StrategyPerformance
): StrategyScores {
  const tech =
    40 +
    strategy.blocks.technicalIndicators.length * 8 +
    strategy.blocks.momentumFilters.length * 6 +
    (performance.sharpe >= 1 ? 12 : 0);
  const fund =
    35 +
    strategy.blocks.fundamentalFilters.length * 10 +
    strategy.blocks.valuationFilters.length * 8;
  const risk =
    70 -
    performance.maxDrawdown * 1.2 +
    (strategy.rules.positionSizePct <= 5 ? 8 : 0) +
    (strategy.rules.stopLossPct <= 6 ? 6 : 0);
  const consistency =
    performance.winRate * 0.55 + performance.profitFactor * 12;
  const robustness =
    50 +
    (strategy.blocks.volumeFilters.length > 0 ? 10 : 0) +
    (strategy.blocks.riskRules.length > 1 ? 8 : 0) +
    (performance.tradeCount >= 80 ? 12 : 4);
  const optimization =
    45 + performance.sharpe * 15 + (performance.riskReward >= 1.8 ? 10 : 0);
  const walkForward =
    40 +
    performance.profitFactor * 12 +
    (performance.maxDrawdown < 15 ? 15 : 0);
  const monteCarlo =
    42 +
    (100 - performance.maxDrawdown) * 0.25 +
    performance.sortino * 8;

  const technical = clamp(round(tech), 0, 100);
  const fundamental = clamp(round(fund), 0, 100);
  const riskScore = clamp(round(risk), 0, 100);
  const consistencyScore = clamp(round(consistency), 0, 100);
  const robustnessScore = clamp(round(robustness), 0, 100);
  const optimizationScore = clamp(round(optimization), 0, 100);
  const walkForwardScore = clamp(round(walkForward), 0, 100);
  const monteCarloScore = clamp(round(monteCarlo), 0, 100);

  const overall = clamp(
    round(
      technical * 0.14 +
        fundamental * 0.1 +
        riskScore * 0.16 +
        consistencyScore * 0.14 +
        robustnessScore * 0.12 +
        optimizationScore * 0.12 +
        walkForwardScore * 0.12 +
        monteCarloScore * 0.1
    ),
    0,
    100
  );

  return {
    overall,
    technical,
    fundamental,
    risk: riskScore,
    consistency: consistencyScore,
    robustness: robustnessScore,
    optimization: optimizationScore,
    walkForward: walkForwardScore,
    monteCarlo: monteCarloScore,
    grade: gradeFromScore(overall),
  };
}

export function generateImprovements(
  strategy: Pick<BuiltStrategy, "id" | "blocks" | "rules" | "performance" | "scores">
): ImprovementSuggestion[] {
  const suggestions: ImprovementSuggestion[] = [];
  const p = strategy.performance;
  const r = strategy.rules;
  const b = strategy.blocks;

  if (b.marketRegime === "Sideways" || p.maxDrawdown > 18) {
    suggestions.push({
      id: `${strategy.id}-trend`,
      title: "Increase Trend Filter",
      detail: "Require ADX ≥ 20 or price above 50 EMA before entries.",
      confidence: clamp(55 + (p.maxDrawdown - 10), 50, 92),
      category: "Trend",
    });
  }
  if (r.stopLossPct > 8 || p.maxDrawdown > 16) {
    suggestions.push({
      id: `${strategy.id}-stop`,
      title: "Reduce Stop Loss",
      detail: `Tighten stop from ${r.stopLossPct}% toward ATR-based risk.`,
      confidence: clamp(60 + r.stopLossPct, 55, 90),
      category: "Risk",
    });
  }
  if (p.riskReward < 1.8) {
    suggestions.push({
      id: `${strategy.id}-target`,
      title: "Increase Target",
      detail: `Raise target above ${r.targetPct}% to improve risk/reward.`,
      confidence: clamp(70 - p.riskReward * 10, 55, 88),
      category: "Targets",
    });
  }
  if (r.positionSizePct > 6 || p.maxDrawdown > 20) {
    suggestions.push({
      id: `${strategy.id}-size`,
      title: "Lower Position Size",
      detail: `Reduce size from ${r.positionSizePct}% to improve drawdown path.`,
      confidence: clamp(58 + r.positionSizePct * 2, 55, 93),
      category: "Sizing",
    });
  }
  if (b.volumeFilters.length === 0) {
    suggestions.push({
      id: `${strategy.id}-vol`,
      title: "Increase Volume Filter",
      detail: "Require relative volume ≥ 1.5× or ADV liquidity gate.",
      confidence: 78,
      category: "Volume",
    });
  }
  if (b.marketRegime === "Any" && p.winRate < 50) {
    suggestions.push({
      id: `${strategy.id}-regime`,
      title: "Avoid Sideways Markets",
      detail: "Gate entries when ADX < 18 or index range-bound.",
      confidence: 74,
      category: "Regime",
    });
  }
  if (p.maxDrawdown > 15) {
    suggestions.push({
      id: `${strategy.id}-dd`,
      title: "Reduce Drawdown",
      detail: "Add portfolio heat cap and correlate position limits.",
      confidence: clamp(50 + p.maxDrawdown, 55, 94),
      category: "Drawdown",
    });
  }
  if (p.profitFactor < 1.4) {
    suggestions.push({
      id: `${strategy.id}-pf`,
      title: "Improve Profit Factor",
      detail: "Cut low-quality setups; raise minimum RR to 1.8.",
      confidence: clamp(80 - p.profitFactor * 15, 55, 90),
      category: "Profit Factor",
    });
  }

  return suggestions.slice(0, 6);
}

function item(
  id: string,
  label: string,
  passed: boolean,
  detail: string,
  required = true
): DeploymentChecklistItem {
  return { id, label, passed, detail, required };
}

export function buildDeploymentReadiness(
  strategy: Pick<BuiltStrategy, "performance" | "scores">
): DeploymentReadiness {
  const p = strategy.performance;
  const s = strategy.scores;
  const items: DeploymentChecklistItem[] = [
    item(
      "backtest",
      "Historical Backtest",
      p.tradeCount >= 30,
      p.tradeCount >= 30
        ? `${p.tradeCount} simulated trades available`
        : "Insufficient trade history (< 30)"
    ),
    item(
      "optimization",
      "Optimization",
      s.optimization >= 55,
      `Optimization score ${s.optimization}/100 (link to Sprint 11C)`
    ),
    item(
      "walk-forward",
      "Walk Forward",
      s.walkForward >= 55,
      `Walk-forward score ${s.walkForward}/100`
    ),
    item(
      "monte-carlo",
      "Monte Carlo",
      s.monteCarlo >= 55,
      `Monte Carlo score ${s.monteCarlo}/100`
    ),
    item(
      "risk",
      "Risk Validation",
      p.maxDrawdown <= 20 && s.risk >= 50,
      `Max DD ${p.maxDrawdown}% · risk score ${s.risk}`
    ),
    item(
      "trades",
      "Minimum Trade Count",
      p.tradeCount >= 50,
      `${p.tradeCount} trades (need ≥ 50)`
    ),
    item(
      "pf",
      "Minimum Profit Factor",
      p.profitFactor >= 1.25,
      `PF ${p.profitFactor} (need ≥ 1.25)`
    ),
    item(
      "wr",
      "Minimum Win Rate",
      p.winRate >= 45,
      `Win rate ${p.winRate}% (need ≥ 45%)`
    ),
    item(
      "dd",
      "Maximum Drawdown",
      p.maxDrawdown <= 18,
      `Drawdown ${p.maxDrawdown}% (cap 18%)`
    ),
  ];

  const required = items.filter((i) => i.required);
  const passed = required.filter((i) => i.passed).length;
  const ratio = passed / required.length;

  let status: DeploymentStatus;
  if (ratio >= 0.85 && s.overall >= 70) status = "Ready";
  else if (ratio >= 0.55) status = "Needs Improvement";
  else status = "Not Ready";

  return {
    items,
    status,
    summary: `${passed}/${required.length} checks passed · ${status}`,
  };
}

export function evaluateStrategyBundle(
  draft: Omit<
    BuiltStrategy,
    "performance" | "scores" | "improvements" | "deployment"
  >
): BuiltStrategy {
  const performance = simulatePerformance(draft);
  const scores = calculateScores(draft, performance);
  const partial = { ...draft, performance, scores };
  const improvements = generateImprovements(partial);
  const deployment = buildDeploymentReadiness(partial);
  return {
    ...draft,
    performance,
    scores,
    improvements,
    deployment,
  };
}
