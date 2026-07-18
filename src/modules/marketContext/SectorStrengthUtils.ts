/**
 * Sector Strength calculators — Sprint 11B.1B.
 * Pure functions only; no I/O.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { SectorPerformance } from "@/types";
import {
  DEFAULT_SECTOR_STRENGTH_CONFIG,
  SUPPORTED_SECTORS,
  type ConstituentSnapshot,
  type SectorAnalysis,
  type SectorEngineInput,
  type SectorRotationSummary,
  type SectorStrengthAnalysis,
  type SectorStrengthConfig,
  type SectorTrend,
  type SupportedSector,
} from "./MarketContextTypes";
import { normalizeSectorLabel } from "./BreadthUtils";

export function resolveSectorStrengthConfig(
  partial?: Partial<SectorStrengthConfig>
): SectorStrengthConfig {
  return { ...DEFAULT_SECTOR_STRENGTH_CONFIG, ...partial };
}

export function classifySectorTrend(
  score: number,
  config: SectorStrengthConfig = DEFAULT_SECTOR_STRENGTH_CONFIG
): SectorTrend {
  if (score >= config.strongBullMin) return "Strong Bull";
  if (score >= config.bullMin) return "Bull";
  if (score <= config.strongBearMax) return "Strong Bear";
  if (score <= config.bearMax) return "Bear";
  return "Neutral";
}

function mapPriceToScore(changePercent: number): number {
  return clamp(round(50 + changePercent * 12, 1), 0, 100);
}

function mapRelativeToScore(
  changePercent: number,
  benchmarkChangePercent: number | null
): number {
  if (benchmarkChangePercent === null) {
    return mapPriceToScore(changePercent);
  }
  const relative = changePercent - benchmarkChangePercent;
  return clamp(round(50 + relative * 14, 1), 0, 100);
}

function mapMomentumToScore(changePercent: number, breadth: number): number {
  const blended = changePercent * 0.7 + (breadth - 50) * 0.06;
  return clamp(round(50 + blended * 10, 1), 0, 100);
}

function mapTrendProxy(changePercent: number, breadth: number): number {
  if (changePercent >= 1.2 && breadth >= 65) return 82;
  if (changePercent >= 0.4 && breadth >= 55) return 68;
  if (changePercent <= -1.2 && breadth <= 35) return 18;
  if (changePercent <= -0.4 && breadth <= 45) return 32;
  return 50;
}

function constituentsForSector(
  sector: string,
  constituents: ConstituentSnapshot[]
): ConstituentSnapshot[] {
  const target = sector.toLowerCase();
  return constituents.filter((c) => {
    if (!c.available || !c.sector) return false;
    const label = normalizeSectorLabel(c.sector).toLowerCase();
    return label === target || label.includes(target) || target.includes(label);
  });
}

function volumeScoreForSector(
  sectorConstituents: ConstituentSnapshot[],
  marketVolumeChangePercent: number | null
): number {
  if (sectorConstituents.length === 0) {
    if (marketVolumeChangePercent === null) return 50;
    return clamp(round(50 + marketVolumeChangePercent * 0.6, 1), 0, 100);
  }

  const rvols = sectorConstituents
    .map((c) => c.relativeVolume)
    .filter((v): v is number => v !== null && Number.isFinite(v));

  if (rvols.length > 0) {
    const avg = rvols.reduce((sum, v) => sum + v, 0) / rvols.length;
    return clamp(round(40 + avg * 20, 1), 0, 100);
  }

  const volumes = sectorConstituents
    .map((c) => c.volume)
    .filter((v) => Number.isFinite(v) && v > 0);
  if (volumes.length === 0) return 50;
  const avgVol = volumes.reduce((sum, v) => sum + v, 0) / volumes.length;
  // Normalize loosely around typical liquid names without hardcoding absolute levels.
  const logScore = Math.log10(avgVol + 1) * 12;
  return clamp(round(logScore, 1), 0, 100);
}

function participationFromConstituents(
  sectorConstituents: ConstituentSnapshot[],
  fallbackBreadth: number
): number {
  if (sectorConstituents.length === 0) return clamp(round(fallbackBreadth, 1), 0, 100);
  const advancing = sectorConstituents.filter((c) => c.changePercent > 0).length;
  return clamp(round((advancing / sectorConstituents.length) * 100, 1), 0, 100);
}

function institutionalScore(
  breadth: number,
  relativeStrength: number,
  volume: number
): number {
  return clamp(round(breadth * 0.4 + relativeStrength * 0.35 + volume * 0.25, 1), 0, 100);
}

/**
 * Resolves a SectorPerformance row onto a canonical SupportedSector label.
 */
export function resolveSupportedSectorName(raw: string): SupportedSector | string {
  const normalized = normalizeSectorLabel(raw);
  const match = SUPPORTED_SECTORS.find(
    (sector) => sector.toLowerCase() === normalized.toLowerCase()
  );
  return match ?? normalized;
}

