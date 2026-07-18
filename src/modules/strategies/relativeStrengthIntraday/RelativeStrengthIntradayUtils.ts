/**
 * Relative Strength Intraday utilities — Sprint 11B.3G.
 * Pure detection helpers for RS leadership / trend / alignment.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import type { MarketRegimeLabel } from "@/src/modules/marketRegime";
import {
  DEFAULT_RELATIVE_STRENGTH_INTRADAY_CONFIG,
  resolveRelativeStrengthIntradayConfig,
  type RelativeStrengthIntradayConfig,
} from "./RelativeStrengthIntradayConstants";
import type {
  RelativeStrengthIntradayCandle,
  RelativeStrengthIntradayDetection,
  RelativeStrengthIntradayDetectionContext,
  RelativeStrengthIntradayDirection,
} from "./RelativeStrengthIntradayTypes";

export { resolveRelativeStrengthIntradayConfig };

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
  config: RelativeStrengthIntradayConfig = DEFAULT_RELATIVE_STRENGTH_INTRADAY_CONFIG
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

export function detectTrendStructure(
  candles: readonly RelativeStrengthIntradayCandle[],
  lookback: number
): {
  bullish: boolean;
  bearish: boolean;
  score: number;
  reasons: string[];
  warnings: string[];
} {
  const window = candles.slice(-Math.max(lookback, 4));
  if (window.length < 4) {
    return {
      bullish: false,
      bearish: false,
      score: 25,
      reasons: [],
      warnings: ["Insufficient bars for trend structure."],
    };
  }

  const half = Math.floor(window.length / 2);
  const early = window.slice(0, half);
  const late = window.slice(half);
  const earlyHigh = Math.max(...early.map((c) => c.high));
  const earlyLow = Math.min(...early.map((c) => c.low));
  const lateHigh = Math.max(...late.map((c) => c.high));
  const lateLow = Math.min(...late.map((c) => c.low));

  const higherHighs = lateHigh > earlyHigh;
  const higherLows = lateLow > earlyLow;
  const lowerHighs = lateHigh < earlyHigh;
  const lowerLows = lateLow < earlyLow;

  if (higherHighs && higherLows) {
    return {
      bullish: true,
      bearish: false,
      score: 85,
      reasons: ["Primary trend remains intact (higher highs / higher lows)."],
      warnings: [],
    };
  }
  if (lowerHighs && lowerLows) {
    return {
      bullish: false,
      bearish: true,
      score: 85,
      reasons: ["Primary trend remains intact (lower highs / lower lows)."],
      warnings: [],
    };
  }
  return {
    bullish: false,
    bearish: false,
    score: 30,
    reasons: [],
    warnings: ["Weak Trend — structure not clearly directional."],
  };
}

export function validateEmaAlignment(
  direction: Exclude<RelativeStrengthIntradayDirection, "NONE">,
  price: number,
  ema20: number,
  ema50: number,
  ema20Series: readonly number[] | null | undefined,
  config: RelativeStrengthIntradayConfig
): { aligned: boolean; score: number; reasons: string[]; warnings: string[] } {
  const reasons: string[] = [];
  const warnings: string[] = [];
  if (
    !Number.isFinite(price) ||
    !Number.isFinite(ema20) ||
    !Number.isFinite(ema50) ||
    ema20 <= 0 ||
    ema50 <= 0
  ) {
    return {
      aligned: false,
      score: 20,
      reasons: [],
      warnings: ["EMA data missing."],
    };
  }

  const separation = Math.abs(ema20 - ema50) / price;
  if (separation < config.minEmaSeparationPct) {
    return {
      aligned: false,
      score: 25,
      reasons: [],
      warnings: ["Flat EMA — insufficient EMA20/EMA50 separation."],
    };
  }

  if (ema20Series && ema20Series.length >= config.emaSlopeLookback) {
    const series = ema20Series.slice(-config.emaSlopeLookback);
    const first = series[0]!;
    const last = series[series.length - 1]!;
    const slope = (last - first) / Math.abs(first);
    if (Math.abs(slope) < config.flatEmaSlopePct) {
      return {
        aligned: false,
        score: 28,
        reasons: [],
        warnings: ["Flat EMA — EMA20 slope too shallow."],
      };
    }
  }

  if (direction === "BUY") {
    const ok = price > ema20 && ema20 > ema50;
    if (ok) {
      reasons.push("Price above EMA20 with EMA20 above EMA50.");
      return { aligned: true, score: 88, reasons, warnings };
    }
    return {
      aligned: false,
      score: 30,
      reasons: [],
      warnings: ["Bullish EMA stack not confirmed."],
    };
  }

  const ok = price < ema20 && ema20 < ema50;
  if (ok) {
    reasons.push("Price below EMA20 with EMA20 below EMA50.");
    return { aligned: true, score: 88, reasons, warnings };
  }
  return {
    aligned: false,
    score: 30,
    reasons: [],
    warnings: ["Bearish EMA stack not confirmed."],
  };
}

export function validateVwapAlignment(
  direction: Exclude<RelativeStrengthIntradayDirection, "NONE">,
  price: number,
  vwap: number
): { aligned: boolean; score: number; reasons: string[]; warnings: string[] } {
  if (!Number.isFinite(vwap) || vwap <= 0 || !Number.isFinite(price)) {
    return {
      aligned: false,
      score: 35,
      reasons: [],
      warnings: ["VWAP missing."],
    };
  }
  if (direction === "BUY") {
    if (price >= vwap) {
      return {
        aligned: true,
        score: 80,
        reasons: ["Price above VWAP supports bullish relative strength."],
        warnings: [],
      };
    }
    return {
      aligned: false,
      score: 30,
      reasons: [],
      warnings: ["Price below VWAP — bullish relative strength rejected."],
    };
  }
  if (price <= vwap) {
    return {
      aligned: true,
      score: 80,
      reasons: ["Price below VWAP supports bearish relative strength."],
      warnings: [],
    };
  }
  return {
    aligned: false,
    score: 30,
    reasons: [],
    warnings: ["Price above VWAP — bearish relative strength rejected."],
  };
}

export function evaluateRelativeStrengthLeadership(
  stockRS: number,
  sectorRS: number,
  benchmarkRS: number,
  direction: Exclude<RelativeStrengthIntradayDirection, "NONE">,
  config: RelativeStrengthIntradayConfig = DEFAULT_RELATIVE_STRENGTH_INTRADAY_CONFIG
): {
  leader: boolean;
  score: number;
  relativeStrengthScore: number;
  outperformsBenchmark: boolean;
  outperformsSector: boolean;
  reasons: string[];
  warnings: string[];
} {
  const reasons: string[] = [];
  const warnings: string[] = [];

  if (
    !Number.isFinite(stockRS) ||
    !Number.isFinite(sectorRS) ||
    !Number.isFinite(benchmarkRS)
  ) {
    return {
      leader: false,
      score: 20,
      relativeStrengthScore: 0,
      outperformsBenchmark: false,
      outperformsSector: false,
      reasons: [],
      warnings: ["Relative strength scores missing."],
    };
  }

  if (direction === "BUY") {
    const outperformsBenchmark =
      stockRS >= benchmarkRS + config.minBenchmarkOutperformance;
    const outperformsSector =
      stockRS >= sectorRS + config.minSectorOutperformance;
    const meetsMin = stockRS >= config.minRelativeStrengthScore;

    if (outperformsBenchmark) {
      reasons.push("Stock outperforming benchmark.");
    } else {
      warnings.push("Stock not outperforming benchmark by required margin.");
    }
    if (outperformsSector) {
      reasons.push("Sector leadership confirmed.");
    } else {
      warnings.push("Stock not outperforming sector by required margin.");
    }
    if (!meetsMin) {
      warnings.push("Stock relative strength below minimum threshold.");
    }

    const score = clamp(
      round(
        (outperformsBenchmark ? 35 : 0) +
          (outperformsSector ? 30 : 0) +
          (meetsMin ? 25 : 0) +
          stockRS * 0.1,
        1
      ),
      0,
      100
    );

    return {
      leader: outperformsBenchmark && outperformsSector && meetsMin,
      score,
      relativeStrengthScore: stockRS,
      outperformsBenchmark,
      outperformsSector,
      reasons,
      warnings,
    };
  }

  const underperformsBenchmark =
    stockRS <= benchmarkRS - config.minBenchmarkOutperformance;
  const underperformsSector =
    stockRS <= sectorRS - config.minSectorOutperformance;
  const maxWeakness = 100 - config.minRelativeStrengthScore;
  const meetsWeakness = stockRS <= maxWeakness;

  if (underperformsBenchmark) {
    reasons.push("Stock underperforming benchmark.");
  } else {
    warnings.push("Stock not underperforming benchmark by required margin.");
  }
  if (underperformsSector) {
    reasons.push("Sector relative weakness confirmed.");
  } else {
    warnings.push("Stock not underperforming sector by required margin.");
  }
  if (!meetsWeakness) {
    warnings.push("Stock relative strength not weak enough for bearish leadership.");
  }

  const score = clamp(
    round(
      (underperformsBenchmark ? 35 : 0) +
        (underperformsSector ? 30 : 0) +
        (meetsWeakness ? 25 : 0) +
        (100 - stockRS) * 0.1,
      1
    ),
    0,
    100
  );

  return {
    leader: underperformsBenchmark && underperformsSector && meetsWeakness,
    score,
    relativeStrengthScore: stockRS,
    outperformsBenchmark: underperformsBenchmark,
    outperformsSector: underperformsSector,
    reasons,
    warnings,
  };
}

export function validateVolume(
  candles: readonly RelativeStrengthIntradayCandle[],
  relativeVolume: number | null,
  config: RelativeStrengthIntradayConfig
): {
  confirmed: boolean;
  score: number;
  reasons: string[];
  warnings: string[];
} {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const last = candles[candles.length - 1];
  if (!last) {
    return {
      confirmed: false,
      score: 25,
      reasons: [],
      warnings: ["Volume data missing."],
    };
  }

  const prior = candles.slice(0, -1).slice(-6);
  const avgVol =
    prior.length > 0
      ? prior.reduce((s, c) => s + c.volume, 0) / prior.length
      : last.volume;
  const spike =
    avgVol > 0 && last.volume >= avgVol * config.volumeConfirmationMultiple;

  if (
    relativeVolume !== null &&
    Number.isFinite(relativeVolume) &&
    relativeVolume < config.minRelativeVolume
  ) {
    return {
      confirmed: false,
      score: 25,
      reasons: [],
      warnings: ["Low volume — relative volume below threshold."],
    };
  }

  if (
    !spike &&
    (relativeVolume === null ||
      relativeVolume < config.preferredRelativeVolume)
  ) {
    warnings.push("Low volume — weak confirmation of institutional participation.");
  } else {
    reasons.push("Institutional buying supported by volume.");
  }

  const confirmed =
    spike ||
    (relativeVolume !== null &&
      Number.isFinite(relativeVolume) &&
      relativeVolume >= config.minRelativeVolume);

  return {
    confirmed,
    score: clamp(
      (spike ? 70 : 40) +
        (relativeVolume !== null &&
        relativeVolume >= config.preferredRelativeVolume
          ? 25
          : relativeVolume !== null &&
              relativeVolume >= config.minRelativeVolume
            ? 15
            : 0),
      0,
      100
    ),
    reasons,
    warnings,
  };
}

export function validateBreadth(
  direction: Exclude<RelativeStrengthIntradayDirection, "NONE">,
  context: InstitutionalMarketContext,
  config: RelativeStrengthIntradayConfig = DEFAULT_RELATIVE_STRENGTH_INTRADAY_CONFIG
): { confirmed: boolean; score: number; reasons: string[]; warnings: string[] } {
  const score = context.marketBreadth?.score;
  if (!Number.isFinite(score)) {
    return {
      confirmed: false,
      score: 30,
      reasons: [],
      warnings: ["Breadth data missing."],
    };
  }
  if (direction === "BUY") {
    if (score! >= config.bullishBreadthMin) {
      return {
        confirmed: true,
        score: clamp(score!, 0, 100),
        reasons: ["Market breadth confirms leadership."],
        warnings: [],
      };
    }
    return {
      confirmed: false,
      score: clamp(score!, 0, 100),
      reasons: [],
      warnings: ["Weak Breadth — participation insufficient."],
    };
  }
  if (score! <= config.bearishBreadthMax) {
    return {
      confirmed: true,
      score: clamp(100 - score!, 0, 100),
      reasons: ["Market breadth confirms relative weakness."],
      warnings: [],
    };
  }
  return {
    confirmed: false,
    score: clamp(score!, 0, 100),
    reasons: [],
    warnings: ["Weak Breadth for bearish relative strength."],
  };
}

export function validateSector(
  direction: Exclude<RelativeStrengthIntradayDirection, "NONE">,
  context: InstitutionalMarketContext,
  config: RelativeStrengthIntradayConfig = DEFAULT_RELATIVE_STRENGTH_INTRADAY_CONFIG
): { confirmed: boolean; score: number; reasons: string[]; warnings: string[] } {
  if (context.sectorStrength.length === 0) {
    return {
      confirmed: false,
      score: 30,
      reasons: [],
      warnings: ["Sector strength missing."],
    };
  }
  const avg = averageSectorScore(context);
  if (direction === "BUY") {
    if (avg >= config.bullishSectorMin) {
      return {
        confirmed: true,
        score: avg,
        reasons: ["Sector leadership supports relative strength."],
        warnings: [],
      };
    }
    return {
      confirmed: false,
      score: avg,
      reasons: [],
      warnings: ["Weak Sector — leadership insufficient."],
    };
  }
  if (avg <= config.bearishSectorMax) {
    return {
      confirmed: true,
      score: clamp(100 - avg, 0, 100),
      reasons: ["Sector weakness supports bearish relative strength."],
      warnings: [],
    };
  }
  return {
    confirmed: false,
    score: avg,
    reasons: [],
    warnings: ["Weak Sector for bearish relative strength."],
  };
}

export function validateMarket(
  direction: Exclude<RelativeStrengthIntradayDirection, "NONE">,
  regime: MarketRegimeLabel,
  riskMode: InstitutionalMarketContext["riskMode"],
  regimeConfidence: number,
  volatilityScore: number,
  newsDriven: boolean,
  config: RelativeStrengthIntradayConfig = DEFAULT_RELATIVE_STRENGTH_INTRADAY_CONFIG
): { confirmed: boolean; score: number; reasons: string[]; warnings: string[] } {
  const reasons: string[] = [];
  const warnings: string[] = [];
  let score = 50;

  if (config.blockedRiskModes.includes(riskMode)) {
    return {
      confirmed: false,
      score: 15,
      reasons: [],
      warnings: [`Risk Off — Risk Mode = ${riskMode}.`],
    };
  }

  if (newsDriven) {
    return {
      confirmed: false,
      score: 15,
      reasons: [],
      warnings: ["News spike — relative strength rejected."],
    };
  }

  if (config.blockedRegimes.includes(regime)) {
    return {
      confirmed: false,
      score: 20,
      reasons: [],
      warnings: [`Sideways / incompatible regime ${regime} — relative strength rejected.`],
    };
  }

  if (direction === "BUY" && config.bullBlockedRegimes.includes(regime)) {
    return {
      confirmed: false,
      score: 20,
      reasons: [],
      warnings: [`Regime ${regime} blocks bullish relative strength.`],
    };
  }
  if (direction === "SELL" && config.bearBlockedRegimes.includes(regime)) {
    return {
      confirmed: false,
      score: 20,
      reasons: [],
      warnings: [`Regime ${regime} blocks bearish relative strength.`],
    };
  }

  if (!config.compatibleRegimes.includes(regime)) {
    return {
      confirmed: false,
      score: 25,
      reasons: [],
      warnings: [`Regime ${regime} not compatible with relative strength.`],
    };
  }
  reasons.push("Trade aligns with market regime.");
  score += 20;

  if (regimeConfidence >= config.minRegimeConfidence) {
    score += 15;
  } else {
    warnings.push("Regime confidence below relative strength threshold.");
    score -= 20;
  }

  if (volatilityScore > config.maxVolatilityScore) {
    warnings.push("Volatility too elevated for clean relative strength.");
    score -= 15;
  } else {
    score += 10;
  }

  return {
    confirmed:
      config.compatibleRegimes.includes(regime) &&
      !config.blockedRegimes.includes(regime) &&
      !config.blockedRiskModes.includes(riskMode) &&
      !newsDriven &&
      regimeConfidence >= config.minRegimeConfidence &&
      volatilityScore <= config.maxVolatilityScore &&
      !(direction === "BUY" && config.bullBlockedRegimes.includes(regime)) &&
      !(direction === "SELL" && config.bearBlockedRegimes.includes(regime)),
    score: clamp(score, config.scoreFloor, config.scoreCeiling),
    reasons,
    warnings,
  };
}

function isCircuitMove(
  candle: RelativeStrengthIntradayCandle,
  config: RelativeStrengthIntradayConfig
): boolean {
  const mid = (candle.high + candle.low) / 2 || candle.close;
  if (!Number.isFinite(mid) || mid <= 0) return false;
  return (candle.high - candle.low) / mid >= config.circuitMovePct;
}

export function calculateConfidence(input: {
  relativeStrengthScore: number;
  trendScore: number;
  volumeScore: number;
  breadthScore: number;
  sectorScore: number;
  marketScore: number;
  vwapScore: number;
  emaScore: number;
  config?: RelativeStrengthIntradayConfig;
}): number {
  const config = input.config ?? DEFAULT_RELATIVE_STRENGTH_INTRADAY_CONFIG;
  const w = config.confidenceWeights;
  const composite =
    input.relativeStrengthScore * w.relativeStrength +
    input.trendScore * w.trendQuality +
    input.volumeScore * w.volume +
    input.breadthScore * w.breadth +
    input.sectorScore * w.sector +
    input.marketScore * w.market +
    input.vwapScore * w.vwap +
    input.emaScore * w.ema;
  return clamp(
    round(composite, 1),
    config.confidenceFloor,
    config.scoreCeiling
  );
}

export function createEmptyRelativeStrengthIntradayDetection(
  warnings: string[],
  reasons: string[] = []
): RelativeStrengthIntradayDetection {
  return {
    detected: false,
    direction: "NONE",
    stockRelativeStrength: 0,
    sectorRelativeStrength: 0,
    benchmarkRelativeStrength: 0,
    relativeStrengthScore: 0,
    outperformsBenchmark: false,
    outperformsSector: false,
    ema20: 0,
    ema50: 0,
    vwap: 0,
    strongTrend: false,
    volumeConfirmed: false,
    breadthConfirmed: false,
    sectorConfirmed: false,
    marketConfirmed: false,
    confidence: 0,
    reasons,
    warnings,
  };
}

/**
 * Full relative strength intraday detection.
 */
