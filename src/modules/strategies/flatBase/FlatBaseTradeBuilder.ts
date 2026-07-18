/**
 * Flat Base Trade Builder — Sprint 11B.3R.
 */

import { round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { enrichFlatBaseTradeSetup } from "./FlatBaseEnrichment";
import { getFlatBaseMetrics } from "./FlatBaseMetrics";
import {
  calculateRiskAmount,
  resolveStopLoss,
  validateTradeRisk,
} from "./FlatBaseRisk";
import type {
  FlatBaseDetection,
  FlatBaseStrategyInput,
} from "./FlatBaseTypes";
import {
  resolveFlatBaseTradeConfig,
  type FlatBaseTradeConfig,
  type FlatBaseTradeSetup,
} from "./FlatBaseTradeTypes";
import {
  calculateFlatBaseEntry,
  calculateFlatBaseTradeQuality,
  calculateRiskReward,
  createRejectedFlatBaseTradeSetup,
  generateFlatBaseTargets,
  validateFlatBaseTradeSetup,
} from "./FlatBaseTradeUtils";

export interface FlatBaseTradeBuildInput {
  detection: FlatBaseDetection;
  marketContext: InstitutionalMarketContext;
  input: FlatBaseStrategyInput;
  config?: Partial<FlatBaseTradeConfig>;
}

export class FlatBaseTradeBuilder {
  private readonly config: FlatBaseTradeConfig;
  private lastSetup: FlatBaseTradeSetup | null = null;

  constructor(config?: Partial<FlatBaseTradeConfig>) {
    this.config = resolveFlatBaseTradeConfig(config);
  }

  getConfiguration(): FlatBaseTradeConfig {
    return resolveFlatBaseTradeConfig(this.config);
  }

  getLastSetup(): FlatBaseTradeSetup | null {
    return this.lastSetup;
  }

  build(input: FlatBaseTradeBuildInput): FlatBaseTradeSetup {
    const started =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    try {
      const config = resolveFlatBaseTradeConfig({
        ...this.config,
        ...input.config,
      });
      const { detection } = input;

      const finalize = (setup: FlatBaseTradeSetup): FlatBaseTradeSetup => {
        const enriched = enrichFlatBaseTradeSetup({
          setup,
          marketContext: input.marketContext,
          fbInput: input.input,
        });
        this.lastSetup = enriched;
        try {
          const ended =
            typeof performance !== "undefined" ? performance.now() : Date.now();
          getFlatBaseMetrics().record({
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
          createRejectedFlatBaseTradeSetup(detection, [
            "Flat Base detection not validated — trade construction skipped.",
            ...detection.warnings,
          ])
        );
      }

      const warnings: string[] = [...detection.warnings];
      const payload = input.input.flatBase;
      const atr = payload.atr ?? input.input.atr ?? null;
      const candles = payload.candlesDaily;

      const entry = calculateFlatBaseEntry({
        detection,
        candles,
        mode: config.entryMode,
        config,
      });
      if (entry === null) {
        return finalize(
          createRejectedFlatBaseTradeSetup(detection, [
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
          createRejectedFlatBaseTradeSetup(detection, [
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
          createRejectedFlatBaseTradeSetup(detection, [
            ...warnings,
            ...riskCheck.errors,
          ])
        );
      }

      const targetResult = generateFlatBaseTargets({
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
          createRejectedFlatBaseTradeSetup(detection, [
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
          createRejectedFlatBaseTradeSetup(detection, [
            ...warnings,
            "Negative reward.",
          ])
        );
      }
      if (riskReward + config.priceEpsilon < config.minimumRiskReward) {
        return finalize(
          createRejectedFlatBaseTradeSetup(detection, [
            ...warnings,
            "RR below threshold.",
          ])
        );
      }

      const quality = calculateFlatBaseTradeQuality({
        detection,
        marketContext: input.marketContext,
        riskReward,
        relativeStrength: payload.relativeStrength ?? null,
        config,
      });

      const draft = createRejectedFlatBaseTradeSetup(
        detection,
        dedupe(warnings)
      );
      const setup: FlatBaseTradeSetup = {
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
        baseDepth: detection.baseDepth,
        baseDuration: detection.baseDuration,
        pivotPrice: detection.pivotPrice,
        holdingPeriod: config.defaultHoldingPeriod,
        positionType: config.defaultPositionType,
        warnings: dedupe(warnings),
      };

      const validation = validateFlatBaseTradeSetup(setup, config);
      if (!validation.valid) {
        return finalize(
          createRejectedFlatBaseTradeSetup(detection, [
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
          : "Flat Base trade construction failed.";
      const rejected = createRejectedFlatBaseTradeSetup(input.detection, [
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

let builderSingleton: FlatBaseTradeBuilder | null = null;

export function getFlatBaseTradeBuilder(
  config?: Partial<FlatBaseTradeConfig>
): FlatBaseTradeBuilder {
  if (!builderSingleton) builderSingleton = new FlatBaseTradeBuilder(config);
  return builderSingleton;
}

export function resetFlatBaseTradeBuilder(): void {
  builderSingleton = null;
}
