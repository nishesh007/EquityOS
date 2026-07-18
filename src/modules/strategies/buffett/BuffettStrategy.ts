/**
 * Buffett Quality Investing Strategy — Sprint 11B.3U.
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
  BUFFETT_STRATEGY_ID,
  BUFFETT_STRATEGY_NAME,
  type BuffettConfig,
} from "./BuffettConstants";
import {
  BuffettDetector,
  validateBuffettContext,
} from "./BuffettDetector";
import { BuffettTradeBuilder } from "./BuffettTradeBuilder";
import type {
  BuffettDetection,
  BuffettInvestmentSetup,
} from "./BuffettTypes";
import {
  isBuffettStrategyInput,
  toBuffettDetectionContext,
} from "./BuffettTypes";
import {
  createEmptyBuffettDetection,
  resolveBuffettConfig,
} from "./BuffettUtils";

export class BuffettStrategy extends BaseStrategy {
  readonly id = BUFFETT_STRATEGY_ID;
  readonly name = BUFFETT_STRATEGY_NAME;
  readonly category = "Position" as const;
  readonly eligibilityId = BUFFETT_STRATEGY_ID;

  private readonly detector: BuffettDetector;
  private readonly tradeBuilder: BuffettTradeBuilder;
  private readonly buffettConfig: BuffettConfig;
  private lastDetection: BuffettDetection | null = null;
  private lastSetup: BuffettInvestmentSetup | null = null;

  constructor(config?: Partial<BuffettConfig>) {
    super();
    this.buffettConfig = resolveBuffettConfig(config);
    this.detector = new BuffettDetector(this.buffettConfig);
    this.tradeBuilder = new BuffettTradeBuilder(this.buffettConfig);
  }

  detect(context: StrategyExecutionContext): BuffettDetection {
    const detectionContext = toBuffettDetectionContext(context);
    if (!detectionContext) {
      const empty = createEmptyBuffettDetection([
        "Buffett market data missing on strategy input.",
      ]);
      this.lastDetection = empty;
      return empty;
    }
    const detection = this.detector.detect({
      ...detectionContext,
      config: this.buffettConfig,
    });
    this.lastDetection = detection;
    return detection;
  }

  buildInvestmentSetup(
    context: StrategyExecutionContext
  ): BuffettInvestmentSetup {
    const detection = this.lastDetection ?? this.detect(context);
    if (!isBuffettStrategyInput(context.input)) {
      const rejected = this.tradeBuilder.build({
        detection,
        marketContext: context.marketContext,
        input: {
          symbol: context.input.symbol,
          lastPrice: context.input.lastPrice,
          buffett: {
            financialHistory: [],
            current: {
              currentPrice: context.input.lastPrice,
              intrinsicValueEstimate: 0,
              roe: 0,
              roce: 0,
              roic: 0,
              debtEquity: 1,
              currentRatio: 0,
              interestCoverage: 0,
              grossMargin: 0,
              operatingMargin: 0,
              netMargin: 0,
              bookValue: 0,
              pe: null,
              pb: null,
              evEbitda: null,
              fcfYield: 0,
              promoterHolding: 0,
              promoterPledge: 1,
              institutionalHolding: 0,
              sector: "Unknown",
              industry: "Unknown",
            },
            moat: {
              brandStrength: 0,
              networkEffects: 0,
              switchingCosts: 0,
              costLeadership: 0,
              patents: 0,
              distributionAdvantage: 0,
              marketShare: 0,
              pricingPower: 0,
              recurringRevenue: 0,
              industryLeadership: 0,
            },
            management: {
              capitalAllocation: 0,
              corporateGovernance: 0,
              promoterIntegrity: 0,
              shareholderFriendliness: 0,
              dividendPolicy: 0,
              buybackQuality: 0,
              accountingQuality: 0,
              relatedPartyRisk: 100,
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
      config: this.buffettConfig,
    });
    this.lastSetup = setup;
    return setup;
  }

  getLastDetection(): BuffettDetection | null {
    return this.lastDetection;
  }

  getLastInvestmentSetup(): BuffettInvestmentSetup | null {
    return this.lastSetup;
  }

  /** Alias for framework callers expecting trade setup naming. */
  getLastTradeSetup(): BuffettInvestmentSetup | null {
    return this.lastSetup;
  }

  override validate(
    context: StrategyExecutionContext
  ): StrategyValidationResult {
    if (!isBuffettStrategyInput(context.input)) {
      return this.failValidation([
        "Buffett input requires multi-year financials / moat / management payload.",
      ]);
    }
    const detectionContext = toBuffettDetectionContext(context);
    const result = validateBuffettContext(
      detectionContext,
      this.buffettConfig
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
      setup.recommendation === "BUY" || setup.recommendation === "HOLD";
    const bias =
      setup.recommendation === "BUY"
        ? "Bullish"
        : setup.recommendation === "HOLD"
          ? "Neutral"
          : "Neutral";

    return {
      bias,
      score: investable ? setup.qualityScore : detection.confidence,
      notes: investable
        ? [
            `Buffett ${setup.recommendation} — ${setup.economicMoat}.`,
            `IV ${setup.intrinsicValue} · Price ${setup.currentPrice} · MoS ${setup.marginOfSafety}.`,
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
        intrinsicValue: setup.intrinsicValue,
        currentPrice: setup.currentPrice,
        businessQuality: setup.businessQuality,
        financialStrength: setup.financialStrength,
        managementQuality: setup.managementQuality,
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
    if (setup.recommendation === "HOLD") return "WATCHLIST";
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
        `BuffettInvestmentSetup — ${setup.recommendation} · ${setup.expectedHoldingPeriod}.`
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

export function createBuffettStrategyRegistration(
  config?: Partial<BuffettConfig>
) {
  return {
    id: BUFFETT_STRATEGY_ID,
    name: BUFFETT_STRATEGY_NAME,
    category: "Position" as const,
    enabled: true,
    eligibilityId: BUFFETT_STRATEGY_ID,
    version: "11B.3U",
    description:
      "Buffett Quality Investing — durable moat, financial strength, management quality and margin of safety.",
    create: () => new BuffettStrategy(config),
  };
}

export function registerBuffettStrategy(
  registry: {
    register: (
      r: ReturnType<typeof createBuffettStrategyRegistration>
    ) => boolean;
  },
  config?: Partial<BuffettConfig>
): boolean {
  return registry.register(createBuffettStrategyRegistration(config));
}
