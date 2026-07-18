/**
 * Market Breadth calculators — Sprint 11B.1B.
 * Pure functions only; no I/O.
 */

import { clamp, round } from "@/lib/engine/utils";
import {
  DEFAULT_BREADTH_CONFIG,
  type BreadthAnalysis,
  type BreadthConfig,
  type BreadthEngineInput,
  type BreadthQualityLabel,
  type CapTier,
  type ConstituentSnapshot,
} from "./MarketContextTypes";

export function resolveBreadthConfig(
  partial?: Partial<BreadthConfig>
): BreadthConfig {
  return { ...DEFAULT_BREADTH_CONFIG, ...partial };
}

export function classifyBreadthQuality(
  score: number,
  config: BreadthConfig = DEFAULT_BREADTH_CONFIG
): BreadthQualityLabel {
  if (score >= config.veryStrongMin) return "Very Strong";
  if (score >= config.strongMin) return "Strong";
  if (score >= config.neutralMin) return "Neutral";
  if (score >= config.weakMin) return "Weak";
  return "Very Weak";
}

export function classifyCapTier(
  marketCapCr: number | null,
  config: BreadthConfig = DEFAULT_BREADTH_CONFIG
): CapTier | null {
  if (marketCapCr === null || !Number.isFinite(marketCapCr) || marketCapCr <= 0) {
    return null;
  }
  if (marketCapCr >= config.largeCapMinCr) return "large";
  if (marketCapCr >= config.midCapMinCr) return "mid";
  return "small";
}

/**
 * Parses Indian market-cap labels (e.g. "₹19.5L Cr", "₹3.4L Cr", "15000 Cr")
 * into crore units.
 */
export function parseMarketCapToCr(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const match = raw.replace(/,/g, "").match(/([\d.]+)\s*(L)?\s*Cr/i);
  if (!match) return null;
  const value = Number.parseFloat(match[1]);
  if (!Number.isFinite(value)) return null;
  return match[2] ? value * 100_000 : value;
}

export function calculateAdvanceDeclineRatio(
  advances: number,
  declines: number
): number {
  const safeDeclines = Math.max(declines, 1);
  if (!Number.isFinite(advances) || advances < 0) return 0;
  return round(advances / safeDeclines, 3);
}

export function calculateNetAdvances(advances: number, declines: number): number {
  return Math.round(advances - declines);
}

export function calculateBreadthPercent(
  advances: number,
  declines: number,
  unchanged: number
): number {
  const total = advances + declines + unchanged;
  if (total <= 0) return 50;
  return clamp(round((advances / total) * 100, 1), 0, 100);
}

export function calculateParticipationPercent(
  advances: number,
  declines: number,
  unchanged: number
): number {
  const total = advances + declines + unchanged;
  if (total <= 0) return 0;
  return clamp(round(((advances + declines) / total) * 100, 1), 0, 100);
}

function tierBreadth(
  constituents: ConstituentSnapshot[],
  tier: CapTier | "equal"
): number {
  const pool =
    tier === "equal"
      ? constituents.filter((c) => c.available)
      : constituents.filter((c) => c.available && c.capTier === tier);

  if (pool.length === 0) return 50;

  const advancing = pool.filter((c) => c.changePercent > 0).length;
  return clamp(round((advancing / pool.length) * 100, 1), 0, 100);
}

export function calculateEqualWeightBreadth(
  constituents: ConstituentSnapshot[]
): number {
  return tierBreadth(constituents, "equal");
}

export function calculateLargeCapBreadth(
  constituents: ConstituentSnapshot[]
): number {
  return tierBreadth(constituents, "large");
}

export function calculateMidCapBreadth(
  constituents: ConstituentSnapshot[]
): number {
  return tierBreadth(constituents, "mid");
}

export function calculateSmallCapBreadth(
  constituents: ConstituentSnapshot[]
): number {
  return tierBreadth(constituents, "small");
}

export function calculateBreadthMomentum(
  currentBreadthPercent: number,
  previousBreadthPercent: number | null
): number {
  if (previousBreadthPercent === null || !Number.isFinite(previousBreadthPercent)) {
    return 0;
  }
  return round(currentBreadthPercent - previousBreadthPercent, 1);
}

function newHighsComponent(newHighs: number, newLows: number): number {
  const total = newHighs + newLows;
  if (total <= 0) return 50;
  return clamp(round((newHighs / total) * 100, 1), 0, 100);
}