function findSectorPerformance(
  sectors: SectorPerformance[],
  canonical: string
): SectorPerformance | null {
  const target = canonical.toLowerCase();
  for (const sector of sectors) {
    const label = resolveSupportedSectorName(sector.name);
    if (String(label).toLowerCase() === target) return sector;
    if (normalizeSectorLabel(sector.name).toLowerCase().includes(target)) {
      return sector;
    }
  }
  return null;
}

/**
 * Evaluates a single sector into a SectorAnalysis snapshot.
 */
export function analyzeSector(
  sectorName: string,
  performance: SectorPerformance | null,
  input: SectorEngineInput,
  config: SectorStrengthConfig = DEFAULT_SECTOR_STRENGTH_CONFIG
): SectorAnalysis {
  const reasons: string[] = [];

  if (
    !performance ||
    !Number.isFinite(performance.changePercent) ||
    !Number.isFinite(performance.breadth)
  ) {
    return {
      sector: sectorName,
      score: 50,
      trend: "Neutral",
      relativeStrength: 50,
      breadth: 50,
      volume: 50,
      momentum: 50,
      participation: 50,
      confidence: Math.max(15, 40 - config.missingDataConfidencePenalty),
      reasons: [`${sectorName} data unavailable — neutral sector score`],
    };
  }

  const sectorConstituents = constituentsForSector(sectorName, input.constituents);
  const price = mapPriceToScore(performance.changePercent);
  const relative = mapRelativeToScore(
    performance.changePercent,
    input.benchmarkChangePercent
  );
  const breadth = clamp(round(performance.breadth, 1), 0, 100);
  const volume = volumeScoreForSector(
    sectorConstituents,
    input.marketVolumeChangePercent
  );
  const momentum = mapMomentumToScore(performance.changePercent, breadth);
  const trendProxy = mapTrendProxy(performance.changePercent, breadth);
  const participation = participationFromConstituents(sectorConstituents, breadth);
  const relativeStrength = relative;
  const institutional = institutionalScore(breadth, relativeStrength, volume);

  const score = clamp(
    round(
      price * config.weightPrice +
        relative * config.weightRelative +
        breadth * config.weightBreadth +
        volume * config.weightVolume +
        momentum * config.weightMomentum +
        trendProxy * config.weightTrend +
        participation * config.weightParticipation +
        relativeStrength * config.weightRelativeStrength +
        institutional * config.weightInstitutional,
      1
    ),
    0,
    100
  );

  const trend = classifySectorTrend(score, config);

  if (performance.changePercent >= 1) {
    reasons.push(`${sectorName} price performance strong (${round(performance.changePercent, 2)}%)`);
  } else if (performance.changePercent <= -1) {
    reasons.push(`${sectorName} price performance weak (${round(performance.changePercent, 2)}%)`);
  }

  if (input.benchmarkChangePercent !== null) {
    const vsBench = performance.changePercent - input.benchmarkChangePercent;
    if (vsBench >= 0.4) reasons.push(`${sectorName} outperforming benchmark`);
    else if (vsBench <= -0.4) reasons.push(`${sectorName} underperforming benchmark`);
  }

  if (breadth >= 65) reasons.push(`${sectorName} breadth constructive`);
  else if (breadth <= 40) reasons.push(`${sectorName} breadth weak`);

  if (trend === "Strong Bull" || trend === "Bull") {
    reasons.push(`${sectorName} leading`);
  } else if (trend === "Strong Bear" || trend === "Bear") {
    reasons.push(`${sectorName} weakening`);
  }

  const availableFactors =
    2 + // price + breadth always from performance
    (input.benchmarkChangePercent !== null ? 1 : 0) +
    (sectorConstituents.length > 0 ? 1 : 0) +
    (input.marketVolumeChangePercent !== null ? 1 : 0);
  const confidence = clamp(
    round(45 + availableFactors * 10 - (sectorConstituents.length === 0 ? 4 : 0), 1),
    0,
    100
  );

  return {
    sector: sectorName,
    score,
    trend,
    relativeStrength,
    breadth,
    volume,
    momentum,
    participation,
    confidence,
    reasons,
  };
}

/**
 * Builds rotation summary from current vs previous sector scores.
 * Falls back to score-vs-neutral heuristics when prior scores are missing.
 */
