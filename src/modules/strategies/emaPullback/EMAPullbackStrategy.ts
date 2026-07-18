/**
 * EMA Pullback Strategy — Sprint 11B.3P.
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
  EMA_PULLBACK_STRATEGY_ID,
  EMA_PULLBACK_STRATEGY_NAME,
  type EMAPullbackConfig,
} from "./EMAPullbackConstants";
import { EMAPullbackDetector } from "./EMAPullbackDetector";
import { EMAPullbackTradeBuilder } from "./EMAPullbackTradeBuilder";
import type { EMAPullbackDetection } from "./EMAPullbackTypes";
import {
  isEMAPullbackStrategyInput,
  toEMAPullbackDetectionContext,
} from "./EMAPullbackTypes";
import {
  resolveEMAPullbackTradeConfig,
  type EMAPullbackTradeConfig,
  type EMAPullbackTradeSetup,
} from "./EMAPullbackTradeTypes";
import {
  createEmptyEMAPullbackDetection,
  resolveEMAPullbackConfig,
} from "./EMAPullbackUtils";
import { EMAPullbackValidator } from "./EMAPullbackValidator";

export class EMAPullbackStrategy extends BaseStrategy {
  readonly id = EMA_PULLBACK_STRATEGY_ID;
  readonly name = EMA_PULLBACK_STRATEGY_NAME;
  readonly category = "Swing" as const;
  readonly eligibilityId = EMA_PULLBACK_STRATEGY_ID;

  private readonly detector: EMAPullbackDetector;
  private readonly epValidator: EMAPullbackValidator;
  private readonly tradeBuilder: EMAPullbackTradeBuilder;
  private readonly epConfig: EMAPullbackConfig;
  private readonly tradeConfig: EMAPullbackTradeConfig;
  private lastDetection: EMAPullbackDetection | null = null;
  private lastTradeSetup: EMAPullbackTradeSetup | null = null;

  constructor(
    config?: Partial<EMAPullbackConfig>,
    tradeConfig?: Partial<EMAPullbackTradeConfig>
  ) {
    super();
    this.epConfig = resolveEMAPullbackConfig(config);
    this.tradeConfig = resolveEMAPullbackTradeConfig(tradeConfig);
    this.detector = new EMAPullbackDetector(this.epConfig);
    this.epValidator = new EMAPullbackValidator(this.epConfig);
    this.tradeBuilder = new EMAPullbackTradeBuilder(this.tradeConfig);
  }

  detect(context: StrategyExecutionContext): EMAPullbackDetection {
    const detectionContext = toEMAPullbackDetectionContext(context);
    if (!detectionContext) {
      const empty = createEmptyEMAPullbackDetection([
        "EMA Pullback market data missing on strategy input.",
      ]);
      this.lastDetection = empty;
      return empty;
    }
    const detection = this.detector.detect({
      ...detectionContext,
      config: this.epConfig,
    });
    this.lastDetection = detection;
    return detection;
  }

  buildTradeSetup(context: StrategyExecutionContext): EMAPullbackTradeSetup {
    const detection = this.lastDetection ?? this.detect(context);
    if (!isEMAPullbackStrategyInput(context.input)) {
      const rejected = this.tradeBuilder.build({
        detection,
        marketContext: context.marketContext,
        input: {
          symbol: context.input.symbol,
          lastPrice: context.input.lastPrice,
          emaPullback: {
            candlesDaily: [],
            vwap: 0,
            atr: null,
            ema20: null,
            ema50: null,
            ema100: null,
            ema200: null,
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

  getLastDetection(): EMAPullbackDetection | null {
    return this.lastDetection;
  }

  getLastTradeSetup(): EMAPullbackTradeSetup | null {
    return this.lastTradeSetup;
  }

  override validate(
    context: StrategyExecutionContext
  ): StrategyValidationResult {
    if (!isEMAPullbackStrategyInput(context.input)) {
      return this.failValidation([
        "EMA Pullback input requires candlesDaily / EMA / ATR / VWAP payload.",
      ]);
    }
    const detectionContext = toEMAPullbackDetectionContext(context);
    const result = this.epValidator.validate(detectionContext);
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
            `EMA Pullback trade constructed (${setup.pullbackType}).`,
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
        pullbackType:
          setup.pullbackType === "ema20"
            ? 20
            : setup.pullbackType === "ema50"
              ? 50
              : setup.pullbackType === "vwap"
                ? 1
                : 0,
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
        conviction:
          setup.conviction || setup.institutionalScore?.conviction || 0,
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
        `EMAPullbackTradeSetup ready — ${setup.positionType} · RR ${setup.riskReward}.`
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

export function createEMAPullbackStrategyRegistration(
  config?: Partial<EMAPullbackConfig>,
  tradeConfig?: Partial<EMAPullbackTradeConfig>
) {
  return {
    id: EMA_PULLBACK_STRATEGY_ID,
    name: EMA_PULLBACK_STRATEGY_NAME,
    category: "Swing" as const,
    enabled: true,
    eligibilityId: EMA_PULLBACK_STRATEGY_ID,
    version: "11B.3P",
    description:
      "EMA Pullback — institutional trend pullback continuation with EMA/VWAP entries.",
    create: () => new EMAPullbackStrategy(config, tradeConfig),
  };
}

export function registerEMAPullbackStrategy(
  registry: {
    register: (
      r: ReturnType<typeof createEMAPullbackStrategyRegistration>
    ) => boolean;
  },
  config?: Partial<EMAPullbackConfig>,
  tradeConfig?: Partial<EMAPullbackTradeConfig>
): boolean {
  return registry.register(
    createEMAPullbackStrategyRegistration(config, tradeConfig)
  );
}
