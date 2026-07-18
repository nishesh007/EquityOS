/**
 * News Momentum Strategy — Sprint 11B.3K.
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
  NEWS_MOMENTUM_STRATEGY_ID,
  NEWS_MOMENTUM_STRATEGY_NAME,
  type NewsMomentumConfig,
} from "./NewsMomentumConstants";
import { NewsMomentumDetector } from "./NewsMomentumDetector";
import { NewsMomentumTradeBuilder } from "./NewsMomentumTradeBuilder";
import type { NewsMomentumDetection } from "./NewsMomentumTypes";
import {
  isNewsMomentumStrategyInput,
  toNewsMomentumDetectionContext,
} from "./NewsMomentumTypes";
import {
  resolveNewsMomentumTradeConfig,
  type NewsMomentumTradeConfig,
  type NewsMomentumTradeSetup,
} from "./NewsMomentumTradeTypes";
import {
  createEmptyNewsMomentumDetection,
  newsQualityIndex,
  resolveNewsMomentumConfig,
} from "./NewsMomentumUtils";
import { NewsMomentumValidator } from "./NewsMomentumValidator";

export class NewsMomentumStrategy extends BaseStrategy {
  readonly id = NEWS_MOMENTUM_STRATEGY_ID;
  readonly name = NEWS_MOMENTUM_STRATEGY_NAME;
  readonly category = "Intraday" as const;
  readonly eligibilityId = NEWS_MOMENTUM_STRATEGY_ID;

  private readonly detector: NewsMomentumDetector;
  private readonly nmValidator: NewsMomentumValidator;
  private readonly tradeBuilder: NewsMomentumTradeBuilder;
  private readonly nmConfig: NewsMomentumConfig;
  private readonly tradeConfig: NewsMomentumTradeConfig;
  private lastDetection: NewsMomentumDetection | null = null;
  private lastTradeSetup: NewsMomentumTradeSetup | null = null;

  constructor(
    config?: Partial<NewsMomentumConfig>,
    tradeConfig?: Partial<NewsMomentumTradeConfig>
  ) {
    super();
    this.nmConfig = resolveNewsMomentumConfig(config);
    this.tradeConfig = resolveNewsMomentumTradeConfig(tradeConfig);
    this.detector = new NewsMomentumDetector(this.nmConfig);
    this.nmValidator = new NewsMomentumValidator(this.nmConfig);
    this.tradeBuilder = new NewsMomentumTradeBuilder(this.tradeConfig);
  }

  detect(context: StrategyExecutionContext): NewsMomentumDetection {
    const detectionContext = toNewsMomentumDetectionContext(context);
    if (!detectionContext) {
      const empty = createEmptyNewsMomentumDetection([
        "News Momentum market data missing on strategy input.",
      ]);
      this.lastDetection = empty;
      return empty;
    }
    const detection = this.detector.detect({
      ...detectionContext,
      config: this.nmConfig,
    });
    this.lastDetection = detection;
    return detection;
  }

  buildTradeSetup(
    context: StrategyExecutionContext
  ): NewsMomentumTradeSetup {
    const detection = this.lastDetection ?? this.detect(context);
    if (!isNewsMomentumStrategyInput(context.input)) {
      const rejected = this.tradeBuilder.build({
        detection,
        marketContext: context.marketContext,
        input: {
          symbol: context.input.symbol,
          lastPrice: context.input.lastPrice,
          newsMomentum: {
            candles5m: [],
            vwap: 0,
            atr: null,
            ema20: null,
            ema50: null,
            relativeVolume: null,
            newsEvents: [],
          },
        },
      });
      this.lastTradeSetup = rejected;
      return rejected;
    }

    const setup = this.tradeBuilder.build({
      detection,
      marketContext: context.marketContext,
      input: context.input,
      config: this.tradeConfig,
    });
    this.lastTradeSetup = setup;
    return setup;
  }

  getLastDetection(): NewsMomentumDetection | null {
    return this.lastDetection;
  }

  getLastTradeSetup(): NewsMomentumTradeSetup | null {
    return this.lastTradeSetup;
  }

  override validate(
    context: StrategyExecutionContext
  ): StrategyValidationResult {
    if (!isNewsMomentumStrategyInput(context.input)) {
      return this.failValidation([
        "News Momentum input requires candles5m / EMA / VWAP / newsEvents payload.",
      ]);
    }
    const detectionContext = toNewsMomentumDetectionContext(context);
    const result = this.nmValidator.validate(detectionContext);
    if (!result.valid) {
      return this.failValidation(result.errors, result.warnings);
    }
    return this.okValidation(result.warnings);
  }

  override analyze(context: StrategyExecutionContext): StrategyAnalysisResult {
    const detection = this.detect(context);
    const setup = this.buildTradeSetup(context);
    const tradeValid = setup.entry > 0 && setup.riskReward > 0;

    const bias =
      tradeValid && setup.detection.direction === "BUY"
        ? "Bullish"
        : tradeValid && setup.detection.direction === "SELL"
          ? "Bearish"
          : "Neutral";

    return {
      bias,
      score: tradeValid ? setup.qualityScore : detection.confidence,
      notes: tradeValid
        ? [
            `News Momentum trade constructed (${setup.detection.direction} · ${setup.catalystType}).`,
            `Entry ${setup.entry} · Stop ${setup.stopLoss} · RR ${setup.riskReward}.`,
            `Quality ${setup.qualityGrade} (${setup.qualityScore}).`,
          ]
        : setup.warnings.length > 0
          ? setup.warnings
          : detection.warnings.length > 0
            ? detection.warnings
            : detection.reasons,
      metrics: {
        detected: detection.detected ? 1 : 0,
        tradeValid: tradeValid ? 1 : 0,
        catalystStrength: setup.catalystStrength,
        newsQualityIndex: newsQualityIndex(detection.newsQuality),
        credibility: detection.credibility,
        impact: detection.impact,
        freshnessMinutes: detection.freshnessMinutes,
        entry: setup.entry,
        stopLoss: setup.stopLoss,
        target1: setup.target1,
        target2: setup.target2,
        finalTarget: setup.finalTarget,
        risk: setup.risk,
        reward: setup.reward,
        riskReward: setup.riskReward,
        qualityScore: setup.qualityScore,
        confidence: detection.confidence,
        conviction: setup.institutionalScore?.conviction ?? 0,
      },
    };
  }

  override generateSignal(
    _context: StrategyExecutionContext,
    analysis: StrategyAnalysisResult
  ): StrategySignal["signal"] {
    if (analysis.metrics.tradeValid !== 1) return "IGNORE";
    if (analysis.bias === "Bullish") return "BUY";
    if (analysis.bias === "Bearish") return "SELL";
    return "IGNORE";
  }

  override calculateEntry(
    _context?: StrategyExecutionContext,
    analysis?: StrategyAnalysisResult
  ): number {
    return analysis?.metrics.entry ?? this.lastTradeSetup?.entry ?? 0;
  }

  override calculateStopLoss(
    _context?: StrategyExecutionContext,
    analysis?: StrategyAnalysisResult
  ): number {
    return analysis?.metrics.stopLoss ?? this.lastTradeSetup?.stopLoss ?? 0;
  }

  override calculateTargets(
    _context?: StrategyExecutionContext,
    analysis?: StrategyAnalysisResult
  ): StrategyTargets {
    return {
      target1: analysis?.metrics.target1 ?? this.lastTradeSetup?.target1 ?? 0,
      target2: analysis?.metrics.target2 ?? this.lastTradeSetup?.target2 ?? 0,
      finalTarget:
        analysis?.metrics.finalTarget ?? this.lastTradeSetup?.finalTarget ?? 0,
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
    if (this.lastTradeSetup && this.lastTradeSetup.riskReward > 0) {
      return this.lastTradeSetup.riskReward;
    }
    return super.calculateRiskReward(entry, stopLoss, targets);
  }

  override explain(
    _context: StrategyExecutionContext,
    analysis: StrategyAnalysisResult,
    signal: StrategySignal
  ): string[] {
    const setup = this.lastTradeSetup;
    const lines = [...analysis.notes];
    if (setup && setup.entry > 0) {
      lines.push(
        `NewsMomentumTradeSetup ready — ${setup.positionType} · RR ${setup.riskReward}.`
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

export function createNewsMomentumStrategyRegistration(
  config?: Partial<NewsMomentumConfig>,
  tradeConfig?: Partial<NewsMomentumTradeConfig>
) {
  return {
    id: NEWS_MOMENTUM_STRATEGY_ID,
    name: NEWS_MOMENTUM_STRATEGY_NAME,
    category: "Intraday" as const,
    enabled: true,
    eligibilityId: NEWS_MOMENTUM_STRATEGY_ID,
    version: "11B.3K",
    description:
      "News Momentum — event-driven catalyst momentum with institutional scoring.",
    create: () => new NewsMomentumStrategy(config, tradeConfig),
  };
}

export function registerNewsMomentumStrategy(
  registry: {
    register: (
      r: ReturnType<typeof createNewsMomentumStrategyRegistration>
    ) => boolean;
  },
  config?: Partial<NewsMomentumConfig>,
  tradeConfig?: Partial<NewsMomentumTradeConfig>
): boolean {
  return registry.register(
    createNewsMomentumStrategyRegistration(config, tradeConfig)
  );
}
