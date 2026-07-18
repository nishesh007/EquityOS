/**
 * Sector Rotation Trade Builder — Sprint 11B.3J.
 */

import { round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { enrichSectorRotationTradeSetup } from "./SectorRotationEnrichment";
import { getSectorRotationMetrics } from "./SectorRotationMetrics";
import {
  calculateRiskAmount,
  resolveStopLoss,
  validateTradeRisk,
} from "./SectorRotationRisk";
import type {
  SectorRotationDetection,
  SectorRotationStrategyInput,
} from "./SectorRotationTypes";
import {
  resolveSectorRotationTradeConfig,
  type SectorRotationTradeConfig,
  type SectorRotationTradeSetup,
} from "./SectorRotationTradeTypes";
import {
  calculateRiskReward,
  calculateSectorRotationEntry,
  calculateSectorRotationTradeQuality,
  createRejectedSectorRotationTradeSetup,
  generateSectorRotationTargets,
  validateSectorRotationTradeSetup,
} from "./SectorRotationTradeUtils";

export interface SectorRotationTradeBuildInput {
  detection: SectorRotationDetection;
  marketContext: InstitutionalMarketContext;
  input: SectorRotationStrategyInput;
  config?: Partial<SectorRotationTradeConfig>;
}

export class SectorRotationTradeBuilder {
  private readonly config: SectorRotationTradeConfig;
  private lastSetup: SectorRotationTradeSetup | null = null;

  constructor(config?: Partial<SectorRotationTradeConfig>) {
    this.config = resolveSectorRotationTradeConfig(config);
  }

  getConfiguration(): SectorRotationTradeConfig {
    return resolveSectorRotationTradeConfig(this.config);
  }

  getLastSetup(): SectorRotationTradeSetup | null {
    return this.lastSetup;
  }

  build(
    input: SectorRotationTradeBuildInput
  ): SectorRotationTradeSetup {
    const started =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    try {
      const config = resolveSectorRotationTradeConfig({
        ...this.config,
        ...input.config,
      });
      const { detection } = input;

      const finalize = (
        setup: SectorRotationTradeSetup
      ): SectorRotationTradeSetup => {
        const enriched = enrichSectorRotationTradeSetup({
          setup,
          marketContext: input.marketContext,
          srInput: input.input,
        });
        this.lastSetup = enriched;
        try {
          const ended =
            typeof performance !== "undefined" ? performance.now() : Date.now();
          getSectorRotationMetrics().record({
            setup: enriched,
            executionTimeMs: ended - started,
          });
        } catch {
          // Metrics optional.
        }
        return enriched;
      };

      if (!detection.detected || detection.direction === "NONE") {
        return finalize(
          createRejectedSectorRotationTradeSetup(detection, [
            "Sector Rotation detection not validated — trade construction skipped.",
            ...detection.warnings,
          ])
        );
      }

      const warnings: string[] = [...detection.warnings];
      const payload = input.input.sectorRotation;
      const atr = payload.atr ?? input.input.atr ?? null;
      const candles = payload.candles5m;

      const entry = calculateSectorRotationEntry({
        detection,
        candles,
        vwap: payload.vwap,
        mode: config.entryMode,
        config,
      });
      if (entry === null) {
        return finalize(
          createRejectedSectorRotationTradeSetup(detection, [
            ...warnings,
            "Invalid entry.",
          ])
        );
      }

      const stopResult = resolveStopLoss({
        detection,
        entry,
        atr,
        candles,
        method: config.stopMethod,
        config,
      });
      warnings.push(...stopResult.warnings);

      if (stopResult.stopLoss === null) {
        return finalize(
          createRejectedSectorRotationTradeSetup(detection, [
            ...warnings,
            "Invalid stop.",
          ])
        );
      }

      const riskCheck = validateTradeRisk({
        entry,
        stopLoss: stopResult.stopLoss,
        direction: detection.direction,
        config,
      });
      if (!riskCheck.valid) {
        return finalize(
          createRejectedSectorRotationTradeSetup(detection, [
            ...warnings,
            ...riskCheck.errors,
          ])
        );
      }

      const targetResult = generateSectorRotationTargets({
        detection,
        entry,
        stopLoss: stopResult.stopLoss,
        atr,
        candles,
        config,
      });
      warnings.push(...targetResult.warnings);

      if (!targetResult.targets) {
        return finalize(
          createRejectedSectorRotationTradeSetup(detection, [
            ...warnings,
            "Invalid targets.",
          ])
        );
      }

      const risk = calculateRiskAmount(entry, stopResult.stopLoss);
      const reward = round(
        Math.abs(targetResult.targets.finalTarget - entry),
        4
      );
      const riskReward = calculateRiskReward(
        entry,
        stopResult.stopLoss,
        targetResult.targets.finalTarget
      );

      if (reward <= 0) {
        return finalize(
          createRejectedSectorRotationTradeSetup(detection, [
            ...warnings,
            "Negative reward.",
          ])
        );
      }

      if (riskReward + config.priceEpsilon < config.minimumRiskReward) {
        return finalize(
          createRejectedSectorRotationTradeSetup(detection, [
            ...warnings,
            "RR below threshold.",
          ])
        );
      }

      const quality = calculateSectorRotationTradeQuality({
        detection,
        marketContext: input.marketContext,
        riskReward,
        relativeVolume: payload.relativeVolume,
        config,
      });

      const draft = createRejectedSectorRotationTradeSetup(
        detection,
        dedupe(warnings)
      );
      const setup: SectorRotationTradeSetup = {
        ...draft,
        entry,
        stopLoss: stopResult.stopLoss,
        target1: targetResult.targets.target1,
        target2: targetResult.targets.target2,
        finalTarget: targetResult.targets.finalTarget,
        risk,
        reward,
        riskReward,
        qualityScore: quality.score,
        qualityGrade: quality.grade,
        holdingPeriod: config.defaultHoldingPeriod,
        positionType: config.defaultPositionType,
        warnings: dedupe(warnings),
      };

      const validation = validateSectorRotationTradeSetup(setup, config);
      if (!validation.valid) {
        return finalize(
          createRejectedSectorRotationTradeSetup(detection, [
            ...setup.warnings,
            ...validation.errors,
          ])
        );
      }

      return finalize(setup);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Sector Rotation trade construction failed.";
      const rejected = createRejectedSectorRotationTradeSetup(
        input.detection,
        [message]
      );
      this.lastSetup = rejected;
      return rejected;
    }
  }
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

let builderSingleton: SectorRotationTradeBuilder | null = null;

export function getSectorRotationTradeBuilder(
  config?: Partial<SectorRotationTradeConfig>
): SectorRotationTradeBuilder {
  if (!builderSingleton) {
    builderSingleton = new SectorRotationTradeBuilder(config);
  }
  return builderSingleton;
}

export function resetSectorRotationTradeBuilder(): void {
  builderSingleton = null;
}
