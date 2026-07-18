/**
 * News Momentum utilities — Sprint 11B.3K.
 * Pure detection helpers for news catalyst momentum patterns.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import type { MarketRegimeLabel } from "@/src/modules/marketRegime";
import {
  DEFAULT_NEWS_MOMENTUM_CONFIG,
  resolveNewsMomentumConfig,
  type NewsMomentumConfig,
} from "./NewsMomentumConstants";
import type {
  NewsCatalystEvent,
  NewsCatalystType,
  NewsMomentumCandle,
  NewsMomentumDetection,
  NewsMomentumDetectionContext,
  NewsMomentumDirection,
  NewsQualityGrade,
} from "./NewsMomentumTypes";

export { resolveNewsMomentumConfig };

const BUY_CATALYST_TYPES: readonly NewsCatalystType[] = [
  "earnings_beat",
  "large_order_win",
  "government_order",
  "promoter_buying",
  "rating_upgrade",
  "regulatory_approval",
];

const SELL_CATALYST_TYPES: readonly NewsCatalystType[] = [
  "earnings_miss",
  "promoter_selling",
  "rating_downgrade",
  "regulatory_action",
];

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
  config: NewsMomentumConfig = DEFAULT_NEWS_MOMENTUM_CONFIG
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

export function newsQualityIndex(grade: NewsQualityGrade): number {
  switch (grade) {
    case "Ignore":
      return 0;
    case "Low":
      return 1;
    case "Medium":
      return 2;
    case "High":
      return 3;
    case "Very High":
      return 4;
    default:
      return 0;
  }
}

export function freshnessMinutes(
  event: NewsCatalystEvent,
  referenceTime: Date
): number {
  const delta = referenceTime.getTime() - event.publishedAt.getTime();
  return Math.max(0, round(delta / 60_000, 1));
}

export function scoreNewsQuality(
  event: NewsCatalystEvent,
  config: NewsMomentumConfig = DEFAULT_NEWS_MOMENTUM_CONFIG,
  referenceTime: Date = new Date()
): number {
  if (event.isDuplicate === true) return 0;
  if (event.isRumor === true || event.source === "rumor") return 0;

  const age = freshnessMinutes(event, referenceTime);
  if (age > config.maxNewsAgeMinutes) return 0;

  const credibility = clamp(event.credibility, 0, 100);
  const impact = clamp(event.impact, 0, 100);
  const relevance = clamp(event.marketRelevance, 0, 100);

  const freshnessScore = clamp(
    100 - (age / Math.max(config.maxNewsAgeMinutes, 1)) * 100,
    0,
    100
  );

  const composite = clamp(
    round(
      credibility * 0.3 +
        impact * 0.3 +
        relevance * 0.2 +
        freshnessScore * 0.2,
      1
    ),
    0,
    100
  );

  if (credibility < config.minCredibility) {
    return clamp(composite - 25, 0, 100);
  }
  if (impact < config.minImpact) {
    return clamp(composite - 15, 0, 100);
  }

  return composite;
}

export function classifyNewsCatalyst(
  event: NewsCatalystEvent,
  config: NewsMomentumConfig = DEFAULT_NEWS_MOMENTUM_CONFIG,
  referenceTime: Date = new Date()
): NewsQualityGrade {
  if (event.isDuplicate === true) return "Ignore";
  if (event.isRumor === true || event.source === "rumor") return "Ignore";

  const age = freshnessMinutes(event, referenceTime);
  if (age > config.maxNewsAgeMinutes) return "Ignore";

  const score = scoreNewsQuality(event, config, referenceTime);
  if (score <= 0) return "Ignore";
  if (score >= 88) return "Very High";
  if (score >= 72) return "High";
  if (score >= 55) return "Medium";
  if (score >= 35) return "Low";
  return "Ignore";
}

export function resolveCatalystDirection(
  event: NewsCatalystEvent
): Exclude<NewsMomentumDirection, "NONE"> | null {
  if (BUY_CATALYST_TYPES.includes(event.catalystType)) return "BUY";
  if (SELL_CATALYST_TYPES.includes(event.catalystType)) return "SELL";
  if (event.directionHint === "BUY" || event.directionHint === "SELL") {
    return event.directionHint;
  }
  return null;
}

export function calculateCatalystStrength(
  event: NewsCatalystEvent,
  quality: NewsQualityGrade,
  config: NewsMomentumConfig = DEFAULT_NEWS_MOMENTUM_CONFIG,
  referenceTime: Date = new Date()
): number {
  const qualityScore = scoreNewsQuality(event, config, referenceTime);
  const qualityBoost = newsQualityIndex(quality) * 8;
  return clamp(
    round(qualityScore * 0.55 + event.impact * 0.25 + qualityBoost, 1),
    0,
    100
  );
}

export function pickBestEligibleNewsEvent(
  events: readonly NewsCatalystEvent[],
  config: NewsMomentumConfig = DEFAULT_NEWS_MOMENTUM_CONFIG,
  referenceTime: Date = new Date()
): {
  event: NewsCatalystEvent | null;
  quality: NewsQualityGrade;
  catalystStrength: number;
} {
  let best: NewsCatalystEvent | null = null;
  let bestQuality: NewsQualityGrade = "Ignore";
  let bestStrength = 0;
  let bestIndex = -1;

  for (const event of events) {
    const quality = classifyNewsCatalyst(event, config, referenceTime);
    const index = newsQualityIndex(quality);
    if (index < config.minNewsQualityIndex) continue;

    const strength = calculateCatalystStrength(
      event,
      quality,
      config,
      referenceTime
    );
    const tieBreak =
      index * 1000 + strength + event.impact + event.credibility;

    if (tieBreak > bestIndex) {
      best = event;
      bestQuality = quality;
      bestStrength = strength;
      bestIndex = tieBreak;
    }
  }

  return {
    event: best,
    quality: bestQuality,
    catalystStrength: bestStrength,
  };
}

function averageVolume(
  candles: readonly NewsMomentumCandle[],
  excludeLast = 1
): number {
  const slice = candles.slice(0, Math.max(candles.length - excludeLast, 0));
  if (slice.length === 0) return candles[candles.length - 1]?.volume ?? 0;
  return slice.reduce((s, c) => s + c.volume, 0) / slice.length;
}

function isCircuitMove(
  candle: NewsMomentumCandle,
  config: NewsMomentumConfig
): boolean {
  const mid = (candle.high + candle.low) / 2 || candle.close;
  if (!Number.isFinite(mid) || mid <= 0) return false;
  return (candle.high - candle.low) / mid >= config.circuitMovePct;
}

export function validatePriceConfirmation(
  direction: Exclude<NewsMomentumDirection, "NONE">,
  candles: readonly NewsMomentumCandle[]
): { confirmed: boolean; score: number; reasons: string[]; warnings: string[] } {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const last = candles[candles.length - 1];
  const prior = candles[candles.length - 2];
  if (!last) {
    return {
      confirmed: false,
      score: 20,
      reasons: [],
      warnings: ["Price data missing."],
    };
  }

  if (direction === "BUY") {
    const bullishClose = last.close >= last.open;
    const higherClose =
      prior === undefined || last.close >= prior.close * 0.9995;
    const confirmed = bullishClose && higherClose;
    if (confirmed) {
      reasons.push("Price confirms news acceptance.");
      return { confirmed: true, score: 85, reasons, warnings };
    }
    warnings.push("Contradictory price — bullish news not confirmed by price.");
    return { confirmed: false, score: 25, reasons, warnings };
  }

  const bearishClose = last.close <= last.open;
  const lowerClose =
    prior === undefined || last.close <= prior.close * 1.0005;
  const confirmed = bearishClose && lowerClose;
  if (confirmed) {
    reasons.push("Price confirms news acceptance.");
    return { confirmed: true, score: 85, reasons, warnings };
  }
  warnings.push("Contradictory price — bearish news not confirmed by price.");
  return { confirmed: false, score: 25, reasons, warnings };
}

export function validateEmaAlignment(
  direction: Exclude<NewsMomentumDirection, "NONE">,
  price: number,
  ema20: number,
  ema50: number,
  config: NewsMomentumConfig
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
  direction: Exclude<NewsMomentumDirection, "NONE">,
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
        reasons: ["Price above VWAP supports news momentum long."],
        warnings: [],
      };
    }
    return {
      aligned: false,
      score: 30,
      reasons: [],
      warnings: ["Price below VWAP — bullish news momentum rejected."],
    };
  }
  if (price <= vwap) {
    return {
      aligned: true,
      score: 80,
      reasons: ["Price below VWAP supports news momentum short."],
      warnings: [],
    };
  }
  return {
    aligned: false,
    score: 30,
    reasons: [],
    warnings: ["Price above VWAP — bearish news momentum rejected."],
  };
}

export function validateVolume(
  candles: readonly NewsMomentumCandle[],
  relativeVolume: number | null,
  config: NewsMomentumConfig
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

  const avgVol = averageVolume(candles);
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
      warnings: ["Weak volume — relative volume below threshold."],
    };
  }

  if (
    !spike &&
    (relativeVolume === null ||
      relativeVolume < config.preferredRelativeVolume)
  ) {
    warnings.push("Weak volume — institutional participation not confirmed.");
  } else {
    reasons.push("Institutional volume validates catalyst.");
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
  direction: Exclude<NewsMomentumDirection, "NONE">,
  context: InstitutionalMarketContext,
  config: NewsMomentumConfig = DEFAULT_NEWS_MOMENTUM_CONFIG
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
        reasons: ["Momentum supported by overall market."],
        warnings: [],
      };
    }
    return {
      confirmed: false,
      score: clamp(score!, 0, 100),
      reasons: [],
      warnings: ["Weak breadth — market participation insufficient."],
    };
  }
  if (score! <= config.bearishBreadthMax) {
    return {
      confirmed: true,
      score: clamp(100 - score!, 0, 100),
      reasons: ["Momentum supported by overall market."],
      warnings: [],
    };
  }
  return {
    confirmed: false,
    score: clamp(score!, 0, 100),
    reasons: [],
    warnings: ["Weak breadth for bearish news momentum."],
  };
}

export function validateSector(
  direction: Exclude<NewsMomentumDirection, "NONE">,
  context: InstitutionalMarketContext,
  config: NewsMomentumConfig = DEFAULT_NEWS_MOMENTUM_CONFIG
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
        reasons: ["Sector also strengthening."],
        warnings: [],
      };
    }
    return {
      confirmed: false,
      score: avg,
      reasons: [],
      warnings: ["Weak sector — news momentum insufficient."],
    };
  }
  if (avg <= config.bearishSectorMax) {
    return {
      confirmed: true,
      score: clamp(100 - avg, 0, 100),
      reasons: ["Sector also strengthening."],
      warnings: [],
    };
  }
  return {
    confirmed: false,
    score: avg,
    reasons: [],
    warnings: ["Weak sector for bearish news momentum."],
  };
}

export function validateMarket(
  direction: Exclude<NewsMomentumDirection, "NONE">,
  regime: MarketRegimeLabel,
  riskMode: InstitutionalMarketContext["riskMode"],
  regimeConfidence: number,
  volatilityScore: number,
  config: NewsMomentumConfig = DEFAULT_NEWS_MOMENTUM_CONFIG
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

  if (config.blockedRegimes.includes(regime)) {
    return {
      confirmed: false,
      score: 20,
      reasons: [],
      warnings: [`Incompatible regime ${regime} — news momentum rejected.`],
    };
  }

  if (direction === "BUY" && config.bullBlockedRegimes.includes(regime)) {
    return {
      confirmed: false,
      score: 20,
      reasons: [],
      warnings: [`Regime ${regime} blocks bullish news momentum.`],
    };
  }
  if (direction === "SELL" && config.bearBlockedRegimes.includes(regime)) {
    return {
      confirmed: false,
      score: 20,
      reasons: [],
      warnings: [`Regime ${regime} blocks bearish news momentum.`],
    };
  }

  if (!config.compatibleRegimes.includes(regime)) {
    return {
      confirmed: false,
      score: 25,
      reasons: [],
      warnings: [`Regime ${regime} not compatible with news momentum.`],
    };
  }

  if (volatilityScore < config.minVolatilityScore) {
    return {
      confirmed: false,
      score: 20,
      reasons: [],
      warnings: ["Volatility too low for event-driven news momentum."],
    };
  }

  reasons.push("Momentum supported by overall market.");
  score += 20;

  if (regimeConfidence >= config.minRegimeConfidence) {
    score += 15;
  } else {
    warnings.push("Regime confidence below news momentum threshold.");
    score -= 20;
  }

  return {
    confirmed:
      config.compatibleRegimes.includes(regime) &&
      !config.blockedRegimes.includes(regime) &&
      !config.blockedRiskModes.includes(riskMode) &&
      regimeConfidence >= config.minRegimeConfidence &&
      volatilityScore >= config.minVolatilityScore &&
      !(direction === "BUY" && config.bullBlockedRegimes.includes(regime)) &&
      !(direction === "SELL" && config.bearBlockedRegimes.includes(regime)),
    score: clamp(score, config.scoreFloor, config.scoreCeiling),
    reasons,
    warnings,
  };
}

export function calculateConfidence(input: {
  newsQualityScore: number;
  priceScore: number;
  volumeScore: number;
  sectorScore: number;
  breadthScore: number;
  marketScore: number;
  vwapScore: number;
  config?: NewsMomentumConfig;
}): number {
  const config = input.config ?? DEFAULT_NEWS_MOMENTUM_CONFIG;
  const w = config.confidenceWeights;
  const composite =
    input.newsQualityScore * w.newsQuality +
    input.priceScore * w.priceConfirmation +
    input.volumeScore * w.volumeConfirmation +
    input.sectorScore * w.sector +
    input.breadthScore * w.breadth +
    input.marketScore * w.market +
    input.vwapScore * w.vwap;
  return clamp(
    round(composite, 1),
    config.confidenceFloor,
    config.scoreCeiling
  );
}

export function createEmptyNewsMomentumDetection(
  warnings: string[],
  reasons: string[] = []
): NewsMomentumDetection {
  return {
    detected: false,
    direction: "NONE",
    catalystType: "unknown",
    catalystStrength: 0,
    newsQuality: "Ignore",
    credibility: 0,
    impact: 0,
    freshnessMinutes: 0,
    ema20: 0,
    ema50: 0,
    vwap: 0,
    priceConfirmed: false,
    volumeConfirmed: false,
    breadthConfirmed: false,
    sectorConfirmed: false,
    marketConfirmed: false,
    confidence: 0,
    reasons,
    warnings,
  };
}

function catalystReason(event: NewsCatalystEvent): string {
  switch (event.catalystType) {
    case "earnings_beat":
      return "Strong earnings surprise confirmed.";
    case "large_order_win":
    case "government_order":
      return "Large order win confirmed by price action.";
    case "promoter_buying":
      return "Promoter buying catalyst detected.";
    case "rating_upgrade":
      return "Rating upgrade supports bullish momentum.";
    case "regulatory_approval":
      return "Regulatory approval supports bullish momentum.";
    case "earnings_miss":
      return "Earnings miss confirmed by price action.";
    case "promoter_selling":
      return "Promoter selling catalyst detected.";
    case "rating_downgrade":
      return "Rating downgrade supports bearish momentum.";
    case "regulatory_action":
      return "Regulatory action supports bearish momentum.";
    default:
      return `News catalyst ${event.catalystType} detected.`;
  }
}

/**
 * Full news momentum detection.
 */
