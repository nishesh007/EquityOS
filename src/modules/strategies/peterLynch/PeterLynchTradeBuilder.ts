/**
 * Peter Lynch Investment Setup Builder — Sprint 11B.3W.
 */

import { round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import type { PeterLynchConfig } from "./PeterLynchConstants";
import {
  buildPeterLynchExplainability,
  createEmptyPeterLynchExplainability,
} from "./PeterLynchExplainability";
import { getPeterLynchMetrics } from "./PeterLynchMetrics";
import { buildPeterLynchInstitutionalScore } from "./PeterLynchScoring";
import type {
  PeterLynchDetection,
  PeterLynchInvestmentSetup,
  PeterLynchStrategyInput,
} from "./PeterLynchTypes";
import {
  createEmptyPeterLynchDetection,
  resolvePeterLynchConfig,
  resolvePositionSize,
} from "./PeterLynchUtils";

export interface PeterLynchBuildInput {
  detection: PeterLynchDetection;
  marketContext: InstitutionalMarketContext;
  input: PeterLynchStrategyInput;
  config?: Partial<PeterLynchConfig>;
}

export function createRejectedPeterLynchSetup(
  detection: PeterLynchDetection,
  warnings: string[]
): PeterLynchInvestmentSetup {
  return {
    detection,
    recommendation: "AVOID",
    growthRate: detection.growth.growthRate,
    revenueCagr: detection.growth.revenueCagr,
    epsCagr: detection.growth.epsCagr,
    pegRatio: detection.peg.pegRatio,
    peRatio: null,
    intrinsicValue: detection.valuation.intrinsicValue,
    valuationStatus: detection.valuation.status,
    businessQuality: detection.business.score,
    financialStrength: detection.financial.score,
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
    explainability: createEmptyPeterLynchExplainability(warnings),
    institutionalScore: {
      conviction: 0,
      grade: "Weak",
      signalGrade: "F",
      confidence: detection.confidence || 0,
    },
  };
}

export class PeterLynchTradeBuilder {
  private readonly config: PeterLynchConfig;
  private lastSetup: PeterLynchInvestmentSetup | null = null;

  constructor(config?: Partial<PeterLynchConfig>) {
    this.config = resolvePeterLynchConfig(config);
  }

  getConfiguration(): PeterLynchConfig {
    return resolvePeterLynchConfig(this.config);
  }

  getLastSetup(): PeterLynchInvestmentSetup | null {
    return this.lastSetup;
  }

  build(input: PeterLynchBuildInput): PeterLynchInvestmentSetup {
    const started =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    try {
      const config = resolvePeterLynchConfig({
        ...this.config,
        ...input.config,
      });
      const { detection } = input;
      const current = input.input.peterLynch.current;

      if (!detection.detected && detection.recommendation === "AVOID") {
        const rejected = createRejectedPeterLynchSetup(detection, [
          "Peter Lynch screen not qualified.",
          ...detection.warnings,
        ]);
        this.lastSetup = rejected;
        this.recordMetrics(rejected, started);
        return rejected;
      }

      const warnings = [...detection.warnings];
      const governanceScore = current.governanceRedFlags
        ? 20
        : current.accountingConcerns
          ? 35
          : current.corporateGovernanceScore;

      const institutionalScore = buildPeterLynchInstitutionalScore({
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
        growth: detection.growth,
        peg: detection.peg,
        business: detection.business,
        financial: detection.financial,
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

      let setup: PeterLynchInvestmentSetup = {
        detection,
        recommendation: detection.recommendation,
        growthRate: detection.growth.growthRate,
        revenueCagr: detection.growth.revenueCagr,
        epsCagr: detection.growth.epsCagr,
        pegRatio: detection.peg.pegRatio,
        peRatio: current.pe,
        intrinsicValue: intrinsic,
        valuationStatus: detection.valuation.status,
        businessQuality: detection.business.score,
        financialStrength: detection.financial.score,
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
        explainability: createEmptyPeterLynchExplainability(warnings),
        institutionalScore,
      };

      try {
        const explainability = buildPeterLynchExplainability({
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
          explainability: createEmptyPeterLynchExplainability([
            ...warnings,
            "Explainability degraded.",
          ]),
        };
      }

      this.lastSetup = setup;
      this.recordMetrics(setup, started);
      return setup;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Peter Lynch investment construction failed.";
      const rejected = createRejectedPeterLynchSetup(
        input.detection ?? createEmptyPeterLynchDetection([message]),
        [message]
      );
      this.lastSetup = rejected;
      return rejected;
    }
  }

  private recordMetrics(
    setup: PeterLynchInvestmentSetup,
    started: number
  ): void {
    try {
      const ended =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      getPeterLynchMetrics().record({
        setup,
        executionTimeMs: ended - started,
      });
    } catch {
      // Metrics optional.
    }
  }
}

let builderSingleton: PeterLynchTradeBuilder | null = null;

export function getPeterLynchTradeBuilder(
  config?: Partial<PeterLynchConfig>
): PeterLynchTradeBuilder {
  if (!builderSingleton) builderSingleton = new PeterLynchTradeBuilder(config);
  return builderSingleton;
}

export function resetPeterLynchTradeBuilder(): void {
  builderSingleton = null;
}