function capBalanceComponent(
  large: number,
  mid: number,
  small: number
): number {
  const avg = (large + mid + small) / 3;
  const dispersion =
    (Math.abs(large - avg) + Math.abs(mid - avg) + Math.abs(small - avg)) / 3;
  // Tight, elevated participation across caps scores higher.
  const level = avg;
  const cohesion = clamp(100 - dispersion * 2, 0, 100);
  return clamp(round(level * 0.65 + cohesion * 0.35, 1), 0, 100);
}

function momentumComponent(
  momentum: number,
  config: BreadthConfig
): number {
  return clamp(round(50 + (momentum / config.momentumStrongDelta) * 25, 1), 0, 100);
}

/**
 * Composite institutional breadth score 0–100.
 */
export function calculateBreadthScore(
  input: {
    advanceDeclineRatio: number;
    participationPercent: number;
    equalWeightBreadth: number;
    largeCapBreadth: number;
    midCapBreadth: number;
    smallCapBreadth: number;
    breadthMomentum: number;
    newHighs: number;
    newLows: number;
  },
  config: BreadthConfig = DEFAULT_BREADTH_CONFIG
): number {
  const adComponent = clamp(
    round(50 + (input.advanceDeclineRatio - 1) * 40, 1),
    0,
    100
  );

  return clamp(
    round(
      adComponent * config.qualityWeightAdvanceRatio +
        input.participationPercent * config.qualityWeightParticipation +
        capBalanceComponent(
          input.largeCapBreadth,
          input.midCapBreadth,
          input.smallCapBreadth
        ) *
          config.qualityWeightCapBalance +
        momentumComponent(input.breadthMomentum, config) *
          config.qualityWeightMomentum +
        newHighsComponent(input.newHighs, input.newLows) *
          config.qualityWeightNewHighs,
      1
    ),
    0,
    100
  );
}

function buildBreadthReasons(
  analysis: Omit<BreadthAnalysis, "reasons" | "confidence" | "lastUpdated">,
  sectors: BreadthEngineInput["sectors"],
  config: BreadthConfig
): string[] {
  const reasons: string[] = [];
  const advancingPct = analysis.breadthPercent;

  reasons.push(`${round(advancingPct, 0)}% stocks advancing`);

  if (analysis.participationPercent >= config.participationHighPct) {
    reasons.push("Broad participation");
    reasons.push("High participation");
  } else if (analysis.participationPercent <= config.participationLowPct) {
    reasons.push("Narrow participation");
  }

  if (analysis.advanceDeclineRatio >= 1.25) {
    reasons.push("Advance/decline ratio constructive");
  } else if (analysis.advanceDeclineRatio <= 0.8) {
    reasons.push("Advance/decline ratio weak");
  }

  if (analysis.breadthMomentum >= config.momentumStrongDelta) {
    reasons.push("Breadth momentum improving");
  } else if (analysis.breadthMomentum <= -config.momentumStrongDelta) {
    reasons.push("Breadth momentum deteriorating");
  }

  if (
    analysis.largeCapBreadth >= 60 &&
    analysis.midCapBreadth >= 60 &&
    analysis.smallCapBreadth >= 55
  ) {
    reasons.push("Cap-tier breadth aligned bullish");
  } else if (
    analysis.largeCapBreadth <= 40 &&
    analysis.midCapBreadth <= 40
  ) {
    reasons.push("Cap-tier breadth aligned bearish");
  }

  const leading = [...sectors]
    .filter((s) => s.changePercent > 0)
    .sort((a, b) => b.changePercent - a.changePercent)
    .slice(0, 2);
  const weakening = [...sectors]
    .filter((s) => s.changePercent < 0)
    .sort((a, b) => a.changePercent - b.changePercent)
    .slice(0, 2);

  for (const sector of leading) {
    reasons.push(`${normalizeSectorLabel(sector.name)} leading`);
  }
  for (const sector of weakening) {
    reasons.push(`${normalizeSectorLabel(sector.name)} weakening`);
  }

  reasons.push(`Breadth quality: ${analysis.breadthQuality}`);
  return dedupe(reasons);
}

