/**
 * Liquidity Sweep Trade Builder — Sprint 11B.3E.
 * Converts validated detection into trade setup with institutional enrichment.
 * No portfolio execution.
 */

import { round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { enrichLiquiditySweepTradeSetup } from "./LiquiditySweepEnrichment";
import { getLiquiditySweepMetrics } from "./LiquiditySweepMetrics";
import {
  calculateRiskAmount,
  resolveStopLoss,
  validateTradeRisk,
} from "./LiquiditySweepRisk";
import type {
  LiquiditySweepDetection,
  LiquiditySweepStrategyInput,
} from "./LiquiditySweepTypes";
import {
  resolveLiquiditySweepTradeConfig,
  type LiquiditySweepTradeConfig,
  type LiquiditySweepTradeSetup,
} from "./LiquiditySweepTradeTypes";
import {
  calculateRiskReward,
  calculateLiquiditySweepEntry,
  calculateLiquiditySweepTradeQuality,
  createRejectedLiquiditySweepTradeSetup,
  generateLiquiditySweepTargets,
  validateLiquiditySweepTradeSetup,
} from "./LiquiditySweepTradeUtils";

export interface LiquiditySweepTradeBuildInput {
  detection: LiquiditySweepDetection;
  marketContext: InstitutionalMarketContext;
  input: LiquiditySweepStrategyInput;
  config?: Partial<LiquiditySweepTradeConfig>;
}

export class LiquiditySweepTradeBuilder {
  private readonly config: LiquiditySweepTradeConfig;
  private lastSetup: LiquiditySweepTradeSetup | null = null;

  constructor(config?: Partial<LiquiditySweepTradeConfig>) {
    this.config = resolveLiquiditySweepTradeConfig(config);
  }

  getConfiguration(): LiquiditySweepTradeConfig {
    return resolveLiquiditySweepTradeConfig(this.config);
  }

  getLastSetup(): LiquiditySweepTradeSetup | null {
    return this.lastSetup;
  }

  build(input: LiquiditySweepTradeBuildInput): LiquiditySweepTradeSetup {
    const started =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    try {
      const config = resolveLiquiditySweepTradeConfig({
        ...this.config,
        ...input.config,
      });
      const { detection } = input;

      const finalize = (
        setup: LiquiditySweepTradeSetup
      ): LiquiditySweepTradeSetup => {
        const enriched = enrichLiquiditySweepTradeSetup({
          setup,
          marketContext: input.marketContext,
          lsInput: input.input,
        });
        this.lastSetup = enriched;
        try {
          const ended =
            typeof performance !== "undefined" ? performance.now() : Date.now();
          getLiquiditySweepMetrics().record({
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
          createRejectedLiquiditySweepTradeSetup(detection, [
            "Liquidity Sweep detection not validated — trade construction skipped.",
            ...detection.warnings,
          ])
        );
      }

      const warnings: string[] = [...detection.warnings];
      const payload = input.input.liquiditySweep;
      const atr = payload.atr ?? input.input.atr ?? null;
      const vwap =
        Number.isFinite(payload.vwap) && payload.vwap > 0 ? payload.vwap : 0;
      const candles = payload.candles5m;
      const recentSwingHigh = payload.recentSwingHigh;
      const recentSwingLow = payload.recentSwingLow;

      const entry = calculateLiquiditySweepEntry({
        detection,
        candles,
        mode: config.entryMode,
        config,
      });
      if (entry === null) {
        return finalize(
          createRejectedLiquiditySweepTradeSetup(detection, [
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
        recentSwingHigh,
        recentSwingLow,
        method: config.stopMethod,
        config,
      });
      warnings.push(...stopResult.warnings);

      if (stopResult.stopLoss === null) {
        return finalize(
          createRejectedLiquiditySweepTradeSetup(detection, [
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
          createRejectedLiquiditySweepTradeSetup(detection, [
            ...warnings,
            ...riskCheck.errors,
          ])
        );
      }

      const targetResult = generateLiquiditySweepTargets({
        detection,
        entry,
        stopLoss: stopResult.stopLoss,
        vwap,
        atr,
        candles,
        recentSwingHigh,
        recentSwingLow,
        config,
      });
      warnings.push(...targetResult.warnings);

      if (!targetResult.targets) {
        return finalize(
          createRejectedLiquiditySweepTradeSetup(detection, [
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
          createRejectedLiquiditySweepTradeSetup(detection, [
            ...warnings,
            "Negative reward.",
          ])
        );
      }

      if (riskReward + config.priceEpsilon < config.minimumRiskReward) {
        return finalize(
          createRejectedLiquiditySweepTradeSetup(detection, [
            ...warnings,
            "RR below threshold.",
          ])
        );
      }

      const quality = calculateLiquiditySweepTradeQuality({
        detection,
        marketContext: input.marketContext,
        riskReward,
        config,
      });

      const draft = createRejectedLiquiditySweepTradeSetup(
        detection,
        dedupe(warnings)
      );
      const setup: LiquiditySweepTradeSetup = {
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

      const validation = validateLiquiditySweepTradeSetup(setup, config);
      if (!validation.valid) {
        return finalize(
          createRejectedLiquiditySweepTradeSetup(detection, [
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
          : "Liquidity Sweep trade construction failed.";
      const rejected = createRejectedLiquiditySweepTradeSetup(input.detection, [
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

let builderSingleton: LiquiditySweepTradeBuilder | null = null;

export function getLiquiditySweepTradeBuilder(
  config?: Partial<LiquiditySweepTradeConfig>
): LiquiditySweepTradeBuilder {
  if (!builderSingleton) {
    builderSingleton = new LiquiditySweepTradeBuilder(config);
  }
  return builderSingleton;
}

export function resetLiquiditySweepTradeBuilder(): void {
  builderSingleton = null;
}
