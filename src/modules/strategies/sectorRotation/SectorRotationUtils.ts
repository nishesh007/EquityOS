/**
 * Sector Rotation utilities — Sprint 11B.3J.
 * Pure detection helpers for sector leadership / rotation / alignment.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import type { MarketRegimeLabel } from "@/src/modules/marketRegime";
import {
  DEFAULT_SECTOR_ROTATION_CONFIG,
  resolveSectorRotationConfig,
  type SectorRotationConfig,
} from "./SectorRotationConstants";
import type {
  SectorRotationCandle,
  SectorRotationDetection,
  SectorRotationDetectionContext,
  SectorRotationDirection,
  SectorRotationSignalKind,
} from "./SectorRotationTypes";

export { resolveSectorRotationConfig };

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
  config: SectorRotationConfig = DEFAULT_SECTOR_ROTATION_CONFIG
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
  candles: readonly SectorRotationCandle[],
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
  direction: Exclude<SectorRotationDirection, "NONE">,
  price: number,
  ema20: number,
  ema50: number,
  config: SectorRotationConfig
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
  direction: Exclude<SectorRotationDirection, "NONE">,
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
        reasons: ["Price above VWAP supports sector rotation long."],
        warnings: [],
      };
    }
    return {
      aligned: false,
      score: 30,
      reasons: [],
      warnings: ["Price below VWAP — bullish sector rotation rejected."],
    };
  }
  if (price <= vwap) {
    return {
      aligned: true,
      score: 80,
      reasons: ["Price below VWAP supports sector rotation short."],
      warnings: [],
    };
  }
  return {
    aligned: false,
    score: 30,
    reasons: [],
    warnings: ["Price above VWAP — bearish sector rotation rejected."],
  };
}

export function evaluateSectorRotationLeadership(
  sectorRS: number,
  benchmarkRS: number,
  sectorMomentum: number,
  sectorBreadth: number,
  direction: Exclude<SectorRotationDirection, "NONE">,
  config: SectorRotationConfig = DEFAULT_SECTOR_ROTATION_CONFIG
): {
  leader: boolean;
  score: number;
  sectorOutperformsBenchmark: boolean;
  reasons: string[];
  warnings: string[];
} {
  const reasons: string[] = [];
  const warnings: string[] = [];

  if (
    !Number.isFinite(sectorRS) ||
    !Number.isFinite(benchmarkRS) ||
    !Number.isFinite(sectorMomentum) ||
    !Number.isFinite(sectorBreadth)
  ) {
    return {
      leader: false,
      score: 20,
      sectorOutperformsBenchmark: false,
      reasons: [],
      warnings: ["Sector rotation scores missing."],
    };
  }

  if (direction === "BUY") {
    const meetsSectorRS = sectorRS >= config.minSectorRelativeStrength;
    const outperformsBenchmark =
      sectorRS >= benchmarkRS + config.minSectorVsBenchmarkMargin;
    const momentumRising = sectorMomentum >= config.minSectorMomentum;
    const breadthOk = sectorBreadth >= config.minSectorBreadth;

    if (meetsSectorRS) {
      reasons.push("Sector has become the strongest performer.");
    } else {
      warnings.push("Weak Sector — relative strength below threshold.");
    }
    if (outperformsBenchmark) {
      reasons.push("Institutional capital rotating into this sector.");
    } else {
      warnings.push("Sector not outperforming benchmark by required margin.");
    }
    if (momentumRising) {
      reasons.push("Sector momentum rising.");
    } else {
      warnings.push("Losing momentum — sector momentum insufficient.");
    }
    if (breadthOk) {
      reasons.push("Sector breadth improving across constituents.");
    } else {
      warnings.push("Declining breadth — sector participation weak.");
    }

    const score = clamp(
      round(
        (meetsSectorRS ? 25 : 0) +
          (outperformsBenchmark ? 25 : 0) +
          (momentumRising ? 20 : 0) +
          (breadthOk ? 20 : 0) +
          sectorRS * 0.1,
        1
      ),
      0,
      100
    );

    return {
      leader:
        meetsSectorRS && outperformsBenchmark && momentumRising && breadthOk,
      score,
      sectorOutperformsBenchmark: outperformsBenchmark,
      reasons,
      warnings,
    };
  }

  const weakSector = sectorRS <= config.bearishSectorMax;
  const underperformsBenchmark =
    sectorRS <= benchmarkRS - config.minSectorVsBenchmarkMargin;
  const momentumFalling = sectorMomentum <= -config.minSectorMomentum;
  const breadthWeak = sectorBreadth <= config.bearishBreadthMax;

  if (weakSector) {
    reasons.push("Sector has become a relative laggard.");
  } else {
    warnings.push("Weak Sector — sector not weak enough for rotation short.");
  }
  if (underperformsBenchmark) {
    reasons.push("Capital rotating out of this sector.");
  } else {
    warnings.push("Sector not underperforming benchmark by required margin.");
  }
  if (momentumFalling) {
    reasons.push("Sector momentum declining.");
  } else {
    warnings.push("Losing momentum — sector not declining enough.");
  }
  if (breadthWeak) {
    reasons.push("Sector breadth deteriorating across constituents.");
  } else {
    warnings.push("Declining breadth — bearish participation insufficient.");
  }

  const score = clamp(
    round(
      (weakSector ? 25 : 0) +
        (underperformsBenchmark ? 25 : 0) +
        (momentumFalling ? 20 : 0) +
        (breadthWeak ? 20 : 0) +
        (100 - sectorRS) * 0.1,
      1
    ),
    0,
    100
  );

  return {
    leader: weakSector && underperformsBenchmark && momentumFalling && breadthWeak,
    score,
    sectorOutperformsBenchmark: underperformsBenchmark,
    reasons,
    warnings,
  };
}

export function evaluateStockVsSector(
  stockRS: number,
  sectorRS: number,
  direction: Exclude<SectorRotationDirection, "NONE">,
  config: SectorRotationConfig = DEFAULT_SECTOR_ROTATION_CONFIG
): {
  leader: boolean;
  score: number;
  stockOutperformsSector: boolean;
  reasons: string[];
  warnings: string[];
} {
  const reasons: string[] = [];
  const warnings: string[] = [];

  if (!Number.isFinite(stockRS) || !Number.isFinite(sectorRS)) {
    return {
      leader: false,
      score: 20,
      stockOutperformsSector: false,
      reasons: [],
      warnings: ["Stock vs sector scores missing."],
    };
  }

  if (direction === "BUY") {
    const outperforms = stockRS >= sectorRS + config.minStockVsSectorMargin;
    if (outperforms) {
      reasons.push("Stock outperforming both benchmark and sector.");
    } else {
      warnings.push("Weak stock vs sector — leadership insufficient.");
    }
    const score = clamp(
      round((outperforms ? 70 : 20) + stockRS * 0.3, 1),
      0,
      100
    );
    return {
      leader: outperforms,
      score,
      stockOutperformsSector: outperforms,
      reasons,
      warnings,
    };
  }

  const underperforms = stockRS <= sectorRS - config.minStockVsSectorMargin;
  if (underperforms) {
    reasons.push("Stock underperforming sector during rotation out.");
  } else {
    warnings.push("Weak stock vs sector — laggard confirmation insufficient.");
  }
  const score = clamp(
    round((underperforms ? 70 : 20) + (100 - stockRS) * 0.3, 1),
    0,
    100
  );
  return {
    leader: underperforms,
    score,
    stockOutperformsSector: underperforms,
    reasons,
    warnings,
  };
}

export function classifySectorRotationSignalKind(input: {
  direction: Exclude<SectorRotationDirection, "NONE">;
  sectorRS: number;
  sectorMomentum: number;
  sectorBreadth: number;
  sectorOutperformsBenchmark: boolean;
  volumeConfirmed: boolean;
  strongTrend: boolean;
  config?: SectorRotationConfig;
}): SectorRotationSignalKind {
  const config = input.config ?? DEFAULT_SECTOR_ROTATION_CONFIG;

  if (input.direction === "BUY") {
    if (
      input.sectorMomentum >= config.minSectorMomentum * 2 &&
      input.sectorRS >= config.minSectorRelativeStrength + 10
    ) {
      return "emerging_sector_leader";
    }
    if (input.sectorOutperformsBenchmark && input.volumeConfirmed) {
      return "institutional_sector_buying";
    }
    if (input.sectorOutperformsBenchmark) {
      return "capital_rotation";
    }
    if (input.sectorMomentum >= config.minSectorMomentum) {
      return "strengthening_sector";
    }
    if (input.strongTrend && input.sectorBreadth >= config.minSectorBreadth) {
      return "sector_breakout";
    }
    return "strengthening_sector";
  }

  if (input.strongTrend && input.sectorBreadth <= config.bearishBreadthMax) {
    return "sector_breakdown";
  }
  if (input.sectorMomentum <= -config.minSectorMomentum * 2) {
    return "sector_breakdown";
  }
  if (!input.sectorOutperformsBenchmark) {
    return "capital_rotation";
  }
  return "sector_breakdown";
}

export function validateVolume(
  candles: readonly SectorRotationCandle[],
  relativeVolume: number | null,
  config: SectorRotationConfig
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
      warnings: ["Low liquidity — relative volume below threshold."],
    };
  }

  if (
    !spike &&
    (relativeVolume === null ||
      relativeVolume < config.preferredRelativeVolume)
  ) {
    warnings.push("Low volume — weak confirmation of institutional participation.");
  } else {
    reasons.push("Volume confirms sector rotation participation.");
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

export function validateSectorBreadth(
  direction: Exclude<SectorRotationDirection, "NONE">,
  sectorBreadth: number,
  config: SectorRotationConfig = DEFAULT_SECTOR_ROTATION_CONFIG
): { confirmed: boolean; score: number; reasons: string[]; warnings: string[] } {
  if (!Number.isFinite(sectorBreadth)) {
    return {
      confirmed: false,
      score: 30,
      reasons: [],
      warnings: ["Sector breadth data missing."],
    };
  }
  if (direction === "BUY") {
    if (sectorBreadth >= config.minSectorBreadth) {
      return {
        confirmed: true,
        score: clamp(sectorBreadth, 0, 100),
        reasons: ["Sector breadth improving across constituents."],
        warnings: [],
      };
    }
    return {
      confirmed: false,
      score: clamp(sectorBreadth, 0, 100),
      reasons: [],
      warnings: ["Declining breadth — sector participation insufficient."],
    };
  }
  if (sectorBreadth <= config.bearishBreadthMax) {
    return {
      confirmed: true,
      score: clamp(100 - sectorBreadth, 0, 100),
      reasons: ["Sector breadth deteriorating across constituents."],
      warnings: [],
    };
  }
  return {
    confirmed: false,
    score: clamp(sectorBreadth, 0, 100),
    reasons: [],
    warnings: ["Declining breadth — bearish sector rotation insufficient."],
  };
}

export function validateMarket(
  direction: Exclude<SectorRotationDirection, "NONE">,
  regime: MarketRegimeLabel,
  riskMode: InstitutionalMarketContext["riskMode"],
  regimeConfidence: number,
  volatilityScore: number,
  newsDriven: boolean,
  config: SectorRotationConfig = DEFAULT_SECTOR_ROTATION_CONFIG
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
      warnings: ["News spike — sector rotation rejected."],
    };
  }

  if (config.blockedRegimes.includes(regime)) {
    return {
      confirmed: false,
      score: 20,
      reasons: [],
      warnings: [`Incompatible regime ${regime} — sector rotation rejected.`],
    };
  }

  if (direction === "BUY" && config.bullBlockedRegimes.includes(regime)) {
    return {
      confirmed: false,
      score: 20,
      reasons: [],
      warnings: [`Regime ${regime} blocks bullish sector rotation.`],
    };
  }
  if (direction === "SELL" && config.bearBlockedRegimes.includes(regime)) {
    return {
      confirmed: false,
      score: 20,
      reasons: [],
      warnings: [`Regime ${regime} blocks bearish sector rotation.`],
    };
  }

  if (!config.compatibleRegimes.includes(regime)) {
    return {
      confirmed: false,
      score: 25,
      reasons: [],
      warnings: [`Regime ${regime} not compatible with sector rotation.`],
    };
  }
  reasons.push("Momentum supported by healthy market regime.");
  score += 20;

  if (regimeConfidence >= config.minRegimeConfidence) {
    score += 15;
  } else {
    warnings.push("Regime confidence below sector rotation threshold.");
    score -= 20;
  }

  if (volatilityScore > config.maxVolatilityScore) {
    warnings.push("Volatility too elevated for clean sector rotation.");
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
  candle: SectorRotationCandle,
  config: SectorRotationConfig
): boolean {
  const mid = (candle.high + candle.low) / 2 || candle.close;
  if (!Number.isFinite(mid) || mid <= 0) return false;
  return (candle.high - candle.low) / mid >= config.circuitMovePct;
}

export function calculateConfidence(input: {
  sectorScore: number;
  stockScore: number;
  trendScore: number;
  volumeScore: number;
  breadthScore: number;
  marketScore: number;
  vwapScore: number;
  emaScore: number;
  config?: SectorRotationConfig;
}): number {
  const config = input.config ?? DEFAULT_SECTOR_ROTATION_CONFIG;
  const w = config.confidenceWeights;
  const composite =
    input.sectorScore * w.sectorStrength +
    input.stockScore * w.relativeStrength +
    input.trendScore * w.trendStructure +
    input.volumeScore * w.volume +
    input.breadthScore * w.sectorBreadth +
    input.marketScore * w.market +
    input.vwapScore * w.vwap +
    input.emaScore * w.trendStructure;
  return clamp(
    round(composite, 1),
    config.confidenceFloor,
    config.scoreCeiling
  );
}

export function createEmptySectorRotationDetection(
  warnings: string[],
  reasons: string[] = []
): SectorRotationDetection {
  return {
    detected: false,
    direction: "NONE",
    signalKind: "none",
    sectorName: "",
    sectorRelativeStrength: 0,
    sectorMomentum: 0,
    sectorBreadth: 0,
    stockRelativeStrength: 0,
    benchmarkRelativeStrength: 0,
    sectorOutperformsBenchmark: false,
    stockOutperformsSector: false,
    ema20: 0,
    ema50: 0,
    vwap: 0,
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
 * Full sector rotation detection.
 */
