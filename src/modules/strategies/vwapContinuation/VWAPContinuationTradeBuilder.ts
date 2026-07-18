/**
 * VWAP Continuation Trade Builder — Sprint 11B.3C.2.
 * Converts validated VWAPContinuationDetection into trade setup (no execution).
 */

import { round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import {
  calculateRiskAmount,
  resolveStopLoss,
  validateTradeRisk,
} from "./VWAPContinuationRisk";
import type {
  VWAPContinuationDetection,
  VWAPContinuationStrategyInput,
} from "./VWAPContinuationTypes";
import {
  resolveVWAPContinuationTradeConfig,
  type VWAPContinuationTradeConfig,
  type VWAPContinuationTradeSetup,
} from "./VWAPContinuationTradeTypes";
import {
  calculateRiskReward,
  calculateVWAPContinuationEntry,
  calculateVWAPContinuationTradeQuality,
  createRejectedVWAPContinuationTradeSetup,
  generateVWAPContinuationTargets,
  validateVWAPContinuationTradeSetup,
} from "./VWAPContinuationTradeUtils";

export interface VWAPContinuationTradeBuildInput {
  detection: VWAPContinuationDetection;
  marketContext: InstitutionalMarketContext;
  input: VWAPContinuationStrategyInput;
  config?: Partial<VWAPContinuationTradeConfig>;
}

export class VWAPContinuationTradeBuilder {
  private readonly config: VWAPContinuationTradeConfig;
  private lastSetup: VWAPContinuationTradeSetup | null = null;

  constructor(config?: Partial<VWAPContinuationTradeConfig>) {
    this.config = resolveVWAPContinuationTradeConfig(config);
  }

  getConfiguration(): VWAPContinuationTradeConfig {
    return resolveVWAPContinuationTradeConfig(this.config);
  }

  getLastSetup(): VWAPContinuationTradeSetup | null {
    return this.lastSetup;
  }

  /**
   * Build a complete trade setup from detection + market payload.
   * Never throws — returns rejected setup with warnings on failure.
   */
  build(input: VWAPContinuationTradeBuildInput): VWAPContinuationTradeSetup {
    try {
      const config = resolveVWAPContinuationTradeConfig({
        ...this.config,
        ...input.config,
      });
      const { detection } = input;

      if (!detection.detected || detection.direction === "NONE") {
        const rejected = createRejectedVWAPContinuationTradeSetup(detection, [
          "VWAP Continuation detection not validated — trade construction skipped.",
          ...detection.warnings,
        ]);
        this.lastSetup = rejected;
        return rejected;
      }

      const warnings: string[] = [...detection.warnings];
      const payload = input.input.vwapContinuation;
      const atr = payload.atr ?? input.input.atr ?? null;
      const vwap =
        Number.isFinite(payload.vwap) && payload.vwap > 0
          ? payload.vwap
          : detection.vwap;
      const candles = payload.candles5m;
      const recentSwingHigh = payload.recentSwingHigh;
      const recentSwingLow = payload.recentSwingLow;

      const entry = calculateVWAPContinuationEntry({
        detection,
        candles,
        vwap,
        mode: config.entryMode,
        config,
      });
      if (entry === null) {
        const rejected = createRejectedVWAPContinuationTradeSetup(detection, [
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
        vwap,
        candles,
        recentSwingHigh,
        recentSwingLow,
        method: config.stopMethod,
        config,
      });
      warnings.push(...stopResult.warnings);

      if (stopResult.stopLoss === null) {
        const rejected = createRejectedVWAPContinuationTradeSetup(detection, [
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
        const rejected = createRejectedVWAPContinuationTradeSetup(detection, [
          ...warnings,
          ...riskCheck.errors,
        ]);
        this.lastSetup = rejected;
        return rejected;
      }

      const targetResult = generateVWAPContinuationTargets({
        detection,
        entry,
        stopLoss: stopResult.stopLoss,
        atr,
        candles,
        recentSwingHigh,
        recentSwingLow,
        config,
      });
      warnings.push(...targetResult.warnings);

      if (!targetResult.targets) {
        const rejected = createRejectedVWAPContinuationTradeSetup(detection, [
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
        const rejected = createRejectedVWAPContinuationTradeSetup(detection, [
          ...warnings,
          "Negative reward.",
        ]);
        this.lastSetup = rejected;
        return rejected;
      }

      if (riskReward + config.priceEpsilon < config.minimumRiskReward) {
        const rejected = createRejectedVWAPContinuationTradeSetup(detection, [
          ...warnings,
          "RR below threshold.",
        ]);
        this.lastSetup = rejected;
        return rejected;
      }

      const quality = calculateVWAPContinuationTradeQuality({
        detection,
        marketContext: input.marketContext,
        riskReward,
        config,
      });

      const setup: VWAPContinuationTradeSetup = {
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

      const validation = validateVWAPContinuationTradeSetup(setup, config);
      if (!validation.valid) {
        const rejected = createRejectedVWAPContinuationTradeSetup(detection, [
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
          : "VWAP Continuation trade construction failed.";
      const rejected = createRejectedVWAPContinuationTradeSetup(
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

let builderSingleton: VWAPContinuationTradeBuilder | null = null;

export function getVWAPContinuationTradeBuilder(
  config?: Partial<VWAPContinuationTradeConfig>
): VWAPContinuationTradeBuilder {
  if (!builderSingleton) {
    builderSingleton = new VWAPContinuationTradeBuilder(config);
  }
  return builderSingleton;
}

export function resetVWAPContinuationTradeBuilder(): void {
  builderSingleton = null;
}
