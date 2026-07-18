/**
 * Cup & Handle Trade Builder — Sprint 11B.3Q.
 */

import { round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { enrichCupHandleTradeSetup } from "./CupHandleEnrichment";
import { getCupHandleMetrics } from "./CupHandleMetrics";
import {
  calculateRiskAmount,
  resolveStopLoss,
  validateTradeRisk,
} from "./CupHandleRisk";
import type {
  CupHandleDetection,
  CupHandleStrategyInput,
} from "./CupHandleTypes";
import {
  resolveCupHandleTradeConfig,
  type CupHandleTradeConfig,
  type CupHandleTradeSetup,
} from "./CupHandleTradeTypes";
import {
  calculateCupHandleEntry,
  calculateCupHandleTradeQuality,
  calculateRiskReward,
  createRejectedCupHandleTradeSetup,
  generateCupHandleTargets,
  validateCupHandleTradeSetup,
} from "./CupHandleTradeUtils";

export interface CupHandleTradeBuildInput {
  detection: CupHandleDetection;
  marketContext: InstitutionalMarketContext;
  input: CupHandleStrategyInput;
  config?: Partial<CupHandleTradeConfig>;
}

export class CupHandleTradeBuilder {
  private readonly config: CupHandleTradeConfig;
  private lastSetup: CupHandleTradeSetup | null = null;

  constructor(config?: Partial<CupHandleTradeConfig>) {
    this.config = resolveCupHandleTradeConfig(config);
  }

  getConfiguration(): CupHandleTradeConfig {
    return resolveCupHandleTradeConfig(this.config);
  }

  getLastSetup(): CupHandleTradeSetup | null {
    return this.lastSetup;
  }

  build(input: CupHandleTradeBuildInput): CupHandleTradeSetup {
    const started =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    try {
      const config = resolveCupHandleTradeConfig({
        ...this.config,
        ...input.config,
      });
      const { detection } = input;

      const finalize = (setup: CupHandleTradeSetup): CupHandleTradeSetup => {
        const enriched = enrichCupHandleTradeSetup({
          setup,
          marketContext: input.marketContext,
          chInput: input.input,
        });
        this.lastSetup = enriched;
        try {
          const ended =
            typeof performance !== "undefined" ? performance.now() : Date.now();
          getCupHandleMetrics().record({
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
          createRejectedCupHandleTradeSetup(detection, [
            "Cup & Handle detection not validated — trade construction skipped.",
            ...detection.warnings,
          ])
        );
      }

      const warnings: string[] = [...detection.warnings];
      const payload = input.input.cupHandle;
      const atr = payload.atr ?? input.input.atr ?? null;
      const candles = payload.candlesDaily;

      const entry = calculateCupHandleEntry({
        detection,
        candles,
        mode: config.entryMode,
        config,
      });
      if (entry === null) {
        return finalize(
          createRejectedCupHandleTradeSetup(detection, [
            ...warnings,
            "Invalid entry.",
          ])
        );
      }

      const stopResult = resolveStopLoss({
        detection,
        entry,
        atr,
        method: config.stopMethod,
        config,
      });
      warnings.push(...stopResult.warnings);
      if (stopResult.stopLoss === null) {
        return finalize(
          createRejectedCupHandleTradeSetup(detection, [
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
          createRejectedCupHandleTradeSetup(detection, [
            ...warnings,
            ...riskCheck.errors,
          ])
        );
      }

      const targetResult = generateCupHandleTargets({
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
          createRejectedCupHandleTradeSetup(detection, [
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
          createRejectedCupHandleTradeSetup(detection, [
            ...warnings,
            "Negative reward.",
          ])
        );
      }
      if (riskReward + config.priceEpsilon < config.minimumRiskReward) {
        return finalize(
          createRejectedCupHandleTradeSetup(detection, [
            ...warnings,
            "RR below threshold.",
          ])
        );
      }

      const quality = calculateCupHandleTradeQuality({
        detection,
        marketContext: input.marketContext,
        riskReward,
        relativeStrength: payload.relativeStrength ?? null,
        config,
      });

      const draft = createRejectedCupHandleTradeSetup(
        detection,
        dedupe(warnings)
      );
      const setup: CupHandleTradeSetup = {
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
        cupDepth: detection.cupDepth,
        cupDuration: detection.cupDuration,
        handleDepth: detection.handleDepth,
        handleDuration: detection.handleDuration,
        pivotPrice: detection.pivotPrice,
        holdingPeriod: config.defaultHoldingPeriod,
        positionType: config.defaultPositionType,
        warnings: dedupe(warnings),
      };

      const validation = validateCupHandleTradeSetup(setup, config);
      if (!validation.valid) {
        return finalize(
          createRejectedCupHandleTradeSetup(detection, [
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
          : "Cup & Handle trade construction failed.";
      const rejected = createRejectedCupHandleTradeSetup(input.detection, [
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

let builderSingleton: CupHandleTradeBuilder | null = null;

export function getCupHandleTradeBuilder(
  config?: Partial<CupHandleTradeConfig>
): CupHandleTradeBuilder {
  if (!builderSingleton) builderSingleton = new CupHandleTradeBuilder(config);
  return builderSingleton;
}

export function resetCupHandleTradeBuilder(): void {
  builderSingleton = null;
}