export function detectNewsMomentum(
  context: NewsMomentumDetectionContext
): NewsMomentumDetection {
  const config = resolveNewsMomentumConfig(context.config);
  const data = context.input.newsMomentum;
  const candles = data.candles5m;
  const warnings: string[] = [];
  const reasons: string[] = [];
  const referenceTime =
    context.timestamp ?? candles[candles.length - 1]?.timestamp ?? new Date();

  const last = candles[candles.length - 1];
  if (!last) {
    return createEmptyNewsMomentumDetection(["Missing candles."]);
  }

  if (isCircuitMove(last, config)) {
    return createEmptyNewsMomentumDetection(
      ["Circuit movement — news momentum rejected."],
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
    return createEmptyNewsMomentumDetection(["EMA20/EMA50 missing."]);
  }

  if (!Array.isArray(data.newsEvents) || data.newsEvents.length === 0) {
    return createEmptyNewsMomentumDetection(["No news events available."]);
  }

  const picked = pickBestEligibleNewsEvent(
    data.newsEvents,
    config,
    referenceTime
  );
  if (!picked.event) {
    const hasDuplicate = data.newsEvents.some((e) => e.isDuplicate === true);
    const hasRumor = data.newsEvents.some(
      (e) => e.isRumor === true || e.source === "rumor"
    );
    const hasOld = data.newsEvents.some(
      (e) => freshnessMinutes(e, referenceTime) > config.maxNewsAgeMinutes
    );
    if (hasDuplicate) {
      warnings.push("Duplicate news — catalyst ignored.");
    }
    if (hasRumor) {
      warnings.push("Rumor news — catalyst rejected.");
    }
    if (hasOld) {
      warnings.push("Old news — exceeds maxNewsAgeMinutes.");
    }
    return createEmptyNewsMomentumDetection(
      [...warnings, "No eligible news catalyst meeting quality threshold."],
      reasons
    );
  }

  const event = picked.event;
  const direction = resolveCatalystDirection(event);
  if (!direction) {
    return createEmptyNewsMomentumDetection(
      ["Unable to resolve catalyst direction."],
      reasons
    );
  }

  if (event.credibility < config.minCredibility) {
    return createEmptyNewsMomentumDetection(
      ["Low credibility — news catalyst rejected."],
      reasons
    );
  }

  reasons.push(catalystReason(event));

  const price = validatePriceConfirmation(direction, candles);
  warnings.push(...price.warnings);
  reasons.push(...price.reasons);

  const ema = validateEmaAlignment(
    direction,
    last.close,
    ema20,
    ema50,
    config
  );
  warnings.push(...ema.warnings);
  reasons.push(...ema.reasons);

  const vwapCheck = validateVwapAlignment(direction, last.close, data.vwap);
  warnings.push(...vwapCheck.warnings);
  reasons.push(...vwapCheck.reasons);

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
    config
  );
  warnings.push(...market.warnings);
  reasons.push(...market.reasons);

  const freshness = freshnessMinutes(event, referenceTime);
  const newsQualityScore = scoreNewsQuality(event, config, referenceTime);

  const confidence = calculateConfidence({
    newsQualityScore,
    priceScore: price.score,
    volumeScore: volume.score,
    sectorScore: sector.score,
    breadthScore: breadth.score,
    marketScore: market.score,
    vwapScore: vwapCheck.score,
    config,
  });

  const baseDetection: NewsMomentumDetection = {
    detected: false,
    direction,
    catalystType: event.catalystType,
    catalystStrength: picked.catalystStrength,
    newsQuality: picked.quality,
    credibility: event.credibility,
    impact: event.impact,
    freshnessMinutes: freshness,
    ema20,
    ema50,
    vwap: data.vwap,
    priceConfirmed: price.confirmed,
    volumeConfirmed: volume.confirmed,
    breadthConfirmed: breadth.confirmed,
    sectorConfirmed: sector.confirmed,
    marketConfirmed: market.confirmed,
    confidence,
    reasons: dedupe(reasons),
    warnings: dedupe(warnings),
  };

  if (
    !price.confirmed ||
    !ema.aligned ||
    !vwapCheck.aligned ||
    !volume.confirmed ||
    !breadth.confirmed ||
    !sector.confirmed ||
    !market.confirmed
  ) {
    return baseDetection;
  }

  reasons.push(`News Momentum ${direction} detected.`);

  return {
    ...baseDetection,
    detected: true,
    reasons: dedupe([...reasons, `News Momentum ${direction} detected.`]),
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
