/**
 * VWAP Mean Reversion Trade Builder — Sprint 11B.3D.2 / 11B.3D.3.
 * Converts validated detection into trade setup with institutional enrichment.
 * No portfolio execution.
 */

import { round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { enrichVWAPMeanReversionTradeSetup } from "./VWAPMeanReversionEnrichment";
import { getVWAPMeanReversionMetrics } from "./VWAPMeanReversionMetrics";
import {
  calculateRiskAmount,
  resolveStopLoss,
  validateTradeRisk,
} from "./VWAPMeanReversionRisk";
import type {
  VWAPMeanReversionDetection,
  VWAPMeanReversionStrategyInput,
} from "./VWAPMeanReversionTypes";
import {
  resolveVWAPMeanReversionTradeConfig,
  type VWAPMeanReversionTradeConfig,
  type VWAPMeanReversionTradeSetup,
} from "./VWAPMeanReversionTradeTypes";
import {
  calculateRiskReward,
  calculateVWAPMeanReversionEntry,
  calculateVWAPMeanReversionTradeQuality,
  createRejectedVWAPMeanReversionTradeSetup,
  generateVWAPMeanReversionTargets,
  validateVWAPMeanReversionTradeSetup,
} from "./VWAPMeanReversionTradeUtils";

export interface VWAPMeanReversionTradeBuildInput {
  detection: VWAPMeanReversionDetection;
  marketContext: InstitutionalMarketContext;
  input: VWAPMeanReversionStrategyInput;
  config?: Partial<VWAPMeanReversionTradeConfig>;
}

export class VWAPMeanReversionTradeBuilder {
  private readonly config: VWAPMeanReversionTradeConfig;
  private lastSetup: VWAPMeanReversionTradeSetup | null = null;

  constructor(config?: Partial<VWAPMeanReversionTradeConfig>) {
    this.config = resolveVWAPMeanReversionTradeConfig(config);
  }

  getConfiguration(): VWAPMeanReversionTradeConfig {
    return resolveVWAPMeanReversionTradeConfig(this.config);
  }

  getLastSetup(): VWAPMeanReversionTradeSetup | null {
    return this.lastSetup;
  }

  build(input: VWAPMeanReversionTradeBuildInput): VWAPMeanReversionTradeSetup {
    const started =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    try {
      const config = resolveVWAPMeanReversionTradeConfig({
        ...this.config,
        ...input.config,
      });
      const { detection } = input;

      const finalize = (
        setup: VWAPMeanReversionTradeSetup
      ): VWAPMeanReversionTradeSetup => {
        const enriched = enrichVWAPMeanReversionTradeSetup({
          setup,
          marketContext: input.marketContext,
          mrInput: input.input,
        });
        this.lastSetup = enriched;
        try {
          const ended =
            typeof performance !== "undefined" ? performance.now() : Date.now();
          getVWAPMeanReversionMetrics().record({
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
          createRejectedVWAPMeanReversionTradeSetup(detection, [
            "VWAP Mean Reversion detection not validated — trade construction skipped.",
            ...detection.warnings,
          ])
        );
      }

      const warnings: string[] = [...detection.warnings];
      const payload = input.input.vwapMeanReversion;
      const atr = payload.atr ?? input.input.atr ?? null;
      const vwap =
        Number.isFinite(payload.vwap) && payload.vwap > 0
          ? payload.vwap
          : detection.vwap;
      const candles = payload.candles5m;
      const recentSwingHigh = payload.recentSwingHigh;
      const recentSwingLow = payload.recentSwingLow;

      const entry = calculateVWAPMeanReversionEntry({
        detection,
        candles,
        vwap,
        mode: config.entryMode,
        config,
      });
      if (entry === null) {
        return finalize(
          createRejectedVWAPMeanReversionTradeSetup(detection, [
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
        recentSwingHigh,
        recentSwingLow,
        method: config.stopMethod,
        config,
      });
      warnings.push(...stopResult.warnings);

      if (stopResult.stopLoss === null) {
        return finalize(
          createRejectedVWAPMeanReversionTradeSetup(detection, [
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
          createRejectedVWAPMeanReversionTradeSetup(detection, [
            ...warnings,
            ...riskCheck.errors,
          ])
        );
      }

      const targetResult = generateVWAPMeanReversionTargets({
        detection,
        entry,
        stopLoss: stopResult.stopLoss,
        vwap,
        atr,
        candles,
        recentSwingHigh,
        recentSwingLow,
        config,
      });
      warnings.push(...targetResult.warnings);

      if (!targetResult.targets) {
        return finalize(
          createRejectedVWAPMeanReversionTradeSetup(detection, [
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
          createRejectedVWAPMeanReversionTradeSetup(detection, [
            ...warnings,
            "Negative reward.",
          ])
        );
      }

      if (riskReward + config.priceEpsilon < config.minimumRiskReward) {
        return finalize(
          createRejectedVWAPMeanReversionTradeSetup(detection, [
            ...warnings,
            "RR below threshold.",
          ])
        );
      }

      const quality = calculateVWAPMeanReversionTradeQuality({
        detection,
        marketContext: input.marketContext,
        riskReward,
        config,
      });

      const draft = createRejectedVWAPMeanReversionTradeSetup(
        detection,
        dedupe(warnings)
      );
      const setup: VWAPMeanReversionTradeSetup = {
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

      const validation = validateVWAPMeanReversionTradeSetup(setup, config);
      if (!validation.valid) {
        return finalize(
          createRejectedVWAPMeanReversionTradeSetup(detection, [
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
          : "VWAP Mean Reversion trade construction failed.";
      const rejected = createRejectedVWAPMeanReversionTradeSetup(
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

let builderSingleton: VWAPMeanReversionTradeBuilder | null = null;

export function getVWAPMeanReversionTradeBuilder(
  config?: Partial<VWAPMeanReversionTradeConfig>
): VWAPMeanReversionTradeBuilder {
  if (!builderSingleton) {
    builderSingleton = new VWAPMeanReversionTradeBuilder(config);
  }
  return builderSingleton;
}

export function resetVWAPMeanReversionTradeBuilder(): void {
  builderSingleton = null;
}
