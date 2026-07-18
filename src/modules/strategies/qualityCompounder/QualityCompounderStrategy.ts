/**
 * Quality Compounder Strategy — Sprint 11B.3Y.
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
  QUALITY_COMPOUNDER_STRATEGY_ID,
  QUALITY_COMPOUNDER_STRATEGY_NAME,
  type QualityCompounderConfig,
} from "./QualityCompounderConstants";
import {
  QualityCompounderDetector,
  validateQualityCompounderContext,
} from "./QualityCompounderDetector";
import { QualityCompounderTradeBuilder } from "./QualityCompounderTradeBuilder";
import type {
  QualityCompounderDetection,
  QualityCompounderInvestmentSetup,
} from "./QualityCompounderTypes";
import {
  isQualityCompounderStrategyInput,
  toQualityCompounderDetectionContext,
} from "./QualityCompounderTypes";
import {
  createEmptyQualityCompounderDetection,
  resolveQualityCompounderConfig,
} from "./QualityCompounderUtils";

export class QualityCompounderStrategy extends BaseStrategy {
  readonly id = QUALITY_COMPOUNDER_STRATEGY_ID;
  readonly name = QUALITY_COMPOUNDER_STRATEGY_NAME;
  readonly category = "Position" as const;
  readonly eligibilityId = QUALITY_COMPOUNDER_STRATEGY_ID;

  private readonly detector: QualityCompounderDetector;
  private readonly tradeBuilder: QualityCompounderTradeBuilder;
  private readonly compounderConfig: QualityCompounderConfig;
  private lastDetection: QualityCompounderDetection | null = null;
  private lastSetup: QualityCompounderInvestmentSetup | null = null;

  constructor(config?: Partial<QualityCompounderConfig>) {
    super();
    this.compounderConfig = resolveQualityCompounderConfig(config);
    this.detector = new QualityCompounderDetector(this.compounderConfig);
    this.tradeBuilder = new QualityCompounderTradeBuilder(this.compounderConfig);
  }

  detect(context: StrategyExecutionContext): QualityCompounderDetection {
    const detectionContext = toQualityCompounderDetectionContext(context);
    if (!detectionContext) {
      const empty = createEmptyQualityCompounderDetection([
        "Quality Compounder market data missing on strategy input.",
      ]);
      this.lastDetection = empty;
      return empty;
    }
    const detection = this.detector.detect({
      ...detectionContext,
      config: this.compounderConfig,
    });
    this.lastDetection = detection;
    return detection;
  }

  buildInvestmentSetup(
    context: StrategyExecutionContext
  ): QualityCompounderInvestmentSetup {
    const detection = this.lastDetection ?? this.detect(context);
    if (!isQualityCompounderStrategyInput(context.input)) {
      const rejected = this.tradeBuilder.build({
        detection,
        marketContext: context.marketContext,
        input: {
          symbol: context.input.symbol,
          lastPrice: context.input.lastPrice,
          qualityCompounder: {
            financialHistory: [],
            current: {
              currentPrice: context.input.lastPrice,
              intrinsicValueEstimate: 0,
              pe: null,
              pb: null,
              peg: null,
              evEbitda: null,
              fcfYield: 0,
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
              freeCashFlow: -1,
              operatingCashFlow: -1,
              dividendHistoryYears: 0,
              shareBuybacks: false,
              promoterHolding: 0,
              promoterPledge: 1,
              institutionalHolding: 0,
              sector: "Unknown",
              industry: "Unknown",
              corporateGovernanceScore: 0,
              marketShare: 0,
              analystGrowthEstimate: 0,
              governanceRedFlags: true,
              accountingConcerns: true,
              businessDisruption: true,
            },
            business: {
              businessSimplicity: 0,
              businessPredictability: 0,
              recurringRevenue: 0,
              pricingPower: 0,
              brandStrength: 0,
              distributionNetwork: 0,
              customerStickiness: 0,
              marketLeadership: 0,
              scalability: 0,
              industryPosition: 0,
            },
            moat: {
              brand: 0,
              networkEffects: 0,
              switchingCosts: 0,
              costAdvantage: 0,
              patents: 0,
              distribution: 0,
              technology: 0,
              regulatoryAdvantage: 0,
              scaleAdvantage: 0,
              recurringCustomers: 0,
            },
            management: {
              integrity: 0,
              capitalAllocation: 0,
              governance: 0,
              promoterQuality: 0,
              accountingQuality: 0,
              shareholderAlignment: 0,
              communication: 0,
              executionTrackRecord: 0,
            },
            capital: {
              roic: 0,
              reinvestmentRate: 0,
              buybackQuality: 0,
              dividendPolicy: 0,
              acquisitionHistory: 0,
              debtManagement: 0,
              cashAllocation: 0,
              shareDilutionRisk: 100,
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
      config: this.compounderConfig,
    });
    this.lastSetup = setup;
    return setup;
  }

  getLastDetection(): QualityCompounderDetection | null {
    return this.lastDetection;
  }

  getLastInvestmentSetup(): QualityCompounderInvestmentSetup | null {
    return this.lastSetup;
  }

  getLastTradeSetup(): QualityCompounderInvestmentSetup | null {
    return this.lastSetup;
  }

  override validate(
    context: StrategyExecutionContext
  ): StrategyValidationResult {
    if (!isQualityCompounderStrategyInput(context.input)) {
      return this.failValidation([
        "Quality Compounder input requires multi-year financials / moat / management / capital payload.",
      ]);
    }
    const detectionContext = toQualityCompounderDetectionContext(context);
    const result = validateQualityCompounderContext(
      detectionContext,
      this.compounderConfig
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
      setup.recommendation === "BUY" ||
      setup.recommendation === "HOLD" ||
      setup.recommendation === "WATCH";
    const bias =
      setup.recommendation === "BUY"
        ? "Bullish"
        : setup.recommendation === "HOLD" || setup.recommendation === "WATCH"
          ? "Neutral"
          : "Neutral";

    return {
      bias,
      score: investable ? setup.qualityScore : detection.confidence,
      notes: investable
        ? [
            `Quality Compounder ${setup.recommendation} — ${setup.economicMoat}.`,
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
        capitalAllocation: setup.capitalAllocation,
        growthSustainability: setup.growthSustainability,
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
        `QualityCompounderInvestmentSetup — ${setup.recommendation} · ${setup.suggestedHoldingPeriod}.`
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

export function createQualityCompounderStrategyRegistration(
  config?: Partial<QualityCompounderConfig>
) {
  return {
    id: QUALITY_COMPOUNDER_STRATEGY_ID,
    name: QUALITY_COMPOUNDER_STRATEGY_NAME,
    category: "Position" as const,
    enabled: true,
    eligibilityId: QUALITY_COMPOUNDER_STRATEGY_ID,
    version: "11B.3Y",
    description:
      "Quality Compounder — durable moat, capital allocation, financial strength and long-term compounding.",
    create: () => new QualityCompounderStrategy(config),
  };
}

export function registerQualityCompounderStrategy(
  registry: {
    register: (
      r: ReturnType<typeof createQualityCompounderStrategyRegistration>
    ) => boolean;
  },
  config?: Partial<QualityCompounderConfig>
): boolean {
  return registry.register(createQualityCompounderStrategyRegistration(config));
}
