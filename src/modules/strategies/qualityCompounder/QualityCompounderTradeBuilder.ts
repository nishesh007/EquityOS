/**
 * Quality Compounder Investment Setup Builder — Sprint 11B.3Y.
 */

import { round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import type { QualityCompounderConfig } from "./QualityCompounderConstants";
import {
  buildQualityCompounderExplainability,
  createEmptyQualityCompounderExplainability,
} from "./QualityCompounderExplainability";
import { getQualityCompounderMetrics } from "./QualityCompounderMetrics";
import { buildQualityCompounderInstitutionalScore } from "./QualityCompounderScoring";
import type {
  QualityCompounderDetection,
  QualityCompounderInvestmentSetup,
  QualityCompounderStrategyInput,
} from "./QualityCompounderTypes";
import {
  createEmptyQualityCompounderDetection,
  resolveExpectedCagr,
  resolveQualityCompounderConfig,
  resolvePositionSize,
} from "./QualityCompounderUtils";

export interface QualityCompounderBuildInput {
  detection: QualityCompounderDetection;
  marketContext: InstitutionalMarketContext;
  input: QualityCompounderStrategyInput;
  config?: Partial<QualityCompounderConfig>;
}

export function createRejectedQualityCompounderSetup(
  detection: QualityCompounderDetection,
  warnings: string[]
): QualityCompounderInvestmentSetup {
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
    capitalAllocation: detection.capital.score,
    growthSustainability: detection.growth.growthSustainability,
    valuationStatus: detection.valuation.status,
    expectedCagr: 0,
    suggestedHoldingPeriod: "N/A",
    positionSize: "None",
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
    explainability: createEmptyQualityCompounderExplainability(warnings),
    institutionalScore: {
      conviction: 0,
      grade: "Weak",
      signalGrade: "F",
      confidence: detection.confidence || 0,
    },
  };
}

export class QualityCompounderTradeBuilder {
  private readonly config: QualityCompounderConfig;
  private lastSetup: QualityCompounderInvestmentSetup | null = null;

  constructor(config?: Partial<QualityCompounderConfig>) {
    this.config = resolveQualityCompounderConfig(config);
  }

  getConfiguration(): QualityCompounderConfig {
    return resolveQualityCompounderConfig(this.config);
  }

  getLastSetup(): QualityCompounderInvestmentSetup | null {
    return this.lastSetup;
  }

  build(input: QualityCompounderBuildInput): QualityCompounderInvestmentSetup {
    const started =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    try {
      const config = resolveQualityCompounderConfig({
        ...this.config,
        ...input.config,
      });
      const { detection } = input;
      const current = input.input.qualityCompounder.current;

      if (!detection.detected && detection.recommendation === "AVOID") {
        const rejected = createRejectedQualityCompounderSetup(detection, [
          "Quality Compounder screen not qualified.",
          ...detection.warnings,
        ]);
        this.lastSetup = rejected;
        this.recordMetrics(rejected, started, current);
        return rejected;
      }

      const warnings = [...detection.warnings];
      const governanceScore = detection.management.governanceRedFlags
        ? 20
        : current.corporateGovernanceScore;

      const institutionalScore = buildQualityCompounderInstitutionalScore({
        detection,
        governanceScore,
        institutionalHolding: current.institutionalHolding,
        qualityScore: detection.qualityScore,
        warnings,
      });

      const positionSize = resolvePositionSize({
        recommendation: detection.recommendation,
        qualityScore: detection.qualityScore,
        conviction: institutionalScore.conviction,
        moat: detection.moat,
        business: detection.business,
        valuation: detection.valuation,
      });

      const expectedCagr = resolveExpectedCagr({
        business: detection.business,
        growth: detection.growth,
        config,
      });

      const entry = round(current.currentPrice, 4);
      const intrinsic = detection.valuation.intrinsicValue;
      const stopLoss = round(entry * (1 - config.softStopLossPct), 4);
      const target1 = round(
        entry + (intrinsic - entry) * config.targetProgress1,
        4
      );
      const target2 = round(
        entry + (intrinsic - entry) * config.targetProgress2,
        4
      );
      const finalTarget = round(
        Math.max(intrinsic, entry * config.finalTargetMultiple),
        4
      );
      const risk = round(Math.abs(entry - stopLoss), 4);
      const reward = round(Math.abs(finalTarget - entry), 4);
      const riskReward = risk > 0 ? round(reward / risk, 2) : 0;

      const holding =
        detection.recommendation === "AVOID"
          ? "N/A"
          : `${config.holdingPeriodYears.min}–${config.holdingPeriodYears.max} Years`;

      const investable = detection.recommendation !== "AVOID";

      let setup: QualityCompounderInvestmentSetup = {
        detection,
        recommendation: detection.recommendation,
        intrinsicValue: intrinsic,
        currentPrice: entry,
        marginOfSafety: detection.valuation.marginOfSafety,
        economicMoat: detection.moat.classification,
        businessQuality: detection.business.score,
        managementQuality: detection.management.score,
        financialStrength: detection.financial.score,
        capitalAllocation: detection.capital.score,
        growthSustainability: detection.growth.growthSustainability,
        valuationStatus: detection.valuation.status,
        expectedCagr,
        suggestedHoldingPeriod: holding,
        positionSize,
        qualityScore: detection.qualityScore,
        conviction: institutionalScore.conviction,
        signalGrade: institutionalScore.signalGrade,
        confidence: institutionalScore.confidence,
        entry: investable ? entry : 0,
        stopLoss: investable ? stopLoss : 0,
        target1: investable ? target1 : 0,
        target2: investable ? target2 : 0,
        finalTarget: investable ? finalTarget : 0,
        risk: investable ? risk : 0,
        reward: investable ? reward : 0,
        riskReward: investable ? riskReward : 0,
        warnings,
        positiveReasons: [],
        negativeReasons: [],
        neutralReasons: [],
        institutionalSummary: [],
        explainability: createEmptyQualityCompounderExplainability(warnings),
        institutionalScore,
      };

      try {
        const explainability = buildQualityCompounderExplainability({
          detection,
          setup,
          governanceScore,
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
          explainability: createEmptyQualityCompounderExplainability([
            ...warnings,
            "Explainability degraded.",
          ]),
        };
      }

      this.lastSetup = setup;
      this.recordMetrics(setup, started, current);
      return setup;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Quality Compounder investment construction failed.";
      const rejected = createRejectedQualityCompounderSetup(
        input.detection ?? createEmptyQualityCompounderDetection([message]),
        [message]
      );
      this.lastSetup = rejected;
      return rejected;
    }
  }

  private recordMetrics(
    setup: QualityCompounderInvestmentSetup,
    started: number,
    current: QualityCompounderStrategyInput["qualityCompounder"]["current"]
  ): void {
    try {
      const ended =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      getQualityCompounderMetrics().record({
        setup,
        executionTimeMs: ended - started,
        roic: current.roic,
        roe: current.roe,
        revenueCagr: current.revenueCagr ?? setup.detection.growth.revenueCagr,
        epsCagr: current.epsCagr ?? setup.detection.growth.epsCagr,
      });
    } catch {
      // Metrics optional.
    }
  }
}

let builderSingleton: QualityCompounderTradeBuilder | null = null;

export function getQualityCompounderTradeBuilder(
  config?: Partial<QualityCompounderConfig>
): QualityCompounderTradeBuilder {
  if (!builderSingleton) {
    builderSingleton = new QualityCompounderTradeBuilder(config);
  }
  return builderSingleton;
}

export function resetQualityCompounderTradeBuilder(): void {
  builderSingleton = null;
}
