/**
 * Momentum Continuation Trade Builder — Sprint 11B.3F.
 */

import { round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { enrichMomentumContinuationTradeSetup } from "./MomentumContinuationEnrichment";
import { getMomentumContinuationMetrics } from "./MomentumContinuationMetrics";
import {
  calculateRiskAmount,
  resolveStopLoss,
  validateTradeRisk,
} from "./MomentumContinuationRisk";
import type {
  MomentumContinuationDetection,
  MomentumContinuationStrategyInput,
} from "./MomentumContinuationTypes";
import {
  resolveMomentumContinuationTradeConfig,
  type MomentumContinuationTradeConfig,
  type MomentumContinuationTradeSetup,
} from "./MomentumContinuationTradeTypes";
import {
  calculateRiskReward,
  calculateMomentumContinuationEntry,
  calculateMomentumContinuationTradeQuality,
  createRejectedMomentumContinuationTradeSetup,
  generateMomentumContinuationTargets,
  validateMomentumContinuationTradeSetup,
} from "./MomentumContinuationTradeUtils";

export interface MomentumContinuationTradeBuildInput {
  detection: MomentumContinuationDetection;
  marketContext: InstitutionalMarketContext;
  input: MomentumContinuationStrategyInput;
  config?: Partial<MomentumContinuationTradeConfig>;
}

export class MomentumContinuationTradeBuilder {
  private readonly config: MomentumContinuationTradeConfig;
  private lastSetup: MomentumContinuationTradeSetup | null = null;

  constructor(config?: Partial<MomentumContinuationTradeConfig>) {
    this.config = resolveMomentumContinuationTradeConfig(config);
  }

  getConfiguration(): MomentumContinuationTradeConfig {
    return resolveMomentumContinuationTradeConfig(this.config);
  }

  getLastSetup(): MomentumContinuationTradeSetup | null {
    return this.lastSetup;
  }

  build(
    input: MomentumContinuationTradeBuildInput
  ): MomentumContinuationTradeSetup {
    const started =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    try {
      const config = resolveMomentumContinuationTradeConfig({
        ...this.config,
        ...input.config,
      });
      const { detection } = input;

      const finalize = (
        setup: MomentumContinuationTradeSetup
      ): MomentumContinuationTradeSetup => {
        const enriched = enrichMomentumContinuationTradeSetup({
          setup,
          marketContext: input.marketContext,
          mcInput: input.input,
        });
        this.lastSetup = enriched;
        try {
          const ended =
            typeof performance !== "undefined" ? performance.now() : Date.now();
          getMomentumContinuationMetrics().record({
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
          createRejectedMomentumContinuationTradeSetup(detection, [
            "Momentum Continuation detection not validated — trade construction skipped.",
            ...detection.warnings,
          ])
        );
      }

      const warnings: string[] = [...detection.warnings];
      const payload = input.input.momentumContinuation;
      const atr = payload.atr ?? input.input.atr ?? null;
      const candles = payload.candles5m;

      const entry = calculateMomentumContinuationEntry({
        detection,
        candles,
        mode: config.entryMode,
        config,
      });
      if (entry === null) {
        return finalize(
          createRejectedMomentumContinuationTradeSetup(detection, [
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
          createRejectedMomentumContinuationTradeSetup(detection, [
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
          createRejectedMomentumContinuationTradeSetup(detection, [
            ...warnings,
            ...riskCheck.errors,
          ])
        );
      }

      const targetResult = generateMomentumContinuationTargets({
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
          createRejectedMomentumContinuationTradeSetup(detection, [
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
          createRejectedMomentumContinuationTradeSetup(detection, [
            ...warnings,
            "Negative reward.",
          ])
        );
      }

      if (riskReward + config.priceEpsilon < config.minimumRiskReward) {
        return finalize(
          createRejectedMomentumContinuationTradeSetup(detection, [
            ...warnings,
            "RR below threshold.",
          ])
        );
      }

      const quality = calculateMomentumContinuationTradeQuality({
        detection,
        marketContext: input.marketContext,
        riskReward,
        relativeVolume: payload.relativeVolume,
        config,
      });

      const draft = createRejectedMomentumContinuationTradeSetup(
        detection,
        dedupe(warnings)
      );
      const setup: MomentumContinuationTradeSetup = {
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

      const validation = validateMomentumContinuationTradeSetup(setup, config);
      if (!validation.valid) {
        return finalize(
          createRejectedMomentumContinuationTradeSetup(detection, [
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
          : "Momentum Continuation trade construction failed.";
      const rejected = createRejectedMomentumContinuationTradeSetup(
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

let builderSingleton: MomentumContinuationTradeBuilder | null = null;

export function getMomentumContinuationTradeBuilder(
  config?: Partial<MomentumContinuationTradeConfig>
): MomentumContinuationTradeBuilder {
  if (!builderSingleton) {
    builderSingleton = new MomentumContinuationTradeBuilder(config);
  }
  return builderSingleton;
}

export function resetMomentumContinuationTradeBuilder(): void {
  builderSingleton = null;
}
