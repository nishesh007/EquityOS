import type {
  RobustnessScore,
  StabilityAnalysis,
  WalkForwardCycleResult,
  WalkForwardDashboard,
  WalkForwardGrade,
} from "./types";

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function variance(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return mean(values.map((v) => (v - m) ** 2));
}

function stdev(values: number[]): number {
  return Math.sqrt(variance(values));
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function gradeFromScore(score: number): WalkForwardGrade {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Strong";
  if (score >= 55) return "Moderate";
  if (score >= 40) return "Weak";
  return "Poor";
}

function stabilityFromVariance(values: number[], scale: number): number {
  if (values.length < 2) return 70;
  const cv = Math.abs(mean(values)) > 1e-6
    ? stdev(values) / Math.abs(mean(values))
    : stdev(values);
  return clamp(100 - cv * scale, 0, 100);
}

export function computeStabilityAnalysis(
  cycles: readonly WalkForwardCycleResult[]
): StabilityAnalysis {
  const evaluated = cycles.filter((c) => c.status !== "Insufficient Data");
  const winRates = evaluated.map((c) => c.metrics.winRate);
  const pfs = evaluated.map((c) => c.metrics.profitFactor);
  const sharpes = evaluated.map((c) => c.metrics.sharpe);
  const dds = evaluated.map((c) => c.metrics.maxDrawdown);
  const rets = evaluated.map((c) => c.metrics.totalReturn);

  const paramKeys = new Set<string>();
  for (const c of evaluated) {
    Object.keys(c.parameters).forEach((k) => paramKeys.add(k));
  }

  let paramStability = 80;
  if (evaluated.length >= 2 && paramKeys.size > 0) {
    let stableKeys = 0;
    for (const key of paramKeys) {
      const vals = evaluated.map((c) => String(c.parameters[key] ?? ""));
      const unique = new Set(vals).size;
      if (unique <= 2) stableKeys += 1;
    }
    paramStability = clamp((stableKeys / paramKeys.size) * 100, 0, 100);
  }

  const rollingPerformance = evaluated.map((c) => c.metrics.totalReturn);

  return {
    metricVariance: {
      winRate: Number(variance(winRates).toFixed(2)),
      profitFactor: Number(variance(pfs).toFixed(4)),
      sharpe: Number(variance(sharpes).toFixed(4)),
      maxDrawdown: Number(variance(dds).toFixed(2)),
      totalReturn: Number(variance(rets).toFixed(2)),
    },
    parameterStability: Number(paramStability.toFixed(1)),
    rollingPerformance,
    equityCurveStability: Number(
      stabilityFromVariance(
        evaluated.flatMap((c) => c.equityCurve.slice(-8)),
        40
      ).toFixed(1)
    ),
    drawdownStability: Number(stabilityFromVariance(dds, 55).toFixed(1)),
    returnConsistency: Number(stabilityFromVariance(rets, 45).toFixed(1)),
  };
}

export function computeRobustnessScore(
  cycles: readonly WalkForwardCycleResult[],
  stability: StabilityAnalysis
): RobustnessScore {
  const evaluated = cycles.filter((c) => c.status !== "Insufficient Data");
  const passed = evaluated.filter((c) => c.status === "Passed").length;
  const successRate =
    evaluated.length === 0 ? 0 : (passed / evaluated.length) * 100;

  const avgReturn = mean(evaluated.map((c) => c.metrics.totalReturn));
  const avgSharpe = mean(evaluated.map((c) => c.metrics.sharpe));
  const avgPf = mean(evaluated.map((c) => c.metrics.profitFactor));
  const avgDd = mean(evaluated.map((c) => c.metrics.maxDrawdown));

  const performanceConsistency = clamp(successRate, 0, 100);
  const drawdownStability = stability.drawdownStability;
  const profitStability = Number(
    stabilityFromVariance(
      evaluated.map((c) => c.metrics.profitFactor),
      60
    ).toFixed(1)
  );
  const winRateStability = Number(
    stabilityFromVariance(
      evaluated.map((c) => c.metrics.winRate),
      50
    ).toFixed(1)
  );
  const parameterStability = stability.parameterStability;
  const outOfSamplePerformance = clamp(
    40 + avgReturn * 1.5 + avgSharpe * 12 + (avgPf - 1) * 15,
    0,
    100
  );
  const riskConsistency = clamp(100 - avgDd * 2.2, 0, 100);

  const factors = {
    performanceConsistency: Number(performanceConsistency.toFixed(1)),
    drawdownStability: Number(drawdownStability.toFixed(1)),
    profitStability,
    winRateStability,
    parameterStability: Number(parameterStability.toFixed(1)),
    outOfSamplePerformance: Number(outOfSamplePerformance.toFixed(1)),
    riskConsistency: Number(riskConsistency.toFixed(1)),
  };

  const score = Number(
    (
      factors.performanceConsistency * 0.2 +
      factors.drawdownStability * 0.15 +
      factors.profitStability * 0.12 +
      factors.winRateStability * 0.12 +
      factors.parameterStability * 0.12 +
      factors.outOfSamplePerformance * 0.17 +
      factors.riskConsistency * 0.12
    ).toFixed(1)
  );

  return {
    score,
    grade: gradeFromScore(score),
    factors,
  };
}

export function buildWalkForwardDashboard(
  cycles: readonly WalkForwardCycleResult[],
  insights: string[]
): WalkForwardDashboard {
  const evaluated = cycles.filter((c) => c.status !== "Insufficient Data");
  const passed = cycles.filter((c) => c.status === "Passed").length;
  const failed = cycles.filter(
    (c) => c.status === "Failed" || c.status === "Insufficient Data"
  ).length;
  const stability = computeStabilityAnalysis(cycles);
  const robustness = computeRobustnessScore(cycles, stability);

  return {
    validationCycles: cycles.length,
    passedCycles: passed,
    failedCycles: failed,
    successRate:
      cycles.length === 0
        ? 0
        : Number(((passed / cycles.length) * 100).toFixed(1)),
    averageReturn: Number(
      mean(evaluated.map((c) => c.metrics.totalReturn)).toFixed(2)
    ),
    averageDrawdown: Number(
      mean(evaluated.map((c) => c.metrics.maxDrawdown)).toFixed(2)
    ),
    averageSharpe: Number(
      mean(evaluated.map((c) => c.metrics.sharpe)).toFixed(2)
    ),
    averageProfitFactor: Number(
      mean(evaluated.map((c) => c.metrics.profitFactor)).toFixed(2)
    ),
    robustness,
    overallGrade: robustness.grade,
    insights,
  };
}
