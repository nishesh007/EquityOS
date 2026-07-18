/**
 * Institutional Accumulation Trade Builder — Sprint 11B.3H.
 */

import { round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { enrichInstitutionalAccumulationTradeSetup } from "./InstitutionalAccumulationEnrichment";
import { getInstitutionalAccumulationMetrics } from "./InstitutionalAccumulationMetrics";
import {
  calculateRiskAmount,
  resolveStopLoss,
  validateTradeRisk,
} from "./InstitutionalAccumulationRisk";
import type {
  InstitutionalAccumulationDetection,
  InstitutionalAccumulationStrategyInput,
} from "./InstitutionalAccumulationTypes";
import {
  resolveInstitutionalAccumulationTradeConfig,
  type InstitutionalAccumulationTradeConfig,
  type InstitutionalAccumulationTradeSetup,
} from "./InstitutionalAccumulationTradeTypes";
import {
  calculateInstitutionalAccumulationEntry,
  calculateInstitutionalAccumulationTradeQuality,
  calculateRiskReward,
  createRejectedInstitutionalAccumulationTradeSetup,
  generateInstitutionalAccumulationTargets,
  validateInstitutionalAccumulationTradeSetup,
} from "./InstitutionalAccumulationTradeUtils";

export interface InstitutionalAccumulationTradeBuildInput {
  detection: InstitutionalAccumulationDetection;
  marketContext: InstitutionalMarketContext;
  input: InstitutionalAccumulationStrategyInput;
  config?: Partial<InstitutionalAccumulationTradeConfig>;
}

export class InstitutionalAccumulationTradeBuilder {
  private readonly config: InstitutionalAccumulationTradeConfig;
  private lastSetup: InstitutionalAccumulationTradeSetup | null = null;

  constructor(config?: Partial<InstitutionalAccumulationTradeConfig>) {
    this.config = resolveInstitutionalAccumulationTradeConfig(config);
  }

  getConfiguration(): InstitutionalAccumulationTradeConfig {
    return resolveInstitutionalAccumulationTradeConfig(this.config);
  }

  getLastSetup(): InstitutionalAccumulationTradeSetup | null {
    return this.lastSetup;
  }

  build(
    input: InstitutionalAccumulationTradeBuildInput
  ): InstitutionalAccumulationTradeSetup {
    const started =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    try {
      const config = resolveInstitutionalAccumulationTradeConfig({
        ...this.config,
        ...input.config,
      });
      const { detection } = input;

      const finalize = (
        setup: InstitutionalAccumulationTradeSetup
      ): InstitutionalAccumulationTradeSetup => {
        const enriched = enrichInstitutionalAccumulationTradeSetup({
          setup,
          marketContext: input.marketContext,
          accumulationInput: input.input,
        });
        this.lastSetup = enriched;
        try {
          const ended =
            typeof performance !== "undefined" ? performance.now() : Date.now();
          getInstitutionalAccumulationMetrics().record({
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
          createRejectedInstitutionalAccumulationTradeSetup(detection, [
            "Institutional Accumulation detection not validated — trade construction skipped.",
            ...detection.warnings,
          ])
        );
      }

      const warnings: string[] = [...detection.warnings];
      const payload = input.input.institutionalAccumulation;
      const atr = payload.atr ?? input.input.atr ?? null;
      const candles = payload.candles5m;

      const entry = calculateInstitutionalAccumulationEntry({
        detection,
        candles,
        vwap: payload.vwap,
        mode: config.entryMode,
        config,
      });
      if (entry === null) {
        return finalize(
          createRejectedInstitutionalAccumulationTradeSetup(detection, [
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
          createRejectedInstitutionalAccumulationTradeSetup(detection, [
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
          createRejectedInstitutionalAccumulationTradeSetup(detection, [
            ...warnings,
            ...riskCheck.errors,
          ])
        );
      }

      const targetResult = generateInstitutionalAccumulationTargets({
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
          createRejectedInstitutionalAccumulationTradeSetup(detection, [
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
          createRejectedInstitutionalAccumulationTradeSetup(detection, [
            ...warnings,
            "Negative reward.",
          ])
        );
      }

      if (riskReward + config.priceEpsilon < config.minimumRiskReward) {
        return finalize(
          createRejectedInstitutionalAccumulationTradeSetup(detection, [
            ...warnings,
            "RR below threshold.",
          ])
        );
      }

      const quality = calculateInstitutionalAccumulationTradeQuality({
        detection,
        marketContext: input.marketContext,
        riskReward,
        relativeVolume: payload.relativeVolume,
        config,
      });

      const draft = createRejectedInstitutionalAccumulationTradeSetup(
        detection,
        dedupe(warnings)
      );
      const setup: InstitutionalAccumulationTradeSetup = {
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

      const validation = validateInstitutionalAccumulationTradeSetup(
        setup,
        config
      );
      if (!validation.valid) {
        return finalize(
          createRejectedInstitutionalAccumulationTradeSetup(detection, [
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
          : "Institutional Accumulation trade construction failed.";
      const rejected = createRejectedInstitutionalAccumulationTradeSetup(
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

let builderSingleton: InstitutionalAccumulationTradeBuilder | null = null;

export function getInstitutionalAccumulationTradeBuilder(
  config?: Partial<InstitutionalAccumulationTradeConfig>
): InstitutionalAccumulationTradeBuilder {
  if (!builderSingleton) {
    builderSingleton = new InstitutionalAccumulationTradeBuilder(config);
  }
  return builderSingleton;
}

export function resetInstitutionalAccumulationTradeBuilder(): void {
  builderSingleton = null;
}
