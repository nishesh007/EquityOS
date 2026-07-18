/**
 * Cup & Handle Strategy — Sprint 11B.3Q.
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
  CUP_HANDLE_STRATEGY_ID,
  CUP_HANDLE_STRATEGY_NAME,
  type CupHandleConfig,
} from "./CupHandleConstants";
import { CupHandleDetector } from "./CupHandleDetector";
import { CupHandleTradeBuilder } from "./CupHandleTradeBuilder";
import type { CupHandleDetection } from "./CupHandleTypes";
import {
  isCupHandleStrategyInput,
  toCupHandleDetectionContext,
} from "./CupHandleTypes";
import {
  resolveCupHandleTradeConfig,
  type CupHandleTradeConfig,
  type CupHandleTradeSetup,
} from "./CupHandleTradeTypes";
import {
  createEmptyCupHandleDetection,
  resolveCupHandleConfig,
} from "./CupHandleUtils";
import { CupHandleValidator } from "./CupHandleValidator";

export class CupHandleStrategy extends BaseStrategy {
  readonly id = CUP_HANDLE_STRATEGY_ID;
  readonly name = CUP_HANDLE_STRATEGY_NAME;
  readonly category = "Swing" as const;
  readonly eligibilityId = CUP_HANDLE_STRATEGY_ID;

  private readonly detector: CupHandleDetector;
  private readonly chValidator: CupHandleValidator;
  private readonly tradeBuilder: CupHandleTradeBuilder;
  private readonly chConfig: CupHandleConfig;
  private readonly tradeConfig: CupHandleTradeConfig;
  private lastDetection: CupHandleDetection | null = null;
  private lastTradeSetup: CupHandleTradeSetup | null = null;

  constructor(
    config?: Partial<CupHandleConfig>,
    tradeConfig?: Partial<CupHandleTradeConfig>
  ) {
    super();
    this.chConfig = resolveCupHandleConfig(config);
    this.tradeConfig = resolveCupHandleTradeConfig(tradeConfig);
    this.detector = new CupHandleDetector(this.chConfig);
    this.chValidator = new CupHandleValidator(this.chConfig);
    this.tradeBuilder = new CupHandleTradeBuilder(this.tradeConfig);
  }

  detect(context: StrategyExecutionContext): CupHandleDetection {
    const detectionContext = toCupHandleDetectionContext(context);
    if (!detectionContext) {
      const empty = createEmptyCupHandleDetection([
        "Cup & Handle market data missing on strategy input.",
      ]);
      this.lastDetection = empty;
      return empty;
    }
    const detection = this.detector.detect({
      ...detectionContext,
      config: this.chConfig,
    });
    this.lastDetection = detection;
    return detection;
  }

  buildTradeSetup(context: StrategyExecutionContext): CupHandleTradeSetup {
    const detection = this.lastDetection ?? this.detect(context);
    if (!isCupHandleStrategyInput(context.input)) {
      const rejected = this.tradeBuilder.build({
        detection,
        marketContext: context.marketContext,
        input: {
          symbol: context.input.symbol,
          lastPrice: context.input.lastPrice,
          cupHandle: {
            candlesDaily: [],
            vwap: 0,
            atr: null,
            ema20: null,
            ema50: null,
            ema150: null,
            ema200: null,
            relativeVolume: null,
            relativeStrength: null,
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

  getLastDetection(): CupHandleDetection | null {
    return this.lastDetection;
  }

  getLastTradeSetup(): CupHandleTradeSetup | null {
    return this.lastTradeSetup;
  }

  override validate(
    context: StrategyExecutionContext
  ): StrategyValidationResult {
    if (!isCupHandleStrategyInput(context.input)) {
      return this.failValidation([
        "Cup & Handle input requires candlesDaily / EMA / ATR / VWAP payload.",
      ]);
    }
    const detectionContext = toCupHandleDetectionContext(context);
    const result = this.chValidator.validate(detectionContext);
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
      tradeValid && setup.detection.direction === "BUY" ? "Bullish" : "Neutral";

    return {
      bias,
      score: tradeValid ? setup.qualityScore : detection.confidence,
      notes: tradeValid
        ? [
            `Cup & Handle trade constructed (${setup.cupDuration} sessions).`,
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
        cupDepth: setup.cupDepth,
        cupDuration: setup.cupDuration,
        handleDepth: setup.handleDepth,
        handleDuration: setup.handleDuration,
        pivotPrice: setup.pivotPrice,
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
        `CupHandleTradeSetup ready — ${setup.positionType} · RR ${setup.riskReward}.`
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

export function createCupHandleStrategyRegistration(
  config?: Partial<CupHandleConfig>,
  tradeConfig?: Partial<CupHandleTradeConfig>
) {
  return {
    id: CUP_HANDLE_STRATEGY_ID,
    name: CUP_HANDLE_STRATEGY_NAME,
    category: "Swing" as const,
    enabled: true,
    eligibilityId: CUP_HANDLE_STRATEGY_ID,
    version: "11B.3Q",
    description:
      "Cup & Handle — William O'Neil Cup & Handle continuation base with institutional scoring.",
    create: () => new CupHandleStrategy(config, tradeConfig),
  };
}

export function registerCupHandleStrategy(
  registry: {
    register: (
      r: ReturnType<typeof createCupHandleStrategyRegistration>
    ) => boolean;
  },
  config?: Partial<CupHandleConfig>,
  tradeConfig?: Partial<CupHandleTradeConfig>
): boolean {
  return registry.register(
    createCupHandleStrategyRegistration(config, tradeConfig)
  );
}
