/**
 * Greenblatt Magic Formula Strategy — Sprint 11B.3X.
 */

import { BaseStrategy } from "../BaseStrategy";
import type {
  StrategyAnalysisResult,
  StrategyExecutionContext,
  StrategySignal,
  StrategyTargets,
  StrategyValidationResult,
} from "../StrategyTypes";
import {
  MAGIC_FORMULA_STRATEGY_ID,
  MAGIC_FORMULA_STRATEGY_NAME,
  type MagicFormulaConfig,
} from "./MagicFormulaConstants";
import {
  MagicFormulaDetector,
  validateMagicFormulaContext,
} from "./MagicFormulaDetector";
import { MagicFormulaTradeBuilder } from "./MagicFormulaTradeBuilder";
import type {
  MagicFormulaDetection,
  MagicFormulaInvestmentSetup,
} from "./MagicFormulaTypes";
import {
  isMagicFormulaStrategyInput,
  toMagicFormulaDetectionContext,
} from "./MagicFormulaTypes";
import {
  createEmptyMagicFormulaDetection,
  resolveMagicFormulaConfig,
} from "./MagicFormulaUtils";

export class MagicFormulaStrategy extends BaseStrategy {
  readonly id = MAGIC_FORMULA_STRATEGY_ID;
  readonly name = MAGIC_FORMULA_STRATEGY_NAME;
  readonly category = "Position" as const;
  readonly eligibilityId = MAGIC_FORMULA_STRATEGY_ID;

  private readonly detector: MagicFormulaDetector;
  private readonly tradeBuilder: MagicFormulaTradeBuilder;
  private readonly magicConfig: MagicFormulaConfig;
  private lastDetection: MagicFormulaDetection | null = null;
  private lastSetup: MagicFormulaInvestmentSetup | null = null;

  constructor(config?: Partial<MagicFormulaConfig>) {
    super();
    this.magicConfig = resolveMagicFormulaConfig(config);
    this.detector = new MagicFormulaDetector(this.magicConfig);
    this.tradeBuilder = new MagicFormulaTradeBuilder(this.magicConfig);
  }

  detect(context: StrategyExecutionContext): MagicFormulaDetection {
    const detectionContext = toMagicFormulaDetectionContext(context);
    if (!detectionContext) {
      const empty = createEmptyMagicFormulaDetection([
        "Magic Formula market data missing on strategy input.",
      ]);
      this.lastDetection = empty;
      return empty;
    }
    const detection = this.detector.detect({
      ...detectionContext,
      config: this.magicConfig,
    });
    this.lastDetection = detection;
    return detection;
  }

  buildInvestmentSetup(
    context: StrategyExecutionContext
  ): MagicFormulaInvestmentSetup {
    const detection = this.lastDetection ?? this.detect(context);
    if (!isMagicFormulaStrategyInput(context.input)) {
      const rejected = this.tradeBuilder.build({
        detection,
        marketContext: context.marketContext,
        input: {
          symbol: context.input.symbol,
          lastPrice: context.input.lastPrice,
          magicFormula: {
            financialHistory: [],
            current: {
              currentPrice: context.input.lastPrice,
              enterpriseValue: null,
              marketCap: 0,
              ebit: -1,
              ebitda: null,
              revenue: 0,
              operatingIncome: -1,
              netIncome: -1,
              cash: 0,
              debt: 1,
              workingCapital: -1,
              fixedAssets: 0,
              currentAssets: 0,
              currentLiabilities: 1,
              operatingCashFlow: -1,
              freeCashFlow: -1,
              roe: 0,
              roce: 0,
              roic: 0,
              pe: null,
              pb: null,
              evEbitda: null,
              dividendYield: 0,
              debtEquity: 2,
              currentRatio: 0.5,
              institutionalHolding: 0,
              promoterHolding: 0,
              corporateGovernanceScore: 0,
              sector: "Unknown",
              industry: "Unknown",
              governanceRedFlags: true,
              accountingConcerns: true,
            },
          },
        },
      });
      this.lastSetup = rejected;
      return rejected;
    }
    const setup = this.tradeBuilder.build({
      detection,
      marketContext: context.marketContext,
      input: context.input,
      config: this.magicConfig,
    });
    this.lastSetup = setup;
    return setup;
  }

  getLastDetection(): MagicFormulaDetection | null {
    return this.lastDetection;
  }

  getLastInvestmentSetup(): MagicFormulaInvestmentSetup | null {
    return this.lastSetup;
  }

  getLastTradeSetup(): MagicFormulaInvestmentSetup | null {
    return this.lastSetup;
  }

  override validate(
    context: StrategyExecutionContext
  ): StrategyValidationResult {
    if (!isMagicFormulaStrategyInput(context.input)) {
      return this.failValidation([
        "Magic Formula input requires EY / ROC / financial payload.",
      ]);
    }
    const detectionContext = toMagicFormulaDetectionContext(context);
    const result = validateMagicFormulaContext(
      detectionContext,
      this.magicConfig
    );
    if (!result.valid) {
      return this.failValidation(result.errors, result.warnings);
    }
    return this.okValidation(result.warnings);
  }

