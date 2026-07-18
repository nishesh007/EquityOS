/**
 * Breakout Retest Trade Builder — Sprint 11B.3I.
 */

import { round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { enrichBreakoutRetestTradeSetup } from "./BreakoutRetestEnrichment";
import { getBreakoutRetestMetrics } from "./BreakoutRetestMetrics";
import {
  calculateRiskAmount,
  resolveStopLoss,
  validateTradeRisk,
} from "./BreakoutRetestRisk";
import type {
  BreakoutRetestDetection,
  BreakoutRetestStrategyInput,
} from "./BreakoutRetestTypes";
import {
  resolveBreakoutRetestTradeConfig,
  type BreakoutRetestTradeConfig,
  type BreakoutRetestTradeSetup,
} from "./BreakoutRetestTradeTypes";
import {
  calculateBreakoutRetestEntry,
  calculateBreakoutRetestTradeQuality,
  calculateRiskReward,
  createRejectedBreakoutRetestTradeSetup,
  generateBreakoutRetestTargets,
  validateBreakoutRetestTradeSetup,
} from "./BreakoutRetestTradeUtils";

export interface BreakoutRetestTradeBuildInput {
  detection: BreakoutRetestDetection;
  marketContext: InstitutionalMarketContext;
  input: BreakoutRetestStrategyInput;
  config?: Partial<BreakoutRetestTradeConfig>;
}

export class BreakoutRetestTradeBuilder {
  private readonly config: BreakoutRetestTradeConfig;
  private lastSetup: BreakoutRetestTradeSetup | null = null;

  constructor(config?: Partial<BreakoutRetestTradeConfig>) {
    this.config = resolveBreakoutRetestTradeConfig(config);
  }

  getConfiguration(): BreakoutRetestTradeConfig {
    return resolveBreakoutRetestTradeConfig(this.config);
  }

  getLastSetup(): BreakoutRetestTradeSetup | null {
    return this.lastSetup;
  }

  build(input: BreakoutRetestTradeBuildInput): BreakoutRetestTradeSetup {
    const started =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    try {
      const config = resolveBreakoutRetestTradeConfig({
        ...this.config,
        ...input.config,
      });
      const { detection } = input;

      const finalize = (
        setup: BreakoutRetestTradeSetup
      ): BreakoutRetestTradeSetup => {
        const enriched = enrichBreakoutRetestTradeSetup({
          setup,
          marketContext: input.marketContext,
          retestInput: input.input,
        });
        this.lastSetup = enriched;
        try {
          const ended =
            typeof performance !== "undefined" ? performance.now() : Date.now();
          getBreakoutRetestMetrics().record({
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
          createRejectedBreakoutRetestTradeSetup(detection, [
            "Breakout Retest detection not validated — trade construction skipped.",
            ...detection.warnings,
          ])
        );
      }

      const warnings: string[] = [...detection.warnings];
      const payload = input.input.breakoutRetest;
      const atr = payload.atr ?? input.input.atr ?? null;
      const candles = payload.candles5m;

      const entry = calculateBreakoutRetestEntry({
        detection,
        candles,
        vwap: payload.vwap,
        mode: config.entryMode,
        config,
      });
      if (entry === null) {
        return finalize(
          createRejectedBreakoutRetestTradeSetup(detection, [
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
          createRejectedBreakoutRetestTradeSetup(detection, [
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
          createRejectedBreakoutRetestTradeSetup(detection, [
            ...warnings,
            ...riskCheck.errors,
          ])
        );
      }

      const targetResult = generateBreakoutRetestTargets({
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
          createRejectedBreakoutRetestTradeSetup(detection, [
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
          createRejectedBreakoutRetestTradeSetup(detection, [
            ...warnings,
            "Negative reward.",
          ])
        );
      }

      if (riskReward + config.priceEpsilon < config.minimumRiskReward) {
        return finalize(
          createRejectedBreakoutRetestTradeSetup(detection, [
            ...warnings,
            "RR below threshold.",
          ])
        );
      }

      const quality = calculateBreakoutRetestTradeQuality({
        detection,
        marketContext: input.marketContext,
        riskReward,
        relativeVolume: payload.relativeVolume,
        config,
      });

      const draft = createRejectedBreakoutRetestTradeSetup(
        detection,
        dedupe(warnings)
      );
      const setup: BreakoutRetestTradeSetup = {
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

      const validation = validateBreakoutRetestTradeSetup(setup, config);
      if (!validation.valid) {
        return finalize(
          createRejectedBreakoutRetestTradeSetup(detection, [
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
          : "Breakout Retest trade construction failed.";
      const rejected = createRejectedBreakoutRetestTradeSetup(
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

let builderSingleton: BreakoutRetestTradeBuilder | null = null;

export function getBreakoutRetestTradeBuilder(
  config?: Partial<BreakoutRetestTradeConfig>
): BreakoutRetestTradeBuilder {
  if (!builderSingleton) {
    builderSingleton = new BreakoutRetestTradeBuilder(config);
  }
  return builderSingleton;
}

export function resetBreakoutRetestTradeBuilder(): void {
  builderSingleton = null;
}
