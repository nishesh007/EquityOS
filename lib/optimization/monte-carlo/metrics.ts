import type {
  ConfidenceInterval,
  DistributionBucket,
  MonteCarloRiskMetrics,
  ProbabilityDistributions,
  RiskGrade,
} from "./types";

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - m) ** 2)));
}

function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = clamp((p / 100) * (sortedAsc.length - 1), 0, sortedAsc.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedAsc[lo]!;
  const w = idx - lo;
  return sortedAsc[lo]! * (1 - w) + sortedAsc[hi]! * w;
}

export function gradeRisk(metrics: MonteCarloRiskMetrics): RiskGrade {
  const score =
    40 +
    metrics.expectedReturn * 0.8 -
    metrics.maxDrawdown * 1.1 -
    metrics.probabilityOfRuin * 0.45 +
    metrics.sharpe * 10 +
    (metrics.calmar > 0 ? metrics.calmar * 4 : 0);
  if (score >= 75) return "A";
  if (score >= 60) return "B";
  if (score >= 45) return "C";
  if (score >= 30) return "D";
  return "F";
}

export function computeRiskMetricsFromEquity(
  equity: number[],
  opts?: { targetReturn?: number; ruinDrawdown?: number }
): MonteCarloRiskMetrics {
  const target = opts?.targetReturn ?? 8;
  const ruinDd = opts?.ruinDrawdown ?? 35;

  const returns: number[] = [];
  for (let i = 1; i < equity.length; i += 1) {
    const prev = equity[i - 1]!;
    const cur = equity[i]!;
    if (prev > 0) returns.push(((cur - prev) / prev) * 100);
  }

  let peak = equity[0] ?? 100;
  const drawdowns: number[] = [];
  let maxDd = 0;
  let recovery = 0;
  let inDrawdown = false;
  let ddStart = 0;

  for (let i = 0; i < equity.length; i += 1) {
    const v = equity[i]!;
    peak = Math.max(peak, v);
    const dd = peak > 0 ? ((peak - v) / peak) * 100 : 0;
    drawdowns.push(dd);
    maxDd = Math.max(maxDd, dd);
    if (dd > 0.5) {
      if (!inDrawdown) {
        inDrawdown = true;
        ddStart = i;
      }
    } else if (inDrawdown) {
      recovery = Math.max(recovery, i - ddStart);
      inDrawdown = false;
    }
  }

  const totalReturn =
    equity.length >= 2
      ? ((equity[equity.length - 1]! - equity[0]!) / equity[0]!) * 100
      : 0;
  const vol = stdev(returns);
  const avgRet = mean(returns);
  const downside = returns.filter((r) => r < 0);
  const downsideVol = stdev(downside.length ? downside : [0]);
  const sharpe = vol > 0 ? avgRet / vol : 0;
  const sortino = downsideVol > 0 ? avgRet / downsideVol : 0;
  const calmar = maxDd > 0 ? totalReturn / maxDd : 0;

  // Ulcer index
  const ulcer = Math.sqrt(mean(drawdowns.map((d) => d * d)));

  const sorted = [...returns].sort((a, b) => a - b);
  const var95 = -percentile(sorted, 5);
  const tail = sorted.slice(0, Math.max(1, Math.floor(sorted.length * 0.05)));
  const cvar = -mean(tail);

  const wins = returns.filter((r) => r > 0).length;
  const losses = returns.filter((r) => r < 0);
  const grossWin = returns.filter((r) => r > 0).reduce((a, b) => a + b, 0);
  const grossLoss = Math.abs(losses.reduce((a, b) => a + b, 0));
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 3 : 0;

  return {
    expectedReturn: Number(totalReturn.toFixed(2)),
    medianReturn: Number(percentile([...returns].sort((a, b) => a - b), 50).toFixed(2)),
    worstReturn: Number((sorted[0] ?? 0).toFixed(2)),
    bestReturn: Number((sorted[sorted.length - 1] ?? 0).toFixed(2)),
    maxDrawdown: Number(maxDd.toFixed(2)),
    averageDrawdown: Number(mean(drawdowns).toFixed(2)),
    recoveryTime: recovery,
    volatility: Number(vol.toFixed(2)),
    sharpe: Number(sharpe.toFixed(2)),
    sortino: Number(sortino.toFixed(2)),
    calmar: Number(calmar.toFixed(2)),
    ulcerIndex: Number(ulcer.toFixed(2)),
    var: Number(var95.toFixed(2)),
    cvar: Number(cvar.toFixed(2)),
    probabilityOfRuin: Number(clamp((maxDd / ruinDd) * 40 + (totalReturn < -10 ? 20 : 0), 0, 100).toFixed(1)),
    probabilityOfTarget: Number(
      clamp(50 + (totalReturn - target) * 2.5 - maxDd * 0.8, 0, 100).toFixed(1)
    ),
    profitFactor: Number(profitFactor.toFixed(2)),
    winRate: Number(
      (returns.length ? (wins / returns.length) * 100 : 0).toFixed(1)
    ),
  };
}

