/**
 * Opportunity Engine → Strategy Platform adapter.
 *
 * Candidate market data is adapted to existing concrete strategy inputs. No
 * detection or recommendation logic is duplicated here.
 */

import { CATEGORY_STRATEGY_IDS } from "@/lib/opportunity-engine/pipeline-enrichment";
import type {
  OpportunityCandidate,
  OpportunityStrategySignal,
} from "@/lib/opportunity-engine/types";
import type { OhlcBar } from "@/lib/providers/types";
import { ema } from "@/lib/technical/math";
import type { CupHandleStrategyInput } from "@/src/modules/strategies/cupHandle/CupHandleTypes";
import type { DarvasBoxStrategyInput } from "@/src/modules/strategies/darvasBox/DarvasBoxTypes";
import type { EMAPullbackStrategyInput } from "@/src/modules/strategies/emaPullback/EMAPullbackTypes";
import type { FiftyTwoWeekHighStrategyInput } from "@/src/modules/strategies/fiftyTwoWeekHigh/FiftyTwoWeekHighTypes";
import type { FlatBaseStrategyInput } from "@/src/modules/strategies/flatBase/FlatBaseTypes";
import type { RelativeStrengthLeadershipStrategyInput } from "@/src/modules/strategies/relativeStrengthLeadership/RelativeStrengthLeadershipTypes";
import type { StageAnalysisStrategyInput } from "@/src/modules/strategies/stageAnalysis/StageAnalysisTypes";
import {
  getStrategyEngine,
  getStrategyRegistry,
  type StrategyEngineResult,
  type StrategyExecutionContext,
  type StrategyMarketInput,
  type StrategySignal,
} from "@/src/modules/strategies";
import type { VCPStrategyInput } from "@/src/modules/strategies/vcp/VCPTypes";
import type { TradingPipelineResult } from "@/src/modules/tradingPipeline";

export interface OpportunityStrategyExecution {
  primary: OpportunityStrategySignal | null;
  signals: OpportunityStrategySignal[];
  executedStrategyIds: string[];
  rejectedReasons: string[];
}