export function detectSectorRotation(
  context: SectorRotationDetectionContext
): SectorRotationDetection {
  const config = resolveSectorRotationConfig(context.config);
  const data = context.input.sectorRotation;
  const candles = data.candles5m;
  const warnings: string[] = [];
  const reasons: string[] = [];

  const last = candles[candles.length - 1];
  if (!last) {
    return createEmptySectorRotationDetection(["Missing candles."]);
  }

  if (isCircuitMove(last, config)) {
    return createEmptySectorRotationDetection(
      ["Circuit movement — sector rotation rejected."],
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
    return createEmptySectorRotationDetection(["EMA20/EMA50 missing."]);
  }

  const structure = detectTrendStructure(candles, config.trendLookbackBars);
  warnings.push(...structure.warnings);
  reasons.push(...structure.reasons);

  let direction: Exclude<SectorRotationDirection, "NONE"> | null = null;
  if (structure.bullish) direction = "BUY";
  else if (structure.bearish) direction = "SELL";

  if (!direction) {
    return createEmptySectorRotationDetection(warnings, reasons);
  }

  const ema = validateEmaAlignment(
    direction,
    last.close,
    ema20,
    ema50,
    config
  );
  warnings.push(...ema.warnings);
  reasons.push(...ema.reasons);
  if (!ema.aligned) {
    return {
      ...createEmptySectorRotationDetection(warnings, reasons),
      direction: "NONE",
      ema20,
      ema50,
      vwap: data.vwap,
      sectorName: data.sectorName,
    };
  }

  const vwap = validateVwapAlignment(direction, last.close, data.vwap);
  warnings.push(...vwap.warnings);
  reasons.push(...vwap.reasons);
  if (!vwap.aligned) {
    return createEmptySectorRotationDetection(warnings, reasons);
  }

  const sectorRS = data.sectorRelativeStrength;
  const benchmarkRS = data.benchmarkRelativeStrength;
  const stockRS = data.stockRelativeStrength;
  const sectorMomentum = data.sectorMomentum;
  const sectorBreadth = data.sectorBreadth;

  if (
    sectorRS === null ||
    benchmarkRS === null ||
    stockRS === null ||
    sectorMomentum === null ||
    sectorBreadth === null ||
    !Number.isFinite(sectorRS) ||
    !Number.isFinite(benchmarkRS) ||
    !Number.isFinite(stockRS) ||
    !Number.isFinite(sectorMomentum) ||
    !Number.isFinite(sectorBreadth)
  ) {
    return createEmptySectorRotationDetection(
      ["Sector rotation scores missing."],
      reasons
    );
  }

  const sectorLeadership = evaluateSectorRotationLeadership(
    sectorRS,
    benchmarkRS,
    sectorMomentum,
    sectorBreadth,
    direction,
    config
  );
  warnings.push(...sectorLeadership.warnings);
  reasons.push(...sectorLeadership.reasons);

  const stockLeadership = evaluateStockVsSector(
    stockRS,
    sectorRS,
    direction,
    config
  );
  warnings.push(...stockLeadership.warnings);
  reasons.push(...stockLeadership.reasons);

  if (!sectorLeadership.leader || !stockLeadership.leader) {
    return {
      ...createEmptySectorRotationDetection(warnings, reasons),
      direction: "NONE",
      signalKind: "none",
      sectorName: data.sectorName,
      sectorRelativeStrength: sectorRS,
      sectorMomentum,
      sectorBreadth,
      stockRelativeStrength: stockRS,
      benchmarkRelativeStrength: benchmarkRS,
      sectorOutperformsBenchmark: sectorLeadership.sectorOutperformsBenchmark,
      stockOutperformsSector: stockLeadership.stockOutperformsSector,
      ema20,
      ema50,
      vwap: data.vwap,
    };
  }

  const volume = validateVolume(candles, data.relativeVolume, config);
  warnings.push(...volume.warnings);
  reasons.push(...volume.reasons);

  const breadth = validateSectorBreadth(direction, sectorBreadth, config);
  warnings.push(...breadth.warnings);
  reasons.push(...breadth.reasons);

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

  const sectorConfirmed = sectorLeadership.leader;
  const strongTrend = structure.bullish || structure.bearish;

  if (!volume.confirmed || !breadth.confirmed || !market.confirmed) {
    return {
      ...createEmptySectorRotationDetection(warnings, reasons),
      signalKind: "none",
      sectorName: data.sectorName,
      sectorRelativeStrength: sectorRS,
      sectorMomentum,
      sectorBreadth,
      stockRelativeStrength: stockRS,
      benchmarkRelativeStrength: benchmarkRS,
      sectorOutperformsBenchmark: sectorLeadership.sectorOutperformsBenchmark,
      stockOutperformsSector: stockLeadership.stockOutperformsSector,
      ema20,
      ema50,
      vwap: data.vwap,
      volumeConfirmed: volume.confirmed,
      breadthConfirmed: breadth.confirmed,
      sectorConfirmed,
      marketConfirmed: market.confirmed,
      confidence: calculateConfidence({
        sectorScore: sectorLeadership.score,
        stockScore: stockLeadership.score,
        trendScore: structure.score,
        volumeScore: volume.score,
        breadthScore: breadth.score,
        marketScore: market.score,
        vwapScore: vwap.score,
        emaScore: ema.score,
        config,
      }),
    };
  }

  const signalKind = classifySectorRotationSignalKind({
    direction,
    sectorRS,
    sectorMomentum,
    sectorBreadth,
    sectorOutperformsBenchmark: sectorLeadership.sectorOutperformsBenchmark,
    volumeConfirmed: volume.confirmed,
    strongTrend,
    config,
  });

  const confidence = calculateConfidence({
    sectorScore: sectorLeadership.score,
    stockScore: stockLeadership.score,
    trendScore: structure.score,
    volumeScore: volume.score,
    breadthScore: breadth.score,
    marketScore: market.score,
    vwapScore: vwap.score,
    emaScore: ema.score,
    config,
  });

  reasons.push(`Sector Rotation ${direction} detected (${signalKind}).`);

  return {
    detected: true,
    direction,
    signalKind,
    sectorName: data.sectorName,
    sectorRelativeStrength: sectorRS,
    sectorMomentum,
    sectorBreadth,
    stockRelativeStrength: stockRS,
    benchmarkRelativeStrength: benchmarkRS,
    sectorOutperformsBenchmark: sectorLeadership.sectorOutperformsBenchmark,
    stockOutperformsSector: stockLeadership.stockOutperformsSector,
    ema20,
    ema50,
    vwap: data.vwap,
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
