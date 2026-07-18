/**
 * Institutional Accumulation utilities — Sprint 11B.3H.
 * Pure detection helpers for accumulation / distribution patterns.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import type { MarketRegimeLabel } from "@/src/modules/marketRegime";
import {
  DEFAULT_INSTITUTIONAL_ACCUMULATION_CONFIG,
  resolveInstitutionalAccumulationConfig,
  type InstitutionalAccumulationConfig,
} from "./InstitutionalAccumulationConstants";
import type {
  InstitutionalAccumulationCandle,
  InstitutionalAccumulationDetection,
  InstitutionalAccumulationDetectionContext,
  InstitutionalAccumulationDirection,
  InstitutionalAccumulationPattern,
} from "./InstitutionalAccumulationTypes";

export { resolveInstitutionalAccumulationConfig };

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
  config: InstitutionalAccumulationConfig = DEFAULT_INSTITUTIONAL_ACCUMULATION_CONFIG
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

function barRange(c: InstitutionalAccumulationCandle): number {
  return Math.max(c.high - c.low, 0.0001);
}

function closePositionInBar(c: InstitutionalAccumulationCandle): number {
  const range = barRange(c);
  return (c.close - c.low) / range;
}

function averageVolume(
  candles: readonly InstitutionalAccumulationCandle[],
  excludeLast = 1
): number {
  const slice = candles.slice(0, Math.max(candles.length - excludeLast, 0));
  if (slice.length === 0) return candles[candles.length - 1]?.volume ?? 0;
  return slice.reduce((s, c) => s + c.volume, 0) / slice.length;
}

function isCircuitMove(
  candle: InstitutionalAccumulationCandle,
  config: InstitutionalAccumulationConfig
): boolean {
  const mid = (candle.high + candle.low) / 2 || candle.close;
  if (!Number.isFinite(mid) || mid <= 0) return false;
  return (candle.high - candle.low) / mid >= config.circuitMovePct;
}

function levelsEqual(a: number, b: number, tolerancePct: number): boolean {
  const mid = (a + b) / 2 || a;
  if (!Number.isFinite(mid) || mid <= 0) return false;
  return Math.abs(a - b) / mid <= tolerancePct;
}

export function detectTrendStructure(
  candles: readonly InstitutionalAccumulationCandle[],
  lookback: number
): {
  bullish: boolean;
  bearish: boolean;
  higherLows: boolean;
  lowerHighs: boolean;
  score: number;
  reasons: string[];
  warnings: string[];
} {
  const window = candles.slice(-Math.max(lookback, 4));
  if (window.length < 4) {
    return {
      bullish: false,
      bearish: false,
      higherLows: false,
      lowerHighs: false,
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

  if (higherLows && (higherHighs || lateLow > earlyLow * 1.001)) {
    return {
      bullish: true,
      bearish: false,
      higherLows: true,
      lowerHighs: false,
      score: 85,
      reasons: ["Higher lows confirm accumulation structure."],
      warnings: [],
    };
  }
  if (lowerHighs && (lowerLows || lateHigh < earlyHigh * 0.999)) {
    return {
      bullish: false,
      bearish: true,
      higherLows: false,
      lowerHighs: true,
      score: 85,
      reasons: ["Lower highs confirm distribution structure."],
      warnings: [],
    };
  }
  return {
    bullish: false,
    bearish: false,
    higherLows: false,
    lowerHighs: false,
    score: 30,
    reasons: [],
    warnings: ["Weak Trend — structure not clearly directional."],
  };
}

export function computeDemandZone(
  candles: readonly InstitutionalAccumulationCandle[],
  lookback: number
): { low: number; high: number } {
  const window = candles.slice(-Math.max(lookback, 2));
  if (window.length === 0) return { low: 0, high: 0 };
  const low = Math.min(...window.map((c) => c.low));
  const high = Math.max(...window.map((c) => c.high));
  return { low, high };
}

function detectHighVolumeBreakout(
  candles: readonly InstitutionalAccumulationCandle[],
  direction: Exclude<InstitutionalAccumulationDirection, "NONE">,
  config: InstitutionalAccumulationConfig
): { matched: boolean; score: number; reason: string } {
  const last = candles[candles.length - 1];
  if (!last) return { matched: false, score: 0, reason: "" };
  const avgVol = averageVolume(candles);
  const volOk = avgVol > 0 && last.volume >= avgVol * config.accumulationVolumeMultiple;
  const pos = closePositionInBar(last);
  if (direction === "BUY") {
    const nearHigh = pos >= config.closeNearExtremeFraction;
    if (volOk && nearHigh && last.close >= last.open) {
      return {
        matched: true,
        score: 88,
        reason: "High volume breakout closing near highs.",
      };
    }
  } else {
    const nearLow = pos <= 1 - config.closeNearExtremeFraction;
    if (volOk && nearLow && last.close <= last.open) {
      return {
        matched: true,
        score: 88,
        reason: "High volume breakdown closing near lows.",
      };
    }
  }
  return { matched: false, score: 0, reason: "" };
}

function detectAbsorption(
  candles: readonly InstitutionalAccumulationCandle[],
  direction: Exclude<InstitutionalAccumulationDirection, "NONE">,
  config: InstitutionalAccumulationConfig
): { matched: boolean; score: number; reason: string } {
  const last = candles[candles.length - 1];
  if (!last) return { matched: false, score: 0, reason: "" };
  const avgVol = averageVolume(candles);
  const volOk = avgVol > 0 && last.volume >= avgVol * config.accumulationVolumeMultiple;
  if (!volOk) return { matched: false, score: 0, reason: "" };

  const range = barRange(last);
  if (direction === "BUY") {
    const downside = (Math.min(last.open, last.close) - last.low) / range;
    if (downside <= config.maxAbsorptionDownsideFraction && last.close >= last.open) {
      return {
        matched: true,
        score: 86,
        reason: "Large volume without price breakdown.",
      };
    }
  } else {
    const upside = (last.high - Math.max(last.open, last.close)) / range;
    if (upside <= config.maxAbsorptionDownsideFraction && last.close <= last.open) {
      return {
        matched: true,
        score: 86,
        reason: "Heavy supply absorbed without upside follow-through.",
      };
    }
  }
  return { matched: false, score: 0, reason: "" };
}

function detectShakeoutRecovery(
  candles: readonly InstitutionalAccumulationCandle[],
  direction: Exclude<InstitutionalAccumulationDirection, "NONE">,
  zoneLow: number,
  zoneHigh: number,
  config: InstitutionalAccumulationConfig
): { matched: boolean; score: number; reason: string } {
  const last = candles[candles.length - 1];
  if (!last || zoneLow <= 0) return { matched: false, score: 0, reason: "" };
  const range = barRange(last);
  if (direction === "BUY") {
    const lowerWick = (Math.min(last.open, last.close) - last.low) / range;
    const swept = last.low < zoneLow * (1 + config.equalLevelTolerancePct);
    const recovered = last.close > zoneLow && last.close >= last.open;
    if (
      lowerWick >= config.minShakeoutWickFraction &&
      swept &&
      recovered
    ) {
      return {
        matched: true,
        score: 84,
        reason: "Shakeout sweep recovered above demand zone.",
      };
    }
  } else {
    const upperWick = (last.high - Math.max(last.open, last.close)) / range;
    const swept = last.high > zoneHigh * (1 - config.equalLevelTolerancePct);
    const recovered = last.close < zoneHigh && last.close <= last.open;
    if (
      upperWick >= config.minShakeoutWickFraction &&
      swept &&
      recovered
    ) {
      return {
        matched: true,
        score: 84,
        reason: "Shakeout sweep recovered below supply zone.",
      };
    }
  }
  return { matched: false, score: 0, reason: "" };
}

function detectDemandZoneDefense(
  candles: readonly InstitutionalAccumulationCandle[],
  direction: Exclude<InstitutionalAccumulationDirection, "NONE">,
  zoneLow: number,
  zoneHigh: number,
  config: InstitutionalAccumulationConfig
): { matched: boolean; score: number; reason: string } {
  const window = candles.slice(-config.demandZoneLookbackBars);
  if (window.length < 2 || zoneLow <= 0) {
    return { matched: false, score: 0, reason: "" };
  }

  if (direction === "BUY") {
    let touches = 0;
    for (const c of window) {
      if (levelsEqual(c.low, zoneLow, config.equalLevelTolerancePct)) touches += 1;
      else if (c.low <= zoneLow * (1 + config.equalLevelTolerancePct * 2)) touches += 1;
    }
    if (touches >= config.minDemandZoneTouches) {
      return {
        matched: true,
        score: 82,
        reason: "Demand zone defended multiple times.",
      };
    }
  } else {
    let touches = 0;
    for (const c of window) {
      if (levelsEqual(c.high, zoneHigh, config.equalLevelTolerancePct)) touches += 1;
      else if (c.high >= zoneHigh * (1 - config.equalLevelTolerancePct * 2)) touches += 1;
    }
    if (touches >= config.minDemandZoneTouches) {
      return {
        matched: true,
        score: 82,
        reason: "Supply zone defended multiple times.",
      };
    }
  }
  return { matched: false, score: 0, reason: "" };
}

function detectVolumeDryUpBreakout(
  candles: readonly InstitutionalAccumulationCandle[],
  direction: Exclude<InstitutionalAccumulationDirection, "NONE">,
  config: InstitutionalAccumulationConfig
): { matched: boolean; score: number; reason: string } {
  if (candles.length < 4) return { matched: false, score: 0, reason: "" };
  const prior = candles.slice(-4, -1);
  const last = candles[candles.length - 1]!;
  const avgVol = averageVolume(candles, 1);
  const dryUp = prior.every(
    (c) => avgVol > 0 && c.volume <= avgVol * config.volumeDryUpMaxMultiple
  );
  const expansion =
    avgVol > 0 && last.volume >= avgVol * config.accumulationVolumeMultiple;
  if (!dryUp || !expansion) return { matched: false, score: 0, reason: "" };

  if (direction === "BUY" && last.close > prior[prior.length - 1]!.close) {
    return {
      matched: true,
      score: 80,
      reason: "Volume dry-up followed by expansion breakout.",
    };
  }
  if (direction === "SELL" && last.close < prior[prior.length - 1]!.close) {
    return {
      matched: true,
      score: 80,
      reason: "Volume dry-up followed by distribution expansion.",
    };
  }
  return { matched: false, score: 0, reason: "" };
}

function detectHiddenBuying(
  candles: readonly InstitutionalAccumulationCandle[],
  direction: Exclude<InstitutionalAccumulationDirection, "NONE">,
  config: InstitutionalAccumulationConfig
): { matched: boolean; score: number; reason: string } {
  const window = candles.slice(-Math.max(config.patternLookbackBars, 4));
  if (window.length < 3) return { matched: false, score: 0, reason: "" };
  const avgVol = averageVolume(candles);

  if (direction === "BUY") {
    const upBars = window.filter((c) => c.close > c.open);
    const stealth = upBars.filter(
      (c) =>
        avgVol > 0 &&
        c.volume >= avgVol * config.minRelativeVolume &&
        c.volume <= avgVol * config.accumulationVolumeMultiple &&
        (c.close - c.open) / barRange(c) < 0.55
    );
    if (stealth.length >= 2 && upBars.length >= 2) {
      return {
        matched: true,
        score: 78,
        reason: "Repeated accumulation detected.",
      };
    }
  } else {
    const downBars = window.filter((c) => c.close < c.open);
    const stealth = downBars.filter(
      (c) =>
        avgVol > 0 &&
        c.volume >= avgVol * config.minRelativeVolume &&
        c.volume <= avgVol * config.accumulationVolumeMultiple &&
        (c.open - c.close) / barRange(c) < 0.55
    );
    if (stealth.length >= 2 && downBars.length >= 2) {
      return {
        matched: true,
        score: 78,
        reason: "Repeated distribution detected.",
      };
    }
  }
  return { matched: false, score: 0, reason: "" };
}

function detectBaseBuilding(
  candles: readonly InstitutionalAccumulationCandle[],
  direction: Exclude<InstitutionalAccumulationDirection, "NONE">,
  config: InstitutionalAccumulationConfig
): { matched: boolean; score: number; reason: string } {
  const window = candles.slice(-Math.max(config.patternLookbackBars, 4));
  if (window.length < 4) return { matched: false, score: 0, reason: "" };

  const highs = window.map((c) => c.high);
  const lows = window.map((c) => c.low);
  const rangePct =
    (Math.max(...highs) - Math.min(...lows)) /
    (window[window.length - 1]!.close || 1);
  const tight = rangePct <= 0.025;

  const structure = detectTrendStructure(window, window.length);
  if (direction === "BUY" && tight && structure.higherLows) {
    return {
      matched: true,
      score: 76,
      reason: "Base building with higher lows.",
    };
  }
  if (direction === "SELL" && tight && structure.lowerHighs) {
    return {
      matched: true,
      score: 76,
      reason: "Distribution base with lower highs.",
    };
  }
  return { matched: false, score: 0, reason: "" };
}

function detectDistributionPattern(
  candles: readonly InstitutionalAccumulationCandle[],
  config: InstitutionalAccumulationConfig
): { matched: boolean; score: number; reason: string } {
  const breakout = detectHighVolumeBreakout(candles, "SELL", config);
  if (breakout.matched) {
    return { ...breakout, reason: "Institutional distribution on high volume." };
  }
  const absorption = detectAbsorption(candles, "SELL", config);
  if (absorption.matched) return absorption;
  const hidden = detectHiddenBuying(candles, "SELL", config);
  if (hidden.matched) return hidden;
  return { matched: false, score: 0, reason: "" };
}

function resolveAccumulationPattern(
  candles: readonly InstitutionalAccumulationCandle[],
  direction: Exclude<InstitutionalAccumulationDirection, "NONE">,
  zone: { low: number; high: number },
  config: InstitutionalAccumulationConfig
): {
  pattern: InstitutionalAccumulationPattern;
  score: number;
  reasons: string[];
} {
  const candidates: Array<{
    pattern: InstitutionalAccumulationPattern;
    score: number;
    reason: string;
  }> = [];

  if (direction === "SELL") {
    const dist = detectDistributionPattern(candles, config);
    if (dist.matched) {
      candidates.push({
        pattern: "distribution",
        score: dist.score,
        reason: dist.reason,
      });
    }
  }

  const checks: Array<{
    pattern: InstitutionalAccumulationPattern;
    result: { matched: boolean; score: number; reason: string };
  }> = [
    {
      pattern: "high_volume_breakout",
      result: detectHighVolumeBreakout(candles, direction, config),
    },
    {
      pattern: "absorption",
      result: detectAbsorption(candles, direction, config),
    },
    {
      pattern: "shakeout_recovery",
      result: detectShakeoutRecovery(
        candles,
        direction,
        zone.low,
        zone.high,
        config
      ),
    },
    {
      pattern: "demand_zone_defense",
      result: detectDemandZoneDefense(
        candles,
        direction,
        zone.low,
        zone.high,
        config
      ),
    },
    {
      pattern: "volume_dry_up",
      result: detectVolumeDryUpBreakout(candles, direction, config),
    },
    {
      pattern: "hidden_buying",
      result: detectHiddenBuying(candles, direction, config),
    },
    {
      pattern: "base_building",
      result: detectBaseBuilding(candles, direction, config),
    },
  ];

  for (const check of checks) {
    if (check.result.matched) {
      candidates.push({
        pattern: check.pattern,
        score: check.result.score,
        reason: check.result.reason,
      });
    }
  }

  if (candidates.length === 0) {
    return { pattern: "none", score: 25, reasons: [] };
  }

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0]!;
  return {
    pattern: best.pattern,
    score: best.score,
    reasons: [best.reason],
  };
}

export function validateEmaAlignment(
  direction: Exclude<InstitutionalAccumulationDirection, "NONE">,
  price: number,
  ema20: number,
  ema50: number,
  config: InstitutionalAccumulationConfig
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
  direction: Exclude<InstitutionalAccumulationDirection, "NONE">,
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
        reasons: ["Price above VWAP supports accumulation."],
        warnings: [],
      };
    }
    return {
      aligned: false,
      score: 30,
      reasons: [],
      warnings: ["Price below VWAP — accumulation rejected."],
    };
  }
  if (price <= vwap) {
    return {
      aligned: true,
      score: 80,
      reasons: ["Price below VWAP supports distribution."],
      warnings: [],
    };
  }
  return {
    aligned: false,
    score: 30,
    reasons: [],
    warnings: ["Price above VWAP — distribution rejected."],
  };
}

export function validateVolume(
  candles: readonly InstitutionalAccumulationCandle[],
  relativeVolume: number | null,
  config: InstitutionalAccumulationConfig
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
    avgVol > 0 && last.volume >= avgVol * config.accumulationVolumeMultiple;

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
  direction: Exclude<InstitutionalAccumulationDirection, "NONE">,
  context: InstitutionalMarketContext,
  config: InstitutionalAccumulationConfig = DEFAULT_INSTITUTIONAL_ACCUMULATION_CONFIG
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
        reasons: ["Market breadth supports continuation."],
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
      reasons: ["Market breadth confirms distribution."],
      warnings: [],
    };
  }
  return {
    confirmed: false,
    score: clamp(score!, 0, 100),
    reasons: [],
    warnings: ["Weak Breadth for distribution."],
  };
}

export function validateSector(
  direction: Exclude<InstitutionalAccumulationDirection, "NONE">,
  context: InstitutionalMarketContext,
  config: InstitutionalAccumulationConfig = DEFAULT_INSTITUTIONAL_ACCUMULATION_CONFIG
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
        reasons: ["Sector participation confirms institutional buying."],
        warnings: [],
      };
    }
    return {
      confirmed: false,
      score: avg,
      reasons: [],
      warnings: ["Weak Sector — accumulation insufficient."],
    };
  }
  if (avg <= config.bearishSectorMax) {
    return {
      confirmed: true,
      score: clamp(100 - avg, 0, 100),
      reasons: ["Sector weakness supports distribution."],
      warnings: [],
    };
  }
  return {
    confirmed: false,
    score: avg,
    reasons: [],
    warnings: ["Weak Sector for distribution."],
  };
}

export function validateMarket(
  direction: Exclude<InstitutionalAccumulationDirection, "NONE">,
  regime: MarketRegimeLabel,
  riskMode: InstitutionalMarketContext["riskMode"],
  regimeConfidence: number,
  volatilityScore: number,
  newsDriven: boolean,
  config: InstitutionalAccumulationConfig = DEFAULT_INSTITUTIONAL_ACCUMULATION_CONFIG
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
      warnings: ["News spike — accumulation rejected."],
    };
  }

  if (config.blockedRegimes.includes(regime)) {
    return {
      confirmed: false,
      score: 20,
      reasons: [],
      warnings: [`Regime ${regime} blocked for institutional accumulation.`],
    };
  }

  if (direction === "BUY" && config.bullBlockedRegimes.includes(regime)) {
    return {
      confirmed: false,
      score: 20,
      reasons: [],
      warnings: [`Regime ${regime} blocks bullish accumulation.`],
    };
  }
  if (direction === "SELL" && config.bearBlockedRegimes.includes(regime)) {
    return {
      confirmed: false,
      score: 20,
      reasons: [],
      warnings: [`Regime ${regime} blocks bearish distribution.`],
    };
  }

  if (!config.compatibleRegimes.includes(regime)) {
    return {
      confirmed: false,
      score: 25,
      reasons: [],
      warnings: [`Regime ${regime} not compatible with accumulation.`],
    };
  }
  reasons.push("Trade aligns with market regime.");
  score += 20;

  if (config.preferredRiskModes.includes(riskMode)) {
    score += 10;
    reasons.push("Risk On environment preferred for accumulation.");
  } else if (riskMode === "Neutral") {
    warnings.push("Neutral risk mode — reduced accumulation confidence.");
    score -= 5;
  }

  if (regimeConfidence >= config.minRegimeConfidence) {
    score += 15;
  } else {
    warnings.push("Regime confidence below accumulation threshold.");
    score -= 20;
  }

  if (volatilityScore > config.maxVolatilityScore) {
    warnings.push("Volatility too elevated for clean accumulation.");
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

export function calculateConfidence(input: {
  accumulationScore: number;
  volumeScore: number;
  trendScore: number;
  breadthScore: number;
  sectorScore: number;
  marketScore: number;
  vwapScore: number;
  config?: InstitutionalAccumulationConfig;
}): number {
  const config = input.config ?? DEFAULT_INSTITUTIONAL_ACCUMULATION_CONFIG;
  const w = config.confidenceWeights;
  const composite =
    input.accumulationScore * w.accumulationQuality +
    input.volumeScore * w.volumeQuality +
    input.trendScore * w.trendStructure +
    input.breadthScore * w.breadth +
    input.sectorScore * w.sector +
    input.marketScore * w.market +
    input.vwapScore * w.vwap;
  return clamp(
    round(composite, 1),
    config.confidenceFloor,
    config.scoreCeiling
  );
}

export function createEmptyInstitutionalAccumulationDetection(
  warnings: string[],
  reasons: string[] = []
): InstitutionalAccumulationDetection {
  return {
    detected: false,
    direction: "NONE",
    pattern: "none",
    demandZoneLow: 0,
    demandZoneHigh: 0,
    accumulationScore: 0,
    volumeQuality: 0,
    ema20: 0,
    ema50: 0,
    vwap: 0,
    higherLows: false,
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
 * Full institutional accumulation detection.
 */
