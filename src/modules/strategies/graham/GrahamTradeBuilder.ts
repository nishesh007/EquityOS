/**
 * Graham Investment Setup Builder — Sprint 11B.3V.
 */

import { round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import type { GrahamConfig } from "./GrahamConstants";
import {
  buildGrahamExplainability,
  createEmptyGrahamExplainability,
} from "./GrahamExplainability";
import { getGrahamMetrics } from "./GrahamMetrics";
import { buildGrahamInstitutionalScore } from "./GrahamScoring";
import type {
  GrahamDetection,
  GrahamInvestmentSetup,
  GrahamStrategyInput,
} from "./GrahamTypes";
import {
  createEmptyGrahamDetection,
  resolveGrahamConfig,
  resolvePositionSize,
} from "./GrahamUtils";

export interface GrahamBuildInput {
  detection: GrahamDetection;
  marketContext: InstitutionalMarketContext;
  input: GrahamStrategyInput;
  config?: Partial<GrahamConfig>;
}

export function createRejectedGrahamSetup(
  detection: GrahamDetection,
  warnings: string[],
  currentPrice = 0
): GrahamInvestmentSetup {
  return {
    detection,
    recommendation: "AVOID",
    intrinsicValue: detection.intrinsic.intrinsicValue,
    currentPrice,
    marginOfSafety: detection.marginSafety.marginOfSafety,
    discountPercent: detection.marginSafety.discountPercent,
    upsidePotential: detection.marginSafety.upsidePercent,
    financialStrength: detection.financial.score,
    balanceSheetScore: detection.balanceSheet.score,
    valuationStatus: detection.marginSafety.status,
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
    explainability: createEmptyGrahamExplainability(warnings),
    institutionalScore: {
      conviction: 0,
      grade: "Weak",
      signalGrade: "F",
      confidence: detection.confidence || 0,
    },
  };
}

export class GrahamTradeBuilder {
  private readonly config: GrahamConfig;
  private lastSetup: GrahamInvestmentSetup | null = null;

  constructor(config?: Partial<GrahamConfig>) {
    this.config = resolveGrahamConfig(config);
  }

  getConfiguration(): GrahamConfig {
    return resolveGrahamConfig(this.config);
  }

  getLastSetup(): GrahamInvestmentSetup | null {
    return this.lastSetup;
  }

  build(input: GrahamBuildInput): GrahamInvestmentSetup {
    const started =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    try {
      const config = resolveGrahamConfig({
        ...this.config,
        ...input.config,
      });
      const { detection } = input;
      const current = input.input.graham.current;

      if (!detection.detected && detection.recommendation === "AVOID") {
        const rejected = createRejectedGrahamSetup(
          detection,
          ["Graham screen not qualified.", ...detection.warnings],
          current.currentPrice
        );
        this.lastSetup = rejected;
        this.recordMetrics(
          rejected,
          started,
          current.currentRatio,
          current.debtEquity
        );
        return rejected;
      }

      const warnings = [...detection.warnings];
      const governanceScore = current.governanceRedFlags
        ? 20
        : current.accountingConcerns
          ? 35
          : current.corporateGovernanceScore;

      const institutionalScore = buildGrahamInstitutionalScore({
        detection,
        governanceScore,
        qualityScore: detection.qualityScore,
        warnings,
      });

      const positionSize = resolvePositionSize({
        recommendation: detection.recommendation,
        qualityScore: detection.qualityScore,
        conviction: institutionalScore.conviction,
        marginOfSafety: detection.marginSafety.marginOfSafety,
        financialScore: detection.financial.score,
        balanceSheetScore: detection.balanceSheet.score,
        config,
      });

      const entry = round(current.currentPrice, 4);
      const intrinsic = detection.intrinsic.intrinsicValue;
      const stopLoss = round(entry * (1 - config.softStopLossPct), 4);
      const target1 = round(entry + (intrinsic - entry) * 0.4, 4);
      const target2 = round(entry + (intrinsic - entry) * 0.7, 4);
      const finalTarget = round(Math.max(intrinsic, entry * 1.4), 4);
      const risk = round(Math.abs(entry - stopLoss), 4);
      const reward = round(Math.abs(finalTarget - entry), 4);
      const riskReward = risk > 0 ? round(reward / risk, 2) : 0;

      const holding =
        detection.recommendation === "AVOID"
          ? "N/A"
          : `${config.holdingPeriodYears.min}–${config.holdingPeriodYears.max} Years`;

      const investable = detection.recommendation !== "AVOID";

      let setup: GrahamInvestmentSetup = {
        detection,
        recommendation: detection.recommendation,
        intrinsicValue: intrinsic,
        currentPrice: entry,
        marginOfSafety: detection.marginSafety.marginOfSafety,
        discountPercent: detection.marginSafety.discountPercent,
        upsidePotential: detection.marginSafety.upsidePercent,
        financialStrength: detection.financial.score,
        balanceSheetScore: detection.balanceSheet.score,
        valuationStatus: detection.marginSafety.status,
        positionSize,
        expectedHoldingPeriod: holding,
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
        explainability: createEmptyGrahamExplainability(warnings),
        institutionalScore,
      };

      try {
        const explainability = buildGrahamExplainability({
          detection,
          setup,
          governanceScore,
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
          explainability: createEmptyGrahamExplainability([
            ...warnings,
            "Explainability degraded.",
          ]),
        };
      }

      this.lastSetup = setup;
      this.recordMetrics(
        setup,
        started,
        current.currentRatio,
        current.debtEquity
      );
      return setup;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Graham investment construction failed.";
      const rejected = createRejectedGrahamSetup(
        input.detection ?? createEmptyGrahamDetection([message]),
        [message],
        input.input?.graham?.current?.currentPrice ?? 0
      );
      this.lastSetup = rejected;
      return rejected;
    }
  }

  private recordMetrics(
    setup: GrahamInvestmentSetup,
    started: number,
    currentRatio: number,
    debtEquity: number
  ): void {
    try {
      const ended =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      getGrahamMetrics().record({
        setup,
        executionTimeMs: ended - started,
        currentRatio,
        debtEquity,
      });
    } catch {
      // Metrics optional.
    }
  }
}

let builderSingleton: GrahamTradeBuilder | null = null;

export function getGrahamTradeBuilder(
  config?: Partial<GrahamConfig>
): GrahamTradeBuilder {
  if (!builderSingleton) builderSingleton = new GrahamTradeBuilder(config);
  return builderSingleton;
}

export function resetGrahamTradeBuilder(): void {
  builderSingleton = null;
}
