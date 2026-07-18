/**
 * Relative Strength Leadership Trade Builder — Sprint 11B.3O.
 */

import { round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import { enrichRelativeStrengthLeadershipTradeSetup } from "./RelativeStrengthLeadershipEnrichment";
import { getRelativeStrengthLeadershipMetrics } from "./RelativeStrengthLeadershipMetrics";
import {
  calculateRiskAmount,
  resolveStopLoss,
  validateTradeRisk,
} from "./RelativeStrengthLeadershipRisk";
import type {
  RelativeStrengthLeadershipDetection,
  RelativeStrengthLeadershipStrategyInput,
} from "./RelativeStrengthLeadershipTypes";
import {
  resolveRelativeStrengthLeadershipTradeConfig,
  type RelativeStrengthLeadershipTradeConfig,
  type RelativeStrengthLeadershipTradeSetup,
} from "./RelativeStrengthLeadershipTradeTypes";
import {
  calculateRelativeStrengthLeadershipEntry,
  calculateRelativeStrengthLeadershipTradeQuality,
  calculateRiskReward,
  createRejectedRelativeStrengthLeadershipTradeSetup,
  generateRelativeStrengthLeadershipTargets,
  validateRelativeStrengthLeadershipTradeSetup,
} from "./RelativeStrengthLeadershipTradeUtils";

export interface RelativeStrengthLeadershipTradeBuildInput {
  detection: RelativeStrengthLeadershipDetection;
  marketContext: InstitutionalMarketContext;
  input: RelativeStrengthLeadershipStrategyInput;
  config?: Partial<RelativeStrengthLeadershipTradeConfig>;
}

export class RelativeStrengthLeadershipTradeBuilder {
  private readonly config: RelativeStrengthLeadershipTradeConfig;
  private lastSetup: RelativeStrengthLeadershipTradeSetup | null = null;

  constructor(config?: Partial<RelativeStrengthLeadershipTradeConfig>) {
    this.config = resolveRelativeStrengthLeadershipTradeConfig(config);
  }

  getConfiguration(): RelativeStrengthLeadershipTradeConfig {
    return resolveRelativeStrengthLeadershipTradeConfig(this.config);
  }

  getLastSetup(): RelativeStrengthLeadershipTradeSetup | null {
    return this.lastSetup;
  }

  build(
    input: RelativeStrengthLeadershipTradeBuildInput
  ): RelativeStrengthLeadershipTradeSetup {
    const started =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    try {
      const config = resolveRelativeStrengthLeadershipTradeConfig({
        ...this.config,
        ...input.config,
      });
      const { detection } = input;

      const finalize = (
        setup: RelativeStrengthLeadershipTradeSetup
      ): RelativeStrengthLeadershipTradeSetup => {
        const enriched = enrichRelativeStrengthLeadershipTradeSetup({
          setup,
          marketContext: input.marketContext,
          rsInput: input.input,
        });
        this.lastSetup = enriched;
        try {
          const ended =
            typeof performance !== "undefined" ? performance.now() : Date.now();
          getRelativeStrengthLeadershipMetrics().record({
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
          createRejectedRelativeStrengthLeadershipTradeSetup(detection, [
            "Relative Strength Leadership detection not validated — trade construction skipped.",
            ...detection.warnings,
          ])
        );
      }

      const warnings: string[] = [...detection.warnings];
      const payload = input.input.relativeStrengthLeadership;
      const atr = payload.atr ?? input.input.atr ?? null;
      const candles = payload.candlesDaily;

      const entry = calculateRelativeStrengthLeadershipEntry({
        detection,
        candles,
        fiftyTwoWeekHigh: payload.fiftyTwoWeekHigh,
        mode: config.entryMode,
        config,
      });
      if (entry === null) {
        return finalize(
          createRejectedRelativeStrengthLeadershipTradeSetup(detection, [
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
          createRejectedRelativeStrengthLeadershipTradeSetup(detection, [
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
          createRejectedRelativeStrengthLeadershipTradeSetup(detection, [
            ...warnings,
            ...riskCheck.errors,
          ])
        );
      }

      const targetResult = generateRelativeStrengthLeadershipTargets({
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
          createRejectedRelativeStrengthLeadershipTradeSetup(detection, [
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
          createRejectedRelativeStrengthLeadershipTradeSetup(detection, [
            ...warnings,
            "Negative reward.",
          ])
        );
      }
      if (riskReward + config.priceEpsilon < config.minimumRiskReward) {
        return finalize(
          createRejectedRelativeStrengthLeadershipTradeSetup(detection, [
            ...warnings,
            "RR below threshold.",
          ])
        );
      }

      const quality = calculateRelativeStrengthLeadershipTradeQuality({
        detection,
        marketContext: input.marketContext,
        riskReward,
        config,
      });

      const draft = createRejectedRelativeStrengthLeadershipTradeSetup(
        detection,
        dedupe(warnings)
      );
      const setup: RelativeStrengthLeadershipTradeSetup = {
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
        relativeStrengthScore: detection.relativeStrengthScore,
        relativeStrengthRank: detection.relativeStrengthRank,
        sectorRank: detection.sectorRank,
        industryRank: detection.industryRank,
        leadershipPercentile: detection.leadershipPercentile,
        holdingPeriod: config.defaultHoldingPeriod,
        positionType: config.defaultPositionType,
        warnings: dedupe(warnings),
      };

      const validation = validateRelativeStrengthLeadershipTradeSetup(
        setup,
        config
      );
      if (!validation.valid) {
        return finalize(
          createRejectedRelativeStrengthLeadershipTradeSetup(detection, [
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
          : "Relative Strength Leadership trade construction failed.";
      const rejected = createRejectedRelativeStrengthLeadershipTradeSetup(
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

let builderSingleton: RelativeStrengthLeadershipTradeBuilder | null = null;

export function getRelativeStrengthLeadershipTradeBuilder(
  config?: Partial<RelativeStrengthLeadershipTradeConfig>
): RelativeStrengthLeadershipTradeBuilder {
  if (!builderSingleton)
    builderSingleton = new RelativeStrengthLeadershipTradeBuilder(config);
  return builderSingleton;
}

export function resetRelativeStrengthLeadershipTradeBuilder(): void {
  builderSingleton = null;
}
