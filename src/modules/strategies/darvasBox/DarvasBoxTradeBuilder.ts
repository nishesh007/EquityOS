/**
 * Darvas Box Trade Builder — Sprint 11B.3N.
 */

import { round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { enrichDarvasBoxTradeSetup } from "./DarvasBoxEnrichment";
import { getDarvasBoxMetrics } from "./DarvasBoxMetrics";
import {
  calculateRiskAmount,
  resolveStopLoss,
  validateTradeRisk,
} from "./DarvasBoxRisk";
import type {
  DarvasBoxDetection,
  DarvasBoxStrategyInput,
} from "./DarvasBoxTypes";
import {
  resolveDarvasBoxTradeConfig,
  type DarvasBoxTradeConfig,
  type DarvasBoxTradeSetup,
} from "./DarvasBoxTradeTypes";
import {
  calculateDarvasBoxEntry,
  calculateDarvasBoxTradeQuality,
  calculateRiskReward,
  createRejectedDarvasBoxTradeSetup,
  generateDarvasBoxTargets,
  validateDarvasBoxTradeSetup,
} from "./DarvasBoxTradeUtils";

export interface DarvasBoxTradeBuildInput {
  detection: DarvasBoxDetection;
  marketContext: InstitutionalMarketContext;
  input: DarvasBoxStrategyInput;
  config?: Partial<DarvasBoxTradeConfig>;
}

export class DarvasBoxTradeBuilder {
  private readonly config: DarvasBoxTradeConfig;
  private lastSetup: DarvasBoxTradeSetup | null = null;

  constructor(config?: Partial<DarvasBoxTradeConfig>) {
    this.config = resolveDarvasBoxTradeConfig(config);
  }

  getConfiguration(): DarvasBoxTradeConfig {
    return resolveDarvasBoxTradeConfig(this.config);
  }

  getLastSetup(): DarvasBoxTradeSetup | null {
    return this.lastSetup;
  }

  build(input: DarvasBoxTradeBuildInput): DarvasBoxTradeSetup {
    const started =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    try {
      const config = resolveDarvasBoxTradeConfig({
        ...this.config,
        ...input.config,
      });
      const { detection } = input;

      const finalize = (setup: DarvasBoxTradeSetup): DarvasBoxTradeSetup => {
        const enriched = enrichDarvasBoxTradeSetup({
          setup,
          marketContext: input.marketContext,
          dbInput: input.input,
        });
        this.lastSetup = enriched;
        try {
          const ended =
            typeof performance !== "undefined" ? performance.now() : Date.now();
          getDarvasBoxMetrics().record({
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
          createRejectedDarvasBoxTradeSetup(detection, [
            "Darvas Box detection not validated — trade construction skipped.",
            ...detection.warnings,
          ])
        );
      }

      const warnings: string[] = [...detection.warnings];
      const payload = input.input.darvasBox;
      const atr = payload.atr ?? input.input.atr ?? null;
      const candles = payload.candlesDaily;

      const entry = calculateDarvasBoxEntry({
        detection,
        candles,
        mode: config.entryMode,
        config,
      });
      if (entry === null) {
        return finalize(
          createRejectedDarvasBoxTradeSetup(detection, [
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
          createRejectedDarvasBoxTradeSetup(detection, [
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
          createRejectedDarvasBoxTradeSetup(detection, [
            ...warnings,
            ...riskCheck.errors,
          ])
        );
      }

      const targetResult = generateDarvasBoxTargets({
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
          createRejectedDarvasBoxTradeSetup(detection, [
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
          createRejectedDarvasBoxTradeSetup(detection, [
            ...warnings,
            "Negative reward.",
          ])
        );
      }
      if (riskReward + config.priceEpsilon < config.minimumRiskReward) {
        return finalize(
          createRejectedDarvasBoxTradeSetup(detection, [
            ...warnings,
            "RR below threshold.",
          ])
        );
      }

      const quality = calculateDarvasBoxTradeQuality({
        detection,
        marketContext: input.marketContext,
        riskReward,
        relativeStrength: payload.relativeStrength,
        config,
      });

      const draft = createRejectedDarvasBoxTradeSetup(
        detection,
        dedupe(warnings)
      );
      const setup: DarvasBoxTradeSetup = {
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
        boxHigh: detection.boxHigh,
        boxLow: detection.boxLow,
        boxHeight: detection.boxHeight,
        boxDuration: detection.boxDuration,
        holdingPeriod: config.defaultHoldingPeriod,
        positionType: config.defaultPositionType,
        warnings: dedupe(warnings),
      };

      const validation = validateDarvasBoxTradeSetup(setup, config);
      if (!validation.valid) {
        return finalize(
          createRejectedDarvasBoxTradeSetup(detection, [
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
          : "Darvas Box trade construction failed.";
      const rejected = createRejectedDarvasBoxTradeSetup(input.detection, [
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

let builderSingleton: DarvasBoxTradeBuilder | null = null;

export function getDarvasBoxTradeBuilder(
  config?: Partial<DarvasBoxTradeConfig>
): DarvasBoxTradeBuilder {
  if (!builderSingleton) builderSingleton = new DarvasBoxTradeBuilder(config);
  return builderSingleton;
}

export function resetDarvasBoxTradeBuilder(): void {
  builderSingleton = null;
}
