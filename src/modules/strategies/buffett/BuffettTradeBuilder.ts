/**
 * Buffett Investment Setup Builder — Sprint 11B.3U.
 */

import { round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import {
  buildBuffettExplainability,
  createEmptyBuffettExplainability,
} from "./BuffettExplainability";
import { getBuffettMetrics } from "./BuffettMetrics";
import { buildBuffettInstitutionalScore } from "./BuffettScoring";
import type {
  BuffettDetection,
  BuffettInvestmentSetup,
  BuffettStrategyInput,
} from "./BuffettTypes";
import type { BuffettConfig } from "./BuffettConstants";
import {
  createEmptyBuffettDetection,
  resolveBuffettConfig,
  resolvePositionSize,
} from "./BuffettUtils";
export interface BuffettBuildInput {
  detection: BuffettDetection;
  marketContext: InstitutionalMarketContext;
  input: BuffettStrategyInput;
  config?: Partial<BuffettConfig>;
}

export function createRejectedBuffettSetup(
  detection: BuffettDetection,
  warnings: string[]
): BuffettInvestmentSetup {
  return {
    detection,
    recommendation: "AVOID",
    intrinsicValue: detection.valuation.intrinsicValue,
    currentPrice: detection.valuation.currentPrice,
    marginOfSafety: detection.valuation.marginOfSafety,
    economicMoat: detection.moat.classification,
    businessQuality: detection.business.score,
    managementQuality: detection.management.score,
    financialStrength: detection.financial.score,
    valuationStatus: detection.valuation.status,
    positionSize: "None",
    expectedHoldingPeriod: "N/A",
    qualityScore: 0,
    conviction: 0,
    signalGrade: "F",
    confidence: detection.confidence || 0,
    entry: 0,
    stopLoss: 0,
    target1: 0,
    target2: 0,
    finalTarget: 0,
    risk: 0,
    reward: 0,
    riskReward: 0,
    warnings,
    positiveReasons: [],
    negativeReasons: [],
    neutralReasons: [],
    institutionalSummary: [],
    explainability: createEmptyBuffettExplainability(warnings),
    institutionalScore: {
      conviction: 0,
      grade: "Weak",
      signalGrade: "F",
      confidence: detection.confidence || 0,
    },
  };
}

export class BuffettTradeBuilder {
  private readonly config: BuffettConfig;
  private lastSetup: BuffettInvestmentSetup | null = null;

  constructor(config?: Partial<BuffettConfig>) {
    this.config = resolveBuffettConfig(config);
  }

  getConfiguration(): BuffettConfig {
    return resolveBuffettConfig(this.config);
  }

  getLastSetup(): BuffettInvestmentSetup | null {
    return this.lastSetup;
  }

  build(input: BuffettBuildInput): BuffettInvestmentSetup {
    const started =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    try {
      const config = resolveBuffettConfig({
        ...this.config,
        ...input.config,
      });
      const { detection } = input;
      const current = input.input.buffett.current;

      if (!detection.detected && detection.recommendation === "AVOID") {
        const rejected = createRejectedBuffettSetup(detection, [
          "Buffett screen not qualified.",
          ...detection.warnings,
        ]);
        this.lastSetup = rejected;
        this.recordMetrics(rejected, started, current.roe, current.roce);
        return rejected;
      }

      const warnings = [...detection.warnings];
      const institutionalScore = buildBuffettInstitutionalScore({
        detection,
        institutionalHolding: current.institutionalHolding,
        qualityScore: detection.qualityScore,
        warnings,
      });

      const positionSize = resolvePositionSize({
        recommendation: detection.recommendation,
        qualityScore: detection.qualityScore,
        conviction: institutionalScore.conviction,
        valuation: detection.valuation,
        moat: detection.moat,
      });

      const entry = round(current.currentPrice, 4);
      const intrinsic = detection.valuation.intrinsicValue;
      // Soft capital-preservation stop: 25% below entry for long-term book.
      const stopLoss = round(entry * 0.75, 4);
      const target1 = round(entry + (intrinsic - entry) * 0.4, 4);
      const target2 = round(entry + (intrinsic - entry) * 0.7, 4);
      const finalTarget = round(Math.max(intrinsic, entry * 1.5), 4);
      const risk = round(Math.abs(entry - stopLoss), 4);
      const reward = round(Math.abs(finalTarget - entry), 4);
      const riskReward = risk > 0 ? round(reward / risk, 2) : 0;

      const holding =
        detection.recommendation === "AVOID"
          ? "N/A"
          : `${config.holdingPeriodYears.min}–${config.holdingPeriodYears.max} Years`;

      let setup: BuffettInvestmentSetup = {
        detection,
        recommendation: detection.recommendation,
        intrinsicValue: intrinsic,
        currentPrice: entry,
        marginOfSafety: detection.valuation.marginOfSafety,
        economicMoat: detection.moat.classification,
        businessQuality: detection.business.score,
        managementQuality: detection.management.score,
        financialStrength: detection.financial.score,
        valuationStatus: detection.valuation.status,
        positionSize,
        expectedHoldingPeriod: holding,
        qualityScore: detection.qualityScore,
        conviction: institutionalScore.conviction,
        signalGrade: institutionalScore.signalGrade,
        confidence: institutionalScore.confidence,
        entry: detection.recommendation === "AVOID" ? 0 : entry,
        stopLoss: detection.recommendation === "AVOID" ? 0 : stopLoss,
        target1: detection.recommendation === "AVOID" ? 0 : target1,
        target2: detection.recommendation === "AVOID" ? 0 : target2,
        finalTarget: detection.recommendation === "AVOID" ? 0 : finalTarget,
        risk: detection.recommendation === "AVOID" ? 0 : risk,
        reward: detection.recommendation === "AVOID" ? 0 : reward,
        riskReward: detection.recommendation === "AVOID" ? 0 : riskReward,
        warnings,
        positiveReasons: [],
        negativeReasons: [],
        neutralReasons: [],
        institutionalSummary: [],
        explainability: createEmptyBuffettExplainability(warnings),
        institutionalScore,
      };

      try {
        const explainability = buildBuffettExplainability({
          detection,
          setup,
          institutionalHolding: current.institutionalHolding,
          institutionalScore,
        });
        setup = {
          ...setup,
          positiveReasons: explainability.positiveReasons,
          negativeReasons: explainability.negativeReasons,
          neutralReasons: explainability.neutralFactors,
          institutionalSummary: explainability.summary,
          warnings: explainability.warnings,
          explainability,
        };
      } catch {
        setup = {
          ...setup,
          explainability: createEmptyBuffettExplainability([
            ...warnings,
            "Explainability degraded.",
          ]),
        };
      }

      this.lastSetup = setup;
      this.recordMetrics(setup, started, current.roe, current.roce);
      return setup;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Buffett investment construction failed.";
      const rejected = createRejectedBuffettSetup(
        input.detection ?? createEmptyBuffettDetection([message]),
        [message]
      );
      this.lastSetup = rejected;
      return rejected;
    }
  }

  private recordMetrics(
    setup: BuffettInvestmentSetup,
    started: number,
    roe: number,
    roce: number
  ): void {
    try {
      const ended =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      getBuffettMetrics().record({
        setup,
        executionTimeMs: ended - started,
        roe,
        roce,
      });
    } catch {
      // Metrics optional.
    }
  }
}

let builderSingleton: BuffettTradeBuilder | null = null;

export function getBuffettTradeBuilder(
  config?: Partial<BuffettConfig>
): BuffettTradeBuilder {
  if (!builderSingleton) builderSingleton = new BuffettTradeBuilder(config);
  return builderSingleton;
}

export function resetBuffettTradeBuilder(): void {
  builderSingleton = null;
}
