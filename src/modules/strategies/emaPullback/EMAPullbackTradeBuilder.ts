/**
 * EMA Pullback Trade Builder — Sprint 11B.3P.
 */

import { round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { enrichEMAPullbackTradeSetup } from "./EMAPullbackEnrichment";
import { getEMAPullbackMetrics } from "./EMAPullbackMetrics";
import {
  calculateRiskAmount,
  resolveStopLoss,
  validateTradeRisk,
} from "./EMAPullbackRisk";
import type {
  EMAPullbackDetection,
  EMAPullbackStrategyInput,
} from "./EMAPullbackTypes";
import {
  resolveEMAPullbackTradeConfig,
  type EMAPullbackTradeConfig,
  type EMAPullbackTradeSetup,
} from "./EMAPullbackTradeTypes";
import {
  calculateEMAPullbackEntry,
  calculateEMAPullbackTradeQuality,
  calculateRiskReward,
  createRejectedEMAPullbackTradeSetup,
  generateEMAPullbackTargets,
  validateEMAPullbackTradeSetup,
} from "./EMAPullbackTradeUtils";

export interface EMAPullbackTradeBuildInput {
  detection: EMAPullbackDetection;
  marketContext: InstitutionalMarketContext;
  input: EMAPullbackStrategyInput;
  config?: Partial<EMAPullbackTradeConfig>;
}

export class EMAPullbackTradeBuilder {
  private readonly config: EMAPullbackTradeConfig;
  private lastSetup: EMAPullbackTradeSetup | null = null;

  constructor(config?: Partial<EMAPullbackTradeConfig>) {
    this.config = resolveEMAPullbackTradeConfig(config);
  }

  getConfiguration(): EMAPullbackTradeConfig {
    return resolveEMAPullbackTradeConfig(this.config);
  }

  getLastSetup(): EMAPullbackTradeSetup | null {
    return this.lastSetup;
  }

  build(input: EMAPullbackTradeBuildInput): EMAPullbackTradeSetup {
    const started =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    try {
      const config = resolveEMAPullbackTradeConfig({
        ...this.config,
        ...input.config,
      });
      const { detection } = input;

      const finalize = (setup: EMAPullbackTradeSetup): EMAPullbackTradeSetup => {
        const enriched = enrichEMAPullbackTradeSetup({
          setup,
          marketContext: input.marketContext,
          epInput: input.input,
        });
        this.lastSetup = enriched;
        try {
          const ended =
            typeof performance !== "undefined" ? performance.now() : Date.now();
          getEMAPullbackMetrics().record({
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
          createRejectedEMAPullbackTradeSetup(detection, [
            "EMA Pullback detection not validated — trade construction skipped.",
            ...detection.warnings,
          ])
        );
      }

      const warnings: string[] = [...detection.warnings];
      const payload = input.input.emaPullback;
      const atr = payload.atr ?? input.input.atr ?? null;
      const candles =
        payload.candles5m && payload.candles5m.length >= 8
          ? payload.candles5m
          : payload.candlesDaily;

      const entry = calculateEMAPullbackEntry({
        detection,
        candles,
        mode: config.entryMode,
        config,
      });
      if (entry === null) {
        return finalize(
          createRejectedEMAPullbackTradeSetup(detection, [
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
          createRejectedEMAPullbackTradeSetup(detection, [
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
          createRejectedEMAPullbackTradeSetup(detection, [
            ...warnings,
            ...riskCheck.errors,
          ])
        );
      }

      const targetResult = generateEMAPullbackTargets({
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
          createRejectedEMAPullbackTradeSetup(detection, [
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
          createRejectedEMAPullbackTradeSetup(detection, [
            ...warnings,
            "Negative reward.",
          ])
        );
      }
      if (riskReward + config.priceEpsilon < config.minimumRiskReward) {
        return finalize(
          createRejectedEMAPullbackTradeSetup(detection, [
            ...warnings,
            "RR below threshold.",
          ])
        );
      }

      const quality = calculateEMAPullbackTradeQuality({
        detection,
        marketContext: input.marketContext,
        riskReward,
        config,
      });

      const draft = createRejectedEMAPullbackTradeSetup(
        detection,
        dedupe(warnings)
      );
      const setup: EMAPullbackTradeSetup = {
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
        trendDirection: detection.trendDirection,
        pullbackType: detection.pullbackType,
        holdingPeriod: config.defaultHoldingPeriod,
        positionType: config.defaultPositionType,
        warnings: dedupe(warnings),
      };

      const validation = validateEMAPullbackTradeSetup(setup, config);
      if (!validation.valid) {
        return finalize(
          createRejectedEMAPullbackTradeSetup(detection, [
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
          : "EMA Pullback trade construction failed.";
      const rejected = createRejectedEMAPullbackTradeSetup(input.detection, [
        message,
      ]);
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

let builderSingleton: EMAPullbackTradeBuilder | null = null;

export function getEMAPullbackTradeBuilder(
  config?: Partial<EMAPullbackTradeConfig>
): EMAPullbackTradeBuilder {
  if (!builderSingleton) builderSingleton = new EMAPullbackTradeBuilder(config);
  return builderSingleton;
}

export function resetEMAPullbackTradeBuilder(): void {
  builderSingleton = null;
}
