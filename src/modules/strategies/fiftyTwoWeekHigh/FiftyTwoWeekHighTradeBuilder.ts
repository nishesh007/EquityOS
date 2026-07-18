/**
 * 52-Week High Trade Builder — Sprint 11B.3S.
 */

import { round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { enrichFiftyTwoWeekHighTradeSetup } from "./FiftyTwoWeekHighEnrichment";
import { getFiftyTwoWeekHighMetrics } from "./FiftyTwoWeekHighMetrics";
import {
  calculateRiskAmount,
  resolveStopLoss,
  validateTradeRisk,
} from "./FiftyTwoWeekHighRisk";
import type {
  FiftyTwoWeekHighDetection,
  FiftyTwoWeekHighStrategyInput,
} from "./FiftyTwoWeekHighTypes";
import {
  resolveFiftyTwoWeekHighTradeConfig,
  type FiftyTwoWeekHighTradeConfig,
  type FiftyTwoWeekHighTradeSetup,
} from "./FiftyTwoWeekHighTradeTypes";
import {
  calculateFiftyTwoWeekHighEntry,
  calculateFiftyTwoWeekHighTradeQuality,
  calculateRiskReward,
  createRejectedFiftyTwoWeekHighTradeSetup,
  generateFiftyTwoWeekHighTargets,
  validateFiftyTwoWeekHighTradeSetup,
} from "./FiftyTwoWeekHighTradeUtils";

export interface FiftyTwoWeekHighTradeBuildInput {
  detection: FiftyTwoWeekHighDetection;
  marketContext: InstitutionalMarketContext;
  input: FiftyTwoWeekHighStrategyInput;
  config?: Partial<FiftyTwoWeekHighTradeConfig>;
}

export class FiftyTwoWeekHighTradeBuilder {
  private readonly config: FiftyTwoWeekHighTradeConfig;
  private lastSetup: FiftyTwoWeekHighTradeSetup | null = null;

  constructor(config?: Partial<FiftyTwoWeekHighTradeConfig>) {
    this.config = resolveFiftyTwoWeekHighTradeConfig(config);
  }

  getConfiguration(): FiftyTwoWeekHighTradeConfig {
    return resolveFiftyTwoWeekHighTradeConfig(this.config);
  }

  getLastSetup(): FiftyTwoWeekHighTradeSetup | null {
    return this.lastSetup;
  }

  build(input: FiftyTwoWeekHighTradeBuildInput): FiftyTwoWeekHighTradeSetup {
    const started =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    try {
      const config = resolveFiftyTwoWeekHighTradeConfig({
        ...this.config,
        ...input.config,
      });
      const { detection } = input;

      const finalize = (
        setup: FiftyTwoWeekHighTradeSetup
      ): FiftyTwoWeekHighTradeSetup => {
        const enriched = enrichFiftyTwoWeekHighTradeSetup({
          setup,
          marketContext: input.marketContext,
          ftwInput: input.input,
        });
        this.lastSetup = enriched;
        try {
          const ended =
            typeof performance !== "undefined" ? performance.now() : Date.now();
          getFiftyTwoWeekHighMetrics().record({
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
          createRejectedFiftyTwoWeekHighTradeSetup(detection, [
            "52-Week High detection not validated — trade construction skipped.",
            ...detection.warnings,
          ])
        );
      }

      const warnings: string[] = [...detection.warnings];
      const payload = input.input.fiftyTwoWeekHigh;
      const atr = payload.atr ?? input.input.atr ?? null;
      const candles = payload.candlesDaily;

      const entry = calculateFiftyTwoWeekHighEntry({
        detection,
        candles,
        mode: config.entryMode,
        config,
      });
      if (entry === null) {
        return finalize(
          createRejectedFiftyTwoWeekHighTradeSetup(detection, [
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
          createRejectedFiftyTwoWeekHighTradeSetup(detection, [
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
          createRejectedFiftyTwoWeekHighTradeSetup(detection, [
            ...warnings,
            ...riskCheck.errors,
          ])
        );
      }

      const targetResult = generateFiftyTwoWeekHighTargets({
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
          createRejectedFiftyTwoWeekHighTradeSetup(detection, [
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
          createRejectedFiftyTwoWeekHighTradeSetup(detection, [
            ...warnings,
            "Negative reward.",
          ])
        );
      }
      if (riskReward + config.priceEpsilon < config.minimumRiskReward) {
        return finalize(
          createRejectedFiftyTwoWeekHighTradeSetup(detection, [
            ...warnings,
            "RR below threshold.",
          ])
        );
      }

      const quality = calculateFiftyTwoWeekHighTradeQuality({
        detection,
        marketContext: input.marketContext,
        riskReward,
        relativeStrength: payload.relativeStrength ?? null,
        config,
      });

      const draft = createRejectedFiftyTwoWeekHighTradeSetup(
        detection,
        dedupe(warnings)
      );
      const setup: FiftyTwoWeekHighTradeSetup = {
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
        previous52WeekHigh: detection.previous52WeekHigh,
        currentBreakoutLevel: detection.currentBreakoutLevel,
        breakoutAge: detection.breakoutAge,
        distanceFromBreakout: detection.distanceFromBreakout,
        holdingPeriod: config.defaultHoldingPeriod,
        positionType: config.defaultPositionType,
        warnings: dedupe(warnings),
      };

      const validation = validateFiftyTwoWeekHighTradeSetup(setup, config);
      if (!validation.valid) {
        return finalize(
          createRejectedFiftyTwoWeekHighTradeSetup(detection, [
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
          : "52-Week High trade construction failed.";
      const rejected = createRejectedFiftyTwoWeekHighTradeSetup(
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

let builderSingleton: FiftyTwoWeekHighTradeBuilder | null = null;

export function getFiftyTwoWeekHighTradeBuilder(
  config?: Partial<FiftyTwoWeekHighTradeConfig>
): FiftyTwoWeekHighTradeBuilder {
  if (!builderSingleton)
    builderSingleton = new FiftyTwoWeekHighTradeBuilder(config);
  return builderSingleton;
}

export function resetFiftyTwoWeekHighTradeBuilder(): void {
  builderSingleton = null;
}
