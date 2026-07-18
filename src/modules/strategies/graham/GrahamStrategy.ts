/**
 * Graham Value Investing Strategy — Sprint 11B.3V.
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
  GRAHAM_STRATEGY_ID,
  GRAHAM_STRATEGY_NAME,
  type GrahamConfig,
} from "./GrahamConstants";
import {
  GrahamDetector,
  validateGrahamContext,
} from "./GrahamDetector";
import { GrahamTradeBuilder } from "./GrahamTradeBuilder";
import type {
  GrahamDetection,
  GrahamInvestmentSetup,
} from "./GrahamTypes";
import {
  isGrahamStrategyInput,
  toGrahamDetectionContext,
} from "./GrahamTypes";
import {
  createEmptyGrahamDetection,
  resolveGrahamConfig,
} from "./GrahamUtils";

export class GrahamStrategy extends BaseStrategy {
  readonly id = GRAHAM_STRATEGY_ID;
  readonly name = GRAHAM_STRATEGY_NAME;
  readonly category = "Position" as const;
  readonly eligibilityId = GRAHAM_STRATEGY_ID;

  private readonly detector: GrahamDetector;
  private readonly tradeBuilder: GrahamTradeBuilder;
  private readonly grahamConfig: GrahamConfig;
  private lastDetection: GrahamDetection | null = null;
  private lastSetup: GrahamInvestmentSetup | null = null;

  constructor(config?: Partial<GrahamConfig>) {
    super();
    this.grahamConfig = resolveGrahamConfig(config);
    this.detector = new GrahamDetector(this.grahamConfig);
    this.tradeBuilder = new GrahamTradeBuilder(this.grahamConfig);
  }

  detect(context: StrategyExecutionContext): GrahamDetection {
    const detectionContext = toGrahamDetectionContext(context);
    if (!detectionContext) {
      const empty = createEmptyGrahamDetection([
        "Graham market data missing on strategy input.",
      ]);
      this.lastDetection = empty;
      return empty;
    }
    const detection = this.detector.detect({
      ...detectionContext,
      config: this.grahamConfig,
    });
    this.lastDetection = detection;
    return detection;
  }

  buildInvestmentSetup(
    context: StrategyExecutionContext
  ): GrahamInvestmentSetup {
    const detection = this.lastDetection ?? this.detect(context);
    if (!isGrahamStrategyInput(context.input)) {
      const rejected = this.tradeBuilder.build({
        detection,
        marketContext: context.marketContext,
        input: {
          symbol: context.input.symbol,
          lastPrice: context.input.lastPrice,
          graham: {
            financialHistory: [],
            current: {
              currentPrice: context.input.lastPrice,
              intrinsicValueEstimate: 0,
              bookValue: 0,
              tangibleBookValue: 0,
              currentAssets: 0,
              currentLiabilities: 1,
              totalAssets: 0,
              totalLiabilities: 1,
              workingCapital: -1,
              cash: 0,
              debt: 1,
              debtEquity: 2,
              currentRatio: 0.5,
              quickRatio: 0.3,
              interestCoverage: 0,
              operatingCashFlow: -1,
              freeCashFlow: -1,
              pe: null,
              pb: null,
              evEbitda: null,
              marketCap: 0,
              promoterHolding: 0,
              institutionalHolding: 0,
              dividendHistoryYears: 0,
              governanceRedFlags: true,
              accountingConcerns: true,
              corporateGovernanceScore: 0,
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
      config: this.grahamConfig,
    });
    this.lastSetup = setup;
    return setup;
  }

  getLastDetection(): GrahamDetection | null {
    return this.lastDetection;
  }

  getLastInvestmentSetup(): GrahamInvestmentSetup | null {
    return this.lastSetup;
  }

  getLastTradeSetup(): GrahamInvestmentSetup | null {
    return this.lastSetup;
  }

  override validate(
    context: StrategyExecutionContext
  ): StrategyValidationResult {
    if (!isGrahamStrategyInput(context.input)) {
      return this.failValidation([
        "Graham input requires multi-year financials / balance sheet payload.",
      ]);
    }
    const detectionContext = toGrahamDetectionContext(context);
    const result = validateGrahamContext(
      detectionContext,
      this.grahamConfig
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
    const bias =
      setup.recommendation === "BUY"
        ? "Bullish"
        : setup.recommendation === "WATCH"
          ? "Neutral"
          : "Neutral";

    return {
      bias,
      score: investable ? setup.qualityScore : detection.confidence,
      notes: investable
        ? [
            `Graham ${setup.recommendation} — MoS ${setup.marginOfSafety}.`,
            `IV ${setup.intrinsicValue} · Price ${setup.currentPrice} · Discount ${setup.discountPercent}%.`,
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
        marginOfSafety: setup.marginOfSafety,
        discountPercent: setup.discountPercent,
        upsidePotential: setup.upsidePotential,
        intrinsicValue: setup.intrinsicValue,
        currentPrice: setup.currentPrice,
        financialStrength: setup.financialStrength,
        balanceSheetScore: setup.balanceSheetScore,
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
        `GrahamInvestmentSetup — ${setup.recommendation} · ${setup.expectedHoldingPeriod}.`
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

export function createGrahamStrategyRegistration(
  config?: Partial<GrahamConfig>
) {
  return {
    id: GRAHAM_STRATEGY_ID,
    name: GRAHAM_STRATEGY_NAME,
    category: "Position" as const,
    enabled: true,
    eligibilityId: GRAHAM_STRATEGY_ID,
    version: "11B.3V",
    description:
      "Graham Value Investing — deep value, margin of safety, strong balance sheet.",
    create: () => new GrahamStrategy(config),
  };
}

export function registerGrahamStrategy(
  registry: {
    register: (
      r: ReturnType<typeof createGrahamStrategyRegistration>
    ) => boolean;
  },
  config?: Partial<GrahamConfig>
): boolean {
  return registry.register(createGrahamStrategyRegistration(config));
}
