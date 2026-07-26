import { compareAgainstBenchmarks } from "@/lib/backtesting/validation/benchmark-comparison";
import {
  buildConvictionCalibration,
} from "@/lib/backtesting/validation/confidence-calibration";
import { buildFailureAnalysis } from "@/lib/backtesting/validation/failure-analysis";
import {
  createEmptyValidationFilters,
  filterValidationTrades,
} from "@/lib/backtesting/validation/filters";
import { generateValidationInsights } from "@/lib/backtesting/validation/insights";
import { evaluateRecommendationQuality } from "@/lib/backtesting/validation/recommendation-validation";
import { compareByDimension } from "@/lib/backtesting/validation/strategy-comparison";
import { buildValidationUniverse } from "@/lib/backtesting/validation/enrichment";
import type {
  StrategyValidationReport,
  ValidationFilterState,
  ValidationTradeRecord,
} from "@/lib/backtesting/validation/types";

export function buildStrategyValidationReport(input: {
  trades?: readonly ValidationTradeRecord[];
  filters?: ValidationFilterState;
  now?: Date;
} = {}): StrategyValidationReport {
  const filters = input.filters ?? createEmptyValidationFilters();
  const universe = input.trades ?? buildValidationUniverse();
  const trades = filterValidationTrades(universe, filters);

  const strategyComparison = compareByDimension(trades, "strategy");
  const sectorComparison = compareByDimension(trades, "sector");
  const regimeComparison = compareByDimension(trades, "market_regime");
  const marketCapComparison = compareByDimension(trades, "market_cap");
  const universeComparison = compareByDimension(trades, "universe");
  const symbolComparison = compareByDimension(trades, "symbol");
  const recommendationValidation = evaluateRecommendationQuality(trades);
  const convictionBuckets = buildConvictionCalibration(trades);
  const failureAnalysis = buildFailureAnalysis(trades);
  const benchmarkComparison = compareAgainstBenchmarks(trades);
  const insights = generateValidationInsights({
    trades,
    strategyComparison,
    regimeComparison,
    recommendationValidation,
    convictionBuckets,
    failureAnalysis,
  });

  return {
    generatedAt: (input.now ?? new Date("2026-02-16T08:00:00.000Z")).toISOString(),
    filters,
    trades,
    strategyComparison,
    sectorComparison,
    regimeComparison,
    marketCapComparison,
    universeComparison,
    symbolComparison,
    recommendationValidation,
    convictionBuckets,
    failureAnalysis,
    benchmarkComparison,
    insights,
  };
}
