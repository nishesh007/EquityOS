/**
 * News Momentum Trade Builder — Sprint 11B.3K.
 */

import { round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { enrichNewsMomentumTradeSetup } from "./NewsMomentumEnrichment";
import { getNewsMomentumMetrics } from "./NewsMomentumMetrics";
import {
  calculateRiskAmount,
  resolveStopLoss,
  validateTradeRisk,
} from "./NewsMomentumRisk";
import type {
  NewsMomentumDetection,
  NewsMomentumStrategyInput,
} from "./NewsMomentumTypes";
import {
  resolveNewsMomentumTradeConfig,
  type NewsMomentumTradeConfig,
  type NewsMomentumTradeSetup,
} from "./NewsMomentumTradeTypes";
import {
  calculateNewsMomentumEntry,
  calculateNewsMomentumTradeQuality,
  calculateRiskReward,
  createRejectedNewsMomentumTradeSetup,
  generateNewsMomentumTargets,
  validateNewsMomentumTradeSetup,
} from "./NewsMomentumTradeUtils";

export interface NewsMomentumTradeBuildInput {
  detection: NewsMomentumDetection;
  marketContext: InstitutionalMarketContext;
  input: NewsMomentumStrategyInput;
  config?: Partial<NewsMomentumTradeConfig>;
}

export class NewsMomentumTradeBuilder {
  private readonly config: NewsMomentumTradeConfig;
  private lastSetup: NewsMomentumTradeSetup | null = null;

  constructor(config?: Partial<NewsMomentumTradeConfig>) {
    this.config = resolveNewsMomentumTradeConfig(config);
  }

  getConfiguration(): NewsMomentumTradeConfig {
    return resolveNewsMomentumTradeConfig(this.config);
  }

  getLastSetup(): NewsMomentumTradeSetup | null {
    return this.lastSetup;
  }

  build(
    input: NewsMomentumTradeBuildInput
  ): NewsMomentumTradeSetup {
    const started =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    try {
      const config = resolveNewsMomentumTradeConfig({
        ...this.config,
        ...input.config,
      });
      const { detection } = input;

      const finalize = (
        setup: NewsMomentumTradeSetup
      ): NewsMomentumTradeSetup => {
        const enriched = enrichNewsMomentumTradeSetup({
          setup,
          marketContext: input.marketContext,
          nmInput: input.input,
        });
        this.lastSetup = enriched;
        try {
          const ended =
            typeof performance !== "undefined" ? performance.now() : Date.now();
          getNewsMomentumMetrics().record({
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
          createRejectedNewsMomentumTradeSetup(detection, [
            "News Momentum detection not validated — trade construction skipped.",
            ...detection.warnings,
          ])
        );
      }

      const warnings: string[] = [...detection.warnings];
      const payload = input.input.newsMomentum;
      const atr = payload.atr ?? input.input.atr ?? null;
      const candles = payload.candles5m;

      const entry = calculateNewsMomentumEntry({
        detection,
        candles,
        vwap: payload.vwap,
        mode: config.entryMode,
        config,
      });
      if (entry === null) {
        return finalize(
          createRejectedNewsMomentumTradeSetup(detection, [
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
          createRejectedNewsMomentumTradeSetup(detection, [
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
          createRejectedNewsMomentumTradeSetup(detection, [
            ...warnings,
            ...riskCheck.errors,
          ])
        );
      }

      const targetResult = generateNewsMomentumTargets({
        detection,
        entry,
        stopLoss: stopResult.stopLoss,
        atr,
        candles,
        gapPercent: payload.gapPercent,
        config,
      });
      warnings.push(...targetResult.warnings);

      if (!targetResult.targets) {
        return finalize(
          createRejectedNewsMomentumTradeSetup(detection, [
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
          createRejectedNewsMomentumTradeSetup(detection, [
            ...warnings,
            "Negative reward.",
          ])
        );
      }

      if (riskReward + config.priceEpsilon < config.minimumRiskReward) {
        return finalize(
          createRejectedNewsMomentumTradeSetup(detection, [
            ...warnings,
            "RR below threshold.",
          ])
        );
      }

      const quality = calculateNewsMomentumTradeQuality({
        detection,
        marketContext: input.marketContext,
        riskReward,
        relativeVolume: payload.relativeVolume,
        config,
      });

      const draft = createRejectedNewsMomentumTradeSetup(
        detection,
        dedupe(warnings)
      );
      const setup: NewsMomentumTradeSetup = {
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
        catalystType: detection.catalystType,
        catalystStrength: detection.catalystStrength,
        holdingPeriod: config.defaultHoldingPeriod,
        positionType: config.defaultPositionType,
        warnings: dedupe(warnings),
      };

      const validation = validateNewsMomentumTradeSetup(setup, config);
      if (!validation.valid) {
        return finalize(
          createRejectedNewsMomentumTradeSetup(detection, [
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
          : "News Momentum trade construction failed.";
      const rejected = createRejectedNewsMomentumTradeSetup(
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

let builderSingleton: NewsMomentumTradeBuilder | null = null;

export function getNewsMomentumTradeBuilder(
  config?: Partial<NewsMomentumTradeConfig>
): NewsMomentumTradeBuilder {
  if (!builderSingleton) {
    builderSingleton = new NewsMomentumTradeBuilder(config);
  }
  return builderSingleton;
}

export function resetNewsMomentumTradeBuilder(): void {
  builderSingleton = null;
}
