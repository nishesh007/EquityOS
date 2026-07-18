/**
 * Magic Formula Investment Setup Builder — Sprint 11B.3X.
 */

import { round } from "@/lib/engine/utils";
import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import type { MagicFormulaConfig } from "./MagicFormulaConstants";
import {
  buildMagicFormulaExplainability,
  createEmptyMagicFormulaExplainability,
} from "./MagicFormulaExplainability";
import { getMagicFormulaMetrics } from "./MagicFormulaMetrics";
import { buildMagicFormulaInstitutionalScore } from "./MagicFormulaScoring";
import type {
  MagicFormulaDetection,
  MagicFormulaInvestmentSetup,
  MagicFormulaStrategyInput,
} from "./MagicFormulaTypes";
import {
  createEmptyMagicFormulaDetection,
  resolveMagicFormulaConfig,
  resolvePositionSize,
} from "./MagicFormulaUtils";

export interface MagicFormulaBuildInput {
  detection: MagicFormulaDetection;
  marketContext: InstitutionalMarketContext;
  input: MagicFormulaStrategyInput;
  config?: Partial<MagicFormulaConfig>;
}

export function createRejectedMagicFormulaSetup(
  detection: MagicFormulaDetection,
  warnings: string[]
): MagicFormulaInvestmentSetup {
  return {
    detection,
    recommendation: "AVOID",
    magicFormulaRank: detection.ranking.magicFormulaRank,
    compositeRank: detection.ranking.compositeRank,
    earningsYield: detection.earningsYield.earningsYield,
    returnOnCapital: detection.roc.returnOnCapital,
    enterpriseValue: detection.earningsYield.enterpriseValue,
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
    explainability: createEmptyMagicFormulaExplainability(warnings),
    institutionalScore: {
      conviction: 0,
      grade: "Weak",
      signalGrade: "F",
      confidence: detection.confidence || 0,
    },
  };
}

export class MagicFormulaTradeBuilder {
  private readonly config: MagicFormulaConfig;
  private lastSetup: MagicFormulaInvestmentSetup | null = null;

  constructor(config?: Partial<MagicFormulaConfig>) {
    this.config = resolveMagicFormulaConfig(config);
  }

  getConfiguration(): MagicFormulaConfig {
    return resolveMagicFormulaConfig(this.config);
  }

  getLastSetup(): MagicFormulaInvestmentSetup | null {
    return this.lastSetup;
  }

  build(input: MagicFormulaBuildInput): MagicFormulaInvestmentSetup {
    const started =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    try {
      const config = resolveMagicFormulaConfig({
        ...this.config,
        ...input.config,
      });
      const { detection } = input;
      const current = input.input.magicFormula.current;

      if (!detection.detected && detection.recommendation === "AVOID") {
        const rejected = createRejectedMagicFormulaSetup(detection, [
          "Magic Formula screen not qualified.",
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

      const institutionalScore = buildMagicFormulaInstitutionalScore({
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
        ranking: detection.ranking,
        financial: detection.financial,
        config,
      });

      const entry = round(current.currentPrice, 4);
      const eyUplift = 1 + Math.max(detection.earningsYield.earningsYield, 0);
      const impliedTarget = round(entry * eyUplift, 4);
      const stopLoss = round(entry * (1 - config.softStopLossPct), 4);
      const target1 = round(
        entry + (impliedTarget - entry) * config.targetProgress1,
        4
      );
      const target2 = round(
        entry + (impliedTarget - entry) * config.targetProgress2,
        4
      );
      const finalTarget = round(
        Math.max(impliedTarget, entry * config.finalTargetMultiple),
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

      let setup: MagicFormulaInvestmentSetup = {
        detection,
        recommendation: detection.recommendation,
        magicFormulaRank: detection.ranking.magicFormulaRank,
        compositeRank: detection.ranking.compositeRank,
        earningsYield: detection.earningsYield.earningsYield,
        returnOnCapital: detection.roc.returnOnCapital,
        enterpriseValue: detection.earningsYield.enterpriseValue,
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
        explainability: createEmptyMagicFormulaExplainability(warnings),
        institutionalScore,
      };

      try {
        const explainability = buildMagicFormulaExplainability({
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
          explainability: createEmptyMagicFormulaExplainability([
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
          : "Magic Formula investment construction failed.";
      const rejected = createRejectedMagicFormulaSetup(
        input.detection ?? createEmptyMagicFormulaDetection([message]),
        [message]
      );
      this.lastSetup = rejected;
      return rejected;
    }
  }

  private recordMetrics(
    setup: MagicFormulaInvestmentSetup,
    started: number
  ): void {
    try {
      const ended =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      getMagicFormulaMetrics().record({
        setup,
        executionTimeMs: ended - started,
      });
    } catch {
      // Metrics optional.
    }
  }
}

let builderSingleton: MagicFormulaTradeBuilder | null = null;

export function getMagicFormulaTradeBuilder(
  config?: Partial<MagicFormulaConfig>
): MagicFormulaTradeBuilder {
  if (!builderSingleton) {
    builderSingleton = new MagicFormulaTradeBuilder(config);
  }
  return builderSingleton;
}

export function resetMagicFormulaTradeBuilder(): void {
  builderSingleton = null;
}