/** Maps "Nifty IT" → "IT", "Nifty PSU Bank" → "PSU", etc. */
export function normalizeSectorLabel(raw: string): string {
  const cleaned = raw.replace(/^Nifty\s+/i, "").trim();
  const aliases: Record<string, string> = {
    "PSU Bank": "PSU",
    "Private Bank": "Banking",
    Bank: "Banking",
    Banks: "Banking",
    "Metals & Mining": "Metal",
    Metals: "Metal",
    Pharma: "Pharma",
    Healthcare: "Healthcare",
    "Oil & Gas": "Energy",
    Energy: "Energy",
    Realty: "Realty",
    Media: "Media",
    FMCG: "FMCG",
    IT: "IT",
    Auto: "Auto",
    Metal: "Metal",
    Telecom: "Telecom",
    Infrastructure: "Infrastructure",
    "Capital Goods": "Capital Goods",
    "Financial Services": "Financial Services",
    Chemical: "Chemical",
    Chemicals: "Chemical",
  };
  return aliases[cleaned] ?? cleaned;
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

function estimateConfidence(
  input: BreadthEngineInput,
  hasCapCoverage: boolean,
  config: BreadthConfig
): number {
  let confidence = 72;
  const total = input.advances + input.declines + input.unchanged;
  if (total <= 0) confidence -= config.missingDataConfidencePenalty * 2;
  if (input.sectors.length === 0) confidence -= config.missingDataConfidencePenalty;
  if (input.constituents.filter((c) => c.available).length === 0) {
    confidence -= config.missingDataConfidencePenalty;
  }
  if (!hasCapCoverage) confidence -= config.missingDataConfidencePenalty / 2;
  if (input.previousBreadthPercent === null) confidence -= 4;
  return clamp(round(confidence, 1), 0, 100);
}

/**
 * Builds a full institutional BreadthAnalysis from normalized input.
 */
export function buildBreadthAnalysis(input: BreadthEngineInput): BreadthAnalysis {
  const config = resolveBreadthConfig(input.config);
  const advances = Number.isFinite(input.advances) ? Math.max(0, input.advances) : 0;
  const declines = Number.isFinite(input.declines) ? Math.max(0, input.declines) : 0;
  const unchanged = Number.isFinite(input.unchanged) ? Math.max(0, input.unchanged) : 0;
  const newHighs = Number.isFinite(input.newHighs) ? Math.max(0, input.newHighs) : 0;
  const newLows = Number.isFinite(input.newLows) ? Math.max(0, input.newLows) : 0;
  const total = advances + declines + unchanged;

  if (total <= 0 && input.constituents.every((c) => !c.available)) {
    return createFallbackBreadthAnalysis(input.asOf);
  }

  const advanceDeclineRatio = calculateAdvanceDeclineRatio(advances, declines);
  const netAdvances = calculateNetAdvances(advances, declines);
  const breadthPercent = calculateBreadthPercent(advances, declines, unchanged);
  const participationPercent = calculateParticipationPercent(
    advances,
    declines,
    unchanged
  );
  const equalWeightBreadth = calculateEqualWeightBreadth(input.constituents);
  const largeCapBreadth = calculateLargeCapBreadth(input.constituents);
  const midCapBreadth = calculateMidCapBreadth(input.constituents);
  const smallCapBreadth = calculateSmallCapBreadth(input.constituents);
  const breadthMomentum = calculateBreadthMomentum(
    breadthPercent,
    input.previousBreadthPercent
  );

  const score = calculateBreadthScore(
    {
      advanceDeclineRatio,
      participationPercent,
      equalWeightBreadth,
      largeCapBreadth,
      midCapBreadth,
      smallCapBreadth,
      breadthMomentum,
      newHighs,
      newLows,
    },
    config
  );

  const breadthQuality = classifyBreadthQuality(score, config);
  const hasCapCoverage = input.constituents.some(
    (c) => c.available && c.capTier !== null
  );

  const core = {
    advanceCount: Math.round(advances),
    declineCount: Math.round(declines),
    unchangedCount: Math.round(unchanged),
    advanceDeclineRatio,
    netAdvances,
    breadthPercent,
    participationPercent,
    equalWeightBreadth,
    largeCapBreadth,
    midCapBreadth,
    smallCapBreadth,
    breadthMomentum,
    breadthQuality,
    score,
  };

  return {
    ...core,
    confidence: estimateConfidence(
      { ...input, advances, declines, unchanged },
      hasCapCoverage,
      config
    ),
    reasons: buildBreadthReasons(core, input.sectors, config),
    lastUpdated: input.asOf,
  };
}

export function createFallbackBreadthAnalysis(
  asOf: Date = new Date(),
  reason = "Insufficient breadth data — neutral breadth applied"
): BreadthAnalysis {
  return {
    advanceCount: 0,
    declineCount: 0,
    unchangedCount: 0,
    advanceDeclineRatio: 1,
    netAdvances: 0,
    breadthPercent: 50,
    participationPercent: 0,
    equalWeightBreadth: 50,
    largeCapBreadth: 50,
    midCapBreadth: 50,
    smallCapBreadth: 50,
    breadthMomentum: 0,
    breadthQuality: "Neutral",
    score: 50,
    confidence: 20,
    reasons: [reason],
    lastUpdated: asOf,
  };
}