export function buildSectorRotationSummary(
  sectors: SectorAnalysis[],
  previousScores: Record<string, number>,
  config: SectorStrengthConfig = DEFAULT_SECTOR_STRENGTH_CONFIG
): SectorRotationSummary {
  const improving: string[] = [];
  const weakening: string[] = [];
  const stable: string[] = [];
  const reasons: string[] = [];
  const hasHistory = Object.keys(previousScores).length > 0;

  for (const sector of sectors) {
    const prior = previousScores[sector.sector];
    if (hasHistory && prior !== undefined) {
      const delta = sector.score - prior;
      if (delta >= config.rotationImproveDelta) improving.push(sector.sector);
      else if (delta <= config.rotationWeakenDelta) weakening.push(sector.sector);
      else stable.push(sector.sector);
    } else if (sector.score >= config.bullMin) {
      improving.push(sector.sector);
    } else if (sector.score <= config.bearMax) {
      weakening.push(sector.sector);
    } else {
      stable.push(sector.sector);
    }
  }

  const ranked = [...sectors].sort((a, b) => b.score - a.score);
  const leaders = ranked.slice(0, config.leaderCount).map((s) => s.sector);
  const laggards = ranked
    .slice(-config.leaderCount)
    .reverse()
    .map((s) => s.sector);

  if (improving.length > 0) {
    reasons.push(`Improving sectors: ${improving.slice(0, 3).join(", ")}`);
  }
  if (weakening.length > 0) {
    reasons.push(`Weakening sectors: ${weakening.slice(0, 3).join(", ")}`);
  }
  if (leaders.length > 0) {
    reasons.push(`Sector leaders: ${leaders.slice(0, 3).join(", ")}`);
  }

  return { improving, weakening, stable, leaders, laggards, reasons };
}

/**
 * Builds full SectorStrengthAnalysis across supported sectors.
 * Missing sectors degrade gracefully; single-sector failures do not abort.
 */
export function buildSectorStrengthAnalysis(
  input: SectorEngineInput
): SectorStrengthAnalysis {
  const config = resolveSectorStrengthConfig(input.config);

  if (!input.sectors.length && input.constituents.every((c) => !c.available)) {
    return createFallbackSectorStrengthAnalysis(input.asOf);
  }

  const observedNames = new Set<string>();
  for (const row of input.sectors) {
    observedNames.add(String(resolveSupportedSectorName(row.name)));
  }

  const sectorNames: string[] = [
    ...SUPPORTED_SECTORS.filter(
      (name) =>
        observedNames.has(name) ||
        input.sectors.some((row) =>
          normalizeSectorLabel(row.name).toLowerCase().includes(name.toLowerCase())
        )
    ),
  ];

  // Include any observed sector not in the canonical list.
  for (const name of observedNames) {
    if (!sectorNames.includes(name)) sectorNames.push(name);
  }

  // If still empty (all missing), evaluate canonical list with neutral fallbacks.
  const namesToEvaluate =
    sectorNames.length > 0 ? sectorNames : [...SUPPORTED_SECTORS];

  const analyses: SectorAnalysis[] = [];
  for (const name of namesToEvaluate) {
    try {
      const performance = findSectorPerformance(input.sectors, name);
      analyses.push(analyzeSector(name, performance, input, config));
    } catch {
      analyses.push({
        sector: name,
        score: 50,
        trend: "Neutral",
        relativeStrength: 50,
        breadth: 50,
        volume: 50,
        momentum: 50,
        participation: 50,
        confidence: 15,
        reasons: [`${name} evaluation failed — neutral fallback`],
      });
    }
  }

  const ranked = [...analyses].sort((a, b) => b.score - a.score);
  const leaders = ranked.slice(0, config.leaderCount);
  const weakest = ranked.slice(-config.leaderCount).reverse();
  const rotation = buildSectorRotationSummary(
    analyses,
    input.previousScores,
    config
  );

  const avgConfidence =
    analyses.length > 0
      ? analyses.reduce((sum, s) => sum + s.confidence, 0) / analyses.length
      : 20;

  const reasons = dedupe([
    ...rotation.reasons,
    ...leaders.slice(0, 2).flatMap((s) => s.reasons.slice(0, 1)),
    ...weakest.slice(0, 2).flatMap((s) => s.reasons.slice(0, 1)),
  ]);

  return {
    sectors: analyses,
    leaders,
    weakest,
    rotation,
    confidence: clamp(round(avgConfidence, 1), 0, 100),
    reasons,
    lastUpdated: input.asOf,
  };
}

export function createFallbackSectorStrengthAnalysis(
  asOf: Date = new Date(),
  reason = "Insufficient sector data — neutral sector strength applied"
): SectorStrengthAnalysis {
  const sectors: SectorAnalysis[] = SUPPORTED_SECTORS.map((sector) => ({
    sector,
    score: 50,
    trend: "Neutral" as const,
    relativeStrength: 50,
    breadth: 50,
    volume: 50,
    momentum: 50,
    participation: 50,
    confidence: 20,
    reasons: [reason],
  }));

  return {
    sectors,
    leaders: sectors.slice(0, 5),
    weakest: sectors.slice(-5),
    rotation: {
      improving: [],
      weakening: [],
      stable: sectors.map((s) => s.sector),
      leaders: sectors.slice(0, 5).map((s) => s.sector),
      laggards: sectors.slice(-5).map((s) => s.sector),
      reasons: [reason],
    },
    confidence: 20,
    reasons: [reason],
    lastUpdated: asOf,
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