  override analyze(context: StrategyExecutionContext): StrategyAnalysisResult {
    const detection = this.detect(context);
    const setup = this.buildInvestmentSetup(context);
    const investable =
      setup.recommendation === "BUY" || setup.recommendation === "WATCH";

    return {
      bias: setup.recommendation === "BUY" ? "Bullish" : "Neutral",
      score: investable ? setup.qualityScore : detection.confidence,
      notes: investable
        ? [
            `Magic Formula ${setup.recommendation} — Rank ${setup.magicFormulaRank}.`,
            `EY ${setup.earningsYield} · ROC ${setup.returnOnCapital} · EV ${setup.enterpriseValue}.`,
            `Quality ${setup.qualityScore} · Conviction ${setup.conviction} · Size ${setup.positionSize}.`,
          ]
        : setup.warnings.length > 0
          ? setup.warnings
          : detection.warnings.length > 0
            ? detection.warnings
            : detection.reasons,
      metrics: {
        detected: detection.detected ? 1 : 0,
        tradeValid: investable && setup.entry > 0 ? 1 : 0,
        qualityScore: setup.qualityScore,
        conviction: setup.conviction,
        magicFormulaRank: setup.magicFormulaRank,
        compositeRank: setup.compositeRank,
        earningsYield: setup.earningsYield,
        returnOnCapital: setup.returnOnCapital,
        enterpriseValue: setup.enterpriseValue,
        financialStrength: setup.financialStrength,
        entry: setup.entry,
        stopLoss: setup.stopLoss,
        target1: setup.target1,
        target2: setup.target2,
        finalTarget: setup.finalTarget,
        risk: setup.risk,
        reward: setup.reward,
        riskReward: setup.riskReward,
        confidence: detection.confidence,
      },
    };
  }

  override generateSignal(
    _context: StrategyExecutionContext,
    analysis: StrategyAnalysisResult
  ): StrategySignal["signal"] {
    const setup = this.lastSetup;
    if (!setup) return "IGNORE";
    if (setup.recommendation === "BUY" && analysis.metrics.tradeValid === 1) {
      return "BUY";
    }
    if (setup.recommendation === "WATCH") return "WATCHLIST";
    return "IGNORE";
  }

  override calculateEntry(
    _context?: StrategyExecutionContext,
    analysis?: StrategyAnalysisResult
  ): number {
    return analysis?.metrics.entry ?? this.lastSetup?.entry ?? 0;
  }

  override calculateStopLoss(
    _context?: StrategyExecutionContext,
    analysis?: StrategyAnalysisResult
  ): number {
    return analysis?.metrics.stopLoss ?? this.lastSetup?.stopLoss ?? 0;
  }

  override calculateTargets(
    _context?: StrategyExecutionContext,
    analysis?: StrategyAnalysisResult
  ): StrategyTargets {
    return {
      target1: analysis?.metrics.target1 ?? this.lastSetup?.target1 ?? 0,
      target2: analysis?.metrics.target2 ?? this.lastSetup?.target2 ?? 0,
      finalTarget:
        analysis?.metrics.finalTarget ?? this.lastSetup?.finalTarget ?? 0,
    };
  }

  override calculateConfidence(
    _context: StrategyExecutionContext,
    analysis: StrategyAnalysisResult
  ): number {
    return analysis.score;
  }

  override calculateRiskReward(
    entry: number,
    stopLoss: number,
    targets: StrategyTargets
  ): number {
    if (this.lastSetup && this.lastSetup.riskReward > 0) {
      return this.lastSetup.riskReward;
    }
    return super.calculateRiskReward(entry, stopLoss, targets);
  }

  override explain(
    _context: StrategyExecutionContext,
    analysis: StrategyAnalysisResult,
    signal: StrategySignal
  ): string[] {
    const setup = this.lastSetup;
    const lines = [...analysis.notes];
    if (setup) {
      lines.push(
        `MagicFormulaInvestmentSetup — ${setup.recommendation} · ${setup.expectedHoldingPeriod}.`
      );
      if (setup.institutionalScore) {
        lines.push(
          `Conviction ${setup.institutionalScore.grade} (${setup.institutionalScore.conviction}) · Signal ${setup.institutionalScore.signalGrade}.`
        );
      }
      if (setup.explainability?.summary?.length) {
        lines.push(...setup.explainability.summary);
      }
    }
    lines.push(`Framework signal ${signal.signal}.`);
    return lines;
  }
}

export function createMagicFormulaStrategyRegistration(
  config?: Partial<MagicFormulaConfig>
) {
  return {
    id: MAGIC_FORMULA_STRATEGY_ID,
    name: MAGIC_FORMULA_STRATEGY_NAME,
    category: "Position" as const,
    enabled: true,
    eligibilityId: MAGIC_FORMULA_STRATEGY_ID,
    version: "11B.3X",
    description:
      "Greenblatt Magic Formula — earnings yield and return on capital ranking.",
    create: () => new MagicFormulaStrategy(config),
  };
}

export function registerMagicFormulaStrategy(
  registry: {
    register: (
      r: ReturnType<typeof createMagicFormulaStrategyRegistration>
    ) => boolean;
  },
  config?: Partial<MagicFormulaConfig>
): boolean {
  return registry.register(createMagicFormulaStrategyRegistration(config));
}
