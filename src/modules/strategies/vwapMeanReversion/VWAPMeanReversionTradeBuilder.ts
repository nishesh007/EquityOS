/**
 * VWAP Mean Reversion Trade Builder — Sprint 11B.3D.2.
 * Converts validated detection into trade setup (no execution).
 */

import { round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
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

  /**
   * Build a complete trade setup from detection + market payload.
   * Never throws — returns rejected setup with warnings on failure.
   */
  build(input: VWAPMeanReversionTradeBuildInput): VWAPMeanReversionTradeSetup {
    try {
      const config = resolveVWAPMeanReversionTradeConfig({
        ...this.config,
        ...input.config,
      });
      const { detection } = input;

      if (!detection.detected || detection.direction === "NONE") {
        const rejected = createRejectedVWAPMeanReversionTradeSetup(detection, [
          "VWAP Mean Reversion detection not validated — trade construction skipped.",
          ...detection.warnings,
        ]);
        this.lastSetup = rejected;
        return rejected;
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
        const rejected = createRejectedVWAPMeanReversionTradeSetup(detection, [
          ...warnings,
          "Invalid entry.",
        ]);
        this.lastSetup = rejected;
        return rejected;
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
        const rejected = createRejectedVWAPMeanReversionTradeSetup(detection, [
          ...warnings,
          "Invalid stop.",
        ]);
        this.lastSetup = rejected;
        return rejected;
      }

      const riskCheck = validateTradeRisk({
        entry,
        stopLoss: stopResult.stopLoss,
        direction: detection.direction,
        config,
      });
      if (!riskCheck.valid) {
        const rejected = createRejectedVWAPMeanReversionTradeSetup(detection, [
          ...warnings,
          ...riskCheck.errors,
        ]);
        this.lastSetup = rejected;
        return rejected;
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
        const rejected = createRejectedVWAPMeanReversionTradeSetup(detection, [
          ...warnings,
          "Invalid targets.",
        ]);
        this.lastSetup = rejected;
        return rejected;
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
        const rejected = createRejectedVWAPMeanReversionTradeSetup(detection, [
          ...warnings,
          "Negative reward.",
        ]);
        this.lastSetup = rejected;
        return rejected;
      }

      if (riskReward + config.priceEpsilon < config.minimumRiskReward) {
        const rejected = createRejectedVWAPMeanReversionTradeSetup(detection, [
          ...warnings,
          "RR below threshold.",
        ]);
        this.lastSetup = rejected;
        return rejected;
      }

      const quality = calculateVWAPMeanReversionTradeQuality({
        detection,
        marketContext: input.marketContext,
        riskReward,
        config,
      });

      const setup: VWAPMeanReversionTradeSetup = {
        detection,
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
        const rejected = createRejectedVWAPMeanReversionTradeSetup(detection, [
          ...setup.warnings,
          ...validation.errors,
        ]);
        this.lastSetup = rejected;
        return rejected;
      }

      this.lastSetup = setup;
      return setup;
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
