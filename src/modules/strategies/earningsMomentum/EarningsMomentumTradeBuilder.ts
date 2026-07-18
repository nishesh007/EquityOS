/**
 * Earnings Momentum Trade Builder — Sprint 11B.3T.
 */

import { round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { enrichEarningsMomentumTradeSetup } from "./EarningsMomentumEnrichment";
import { getEarningsMomentumMetrics } from "./EarningsMomentumMetrics";
import {
  calculateRiskAmount,
  resolveStopLoss,
  validateTradeRisk,
} from "./EarningsMomentumRisk";
import type {
  EarningsMomentumDetection,
  EarningsMomentumStrategyInput,
} from "./EarningsMomentumTypes";
import {
  resolveEarningsMomentumTradeConfig,
  type EarningsMomentumTradeConfig,
  type EarningsMomentumTradeSetup,
} from "./EarningsMomentumTradeTypes";
import {
  calculateEarningsMomentumEntry,
  calculateEarningsMomentumTradeQuality,
  calculateRiskReward,
  createRejectedEarningsMomentumTradeSetup,
  generateEarningsMomentumTargets,
  validateEarningsMomentumTradeSetup,
} from "./EarningsMomentumTradeUtils";

export interface EarningsMomentumTradeBuildInput {
  detection: EarningsMomentumDetection;
  marketContext: InstitutionalMarketContext;
  input: EarningsMomentumStrategyInput;
  config?: Partial<EarningsMomentumTradeConfig>;
}

export class EarningsMomentumTradeBuilder {
  private readonly config: EarningsMomentumTradeConfig;
  private lastSetup: EarningsMomentumTradeSetup | null = null;

  constructor(config?: Partial<EarningsMomentumTradeConfig>) {
    this.config = resolveEarningsMomentumTradeConfig(config);
  }

  getConfiguration(): EarningsMomentumTradeConfig {
    return resolveEarningsMomentumTradeConfig(this.config);
  }

  getLastSetup(): EarningsMomentumTradeSetup | null {
    return this.lastSetup;
  }

  build(input: EarningsMomentumTradeBuildInput): EarningsMomentumTradeSetup {
    const started =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    try {
      const config = resolveEarningsMomentumTradeConfig({
        ...this.config,
        ...input.config,
      });
      const { detection } = input;

      const finalize = (
        setup: EarningsMomentumTradeSetup
      ): EarningsMomentumTradeSetup => {
        const enriched = enrichEarningsMomentumTradeSetup({
          setup,
          marketContext: input.marketContext,
          emInput: input.input,
        });
        this.lastSetup = enriched;
        try {
          const ended =
            typeof performance !== "undefined" ? performance.now() : Date.now();
          getEarningsMomentumMetrics().record({
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
          createRejectedEarningsMomentumTradeSetup(detection, [
            "Earnings Momentum detection not validated — trade construction skipped.",
            ...detection.warnings,
          ])
        );
      }

      const warnings: string[] = [...detection.warnings];
      const payload = input.input.earningsMomentum;
      const atr = payload.atr ?? input.input.atr ?? null;
      const candles = payload.candlesDaily;

      const entry = calculateEarningsMomentumEntry({
        detection,
        candles,
        mode: config.entryMode,
        config,
      });
      if (entry === null) {
        return finalize(
          createRejectedEarningsMomentumTradeSetup(detection, [
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
          createRejectedEarningsMomentumTradeSetup(detection, [
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
          createRejectedEarningsMomentumTradeSetup(detection, [
            ...warnings,
            ...riskCheck.errors,
          ])
        );
      }

      const targetResult = generateEarningsMomentumTargets({
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
          createRejectedEarningsMomentumTradeSetup(detection, [
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
          createRejectedEarningsMomentumTradeSetup(detection, [
            ...warnings,
            "Negative reward.",
          ])
        );
      }
      if (riskReward + config.priceEpsilon < config.minimumRiskReward) {
        return finalize(
          createRejectedEarningsMomentumTradeSetup(detection, [
            ...warnings,
            "RR below threshold.",
          ])
        );
      }

      const quality = calculateEarningsMomentumTradeQuality({
        detection,
        marketContext: input.marketContext,
        riskReward,
        relativeStrength: payload.relativeStrength ?? null,
        config,
      });

      const draft = createRejectedEarningsMomentumTradeSetup(
        detection,
        dedupe(warnings)
      );
      const setup: EarningsMomentumTradeSetup = {
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
        epsActual: detection.epsActual,
        epsEstimate: detection.epsEstimate,
        epsSurprise: detection.epsSurprise,
        revenueActual: detection.revenueActual,
        revenueEstimate: detection.revenueEstimate,
        revenueSurprise: detection.revenueSurprise,
        guidance: detection.guidance,
        marginExpansion: detection.marginExpansion,
        holdingPeriod: config.defaultHoldingPeriod,
        positionType: config.defaultPositionType,
        warnings: dedupe(warnings),
      };

      const validation = validateEarningsMomentumTradeSetup(setup, config);
      if (!validation.valid) {
        return finalize(
          createRejectedEarningsMomentumTradeSetup(detection, [
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
          : "Earnings Momentum trade construction failed.";
      const rejected = createRejectedEarningsMomentumTradeSetup(
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

let builderSingleton: EarningsMomentumTradeBuilder | null = null;

export function getEarningsMomentumTradeBuilder(
  config?: Partial<EarningsMomentumTradeConfig>
): EarningsMomentumTradeBuilder {
  if (!builderSingleton)
    builderSingleton = new EarningsMomentumTradeBuilder(config);
  return builderSingleton;
}

export function resetEarningsMomentumTradeBuilder(): void {
  builderSingleton = null;
}
