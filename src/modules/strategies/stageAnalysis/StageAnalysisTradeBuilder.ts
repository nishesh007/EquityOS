/**
 * Stage Analysis Trade Builder — Sprint 11B.3M.
 */

import { round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { enrichStageAnalysisTradeSetup } from "./StageAnalysisEnrichment";
import { getStageAnalysisMetrics } from "./StageAnalysisMetrics";
import {
  calculateRiskAmount,
  resolveStopLoss,
  validateTradeRisk,
} from "./StageAnalysisRisk";
import type {
  StageAnalysisDetection,
  StageAnalysisStrategyInput,
} from "./StageAnalysisTypes";
import {
  resolveStageAnalysisTradeConfig,
  type StageAnalysisTradeConfig,
  type StageAnalysisTradeSetup,
} from "./StageAnalysisTradeTypes";
import {
  calculateStageAnalysisEntry,
  calculateStageAnalysisTradeQuality,
  calculateRiskReward,
  createRejectedStageAnalysisTradeSetup,
  generateStageAnalysisTargets,
  validateStageAnalysisTradeSetup,
} from "./StageAnalysisTradeUtils";

export interface StageAnalysisTradeBuildInput {
  detection: StageAnalysisDetection;
  marketContext: InstitutionalMarketContext;
  input: StageAnalysisStrategyInput;
  config?: Partial<StageAnalysisTradeConfig>;
}

export class StageAnalysisTradeBuilder {
  private readonly config: StageAnalysisTradeConfig;
  private lastSetup: StageAnalysisTradeSetup | null = null;

  constructor(config?: Partial<StageAnalysisTradeConfig>) {
    this.config = resolveStageAnalysisTradeConfig(config);
  }

  getConfiguration(): StageAnalysisTradeConfig {
    return resolveStageAnalysisTradeConfig(this.config);
  }

  getLastSetup(): StageAnalysisTradeSetup | null {
    return this.lastSetup;
  }

  build(input: StageAnalysisTradeBuildInput): StageAnalysisTradeSetup {
    const started =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    try {
      const config = resolveStageAnalysisTradeConfig({
        ...this.config,
        ...input.config,
      });
      const { detection } = input;

      const finalize = (
        setup: StageAnalysisTradeSetup
      ): StageAnalysisTradeSetup => {
        const enriched = enrichStageAnalysisTradeSetup({
          setup,
          marketContext: input.marketContext,
          saInput: input.input,
        });
        this.lastSetup = enriched;
        try {
          const ended =
            typeof performance !== "undefined" ? performance.now() : Date.now();
          getStageAnalysisMetrics().record({
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
          createRejectedStageAnalysisTradeSetup(detection, [
            "Stage Analysis detection not validated — trade construction skipped.",
            ...detection.warnings,
          ])
        );
      }

      const warnings: string[] = [...detection.warnings];
      const payload = input.input.stageAnalysis;
      const atr = payload.atr ?? input.input.atr ?? null;
      const candles =
        payload.candlesDaily.length > 0
          ? payload.candlesDaily
          : payload.candlesWeekly;

      const entry = calculateStageAnalysisEntry({
        detection,
        candles,
        vwap: payload.vwap,
        mode: config.entryMode,
        config,
      });
      if (entry === null) {
        return finalize(
          createRejectedStageAnalysisTradeSetup(detection, [
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
          createRejectedStageAnalysisTradeSetup(detection, [
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
          createRejectedStageAnalysisTradeSetup(detection, [
            ...warnings,
            ...riskCheck.errors,
          ])
        );
      }

      const targetResult = generateStageAnalysisTargets({
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
          createRejectedStageAnalysisTradeSetup(detection, [
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
          createRejectedStageAnalysisTradeSetup(detection, [
            ...warnings,
            "Negative reward.",
          ])
        );
      }

      if (riskReward + config.priceEpsilon < config.minimumRiskReward) {
        return finalize(
          createRejectedStageAnalysisTradeSetup(detection, [
            ...warnings,
            "RR below threshold.",
          ])
        );
      }

      const quality = calculateStageAnalysisTradeQuality({
        detection,
        marketContext: input.marketContext,
        riskReward,
        config,
      });

      const draft = createRejectedStageAnalysisTradeSetup(
        detection,
        dedupe(warnings)
      );
      const setup: StageAnalysisTradeSetup = {
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
        stage: detection.stage,
        previousStage: detection.previousStage,
        transition: detection.transition,
        transitionConfidence: detection.transitionConfidence,
        holdingPeriod: config.defaultHoldingPeriod,
        positionType: config.defaultPositionType,
        warnings: dedupe(warnings),
      };

      const validation = validateStageAnalysisTradeSetup(setup, config);
      if (!validation.valid) {
        return finalize(
          createRejectedStageAnalysisTradeSetup(detection, [
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
          : "Stage Analysis trade construction failed.";
      const rejected = createRejectedStageAnalysisTradeSetup(input.detection, [
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

let builderSingleton: StageAnalysisTradeBuilder | null = null;

export function getStageAnalysisTradeBuilder(
  config?: Partial<StageAnalysisTradeConfig>
): StageAnalysisTradeBuilder {
  if (!builderSingleton) {
    builderSingleton = new StageAnalysisTradeBuilder(config);
  }
  return builderSingleton;
}

export function resetStageAnalysisTradeBuilder(): void {
  builderSingleton = null;
}
