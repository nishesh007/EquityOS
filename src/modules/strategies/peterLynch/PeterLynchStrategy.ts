/**
 * Peter Lynch GARP Strategy — Sprint 11B.3W.
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
  PETER_LYNCH_STRATEGY_ID,
  PETER_LYNCH_STRATEGY_NAME,
  type PeterLynchConfig,
} from "./PeterLynchConstants";
import {
  PeterLynchDetector,
  validatePeterLynchContext,
} from "./PeterLynchDetector";
import { PeterLynchTradeBuilder } from "./PeterLynchTradeBuilder";
import type {
  PeterLynchDetection,
  PeterLynchInvestmentSetup,
} from "./PeterLynchTypes";
import {
  isPeterLynchStrategyInput,
  toPeterLynchDetectionContext,
} from "./PeterLynchTypes";
import {
  createEmptyPeterLynchDetection,
  resolvePeterLynchConfig,
} from "./PeterLynchUtils";

export class PeterLynchStrategy extends BaseStrategy {
  readonly id = PETER_LYNCH_STRATEGY_ID;
  readonly name = PETER_LYNCH_STRATEGY_NAME;
  readonly category = "Position" as const;
  readonly eligibilityId = PETER_LYNCH_STRATEGY_ID;

  private readonly detector: PeterLynchDetector;
  private readonly tradeBuilder: PeterLynchTradeBuilder;
  private readonly lynchConfig: PeterLynchConfig;
  private lastDetection: PeterLynchDetection | null = null;
  private lastSetup: PeterLynchInvestmentSetup | null = null;

  constructor(config?: Partial<PeterLynchConfig>) {
    super();
    this.lynchConfig = resolvePeterLynchConfig(config);
    this.detector = new PeterLynchDetector(this.lynchConfig);
    this.tradeBuilder = new PeterLynchTradeBuilder(this.lynchConfig);
  }

  detect(context: StrategyExecutionContext): PeterLynchDetection {
    const detectionContext = toPeterLynchDetectionContext(context);
    if (!detectionContext) {
      const empty = createEmptyPeterLynchDetection([
        "Peter Lynch market data missing on strategy input.",
      ]);
      this.lastDetection = empty;
      return empty;
    }
    const detection = this.detector.detect({
      ...detectionContext,
      config: this.lynchConfig,
    });
    this.lastDetection = detection;
    return detection;
  }

  buildInvestmentSetup(
    context: StrategyExecutionContext
  ): PeterLynchInvestmentSetup {
    const detection = this.lastDetection ?? this.detect(context);
    if (!isPeterLynchStrategyInput(context.input)) {
      const rejected = this.tradeBuilder.build({
        detection,
        marketContext: context.marketContext,
        input: {
          symbol: context.input.symbol,
          lastPrice: context.input.lastPrice,
          peterLynch: {
            financialHistory: [],
            current: {
              currentPrice: context.input.lastPrice,
              intrinsicValueEstimate: 0,
              pe: null,
              peg: null,
              pb: null,
              evEbitda: null,
              dividendYield: 0,
              roe: 0,
              roce: 0,
              roic: 0,
              debtEquity: 2,
              currentRatio: 0.5,
              interestCoverage: 0,
              grossMargin: 0,
              operatingMargin: 0,
              netMargin: 0,
              freeCashFlow: -1,
              operatingCashFlow: -1,
              marketCap: 0,
              institutionalHolding: 0,
              promoterHolding: 0,
              promoterPledge: 1,
              sector: "Unknown",
              industry: "Unknown",
              corporateGovernanceScore: 0,
              analystGrowthEstimate: 0,
              governanceRedFlags: true,
              accountingConcerns: true,
            },
            business: {
              scalableBusiness: 0,
              marketOpportunity: 0,
              competitivePosition: 0,
              brandStrength: 0,
              productLeadership: 0,
              innovation: 0,
              customerRetention: 0,
              recurringRevenue: 0,
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
      config: this.lynchConfig,
    });
    this.lastSetup = setup;
    return setup;
  }

  getLastDetection(): PeterLynchDetection | null {
    return this.lastDetection;
  }

  getLastInvestmentSetup(): PeterLynchInvestmentSetup | null {
    return this.lastSetup;
  }

  getLastTradeSetup(): PeterLynchInvestmentSetup | null {
    return this.lastSetup;
  }

  override validate(
    context: StrategyExecutionContext
  ): StrategyValidationResult {
    if (!isPeterLynchStrategyInput(context.input)) {
      return this.failValidation([
        "Peter Lynch input requires growth / PEG / business payload.",
      ]);
    }
    const detectionContext = toPeterLynchDetectionContext(context);
    const result = validatePeterLynchContext(
      detectionContext,
      this.lynchConfig
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
            `Lynch ${setup.recommendation} — PEG ${setup.pegRatio}.`,
            `Growth ${setup.growthRate} · Rev CAGR ${setup.revenueCagr} · EPS CAGR ${setup.epsCagr}.`,
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
        pegRatio: setup.pegRatio,
        growthRate: setup.growthRate,
        revenueCagr: setup.revenueCagr,
        epsCagr: setup.epsCagr,
        intrinsicValue: setup.intrinsicValue,
        businessQuality: setup.businessQuality,
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
        `PeterLynchInvestmentSetup — ${setup.recommendation} · ${setup.expectedHoldingPeriod}.`
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

export function createPeterLynchStrategyRegistration(
  config?: Partial<PeterLynchConfig>
) {
  return {
    id: PETER_LYNCH_STRATEGY_ID,
    name: PETER_LYNCH_STRATEGY_NAME,
    category: "Position" as const,
    enabled: true,
    eligibilityId: PETER_LYNCH_STRATEGY_ID,
    version: "11B.3W",
    description:
      "Peter Lynch GARP — growth at a reasonable price with PEG and scalable businesses.",
    create: () => new PeterLynchStrategy(config),
  };
}

export function registerPeterLynchStrategy(
  registry: {
    register: (
      r: ReturnType<typeof createPeterLynchStrategyRegistration>
    ) => boolean;
  },
  config?: Partial<PeterLynchConfig>
): boolean {
  return registry.register(createPeterLynchStrategyRegistration(config));
}
