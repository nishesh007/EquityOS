/**
 * ORB Trade Builder — Sprint 11B.3B.2.
 * Converts validated ORBDetection into ORBTradeSetup (no execution).
 */

import { round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import {
  calculateRiskAmount,
  findBreakoutCandle,
  resolveStopLoss,
  validateTradeRisk,
} from "./ORBRisk";
import type { ORBDetection, ORBStrategyInput } from "./ORBTypes";
import {
  resolveORBTradeConfig,
  type ORBTradeConfig,
  type ORBTradeSetup,
} from "./ORBTradeTypes";
import {
  calculateORBEntry,
  calculateORBTradeQuality,
  calculateRiskReward,
  createRejectedTradeSetup,
  generateORBTargets,
  validateORBTradeSetup,
} from "./ORBTradeUtils";

export interface ORBTradeBuildInput {
  detection: ORBDetection;
  marketContext: InstitutionalMarketContext;
  input: ORBStrategyInput;
  config?: Partial<ORBTradeConfig>;
}

export class ORBTradeBuilder {
  private readonly config: ORBTradeConfig;
  private lastSetup: ORBTradeSetup | null = null;

  constructor(config?: Partial<ORBTradeConfig>) {
    this.config = resolveORBTradeConfig(config);
  }

  getConfiguration(): ORBTradeConfig {
    return resolveORBTradeConfig(this.config);
  }

  getLastSetup(): ORBTradeSetup | null {
    return this.lastSetup;
  }

  /**
   * Build a complete trade setup from detection + market payload.
   * Never throws — returns rejected setup with warnings on failure.
   */
  build(input: ORBTradeBuildInput): ORBTradeSetup {
    try {
      const config = resolveORBTradeConfig({
        ...this.config,
        ...input.config,
      });
      const { detection } = input;

      if (!detection.detected || detection.direction === "NONE") {
        const rejected = createRejectedTradeSetup(detection, [
          "ORB detection not validated — trade construction skipped.",
          ...detection.warnings,
        ]);
        this.lastSetup = rejected;
        return rejected;
      }

      const warnings: string[] = [...detection.warnings];
      const atr = input.input.orb.atr ?? input.input.atr ?? null;
      const vwap = input.input.orb.vwap;
      const candles = input.input.orb.candles5m;

      const entry = calculateORBEntry({
        detection,
        mode: config.entryMode,
        config,
      });
      if (entry === null) {
        const rejected = createRejectedTradeSetup(detection, [
          ...warnings,
          "Invalid entry.",
        ]);
        this.lastSetup = rejected;
        return rejected;
      }

      const breakoutCandle = findBreakoutCandle(detection, candles);
      const stopResult = resolveStopLoss({
        detection,
        entry,
        breakoutCandle,
        atr,
        method: config.stopMethod,
        config,
      });
      warnings.push(...stopResult.warnings);

      if (stopResult.stopLoss === null) {
        const rejected = createRejectedTradeSetup(detection, [
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
        const rejected = createRejectedTradeSetup(detection, [
          ...warnings,
          ...riskCheck.errors,
        ]);
        this.lastSetup = rejected;
        return rejected;
      }

      const targetResult = generateORBTargets({
        detection,
        entry,
        stopLoss: stopResult.stopLoss,
        atr,
        vwap,
        candles,
        config,
      });
      warnings.push(...targetResult.warnings);

      if (!targetResult.targets) {
        const rejected = createRejectedTradeSetup(detection, [
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
        const rejected = createRejectedTradeSetup(detection, [
          ...warnings,
          "Negative reward.",
        ]);
        this.lastSetup = rejected;
        return rejected;
      }

      if (riskReward + config.priceEpsilon < config.minimumRiskReward) {
        const rejected = createRejectedTradeSetup(detection, [
          ...warnings,
          "RR below threshold.",
        ]);
        this.lastSetup = rejected;
        return rejected;
      }

      const quality = calculateORBTradeQuality({
        detection,
        marketContext: input.marketContext,
        riskReward,
        config,
      });

      const draft: ORBTradeSetup = {
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

      const validation = validateORBTradeSetup(draft, config);
      if (!validation.valid) {
        const rejected = createRejectedTradeSetup(detection, [
          ...draft.warnings,
          ...validation.errors,
        ]);
        this.lastSetup = rejected;
        return rejected;
      }

      this.lastSetup = draft;
      return draft;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "ORB trade construction failed.";
      const rejected = createRejectedTradeSetup(input.detection, [message]);
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

let builderSingleton: ORBTradeBuilder | null = null;

export function getORBTradeBuilder(
  config?: Partial<ORBTradeConfig>
): ORBTradeBuilder {
  if (!builderSingleton) {
    builderSingleton = new ORBTradeBuilder(config);
  }
  return builderSingleton;
}

export function resetORBTradeBuilder(): void {
  builderSingleton = null;
}