export function buildHistogram(
  values: number[],
  bins = 8
): DistributionBucket[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = max === min ? 1 : (max - min) / bins;
  const counts = Array.from({ length: bins }, () => 0);
  for (const v of values) {
    const idx = clamp(Math.floor((v - min) / width), 0, bins - 1);
    counts[idx]! += 1;
  }
  return counts.map((count, i) => {
    const lo = min + i * width;
    const hi = lo + width;
    return {
      label: `${lo.toFixed(1)}–${hi.toFixed(1)}`,
      value: Number(((lo + hi) / 2).toFixed(2)),
      count,
    };
  });
}

export function buildDistributions(
  metricsList: MonteCarloRiskMetrics[],
  holdingTimes: number[]
): ProbabilityDistributions {
  return {
    returns: buildHistogram(metricsList.map((m) => m.expectedReturn)),
    drawdowns: buildHistogram(metricsList.map((m) => m.maxDrawdown)),
    winRates: buildHistogram(metricsList.map((m) => m.winRate)),
    sharpes: buildHistogram(metricsList.map((m) => m.sharpe)),
    profitFactors: buildHistogram(metricsList.map((m) => m.profitFactor)),
    holdingTimes: buildHistogram(holdingTimes),
    risks: buildHistogram(metricsList.map((m) => m.probabilityOfRuin)),
  };
}

export function buildConfidenceIntervals(
  metricsList: MonteCarloRiskMetrics[]
): ConfidenceInterval[] {
  const levels = [50, 75, 90, 95, 99];
  const returns = metricsList.map((m) => m.expectedReturn).sort((a, b) => a - b);
  const dds = metricsList.map((m) => m.maxDrawdown).sort((a, b) => a - b);
  const pfs = metricsList.map((m) => m.profitFactor).sort((a, b) => a - b);
  const sharpes = metricsList.map((m) => m.sharpe).sort((a, b) => a - b);
  const lossProb =
    metricsList.length === 0
      ? 0
      : (metricsList.filter((m) => m.expectedReturn < 0).length /
          metricsList.length) *
        100;

  return levels.map((level) => {
    const tail = (100 - level) / 2;
    return {
      level,
      returnLow: Number(percentile(returns, tail).toFixed(2)),
      returnHigh: Number(percentile(returns, 100 - tail).toFixed(2)),
      drawdownLow: Number(percentile(dds, tail).toFixed(2)),
      drawdownHigh: Number(percentile(dds, 100 - tail).toFixed(2)),
      profitFactorLow: Number(percentile(pfs, tail).toFixed(2)),
      profitFactorHigh: Number(percentile(pfs, 100 - tail).toFixed(2)),
      sharpeLow: Number(percentile(sharpes, tail).toFixed(2)),
      sharpeHigh: Number(percentile(sharpes, 100 - tail).toFixed(2)),
      probabilityOfLoss: Number(lossProb.toFixed(1)),
    };
  });
}

export function aggregateStabilityScore(
  metricsList: MonteCarloRiskMetrics[]
): number {
  if (metricsList.length === 0) return 0;
  const avgRuin = mean(metricsList.map((m) => m.probabilityOfRuin));
  const avgDd = mean(metricsList.map((m) => m.maxDrawdown));
  const avgSharpe = mean(metricsList.map((m) => m.sharpe));
  const retVol = stdev(metricsList.map((m) => m.expectedReturn));
  return Number(
    clamp(70 - avgRuin * 0.35 - avgDd * 0.6 + avgSharpe * 8 - retVol * 0.4, 0, 100).toFixed(1)
  );
}
