/**
 * Sector Strength Engine — Sprint 11B.1B.
 * Evaluates sector leadership, weakness, and rotation.
 */

import type {
  SectorEngineInput,
  SectorStrengthAnalysis,
  SectorStrengthConfig,
} from "./MarketContextTypes";
import {
  buildSectorStrengthAnalysis,
  createFallbackSectorStrengthAnalysis,
  resolveSectorStrengthConfig,
} from "./SectorStrengthUtils";

export class SectorStrengthEngine {
  private current: SectorStrengthAnalysis | null = null;
  private previousScores: Record<string, number> = {};
  private readonly config: SectorStrengthConfig;

  constructor(config?: Partial<SectorStrengthConfig>) {
    this.config = resolveSectorStrengthConfig(config);
  }

  /**
   * Analyze sector strength. Threads prior scores for rotation detection.
   */
  analyze(input: SectorEngineInput): SectorStrengthAnalysis {
    try {
      const merged: SectorEngineInput = {
        ...input,
        previousScores:
          Object.keys(input.previousScores).length > 0
            ? input.previousScores
            : { ...this.previousScores },
        config: { ...this.config, ...input.config },
      };
      const analysis = buildSectorStrengthAnalysis(merged);
      this.previousScores = Object.fromEntries(
        analysis.sectors.map((sector) => [sector.sector, sector.score])
      );
      this.current = analysis;
      return analysis;
    } catch {
      const fallback = createFallbackSectorStrengthAnalysis(
        input.asOf ?? new Date(),
        "Sector strength analysis failed — neutral fallback applied"
      );
      this.current = fallback;
      return fallback;
    }
  }

  getCurrentAnalysis(): SectorStrengthAnalysis | null {
    return this.current;
  }

  getConfiguration(): SectorStrengthConfig {
    return resolveSectorStrengthConfig(this.config);
  }

  clear(): void {
    this.current = null;
    this.previousScores = {};
  }
}

let sectorSingleton: SectorStrengthEngine | null = null;

export function getSectorStrengthEngine(
  config?: Partial<SectorStrengthConfig>
): SectorStrengthEngine {
  if (!sectorSingleton) {
    sectorSingleton = new SectorStrengthEngine(config);
  }
  return sectorSingleton;
}

export function resetSectorStrengthEngine(): void {
  if (sectorSingleton) sectorSingleton.clear();
  sectorSingleton = null;
}