export function detectInstitutionalAccumulation(
  context: InstitutionalAccumulationDetectionContext
): InstitutionalAccumulationDetection {
  const config = resolveInstitutionalAccumulationConfig(context.config);
  const data = context.input.institutionalAccumulation;
  const candles = data.candles5m;
  const warnings: string[] = [];
  const reasons: string[] = [];

  const last = candles[candles.length - 1];
  if (!last) {
    return createEmptyInstitutionalAccumulationDetection(["Missing candles."]);
  }

  if (isCircuitMove(last, config)) {
    return createEmptyInstitutionalAccumulationDetection(
      ["Circuit movement — accumulation rejected."],
      reasons
    );
  }

  if (data.newsDriven === true) {
    return createEmptyInstitutionalAccumulationDetection(
      ["News spike — accumulation rejected."],
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
    return createEmptyInstitutionalAccumulationDetection(["EMA20/EMA50 missing."]);
  }

  const structure = detectTrendStructure(candles, config.patternLookbackBars);
  warnings.push(...structure.warnings);
  reasons.push(...structure.reasons);

  let direction: Exclude<InstitutionalAccumulationDirection, "NONE"> | null = null;
  if (structure.bullish || structure.higherLows) direction = "BUY";
  else if (structure.bearish || structure.lowerHighs) direction = "SELL";

  if (!direction) {
    return createEmptyInstitutionalAccumulationDetection(warnings, reasons);
  }

  const ema = validateEmaAlignment(direction, last.close, ema20, ema50, config);
  warnings.push(...ema.warnings);
  reasons.push(...ema.reasons);
  if (!ema.aligned) {
    return {
      ...createEmptyInstitutionalAccumulationDetection(warnings, reasons),
      direction: "NONE",
      ema20,
      ema50,
      vwap: data.vwap,
      higherLows: structure.higherLows,
    };
  }

  const vwap = validateVwapAlignment(direction, last.close, data.vwap);
  warnings.push(...vwap.warnings);
  reasons.push(...vwap.reasons);
  if (!vwap.aligned) {
    return createEmptyInstitutionalAccumulationDetection(warnings, reasons);
  }

  const zone = computeDemandZone(candles, config.demandZoneLookbackBars);
  const patternResult = resolveAccumulationPattern(
    candles,
    direction,
    zone,
    config
  );
  reasons.push(...patternResult.reasons);

  if (patternResult.pattern === "none") {
    return {
      ...createEmptyInstitutionalAccumulationDetection(warnings, reasons),
      direction: "NONE",
      pattern: "none",
      demandZoneLow: zone.low,
      demandZoneHigh: zone.high,
      ema20,
      ema50,
      vwap: data.vwap,
      higherLows: structure.higherLows,
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
    false,
    config
  );
  warnings.push(...market.warnings);
  reasons.push(...market.reasons);

  const confidence = calculateConfidence({
    accumulationScore: patternResult.score,
    volumeScore: volume.score,
    trendScore: structure.score,
    breadthScore: breadth.score,
    sectorScore: sector.score,
    marketScore: market.score,
    vwapScore: vwap.score,
    config,
  });

  if (
    !volume.confirmed ||
    !breadth.confirmed ||
    !sector.confirmed ||
    !market.confirmed
  ) {
    return {
      ...createEmptyInstitutionalAccumulationDetection(warnings, reasons),
      direction: "NONE",
      pattern: patternResult.pattern,
      demandZoneLow: zone.low,
      demandZoneHigh: zone.high,
      accumulationScore: patternResult.score,
      volumeQuality: volume.score,
      ema20,
      ema50,
      vwap: data.vwap,
      higherLows: structure.higherLows,
      volumeConfirmed: volume.confirmed,
      breadthConfirmed: breadth.confirmed,
      sectorConfirmed: sector.confirmed,
      marketConfirmed: market.confirmed,
      confidence,
    };
  }

  reasons.push(`Institutional Accumulation ${direction} detected (${patternResult.pattern}).`);

  return {
    detected: true,
    direction,
    pattern: patternResult.pattern,
    demandZoneLow: zone.low,
    demandZoneHigh: zone.high,
    accumulationScore: patternResult.score,
    volumeQuality: volume.score,
    ema20,
    ema50,
    vwap: data.vwap,
    higherLows: structure.higherLows,
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
