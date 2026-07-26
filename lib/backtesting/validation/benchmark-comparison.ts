import { roundMetric } from "@/lib/analytics";
import {
  BENCHMARK_LABELS,
  type BenchmarkComparisonRow,
  type BenchmarkDefinition,
  type BenchmarkId,
  type ValidationTradeRecord,
} from "@/lib/backtesting/validation/types";
import {
  closedTradesOnly,
  toStats,
  totalReturnPercent,
} from "@/lib/backtesting/validation/metrics";

/**
 * Deterministic demo benchmark cumulative return series.
 * Architecture supports adding providers later without UI changes.
 */
export const DEMO_BENCHMARKS: readonly BenchmarkDefinition[] = [
  {
    id: "nifty_50",
    label: BENCHMARK_LABELS.nifty_50,
    series: [
      { at: "2026-01-02T03:45:00.000Z", value: 0 },
      { at: "2026-01-15T03:45:00.000Z", value: 1.8 },
      { at: "2026-02-09T03:45:00.000Z", value: 2.4 },
    ],
  },
  {
    id: "nifty_100",
    label: BENCHMARK_LABELS.nifty_100,
    series: [
      { at: "2026-01-02T03:45:00.000Z", value: 0 },
      { at: "2026-01-15T03:45:00.000Z", value: 2.1 },
      { at: "2026-02-09T03:45:00.000Z", value: 2.9 },
    ],
  },
  {
    id: "nifty_500",
    label: BENCHMARK_LABELS.nifty_500,
    series: [
      { at: "2026-01-02T03:45:00.000Z", value: 0 },
      { at: "2026-01-15T03:45:00.000Z", value: 2.6 },
      { at: "2026-02-09T03:45:00.000Z", value: 3.3 },
    ],
  },
];

function benchmarkReturnAt(
  definition: BenchmarkDefinition,
  asOf: string
): number {
  let value = definition.series[0]?.value ?? 0;
  for (const point of definition.series) {
    if (point.at <= asOf) value = point.value;
    else break;
  }
  return value;
}

export function compareAgainstBenchmarks(
  trades: readonly ValidationTradeRecord[],
  benchmarks: readonly BenchmarkDefinition[] = DEMO_BENCHMARKS
): BenchmarkComparisonRow[] {
  const closed = closedTradesOnly(trades);
  const strategyReturn = totalReturnPercent(closed);
  const stats = toStats(closed);
  const asOf =
    closed.length > 0
      ? [...closed].sort((a, b) =>
          (b.exitAt as string).localeCompare(a.exitAt as string)
        )[0].exitAt!
      : benchmarks[0]?.series[benchmarks[0].series.length - 1]?.at ??
        new Date(0).toISOString();

  return benchmarks.map((benchmark) => {
    const benchReturn = benchmarkReturnAt(benchmark, asOf);
    return {
      benchmarkId: benchmark.id,
      benchmarkLabel: benchmark.label,
      benchmarkReturn: roundMetric(benchReturn, 2),
      strategyReturn: roundMetric(strategyReturn, 2),
      excessReturn: roundMetric(strategyReturn - benchReturn, 2),
      strategyWinRate: roundMetric(stats.winRate, 1),
      sampleSize: closed.length,
    };
  });
}

export function listBenchmarkIds(): BenchmarkId[] {
  return DEMO_BENCHMARKS.map((b) => b.id);
}