function metric(
  candidate: OpportunityCandidate,
  key: string
): number | null {
  const value = candidate.scanMetrics?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function baseInput(candidate: OpportunityCandidate): StrategyMarketInput {
  const lastPrice =
    candidate.quote?.price ??
    metric(candidate, "cmp") ??
    candidate.entryZone.low;
  return {
    symbol: candidate.symbol,
    lastPrice,
    open: metric(candidate, "open") ?? undefined,
    high: metric(candidate, "high") ?? undefined,
    low: metric(candidate, "low") ?? undefined,
    close: lastPrice,
    volume: metric(candidate, "volume") ?? undefined,
    atr: metric(candidate, "atr") ?? undefined,
    indicators: {
      rsi: metric(candidate, "rsi") ?? 0,
      adx: metric(candidate, "adx") ?? 0,
      ema20: metric(candidate, "ema20") ?? 0,
      ema50: metric(candidate, "ema50") ?? 0,
      ema200: metric(candidate, "ema200") ?? 0,
      relativeStrength: metric(candidate, "relative_strength") ?? 0,
      relativeVolume: metric(candidate, "volume_ratio") ?? 0,
    },
  };
}

function strategyInput<T extends StrategyMarketInput>(input: T): T {
  return input;
}

function datedCandles(candles: readonly OhlcBar[]) {
  return candles.map((candle) => ({
    timestamp: new Date(candle.timestamp),
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume,
  }));
}

function weeklyCandles(candles: ReturnType<typeof datedCandles>) {
  const weeks: ReturnType<typeof datedCandles> = [];
  for (let index = 0; index < candles.length; index += 5) {
    const group = candles.slice(index, index + 5);
    if (group.length === 0) continue;
    weeks.push({
      timestamp: group[0].timestamp,
      open: group[0].open,
      high: Math.max(...group.map((candle) => candle.high)),
      low: Math.min(...group.map((candle) => candle.low)),
      close: group[group.length - 1].close,
      volume: group.reduce((sum, candle) => sum + candle.volume, 0),
    });
  }
  return weeks;
}

function buildStrategyInput(
  strategyId: string,
  candidate: OpportunityCandidate,
  candles: readonly OhlcBar[]
): StrategyMarketInput {
  const base = baseInput(candidate);
  const daily = datedCandles(candles);
  const closes = daily.map((candle) => candle.close);
  const common = {
    candlesDaily: daily,
    vwap: metric(candidate, "vwap") ?? base.lastPrice,
    atr: metric(candidate, "atr"),
    ema20: metric(candidate, "ema20"),
    ema50: metric(candidate, "ema50"),
    ema150: ema(closes, 150),
    ema200: metric(candidate, "ema200"),
    relativeVolume: metric(candidate, "volume_ratio"),
    averageVolume20d: metric(candidate, "avg_volume_20d"),
    fiftyTwoWeekHigh: metric(candidate, "week_high_52"),
    newsDriven: false,
  };

  if (strategyId === "vcp") {
    return strategyInput({ ...base, vcp: common } satisfies VCPStrategyInput);
  }
  if (strategyId === "ema-pullback") {
    return strategyInput({
      ...base,
      emaPullback: {
        ...common,
        ema100: ema(closes, 100),
        rsi: metric(candidate, "rsi"),
        adx: metric(candidate, "adx"),
        relativeStrength: metric(candidate, "relative_strength"),
      },
    } satisfies EMAPullbackStrategyInput);
  }
  if (strategyId === "cup-and-handle") {
    return strategyInput({
      ...base,
      cupHandle: {
        ...common,
        relativeStrength: metric(candidate, "relative_strength"),
      },
    } satisfies CupHandleStrategyInput);
  }
  if (strategyId === "flat-base") {
    return strategyInput({
      ...base,
      flatBase: {
        ...common,
        relativeStrength: metric(candidate, "relative_strength"),
      },
    } satisfies FlatBaseStrategyInput);
  }
  if (strategyId === "fifty-two-week-high") {
    return strategyInput({
      ...base,
      fiftyTwoWeekHigh: {
        ...common,
        relativeStrength: metric(candidate, "relative_strength"),
        fiftyTwoWeekLow: metric(candidate, "week_low_52"),
      },
    } satisfies FiftyTwoWeekHighStrategyInput);
  }
  if (strategyId === "darvas") {
    return strategyInput({
      ...base,
      darvasBox: {
        ...common,
        relativeStrength: metric(candidate, "relative_strength"),
      },
    } satisfies DarvasBoxStrategyInput);
  }
  if (strategyId === "relative-strength-leadership") {
    return strategyInput({
      ...base,
      relativeStrengthLeadership: {
        ...common,
        relativeStrengthRatio: metric(candidate, "relative_strength"),
        pricePerformance: metric(candidate, "momentum"),
      },
    } satisfies RelativeStrengthLeadershipStrategyInput);
  }
  if (strategyId === "stage-analysis") {
    const weekly = weeklyCandles(daily);
    const weeklyCloses = weekly.map((candle) => candle.close);
    return strategyInput({
      ...base,
      stageAnalysis: {
        candlesDaily: daily,
        candlesWeekly: weekly,
        ma30Week: ema(weeklyCloses, 30),
        ema20: common.ema20,
        ema50: common.ema50,
        ema150: common.ema150,
        ema200: common.ema200,
        vwap: common.vwap,
        atr: common.atr,
        fiftyTwoWeekHigh: common.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: metric(candidate, "week_low_52"),
        relativeVolume: common.relativeVolume,
        relativeStrength: metric(candidate, "relative_strength"),
      },
    } satisfies StageAnalysisStrategyInput);
  }

  // The concrete Strategy Engine still executes unsupported payloads and
  // returns a standardized IGNORE with the strategy's own validation reason.
  return base;
}

function toSignalDto(signal: StrategySignal): OpportunityStrategySignal {
  return {
    strategy: signal.strategyName,
    strategyId: signal.strategyId,
    signal: signal.signal,
    entry: signal.entry,
    stopLoss: signal.stopLoss,
    target: signal.finalTarget,
    target1: signal.target1,
    target2: signal.target2,
    confidence: signal.confidence,
    risk: signal.risk,
    reward: signal.reward,
    riskReward: signal.riskReward,
    reasons: [...signal.reasons],
    evidence: [...signal.evidence],
    tags: [...signal.tags],
    marketRegime: signal.marketRegime,
    eligibility: {
      ...signal.eligibility,
      reasons: [...signal.eligibility.reasons],
    },
    timestamp: signal.timestamp.toISOString(),
  };
}

function rankResult(result: StrategyEngineResult): number {
  const signal = result.signal;
  const action = signal.signal === "BUY" || signal.signal === "SELL" ? 300 : 0;
  const watchlist = signal.signal === "WATCHLIST" ? 200 : 0;
  return action + watchlist + signal.quality + signal.confidence + signal.riskReward;
}

export function executeOpportunityStrategies(
  candidate: OpportunityCandidate,
  pipeline: TradingPipelineResult,
  candles: readonly OhlcBar[]
): OpportunityStrategyExecution {
  const registry = getStrategyRegistry();
  const preferred = CATEGORY_STRATEGY_IDS[candidate.category];
  const eligibleIds = preferred.filter((strategyId) => {
    const eligibility = pipeline.eligibleStrategies.find(
      (strategy) => strategy.strategyId === strategyId
    );
    return Boolean(eligibility?.eligible && registry.has(strategyId));
  });
  const strategyIds =
    eligibleIds.length > 0 && candles.length > 0
      ? eligibleIds
      : preferred.filter((strategyId) => registry.has(strategyId));

  const results: StrategyEngineResult[] = [];
  for (const strategyId of strategyIds) {
    const input = buildStrategyInput(strategyId, candidate, candles);
    const context: StrategyExecutionContext = {
      input,
      marketContext: pipeline.context,
      regime: pipeline.regime,
      confidence: pipeline.confidence,
      eligibleStrategies: pipeline.eligibleStrategies,
      riskMode: pipeline.context.riskMode,
      pipeline,
      validation: {
        score: candidate.validationScore ?? 0,
        reasons: candidate.eligibleReasons ?? [],
      },
      aiConfidence: candidate.aiConvictionScore,
      timestamp: pipeline.timestamp,
    };
    results.push(getStrategyEngine().execute(strategyId, context));
  }

  const ranked = results.slice().sort((left, right) => rankResult(right) - rankResult(left));
  const actionable = ranked.filter(
    (result) => result.signal.signal !== "IGNORE"
  );
  const deduped = new Map<string, OpportunityStrategySignal>();
  for (const result of actionable) {
    const signal = toSignalDto(result.signal);
    const key = `${signal.strategyId}:${candidate.symbol}:${signal.signal}`;
    if (!deduped.has(key)) deduped.set(key, signal);
  }

  return {
    primary: deduped.values().next().value ?? null,
    signals: [...deduped.values()],
    executedStrategyIds: results.map((result) => result.signal.strategyId),
    rejectedReasons: ranked
      .filter((result) => result.signal.signal === "IGNORE")
      .flatMap((result) => result.signal.reasons)
      .slice(0, 8),
  };
}
