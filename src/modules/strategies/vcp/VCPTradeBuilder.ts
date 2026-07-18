/**
 * VCP Trade Builder — Sprint 11B.3L.
 */

import { round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { enrichVCPTradeSetup } from "./VCPEnrichment";
import { getVCPMetrics } from "./VCPMetrics";
import {
  calculateRiskAmount,
  resolveStopLoss,
  validateTradeRisk,
} from "./VCPRisk";
import type { VCPDetection, VCPStrategyInput } from "./VCPTypes";
import {
  resolveVCPTradeConfig,
  type VCPTradeConfig,
  type VCPTradeSetup,
} from "./VCPTradeTypes";
import {
  calculateVCPEntry,
  calculateVCPTradeQuality,
  calculateRiskReward,
  createRejectedVCPTradeSetup,
  generateVCPTargets,
  validateVCPTradeSetup,
} from "./VCPTradeUtils";

export interface VCPTradeBuildInput {
  detection: VCPDetection;
  marketContext: InstitutionalMarketContext;
  input: VCPStrategyInput;
  config?: Partial<VCPTradeConfig>;
}

export class VCPTradeBuilder {
  private readonly config: VCPTradeConfig;
  private lastSetup: VCPTradeSetup | null = null;

  constructor(config?: Partial<VCPTradeConfig>) {
    this.config = resolveVCPTradeConfig(config);
  }

  getConfiguration(): VCPTradeConfig {
    return resolveVCPTradeConfig(this.config);
  }

  getLastSetup(): VCPTradeSetup | null {
    return this.lastSetup;
  }

  build(input: VCPTradeBuildInput): VCPTradeSetup {
    const started =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    try {
      const config = resolveVCPTradeConfig({
        ...this.config,
        ...input.config,
      });
      const { detection } = input;

      const finalize = (setup: VCPTradeSetup): VCPTradeSetup => {
        const enriched = enrichVCPTradeSetup({
          setup,
          marketContext: input.marketContext,
          vcpInput: input.input,
        });
        this.lastSetup = enriched;
        try {
          const ended =
            typeof performance !== "undefined" ? performance.now() : Date.now();
          getVCPMetrics().record({
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
          createRejectedVCPTradeSetup(detection, [
            "VCP detection not validated — trade construction skipped.",
            ...detection.warnings,
          ])
        );
      }

      const warnings: string[] = [...detection.warnings];
      const payload = input.input.vcp;
      const atr = payload.atr ?? input.input.atr ?? null;
      const candles = payload.candlesDaily;

      const entry = calculateVCPEntry({
        detection,
        candles,
        mode: config.entryMode,
        config,
      });
      if (entry === null) {
        return finalize(
          createRejectedVCPTradeSetup(detection, [
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
          createRejectedVCPTradeSetup(detection, [
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
          createRejectedVCPTradeSetup(detection, [
            ...warnings,
            ...riskCheck.errors,
          ])
        );
      }

      const targetResult = generateVCPTargets({
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
          createRejectedVCPTradeSetup(detection, [
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
          createRejectedVCPTradeSetup(detection, [
            ...warnings,
            "Negative reward.",
          ])
        );
      }

      if (riskReward + config.priceEpsilon < config.minimumRiskReward) {
        return finalize(
          createRejectedVCPTradeSetup(detection, [
            ...warnings,
            "RR below threshold.",
          ])
        );
      }

      const quality = calculateVCPTradeQuality({
        detection,
        marketContext: input.marketContext,
        riskReward,
        config,
      });

      const draft = createRejectedVCPTradeSetup(detection, dedupe(warnings));
      const setup: VCPTradeSetup = {
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
        pivotPrice: detection.pivotPrice,
        contractionCount: detection.contractionCount,
        holdingPeriod: config.defaultHoldingPeriod,
        positionType: config.defaultPositionType,
        warnings: dedupe(warnings),
      };

      const validation = validateVCPTradeSetup(setup, config);
      if (!validation.valid) {
        return finalize(
          createRejectedVCPTradeSetup(detection, [
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
          : "VCP trade construction failed.";
      const rejected = createRejectedVCPTradeSetup(input.detection, [message]);
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

let builderSingleton: VCPTradeBuilder | null = null;

export function getVCPTradeBuilder(
  config?: Partial<VCPTradeConfig>
): VCPTradeBuilder {
  if (!builderSingleton) {
    builderSingleton = new VCPTradeBuilder(config);
  }
  return builderSingleton;
}

export function resetVCPTradeBuilder(): void {
  builderSingleton = null;
}
