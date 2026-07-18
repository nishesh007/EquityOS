/**
 * Earnings Momentum utilities — Sprint 11B.3T.
 * Pure earnings analysis / detection helpers.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { isStrategyEligible } from "../StrategyUtils";
import {
  DEFAULT_EARNINGS_MOMENTUM_CONFIG,
  EARNINGS_MOMENTUM_STRATEGY_ID,
  resolveEarningsMomentumConfig,
  type EarningsMomentumConfig,
} from "./EarningsMomentumConstants";
import type {
  EarningsAnalysis,
  EarningsFundamentals,
  EarningsMomentumCandle,
  EarningsMomentumDetection,
  EarningsMomentumDetectionContext,
  EarningsMomentumDirection,
  EarningsMomentumMarketData,
} from "./EarningsMomentumTypes";

export { resolveEarningsMomentumConfig };

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
  config: EarningsMomentumConfig = DEFAULT_EARNINGS_MOMENTUM_CONFIG
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

function surprisePct(actual: number, estimate: number): number {
  if (!Number.isFinite(actual) || !Number.isFinite(estimate)) return 0;
  const denom = Math.abs(estimate);
  if (denom < 1e-9) {
    if (Math.abs(actual) < 1e-9) return 0;
    return actual > 0 ? 1 : -1;
  }
  return (actual - estimate) / denom;
}

export function analyzeEarnings(
  fundamentals: EarningsFundamentals
): EarningsAnalysis {
  const epsSurprise = surprisePct(
    fundamentals.epsActual,
    fundamentals.epsEstimate
  );
  const revenueSurprise = surprisePct(
    fundamentals.revenueActual,
    fundamentals.revenueEstimate
  );
  const operatingMarginExpansion =
    fundamentals.operatingMargin !== null &&
    fundamentals.operatingMargin !== undefined &&
    fundamentals.operatingMarginPrior !== null &&
    fundamentals.operatingMarginPrior !== undefined &&
    Number.isFinite(fundamentals.operatingMargin) &&
    Number.isFinite(fundamentals.operatingMarginPrior)
      ? fundamentals.operatingMargin - fundamentals.operatingMarginPrior
      : 0;
  const ebitdaGrowth =
    fundamentals.ebitda !== null &&
    fundamentals.ebitda !== undefined &&
    fundamentals.ebitdaPrior !== null &&
    fundamentals.ebitdaPrior !== undefined &&
    Number.isFinite(fundamentals.ebitda) &&
    Number.isFinite(fundamentals.ebitdaPrior) &&
    Math.abs(fundamentals.ebitdaPrior) > 1e-9
      ? (fundamentals.ebitda - fundamentals.ebitdaPrior) /
        Math.abs(fundamentals.ebitdaPrior)
      : 0;

  const yoyGrowth =
    fundamentals.epsGrowthYoy ?? fundamentals.revenueGrowthYoy ?? 0;
  const qoqGrowth =
    fundamentals.epsGrowthQoq ?? fundamentals.revenueGrowthQoq ?? 0;
  const profitGrowth = fundamentals.patGrowth ?? yoyGrowth;
  const revenueGrowth = fundamentals.revenueGrowthYoy ?? 0;

  return {
    epsSurprise: round(epsSurprise, 4),
    revenueSurprise: round(revenueSurprise, 4),
    profitGrowth: round(profitGrowth, 4),
    revenueGrowth: round(revenueGrowth, 4),
    operatingMarginExpansion: round(operatingMarginExpansion, 4),
    ebitdaGrowth: round(ebitdaGrowth, 4),
    guidanceUpgrade: fundamentals.guidance === "upgrade",
    guidanceDowngrade: fundamentals.guidance === "downgrade",
    sequentialGrowth: round(qoqGrowth, 4),
    yoyGrowth: round(yoyGrowth, 4),
    qoqGrowth: round(qoqGrowth, 4),
    estimateRevision: round(fundamentals.estimateRevision ?? 0, 4),
  };
}

export function createEmptyEarningsMomentumDetection(
  warnings: string[] = [],
  reasons: string[] = []
): EarningsMomentumDetection {
  const emptyAnalysis: EarningsAnalysis = {
    epsSurprise: 0,
    revenueSurprise: 0,
    profitGrowth: 0,
    revenueGrowth: 0,
    operatingMarginExpansion: 0,
    ebitdaGrowth: 0,
    guidanceUpgrade: false,
    guidanceDowngrade: false,
    sequentialGrowth: 0,
    yoyGrowth: 0,
    qoqGrowth: 0,
    estimateRevision: 0,
  };
  return {
    detected: false,
    direction: "NONE",
    epsActual: 0,
    epsEstimate: 0,
    epsSurprise: 0,
    revenueActual: 0,
    revenueEstimate: 0,
    revenueSurprise: 0,
    guidance: "none",
    marginExpansion: 0,
    earningsQuality: 0,
    guidanceQuality: 0,
    priceConfirmation: 0,
    volumeConfirmation: 0,
    ema20: 0,
    ema50: 0,
    vwap: 0,
    atr: 0,
    swingLow: 0,
    swingHigh: 0,
    priceConfirmed: false,
    volumeConfirmed: false,
    rsConfirmed: false,
    breadthConfirmed: false,
    sectorConfirmed: false,
    marketConfirmed: false,
    institutionalConfirmed: false,
    confidence: 0,
    analysis: emptyAnalysis,
    reasons,
    warnings,
  };
}

function averageVolume(candles: readonly EarningsMomentumCandle[]): number {
  if (candles.length === 0) return 0;
  return candles.reduce((s, c) => s + c.volume, 0) / candles.length;
}

export function validateSectorBullish(
  context: InstitutionalMarketContext,
  config: EarningsMomentumConfig = DEFAULT_EARNINGS_MOMENTUM_CONFIG
): boolean {
  return averageSectorScore(context) >= config.bullishSectorMin;
}

export function validateSectorBearish(
  context: InstitutionalMarketContext,
  config: EarningsMomentumConfig = DEFAULT_EARNINGS_MOMENTUM_CONFIG
): boolean {
  return averageSectorScore(context) <= config.bearishSectorMax;
}

export function validateBreadthBullish(
  context: InstitutionalMarketContext,
  config: EarningsMomentumConfig = DEFAULT_EARNINGS_MOMENTUM_CONFIG
): boolean {
  return context.marketBreadth.score >= config.bullishBreadthMin;
}

export function validateBreadthBearish(
  context: InstitutionalMarketContext,
  config: EarningsMomentumConfig = DEFAULT_EARNINGS_MOMENTUM_CONFIG
): boolean {
  return context.marketBreadth.score <= config.bearishBreadthMax;
}

export function calculateConfidence(input: {
  earningsQuality: number;
  guidanceQuality: number;
  priceConfirmation: number;
  volumeConfirmation: number;
  relativeStrength: number;
  sectorStrength: number;
  riskRewardProxy: number;
  config: EarningsMomentumConfig;
}): number {
  const w = input.config.confidenceWeights;
  const total =
    w.earningsQuality +
    w.guidanceQuality +
    w.priceConfirmation +
    w.volumeConfirmation +
    w.relativeStrength +
    w.sectorStrength +
    w.riskReward;
  const composite =
    (input.earningsQuality * w.earningsQuality +
      input.guidanceQuality * w.guidanceQuality +
      input.priceConfirmation * w.priceConfirmation +
      input.volumeConfirmation * w.volumeConfirmation +
      input.relativeStrength * w.relativeStrength +
      input.sectorStrength * w.sectorStrength +
      input.riskRewardProxy * w.riskReward) /
    Math.max(total, 0.0001);
  return clamp(
    round(composite, 1),
    input.config.scoreFloor,
    input.config.scoreCeiling
  );
}

function scoreEarningsQuality(analysis: EarningsAnalysis): number {
  let score = 50;
  score += clamp(analysis.epsSurprise * 100, -25, 25);
  score += clamp(analysis.revenueSurprise * 80, -15, 15);
  score += clamp(analysis.yoyGrowth * 40, -10, 10);
  score += clamp(analysis.operatingMarginExpansion * 200, -10, 10);
  return clamp(round(score, 1), 0, 100);
}

function scoreGuidanceQuality(
  fundamentals: EarningsFundamentals,
  analysis: EarningsAnalysis
): number {
  if (analysis.guidanceUpgrade) return 90;
  if (analysis.guidanceDowngrade) return 20;
  if (fundamentals.guidance === "inline") return 55;
  return 45;
}

export function detectEarningsMomentum(
  context: EarningsMomentumDetectionContext
): EarningsMomentumDetection {
  const config = resolveEarningsMomentumConfig(context.config);
  const warnings: string[] = [];
  const reasons: string[] = [];
  const data = context.input.earningsMomentum;
  const candles = data.candlesDaily;
  const fundamentals = data.fundamentals;

  if (candles.length < config.minimumDailyCandles) {
    return createEmptyEarningsMomentumDetection(
      ["Insufficient daily OHLC for Earnings Momentum."],
      ["Enough Candles missing."]
    );
  }

  const eligible = isStrategyEligible(
    EARNINGS_MOMENTUM_STRATEGY_ID,
    context.eligibleStrategies ?? []
  );
  if (!eligible) {
    return createEmptyEarningsMomentumDetection(
      ["Eligible Strategy gate failed for Earnings Momentum."],
      ["Eligible Strategy gate failed for Earnings Momentum."]
    );
  }

  if (fundamentals.oneTimeGains === true) {
    return createEmptyEarningsMomentumDetection(
      ["One-time gains — earnings quality rejected."],
      ["One-time gains — not sustainable earnings momentum."]
    );
  }
  if (fundamentals.accountingAdjustments === true) {
    return createEmptyEarningsMomentumDetection(
      ["Accounting adjustments — rejected."],
      ["Accounting adjustments — earnings quality unclear."]
    );
  }

  const last = candles[candles.length - 1]!;
  const mid = (last.high + last.low) / 2 || last.close;
  if (
    Number.isFinite(mid) &&
    mid > 0 &&
    (last.high - last.low) / mid >= config.circuitMovePct
  ) {
    return createEmptyEarningsMomentumDetection(
      ["Circuit-like range — rejected."],
      ["Circuit movement — Earnings Momentum invalid."]
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
    return createEmptyEarningsMomentumDetection(
      ["EMA stack incomplete."],
      ["Price confirmation incomplete."]
    );
  }

  if (!(Number.isFinite(data.vwap) && data.vwap > 0)) {
    return createEmptyEarningsMomentumDetection(
      ["Valid VWAP missing."],
      ["VWAP alignment unavailable."]
    );
  }

  const atr =
    data.atr !== null && Number.isFinite(data.atr) && data.atr! > 0
      ? data.atr!
      : Math.max(last.close * 0.02, 0.01);

  const analysis = analyzeEarnings(fundamentals);
  const avgVol =
    data.averageVolume20d &&
    Number.isFinite(data.averageVolume20d) &&
    data.averageVolume20d > 0
      ? data.averageVolume20d
      : averageVolume(candles.slice(-20));

  if (avgVol < config.minAverageVolume) {
    return createEmptyEarningsMomentumDetection(
      ["Low liquidity."],
      ["Low liquidity — average volume below threshold."]
    );
  }

  const volumeOk =
    (data.relativeVolume === null ||
      !Number.isFinite(data.relativeVolume) ||
      data.relativeVolume >= config.minRelativeVolume) &&
    avgVol > 0 &&
    last.volume >= avgVol * config.volumeConfirmationMultiple;

  if (!volumeOk) {
    return createEmptyEarningsMomentumDetection(
      ["Weak volume."],
      ["Weak Volume — institutional participation missing."]
    );
  }

  if (config.blockedRiskModes.includes(context.marketContext.riskMode)) {
    return createEmptyEarningsMomentumDetection(
      ["Risk Off blocks Earnings Momentum."],
      ["Risk Off — Earnings Momentum blocked."]
    );
  }

  if (config.blockedRegimes.includes(context.regime.regime)) {
    return createEmptyEarningsMomentumDetection(
      [`Regime ${context.regime.regime} blocked.`],
      ["Market regime incompatible with Earnings Momentum."]
    );
  }
  if (
    config.compatibleRegimes.length > 0 &&
    !config.compatibleRegimes.includes(context.regime.regime)
  ) {
    return createEmptyEarningsMomentumDetection(
      ["Market regime not compatible."],
      ["Market regime incompatible with Earnings Momentum."]
    );
  }
  if (context.confidence.score < config.minRegimeConfidence) {
    return createEmptyEarningsMomentumDetection(
      ["Regime confidence too low."],
      ["Market regime confidence insufficient."]
    );
  }
  if (context.marketContext.volatility.score > config.maxVolatilityScore) {
    return createEmptyEarningsMomentumDetection(
      ["Volatility too high."],
      ["High volatility — Earnings Momentum rejected."]
    );
  }

  // Mixed results: beat on one, miss on the other with weak guidance
  const epsBeat = analysis.epsSurprise >= config.minEpsSurpriseBuy;
  const epsMiss = analysis.epsSurprise <= config.maxEpsSurpriseSell;
  const revBeat = analysis.revenueSurprise >= config.minRevenueSurpriseBuy;
  const revMiss = analysis.revenueSurprise <= config.maxRevenueSurpriseSell;
  const mixed =
    (epsBeat && revMiss && !analysis.guidanceUpgrade) ||
    (epsMiss && revBeat && !analysis.guidanceDowngrade);
  if (mixed) {
    return createEmptyEarningsMomentumDetection(
      ["Mixed results."],
      ["Mixed Results — EPS and revenue signals conflict."]
    );
  }

  if (
    fundamentals.guidance === "none" &&
    Math.abs(analysis.epsSurprise) < config.minEpsSurpriseBuy
  ) {
    return createEmptyEarningsMomentumDetection(
      ["Weak guidance."],
      ["Weak Guidance — no directional earnings catalyst."]
    );
  }

  const rs = data.relativeStrength;
  const swingWindow = candles.slice(-Math.min(10, candles.length));
  const swingLow = Math.min(...swingWindow.map((c) => c.low));
  const swingHigh = Math.max(...swingWindow.map((c) => c.high));

  let direction: EarningsMomentumDirection = "NONE";

  const buyFundamentals =
    epsBeat &&
    (revBeat || analysis.revenueSurprise >= 0) &&
    analysis.yoyGrowth >= config.minYoyGrowthBuy &&
    analysis.qoqGrowth >= config.minQoqGrowthBuy &&
    analysis.operatingMarginExpansion >= config.minMarginExpansionBuy &&
    !analysis.guidanceDowngrade &&
    (analysis.guidanceUpgrade ||
      fundamentals.managementCommentaryPositive !== false);

  const sellFundamentals =
    (epsMiss || analysis.guidanceDowngrade) &&
    (revMiss || analysis.guidanceDowngrade) &&
    analysis.operatingMarginExpansion <= config.maxMarginContractionSell;

  if (buyFundamentals) {
    if (
      config.requireRiskOnForBuy &&
      context.marketContext.riskMode !== "Risk On"
    ) {
      return createEmptyEarningsMomentumDetection(
        ["Risk ON required for BUY."],
        ["Risk ON required for positive earnings momentum."]
      );
    }
    if (!(ema20 > ema50)) {
      return createEmptyEarningsMomentumDetection(
        ["EMA20 not above EMA50."],
        ["Price confirmation failed — trend not supportive for BUY."]
      );
    }
    if (!(last.close >= data.vwap)) {
      return createEmptyEarningsMomentumDetection(
        ["Price below VWAP."],
        ["Price confirmation failed — below VWAP."]
      );
    }
    const rsOk =
      rs === null ||
      rs === undefined ||
      !Number.isFinite(rs) ||
      rs >= config.minRelativeStrengthBuy;
    if (!rsOk) {
      return createEmptyEarningsMomentumDetection(
        ["Weak Relative Strength."],
        ["Weak Relative Strength — leadership missing."]
      );
    }
    if (!validateSectorBullish(context.marketContext, config)) {
      return createEmptyEarningsMomentumDetection(
        ["Weak sector."],
        ["Weak Sector — leadership missing."]
      );
    }
    if (!validateBreadthBullish(context.marketContext, config)) {
      return createEmptyEarningsMomentumDetection(
        ["Weak breadth."],
        ["Weak Breadth — market participation missing."]
      );
    }
    direction = "BUY";
    reasons.push(
      `EPS exceeded analyst estimates by ${round(analysis.epsSurprise * 100, 1)}%.`
    );
    reasons.push(
      `Revenue growth significantly outperformed expectations (${round(analysis.revenueSurprise * 100, 1)}%).`
    );
    if (analysis.guidanceUpgrade) {
      reasons.push("Management upgraded forward guidance.");
    }
    reasons.push("Institutional buying confirmed after earnings.");
    reasons.push("Sector and market conditions support continuation.");
  } else if (sellFundamentals) {
    if (!(ema20 < ema50) && !(last.close < data.vwap)) {
      return createEmptyEarningsMomentumDetection(
        ["Price action not confirming negative earnings."],
        ["Negative earnings without price confirmation."]
      );
    }
    const rsWeak =
      rs === null ||
      rs === undefined ||
      !Number.isFinite(rs) ||
      rs <= config.maxRelativeStrengthSell;
    if (!rsWeak) {
      return createEmptyEarningsMomentumDetection(
        ["Relative strength too strong for SELL."],
        ["Negative earnings but RS still firm."]
      );
    }
    if (!validateSectorBearish(context.marketContext, config)) {
      return createEmptyEarningsMomentumDetection(
        ["Sector not weak enough for SELL."],
        ["Weak Sector required for negative earnings momentum."]
      );
    }
    if (!validateBreadthBearish(context.marketContext, config)) {
      return createEmptyEarningsMomentumDetection(
        ["Breadth not weak enough for SELL."],
        ["Weak Breadth required for negative earnings momentum."]
      );
    }
    const sellingConfirmed =
      fundamentals.institutionalSelling === true || volumeOk;
    if (!sellingConfirmed) {
      return createEmptyEarningsMomentumDetection(
        ["Distribution volume missing."],
        ["Heavy institutional selling not confirmed."]
      );
    }
    direction = "SELL";
    reasons.push(
      `EPS missed analyst estimates by ${round(Math.abs(analysis.epsSurprise) * 100, 1)}%.`
    );
    if (analysis.guidanceDowngrade) {
      reasons.push("Management downgraded forward guidance.");
    }
    reasons.push("Margin deterioration and distribution pressure.");
  } else {
    return createEmptyEarningsMomentumDetection(
      ["Earnings catalyst insufficient."],
      ["Earnings Analysis did not produce a directional signal."]
    );
  }

  const earningsQuality = scoreEarningsQuality(analysis);
  const guidanceQuality = scoreGuidanceQuality(fundamentals, analysis);
  const priceConfirmation =
    direction === "BUY"
      ? clamp(round(70 + (ema20 > ema50 ? 15 : 0) + (last.close >= data.vwap ? 10 : 0), 1), 0, 100)
      : clamp(round(70 + (ema20 < ema50 ? 15 : 0) + (last.close < data.vwap ? 10 : 0), 1), 0, 100);
  const volumeConfirmation = clamp(
    round(50 + (data.relativeVolume ?? 1) * 20 + (volumeOk ? 15 : 0), 1),
    0,
    100
  );

  const confidence = Math.max(
    config.confidenceFloor,
    calculateConfidence({
      earningsQuality,
      guidanceQuality,
      priceConfirmation,
      volumeConfirmation,
      relativeStrength: clamp(rs ?? (direction === "BUY" ? 60 : 40), 0, 100),
      sectorStrength: averageSectorScore(context.marketContext),
      riskRewardProxy: 70,
      config,
    })
  );

  return {
    detected: true,
    direction,
    epsActual: fundamentals.epsActual,
    epsEstimate: fundamentals.epsEstimate,
    epsSurprise: analysis.epsSurprise,
    revenueActual: fundamentals.revenueActual,
    revenueEstimate: fundamentals.revenueEstimate,
    revenueSurprise: analysis.revenueSurprise,
    guidance: fundamentals.guidance,
    marginExpansion: analysis.operatingMarginExpansion,
    earningsQuality,
    guidanceQuality,
    priceConfirmation,
    volumeConfirmation,
    ema20,
    ema50,
    vwap: data.vwap,
    atr,
    swingLow: round(swingLow, 4),
    swingHigh: round(swingHigh, 4),
    priceConfirmed: true,
    volumeConfirmed: volumeOk,
    rsConfirmed: true,
    breadthConfirmed: true,
    sectorConfirmed: true,
    marketConfirmed: true,
    institutionalConfirmed:
      direction === "BUY"
        ? fundamentals.institutionalBuying !== false
        : fundamentals.institutionalSelling === true || volumeOk,
    confidence,
    analysis,
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

export type { EarningsMomentumMarketData };
