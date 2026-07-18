/**
 * Relative Strength Leadership utilities — Sprint 11B.3O.
 * Pure RS / leadership detection helpers.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { isStrategyEligible } from "../StrategyUtils";
import {
  DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_CONFIG,
  RELATIVE_STRENGTH_LEADERSHIP_STRATEGY_ID,
  resolveRelativeStrengthLeadershipConfig,
  type RelativeStrengthLeadershipConfig,
} from "./RelativeStrengthLeadershipConstants";
import type {
  RelativeStrengthLeadershipCandle,
  RelativeStrengthLeadershipDetection,
  RelativeStrengthLeadershipDetectionContext,
  RelativeStrengthLeadershipDirection,
  RelativeStrengthLeadershipMarketData,
  RelativeStrengthMetrics,
  RelativeStrengthSeriesPoint,
} from "./RelativeStrengthLeadershipTypes";

export { resolveRelativeStrengthLeadershipConfig };

export function parseSessionMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((part) => Number(part));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h! * 60 + m!;
}

export function sessionMinutesOf(
  date: Date,
  utcOffsetMinutes: number
): number {
  const shifted = new Date(date.getTime() + utcOffsetMinutes * 60_000);
  return shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
}

export function isValidMarketHours(
  date: Date,
  config: RelativeStrengthLeadershipConfig = DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_CONFIG
): boolean {
  const minutes = sessionMinutesOf(date, config.sessionUtcOffsetMinutes);
  const open = parseSessionMinutes(config.marketOpen);
  const close = parseSessionMinutes(config.marketClose);
  return minutes >= open && minutes < close;
}

export function averageSectorScore(
  context: InstitutionalMarketContext
): number {
  if (context.sectorStrength.length === 0) return 50;
  const sum = context.sectorStrength.reduce((total, s) => total + s.score, 0);
  return clamp(round(sum / context.sectorStrength.length, 1), 0, 100);
}

export function createEmptyRelativeStrengthLeadershipDetection(
  warnings: string[] = [],
  reasons: string[] = []
): RelativeStrengthLeadershipDetection {
  return {
    detected: false,
    direction: "NONE",
    relativeStrengthScore: 0,
    relativeStrengthRank: 0,
    sectorRank: 0,
    industryRank: 0,
    leadershipPercentile: 0,
    rsVsNifty: 0,
    rsVsSector: 0,
    rsVsIndustry: 0,
    rsMomentum: 0,
    rollingRs: 0,
    weightedRs: 0,
    momentumPersistence: 0,
    trendQuality: 0,
    volumeConfirmation: 0,
    ema20: 0,
    ema50: 0,
    ema150: 0,
    ema200: 0,
    vwap: 0,
    atr: 0,
    rsIncreasing: false,
    outperformingBenchmark: false,
    outperformingSector: false,
    outperformingIndustry: false,
    nearFiftyTwoWeekHigh: false,
    volumeConfirmed: false,
    breadthConfirmed: false,
    sectorConfirmed: false,
    marketConfirmed: false,
    confidence: 0,
    reasons,
    warnings,
  };
}

function performanceReturn(
  series: readonly { close: number }[],
  lookback: number
): number {
  if (series.length < lookback + 1) return 0;
  const end = series[series.length - 1]!.close;
  const start = series[series.length - 1 - lookback]!.close;
  if (!Number.isFinite(start) || start <= 0) return 0;
  return ((end - start) / start) * 100;
}

function relativeOutperformance(
  stockPerf: number,
  benchPerf: number
): number {
  return stockPerf - benchPerf;
}

function toRsScore(outperformancePct: number): number {
  return clamp(round(50 + outperformancePct * 3, 1), 0, 100);
}

export function calculateRelativeStrengthMetrics(
  data: RelativeStrengthLeadershipMarketData,
  config: RelativeStrengthLeadershipConfig
): RelativeStrengthMetrics {
  const lookback = config.rsLookbackBars;
  const momentumBars = config.momentumLookbackBars;
  const stock = data.candlesDaily;
  const stockPerf = performanceReturn(stock, lookback);

  const niftySeries =
    data.nifty50 && data.nifty50.length > 0
      ? data.nifty50
      : data.nifty500 ?? [];
  const sectorSeries = data.sectorIndex ?? [];
  const industrySeries = data.industryIndex ?? [];

  const niftyPerf =
    niftySeries.length > 0 ? performanceReturn(niftySeries, lookback) : 0;
  const sectorPerf =
    sectorSeries.length > 0 ? performanceReturn(sectorSeries, lookback) : 0;
  const industryPerf =
    industrySeries.length > 0
      ? performanceReturn(industrySeries, lookback)
      : 0;

  let rsVsNifty = toRsScore(relativeOutperformance(stockPerf, niftyPerf));
  let rsVsSector = toRsScore(relativeOutperformance(stockPerf, sectorPerf));
  let rsVsIndustry = toRsScore(
    relativeOutperformance(stockPerf, industryPerf)
  );

  if (
    data.relativeStrengthRatio !== null &&
    data.relativeStrengthRatio !== undefined &&
    Number.isFinite(data.relativeStrengthRatio)
  ) {
    rsVsNifty = clamp(data.relativeStrengthRatio, 0, 100);
  }

  const recentStock = performanceReturn(stock, momentumBars);
  const recentNifty =
    niftySeries.length > 0
      ? performanceReturn(niftySeries, momentumBars)
      : 0;
  let rsMomentum =
    data.relativeStrengthMomentum !== null &&
    data.relativeStrengthMomentum !== undefined &&
    Number.isFinite(data.relativeStrengthMomentum)
      ? data.relativeStrengthMomentum
      : relativeOutperformance(recentStock, recentNifty);

  const midLookback = Math.max(Math.floor(lookback / 2), momentumBars);
  const midStock = performanceReturn(stock, midLookback);
  const midNifty =
    niftySeries.length > 0 ? performanceReturn(niftySeries, midLookback) : 0;
  const rollingRs = toRsScore(relativeOutperformance(midStock, midNifty));

  const weightedRs = clamp(
    round(rsVsNifty * 0.45 + rsVsSector * 0.3 + rsVsIndustry * 0.25, 1),
    0,
    100
  );

  const leadershipPercentile =
    data.leadershipPercentile !== null &&
    data.leadershipPercentile !== undefined &&
    Number.isFinite(data.leadershipPercentile)
      ? clamp(data.leadershipPercentile, 0, 100)
      : weightedRs;

  const sectorRank =
    data.sectorRankPercentile !== null &&
    data.sectorRankPercentile !== undefined &&
    Number.isFinite(data.sectorRankPercentile)
      ? clamp(data.sectorRankPercentile, 0, 100)
      : rsVsSector;

  const industryRank =
    data.industryRankPercentile !== null &&
    data.industryRankPercentile !== undefined &&
    Number.isFinite(data.industryRankPercentile)
      ? clamp(data.industryRankPercentile, 0, 100)
      : rsVsIndustry;

  const universe = data.peerUniverseSize ?? 100;
  const leadershipRank = Math.max(
    1,
    Math.round(((100 - leadershipPercentile) / 100) * universe) + 1
  );

  const shortRs = toRsScore(rsMomentum);
  const momentumPersistence = clamp(
    round(100 - Math.abs(shortRs - rollingRs) * 0.8, 1),
    0,
    100
  );

  return {
    rsVsNifty,
    rsVsSector,
    rsVsIndustry,
    rsMomentum,
    rollingRs,
    weightedRs,
    percentileRank: leadershipPercentile,
    leadershipRank,
    sectorRank,
    industryRank,
    momentumPersistence,
  };
}

export function validateSector(
  context: InstitutionalMarketContext,
  config: RelativeStrengthLeadershipConfig = DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_CONFIG
): boolean {
  return averageSectorScore(context) >= config.bullishSectorMin;
}

export function validateBreadth(
  context: InstitutionalMarketContext,
  config: RelativeStrengthLeadershipConfig = DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_CONFIG
): boolean {
  return context.marketBreadth.score >= config.bullishBreadthMin;
}

function isCircuitMove(
  candle: RelativeStrengthLeadershipCandle,
  config: RelativeStrengthLeadershipConfig
): boolean {
  const mid = (candle.high + candle.low) / 2 || candle.close;
  if (!Number.isFinite(mid) || mid <= 0) return false;
  return (candle.high - candle.low) / mid >= config.circuitMovePct;
}

function averageVolume(
  candles: readonly RelativeStrengthLeadershipCandle[]
): number {
  if (candles.length === 0) return 0;
  return candles.reduce((s, c) => s + c.volume, 0) / candles.length;
}

export function calculateConfidence(input: {
  relativeStrength: number;
  leadershipRankScore: number;
  trendQuality: number;
  volumeConfirmation: number;
  sectorScore: number;
  marketScore: number;
  riskRewardProxy: number;
  config: RelativeStrengthLeadershipConfig;
}): number {
  const w = input.config.confidenceWeights;
  const total =
    w.relativeStrength +
    w.leadershipRank +
    w.trendQuality +
    w.volumeConfirmation +
    w.sector +
    w.market +
    w.riskReward;
  const composite =
    (input.relativeStrength * w.relativeStrength +
      input.leadershipRankScore * w.leadershipRank +
      input.trendQuality * w.trendQuality +
      input.volumeConfirmation * w.volumeConfirmation +
      input.sectorScore * w.sector +
      input.marketScore * w.market +
      input.riskRewardProxy * w.riskReward) /
    Math.max(total, 0.0001);
  return clamp(
    round(composite, 1),
    input.config.scoreFloor,
    input.config.scoreCeiling
  );
}

export function detectRelativeStrengthLeadership(
  context: RelativeStrengthLeadershipDetectionContext
): RelativeStrengthLeadershipDetection {
  const config = resolveRelativeStrengthLeadershipConfig(context.config);
  const warnings: string[] = [];
  const reasons: string[] = [];
  const data = context.input.relativeStrengthLeadership;
  const candles = data.candlesDaily;

  if (candles.length < config.minimumDailyCandles) {
    return createEmptyRelativeStrengthLeadershipDetection(
      ["Insufficient daily OHLC for Relative Strength Leadership."],
      ["Enough Candles missing."]
    );
  }

  const eligible = isStrategyEligible(
    RELATIVE_STRENGTH_LEADERSHIP_STRATEGY_ID,
    context.eligibleStrategies ?? []
  );
  if (!eligible) {
    return createEmptyRelativeStrengthLeadershipDetection(
      ["Eligible Strategy gate failed for Relative Strength Leadership."],
      ["Eligible Strategy gate failed for Relative Strength Leadership."]
    );
  }

  if (data.newsDriven === true) {
    return createEmptyRelativeStrengthLeadershipDetection(
      ["News-only move — RS leadership rejected."],
      ["News-only move — not institutional leadership."]
    );
  }

  const last = candles[candles.length - 1]!;
  if (isCircuitMove(last, config)) {
    return createEmptyRelativeStrengthLeadershipDetection(
      ["Circuit-like range — rejected."],
      ["Circuit movement — RS leadership invalid."]
    );
  }

  const ema20 = data.ema20;
  const ema50 = data.ema50;
  const ema150 = data.ema150;
  const ema200 = data.ema200;
  if (
    ema20 === null ||
    ema50 === null ||
    ema150 === null ||
    ema200 === null ||
    !Number.isFinite(ema20) ||
    !Number.isFinite(ema50) ||
    !Number.isFinite(ema150) ||
    !Number.isFinite(ema200)
  ) {
    return createEmptyRelativeStrengthLeadershipDetection(
      ["EMA stack incomplete."],
      ["Trend structure incomplete."]
    );
  }

  const metrics = calculateRelativeStrengthMetrics(data, config);
  const relativeStrengthScore = metrics.weightedRs;
  const rsIncreasing =
    metrics.rsMomentum >= config.minRsMomentum &&
    metrics.rollingRs >= config.minRsScore * 0.9;

  if (relativeStrengthScore < config.minRsScore) {
    return createEmptyRelativeStrengthLeadershipDetection(
      ["Weak relative strength."],
      ["Weak RS — leadership missing."]
    );
  }

  if (!rsIncreasing || metrics.rsMomentum < config.minRsMomentum) {
    return createEmptyRelativeStrengthLeadershipDetection(
      ["Declining or flat relative strength."],
      ["Declining RS — momentum not persistent."]
    );
  }

  if (metrics.percentileRank < config.minLeadershipPercentile) {
    return createEmptyRelativeStrengthLeadershipDetection(
      ["Leadership percentile below threshold."],
      ["Weak RS — not top leadership percentile."]
    );
  }

  const outperformingBenchmark = metrics.rsVsNifty >= config.minRsScore;
  const outperformingSector =
    metrics.rsVsSector >= config.minSectorRankPercentile;
  const outperformingIndustry =
    metrics.rsVsIndustry >= config.minIndustryRankPercentile;

  if (!outperformingBenchmark) {
    return createEmptyRelativeStrengthLeadershipDetection(
      ["Not outperforming benchmark."],
      ["Weak RS vs Nifty."]
    );
  }
  if (!outperformingSector) {
    return createEmptyRelativeStrengthLeadershipDetection(
      ["Not outperforming sector."],
      ["Weak RS vs sector."]
    );
  }
  if (!outperformingIndustry) {
    return createEmptyRelativeStrengthLeadershipDetection(
      ["Not outperforming industry."],
      ["Weak RS vs industry."]
    );
  }

  if (!(ema20 > ema50 && ema50 > ema150 && ema150 > ema200)) {
    return createEmptyRelativeStrengthLeadershipDetection(
      ["EMA stack not fully bullish."],
      ["Weak trend — EMA alignment failed."]
    );
  }

  if (
    !(Number.isFinite(data.vwap) && data.vwap > 0 && last.close >= data.vwap)
  ) {
    return createEmptyRelativeStrengthLeadershipDetection(
      ["Price below VWAP."],
      ["VWAP alignment failed."]
    );
  }

  const fiftyTwo = data.fiftyTwoWeekHigh;
  let nearFiftyTwoWeekHigh = true;
  if (
    fiftyTwo !== null &&
    fiftyTwo !== undefined &&
    Number.isFinite(fiftyTwo) &&
    fiftyTwo > 0
  ) {
    const distance = (fiftyTwo - last.close) / fiftyTwo;
    nearFiftyTwoWeekHigh = distance <= config.nearFiftyTwoWeekHighPct;
    if (!nearFiftyTwoWeekHigh) {
      return createEmptyRelativeStrengthLeadershipDetection(
        ["Price too far from 52-week high."],
        ["Late trend / not near 52-week high."]
      );
    }
    if (
      ema200 > 0 &&
      (last.close - ema200) / ema200 >= config.lateTrendExtensionPct
    ) {
      return createEmptyRelativeStrengthLeadershipDetection(
        ["Late trend extension."],
        ["Late trend — extension excessive."]
      );
    }
  }

  const avgVol =
    data.averageVolume20d &&
    Number.isFinite(data.averageVolume20d) &&
    data.averageVolume20d > 0
      ? data.averageVolume20d
      : averageVolume(candles.slice(-20));

  const volumeConfirmed =
    (data.relativeVolume === null ||
      !Number.isFinite(data.relativeVolume) ||
      data.relativeVolume >= config.minRelativeVolume) &&
    avgVol > 0 &&
    last.volume >= avgVol * config.breakoutVolumeMultiple;

  if (!volumeConfirmed) {
    return createEmptyRelativeStrengthLeadershipDetection(
      ["Weak relative volume / liquidity."],
      ["Weak volume — institutional participation missing."]
    );
  }

  const prior = candles[candles.length - 2];
  if (
    prior &&
    last.close < last.open &&
    last.volume > avgVol * 1.8 &&
    last.close < prior.close
  ) {
    return createEmptyRelativeStrengthLeadershipDetection(
      ["Distribution pressure detected."],
      ["Distribution — leadership invalidated."]
    );
  }

  const sectorConfirmed = validateSector(context.marketContext, config);
  const breadthConfirmed = validateBreadth(context.marketContext, config);
  if (!sectorConfirmed) {
    return createEmptyRelativeStrengthLeadershipDetection(
      ["Weak sector."],
      ["Weak sector — leadership missing."]
    );
  }
  if (!breadthConfirmed) {
    return createEmptyRelativeStrengthLeadershipDetection(
      ["Weak breadth."],
      ["Weak breadth — market participation missing."]
    );
  }

  const riskMode = context.marketContext.riskMode;
  if (config.blockedRiskModes.includes(riskMode)) {
    return createEmptyRelativeStrengthLeadershipDetection(
      ["Risk Off blocks RS leadership buys."],
      ["Risk Off — Relative Strength Leadership buys blocked."]
    );
  }
  if (
    config.requireRiskOnOrNeutral &&
    riskMode !== "Risk On" &&
    riskMode !== "Neutral"
  ) {
    return createEmptyRelativeStrengthLeadershipDetection(
      ["Risk mode not supportive."],
      ["Risk regime incompatible with RS leadership."]
    );
  }

  if (config.blockedRegimes.includes(context.regime.regime)) {
    return createEmptyRelativeStrengthLeadershipDetection(
      [`Regime ${context.regime.regime} blocked.`],
      ["Market regime incompatible with RS leadership."]
    );
  }
  if (
    config.compatibleRegimes.length > 0 &&
    !config.compatibleRegimes.includes(context.regime.regime)
  ) {
    return createEmptyRelativeStrengthLeadershipDetection(
      ["Market regime not compatible."],
      ["Market regime incompatible with RS leadership."]
    );
  }
  if (context.confidence.score < config.minRegimeConfidence) {
    return createEmptyRelativeStrengthLeadershipDetection(
      ["Regime confidence too low."],
      ["Market regime confidence insufficient."]
    );
  }
  if (context.marketContext.volatility.score > config.maxVolatilityScore) {
    return createEmptyRelativeStrengthLeadershipDetection(
      ["Volatility too high."],
      ["High volatility — RS leadership rejected."]
    );
  }

  const trendQuality = clamp(
    round(
      55 +
        (ema20 > ema50 ? 15 : 0) +
        (ema50 > ema150 ? 15 : 0) +
        (ema150 > ema200 ? 15 : 0),
      1
    ),
    0,
    100
  );

  const volumeConfirmation = clamp(
    round(55 + (data.relativeVolume ?? 1) * 15 + (volumeConfirmed ? 15 : 0), 1),
    0,
    100
  );

  const leadershipRankScore = clamp(metrics.percentileRank, 0, 100);

  reasons.push("Stock ranks in the top percentile for relative strength.");
  reasons.push("Outperforming both benchmark and sector.");
  reasons.push("Institutional leadership confirmed.");
  reasons.push("Trend quality remains exceptionally strong.");
  reasons.push("Sector leadership supports continued momentum.");

  const confidence = Math.max(
    config.confidenceFloor,
    calculateConfidence({
      relativeStrength: relativeStrengthScore,
      leadershipRankScore,
      trendQuality,
      volumeConfirmation,
      sectorScore: averageSectorScore(context.marketContext),
      marketScore: clamp(context.marketContext.confidence, 0, 100),
      riskRewardProxy: 70,
      config,
    })
  );

  const direction: RelativeStrengthLeadershipDirection = "BUY";

  return {
    detected: true,
    direction,
    relativeStrengthScore: round(relativeStrengthScore, 1),
    relativeStrengthRank: metrics.leadershipRank,
    sectorRank: round(metrics.sectorRank, 1),
    industryRank: round(metrics.industryRank, 1),
    leadershipPercentile: round(metrics.percentileRank, 1),
    rsVsNifty: round(metrics.rsVsNifty, 1),
    rsVsSector: round(metrics.rsVsSector, 1),
    rsVsIndustry: round(metrics.rsVsIndustry, 1),
    rsMomentum: round(metrics.rsMomentum, 2),
    rollingRs: round(metrics.rollingRs, 1),
    weightedRs: round(metrics.weightedRs, 1),
    momentumPersistence: round(metrics.momentumPersistence, 1),
    trendQuality,
    volumeConfirmation,
    ema20,
    ema50,
    ema150,
    ema200,
    vwap: data.vwap,
    atr: data.atr ?? 0,
    rsIncreasing,
    outperformingBenchmark,
    outperformingSector,
    outperformingIndustry,
    nearFiftyTwoWeekHigh,
    volumeConfirmed,
    breadthConfirmed,
    sectorConfirmed,
    marketConfirmed: true,
    confidence,
    reasons: dedupe(reasons),
    warnings: dedupe(warnings),
  };
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = value.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

export type { RelativeStrengthSeriesPoint };
