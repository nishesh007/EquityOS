/**
 * Momentum Continuation Strategy — Sprint 11B.3F.
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
  MOMENTUM_CONTINUATION_STRATEGY_ID,
  MOMENTUM_CONTINUATION_STRATEGY_NAME,
  type MomentumContinuationConfig,
} from "./MomentumContinuationConstants";
import { MomentumContinuationDetector } from "./MomentumContinuationDetector";
import { MomentumContinuationTradeBuilder } from "./MomentumContinuationTradeBuilder";
import type { MomentumContinuationDetection } from "./MomentumContinuationTypes";
import {
  isMomentumContinuationStrategyInput,
  toMomentumContinuationDetectionContext,
} from "./MomentumContinuationTypes";
import {
  resolveMomentumContinuationTradeConfig,
  type MomentumContinuationTradeConfig,
  type MomentumContinuationTradeSetup,
} from "./MomentumContinuationTradeTypes";
import {
  createEmptyMomentumContinuationDetection,
  resolveMomentumContinuationConfig,
} from "./MomentumContinuationUtils";
import { MomentumContinuationValidator } from "./MomentumContinuationValidator";

export class MomentumContinuationStrategy extends BaseStrategy {
  readonly id = MOMENTUM_CONTINUATION_STRATEGY_ID;
  readonly name = MOMENTUM_CONTINUATION_STRATEGY_NAME;
  readonly category = "Scalp" as const;
  readonly eligibilityId = MOMENTUM_CONTINUATION_STRATEGY_ID;

  private readonly detector: MomentumContinuationDetector;
  private readonly mcValidator: MomentumContinuationValidator;
  private readonly tradeBuilder: MomentumContinuationTradeBuilder;
  private readonly mcConfig: MomentumContinuationConfig;
  private readonly tradeConfig: MomentumContinuationTradeConfig;
  private lastDetection: MomentumContinuationDetection | null = null;
  private lastTradeSetup: MomentumContinuationTradeSetup | null = null;

  constructor(
    config?: Partial<MomentumContinuationConfig>,
    tradeConfig?: Partial<MomentumContinuationTradeConfig>
  ) {
    super();
    this.mcConfig = resolveMomentumContinuationConfig(config);
    this.tradeConfig = resolveMomentumContinuationTradeConfig(tradeConfig);
    this.detector = new MomentumContinuationDetector(this.mcConfig);
    this.mcValidator = new MomentumContinuationValidator(this.mcConfig);
    this.tradeBuilder = new MomentumContinuationTradeBuilder(this.tradeConfig);
  }

  detect(context: StrategyExecutionContext): MomentumContinuationDetection {
    const detectionContext = toMomentumContinuationDetectionContext(context);
    if (!detectionContext) {
      const empty = createEmptyMomentumContinuationDetection([
        "Momentum Continuation market data missing on strategy input.",
      ]);
      this.lastDetection = empty;
      return empty;
    }
    const detection = this.detector.detect({
      ...detectionContext,
      config: this.mcConfig,
    });
    this.lastDetection = detection;
    return detection;
  }

  buildTradeSetup(
    context: StrategyExecutionContext
  ): MomentumContinuationTradeSetup {
    const detection = this.lastDetection ?? this.detect(context);
    if (!isMomentumContinuationStrategyInput(context.input)) {
      const rejected = this.tradeBuilder.build({
        detection,
        marketContext: context.marketContext,
        input: {
          symbol: context.input.symbol,
          lastPrice: context.input.lastPrice,
          momentumContinuation: {
            candles5m: [],
            vwap: 0,
            atr: null,
            ema20: null,
            ema50: null,
            relativeVolume: null,
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

  getLastDetection(): MomentumContinuationDetection | null {
    return this.lastDetection;
  }

  getLastTradeSetup(): MomentumContinuationTradeSetup | null {
    return this.lastTradeSetup;
  }

  override validate(
    context: StrategyExecutionContext
  ): StrategyValidationResult {
    if (!isMomentumContinuationStrategyInput(context.input)) {
      return this.failValidation([
        "Momentum Continuation input requires candles5m / EMA / VWAP payload.",
      ]);
    }
    const detectionContext = toMomentumContinuationDetectionContext(context);
    const result = this.mcValidator.validate(detectionContext);
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
            `Momentum Continuation trade constructed (${setup.detection.direction}).`,
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
        trendStrength: detection.trendStrength,
        pullbackDepth: detection.pullbackDepth,
        adx: detection.adx,
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
        `MomentumContinuationTradeSetup ready — ${setup.positionType} · RR ${setup.riskReward}.`
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

export function createMomentumContinuationStrategyRegistration(
  config?: Partial<MomentumContinuationConfig>,
  tradeConfig?: Partial<MomentumContinuationTradeConfig>
) {
  return {
    id: MOMENTUM_CONTINUATION_STRATEGY_ID,
    name: MOMENTUM_CONTINUATION_STRATEGY_NAME,
    category: "Scalp" as const,
    enabled: true,
    eligibilityId: MOMENTUM_CONTINUATION_STRATEGY_ID,
    version: "11B.3F",
    description:
      "Momentum Continuation — trend pullback resumption with institutional scoring.",
    create: () => new MomentumContinuationStrategy(config, tradeConfig),
  };
}

export function registerMomentumContinuationStrategy(
  registry: {
    register: (
      r: ReturnType<typeof createMomentumContinuationStrategyRegistration>
    ) => boolean;
  },
  config?: Partial<MomentumContinuationConfig>,
  tradeConfig?: Partial<MomentumContinuationTradeConfig>
): boolean {
  return registry.register(
    createMomentumContinuationStrategyRegistration(config, tradeConfig)
  );
}
