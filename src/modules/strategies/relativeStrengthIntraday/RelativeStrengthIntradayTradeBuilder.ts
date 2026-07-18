/**
 * Relative Strength Intraday Trade Builder — Sprint 11B.3G.
 */

import { round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { enrichRelativeStrengthIntradayTradeSetup } from "./RelativeStrengthIntradayEnrichment";
import { getRelativeStrengthIntradayMetrics } from "./RelativeStrengthIntradayMetrics";
import {
  calculateRiskAmount,
  resolveStopLoss,
  validateTradeRisk,
} from "./RelativeStrengthIntradayRisk";
import type {
  RelativeStrengthIntradayDetection,
  RelativeStrengthIntradayStrategyInput,
} from "./RelativeStrengthIntradayTypes";
import {
  resolveRelativeStrengthIntradayTradeConfig,
  type RelativeStrengthIntradayTradeConfig,
  type RelativeStrengthIntradayTradeSetup,
} from "./RelativeStrengthIntradayTradeTypes";
import {
  calculateRelativeStrengthIntradayEntry,
  calculateRelativeStrengthIntradayTradeQuality,
  calculateRiskReward,
  createRejectedRelativeStrengthIntradayTradeSetup,
  generateRelativeStrengthIntradayTargets,
  validateRelativeStrengthIntradayTradeSetup,
} from "./RelativeStrengthIntradayTradeUtils";

export interface RelativeStrengthIntradayTradeBuildInput {
  detection: RelativeStrengthIntradayDetection;
  marketContext: InstitutionalMarketContext;
  input: RelativeStrengthIntradayStrategyInput;
  config?: Partial<RelativeStrengthIntradayTradeConfig>;
}

export class RelativeStrengthIntradayTradeBuilder {
  private readonly config: RelativeStrengthIntradayTradeConfig;
  private lastSetup: RelativeStrengthIntradayTradeSetup | null = null;

  constructor(config?: Partial<RelativeStrengthIntradayTradeConfig>) {
    this.config = resolveRelativeStrengthIntradayTradeConfig(config);
  }

  getConfiguration(): RelativeStrengthIntradayTradeConfig {
    return resolveRelativeStrengthIntradayTradeConfig(this.config);
  }

  getLastSetup(): RelativeStrengthIntradayTradeSetup | null {
    return this.lastSetup;
  }

  build(
    input: RelativeStrengthIntradayTradeBuildInput
  ): RelativeStrengthIntradayTradeSetup {
    const started =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    try {
      const config = resolveRelativeStrengthIntradayTradeConfig({
        ...this.config,
        ...input.config,
      });
      const { detection } = input;

      const finalize = (
        setup: RelativeStrengthIntradayTradeSetup
      ): RelativeStrengthIntradayTradeSetup => {
        const enriched = enrichRelativeStrengthIntradayTradeSetup({
          setup,
          marketContext: input.marketContext,
          rsInput: input.input,
        });
        this.lastSetup = enriched;
        try {
          const ended =
            typeof performance !== "undefined" ? performance.now() : Date.now();
          getRelativeStrengthIntradayMetrics().record({
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
          createRejectedRelativeStrengthIntradayTradeSetup(detection, [
            "Relative Strength Intraday detection not validated — trade construction skipped.",
            ...detection.warnings,
          ])
        );
      }

      const warnings: string[] = [...detection.warnings];
      const payload = input.input.relativeStrengthIntraday;
      const atr = payload.atr ?? input.input.atr ?? null;
      const candles = payload.candles5m;

      const entry = calculateRelativeStrengthIntradayEntry({
        detection,
        candles,
        vwap: payload.vwap,
        openingRangeHigh: payload.openingRangeHigh,
        openingRangeLow: payload.openingRangeLow,
        mode: config.entryMode,
        config,
      });
      if (entry === null) {
        return finalize(
          createRejectedRelativeStrengthIntradayTradeSetup(detection, [
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
          createRejectedRelativeStrengthIntradayTradeSetup(detection, [
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
          createRejectedRelativeStrengthIntradayTradeSetup(detection, [
            ...warnings,
            ...riskCheck.errors,
          ])
        );
      }

      const targetResult = generateRelativeStrengthIntradayTargets({
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
          createRejectedRelativeStrengthIntradayTradeSetup(detection, [
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
          createRejectedRelativeStrengthIntradayTradeSetup(detection, [
            ...warnings,
            "Negative reward.",
          ])
        );
      }

      if (riskReward + config.priceEpsilon < config.minimumRiskReward) {
        return finalize(
          createRejectedRelativeStrengthIntradayTradeSetup(detection, [
            ...warnings,
            "RR below threshold.",
          ])
        );
      }

      const quality = calculateRelativeStrengthIntradayTradeQuality({
        detection,
        marketContext: input.marketContext,
        riskReward,
        relativeVolume: payload.relativeVolume,
        config,
      });

      const draft = createRejectedRelativeStrengthIntradayTradeSetup(
        detection,
        dedupe(warnings)
      );
      const setup: RelativeStrengthIntradayTradeSetup = {
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

      const validation = validateRelativeStrengthIntradayTradeSetup(
        setup,
        config
      );
      if (!validation.valid) {
        return finalize(
          createRejectedRelativeStrengthIntradayTradeSetup(detection, [
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
          : "Relative Strength Intraday trade construction failed.";
      const rejected = createRejectedRelativeStrengthIntradayTradeSetup(
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

let builderSingleton: RelativeStrengthIntradayTradeBuilder | null = null;

export function getRelativeStrengthIntradayTradeBuilder(
  config?: Partial<RelativeStrengthIntradayTradeConfig>
): RelativeStrengthIntradayTradeBuilder {
  if (!builderSingleton) {
    builderSingleton = new RelativeStrengthIntradayTradeBuilder(config);
  }
  return builderSingleton;
}

export function resetRelativeStrengthIntradayTradeBuilder(): void {
  builderSingleton = null;
}