export function detectRelativeStrengthIntraday(
  context: RelativeStrengthIntradayDetectionContext
): RelativeStrengthIntradayDetection {
  const config = resolveRelativeStrengthIntradayConfig(context.config);
  const data = context.input.relativeStrengthIntraday;
  const candles = data.candles5m;
  const warnings: string[] = [];
  const reasons: string[] = [];

  const last = candles[candles.length - 1];
  if (!last) {
    return createEmptyRelativeStrengthIntradayDetection(["Missing candles."]);
  }

  if (isCircuitMove(last, config)) {
    return createEmptyRelativeStrengthIntradayDetection(
      ["Circuit movement — relative strength rejected."],
      reasons
    );
  }

  const ema20 = data.ema20;
  const ema50 = data.ema50;
  if (
    ema20 === null ||
    ema50 === null ||
    !Number.isFinite(ema20) ||
    !Number.isFinite(ema50)
  ) {
    return createEmptyRelativeStrengthIntradayDetection(["EMA20/EMA50 missing."]);
  }

  const structure = detectTrendStructure(candles, config.trendLookbackBars);
  warnings.push(...structure.warnings);
  reasons.push(...structure.reasons);

  let direction: Exclude<RelativeStrengthIntradayDirection, "NONE"> | null = null;
  if (structure.bullish) direction = "BUY";
  else if (structure.bearish) direction = "SELL";

  if (!direction) {
    return createEmptyRelativeStrengthIntradayDetection(warnings, reasons);
  }

  const ema = validateEmaAlignment(
    direction,
    last.close,
    ema20,
    ema50,
    data.ema20Series,
    config
  );
  warnings.push(...ema.warnings);
  reasons.push(...ema.reasons);
  if (!ema.aligned) {
    return {
      ...createEmptyRelativeStrengthIntradayDetection(warnings, reasons),
      direction: "NONE",
      ema20,
      ema50,
      vwap: data.vwap,
    };
  }

  const vwap = validateVwapAlignment(direction, last.close, data.vwap);
  warnings.push(...vwap.warnings);
  reasons.push(...vwap.reasons);
  if (!vwap.aligned) {
    return createEmptyRelativeStrengthIntradayDetection(warnings, reasons);
  }

  const stockRS = data.stockRelativeStrength;
  const sectorRS = data.sectorRelativeStrength;
  const benchmarkRS = data.benchmarkRelativeStrength;

  if (
    stockRS === null ||
    sectorRS === null ||
    benchmarkRS === null ||
    !Number.isFinite(stockRS) ||
    !Number.isFinite(sectorRS) ||
    !Number.isFinite(benchmarkRS)
  ) {
    return createEmptyRelativeStrengthIntradayDetection(
      ["Relative strength scores missing."],
      reasons
    );
  }

  const leadership = evaluateRelativeStrengthLeadership(
    stockRS,
    sectorRS,
    benchmarkRS,
    direction,
    config
  );
  warnings.push(...leadership.warnings);
  reasons.push(...leadership.reasons);
  if (!leadership.leader) {
    return {
      ...createEmptyRelativeStrengthIntradayDetection(warnings, reasons),
      direction: "NONE",
      stockRelativeStrength: stockRS,
      sectorRelativeStrength: sectorRS,
      benchmarkRelativeStrength: benchmarkRS,
      relativeStrengthScore: leadership.relativeStrengthScore,
      outperformsBenchmark: leadership.outperformsBenchmark,
      outperformsSector: leadership.outperformsSector,
      ema20,
      ema50,
      vwap: data.vwap,
      strongTrend: structure.bullish || structure.bearish,
    };
  }

  const volume = validateVolume(candles, data.relativeVolume, config);
  warnings.push(...volume.warnings);
  reasons.push(...volume.reasons);

  const breadth = validateBreadth(direction, context.marketContext, config);
  warnings.push(...breadth.warnings);
  reasons.push(...breadth.reasons);

  const sector = validateSector(direction, context.marketContext, config);
  warnings.push(...sector.warnings);
  reasons.push(...sector.reasons);

  const market = validateMarket(
    direction,
    context.regime.regime,
    context.marketContext.riskMode,
    context.confidence.score,
    context.marketContext.volatility?.score ?? 50,
    data.newsDriven === true,
    config
  );
  warnings.push(...market.warnings);
  reasons.push(...market.reasons);

  if (
    !volume.confirmed ||
    !breadth.confirmed ||
    !sector.confirmed ||
    !market.confirmed
  ) {
    return {
      ...createEmptyRelativeStrengthIntradayDetection(warnings, reasons),
      stockRelativeStrength: stockRS,
      sectorRelativeStrength: sectorRS,
      benchmarkRelativeStrength: benchmarkRS,
      relativeStrengthScore: leadership.relativeStrengthScore,
      outperformsBenchmark: leadership.outperformsBenchmark,
      outperformsSector: leadership.outperformsSector,
      ema20,
      ema50,
      vwap: data.vwap,
      strongTrend: true,
      volumeConfirmed: volume.confirmed,
      breadthConfirmed: breadth.confirmed,
      sectorConfirmed: sector.confirmed,
      marketConfirmed: market.confirmed,
      confidence: calculateConfidence({
        relativeStrengthScore: leadership.score,
        trendScore: structure.score,
        volumeScore: volume.score,
        breadthScore: breadth.score,
        sectorScore: sector.score,
        marketScore: market.score,
        vwapScore: vwap.score,
        emaScore: ema.score,
        config,
      }),
    };
  }

  const confidence = calculateConfidence({
    relativeStrengthScore: leadership.score,
    trendScore: structure.score,
    volumeScore: volume.score,
    breadthScore: breadth.score,
    sectorScore: sector.score,
    marketScore: market.score,
    vwapScore: vwap.score,
    emaScore: ema.score,
    config,
  });

  reasons.push(`Relative Strength Intraday ${direction} detected.`);

  return {
    detected: true,
    direction,
    stockRelativeStrength: stockRS,
    sectorRelativeStrength: sectorRS,
    benchmarkRelativeStrength: benchmarkRS,
    relativeStrengthScore: leadership.relativeStrengthScore,
    outperformsBenchmark: leadership.outperformsBenchmark,
    outperformsSector: leadership.outperformsSector,
    ema20,
    ema50,
    vwap: data.vwap,
    strongTrend: true,
    volumeConfirmed: true,
    breadthConfirmed: true,
    sectorConfirmed: true,
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
