/**
 * 52-Week High Strategy — Sprint 11B.3S.
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
  FIFTY_TWO_WEEK_HIGH_STRATEGY_ID,
  FIFTY_TWO_WEEK_HIGH_STRATEGY_NAME,
  type FiftyTwoWeekHighConfig,
} from "./FiftyTwoWeekHighConstants";
import { FiftyTwoWeekHighDetector } from "./FiftyTwoWeekHighDetector";
import { FiftyTwoWeekHighTradeBuilder } from "./FiftyTwoWeekHighTradeBuilder";
import type { FiftyTwoWeekHighDetection } from "./FiftyTwoWeekHighTypes";
import {
  isFiftyTwoWeekHighStrategyInput,
  toFiftyTwoWeekHighDetectionContext,
} from "./FiftyTwoWeekHighTypes";
import {
  resolveFiftyTwoWeekHighTradeConfig,
  type FiftyTwoWeekHighTradeConfig,
  type FiftyTwoWeekHighTradeSetup,
} from "./FiftyTwoWeekHighTradeTypes";
import {
  createEmptyFiftyTwoWeekHighDetection,
  resolveFiftyTwoWeekHighConfig,
} from "./FiftyTwoWeekHighUtils";
import { FiftyTwoWeekHighValidator } from "./FiftyTwoWeekHighValidator";

export class FiftyTwoWeekHighStrategy extends BaseStrategy {
  readonly id = FIFTY_TWO_WEEK_HIGH_STRATEGY_ID;
  readonly name = FIFTY_TWO_WEEK_HIGH_STRATEGY_NAME;
  readonly category = "Swing" as const;
  readonly eligibilityId = FIFTY_TWO_WEEK_HIGH_STRATEGY_ID;

  private readonly detector: FiftyTwoWeekHighDetector;
  private readonly ftwValidator: FiftyTwoWeekHighValidator;
  private readonly tradeBuilder: FiftyTwoWeekHighTradeBuilder;
  private readonly ftwConfig: FiftyTwoWeekHighConfig;
  private readonly tradeConfig: FiftyTwoWeekHighTradeConfig;
  private lastDetection: FiftyTwoWeekHighDetection | null = null;
  private lastTradeSetup: FiftyTwoWeekHighTradeSetup | null = null;

  constructor(
    config?: Partial<FiftyTwoWeekHighConfig>,
    tradeConfig?: Partial<FiftyTwoWeekHighTradeConfig>
  ) {
    super();
    this.ftwConfig = resolveFiftyTwoWeekHighConfig(config);
    this.tradeConfig = resolveFiftyTwoWeekHighTradeConfig(tradeConfig);
    this.detector = new FiftyTwoWeekHighDetector(this.ftwConfig);
    this.ftwValidator = new FiftyTwoWeekHighValidator(this.ftwConfig);
    this.tradeBuilder = new FiftyTwoWeekHighTradeBuilder(this.tradeConfig);
  }

  detect(context: StrategyExecutionContext): FiftyTwoWeekHighDetection {
    const detectionContext = toFiftyTwoWeekHighDetectionContext(context);
    if (!detectionContext) {
      const empty = createEmptyFiftyTwoWeekHighDetection([
        "52-Week High market data missing on strategy input.",
      ]);
      this.lastDetection = empty;
      return empty;
    }
    const detection = this.detector.detect({
      ...detectionContext,
      config: this.ftwConfig,
    });
    this.lastDetection = detection;
    return detection;
  }

  buildTradeSetup(
    context: StrategyExecutionContext
  ): FiftyTwoWeekHighTradeSetup {
    const detection = this.lastDetection ?? this.detect(context);
    if (!isFiftyTwoWeekHighStrategyInput(context.input)) {
      const rejected = this.tradeBuilder.build({
        detection,
        marketContext: context.marketContext,
        input: {
          symbol: context.input.symbol,
          lastPrice: context.input.lastPrice,
          fiftyTwoWeekHigh: {
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

  getLastDetection(): FiftyTwoWeekHighDetection | null {
    return this.lastDetection;
  }

  getLastTradeSetup(): FiftyTwoWeekHighTradeSetup | null {
    return this.lastTradeSetup;
  }

  override validate(
    context: StrategyExecutionContext
  ): StrategyValidationResult {
    if (!isFiftyTwoWeekHighStrategyInput(context.input)) {
      return this.failValidation([
        "52-Week High input requires candlesDaily / EMA / ATR / VWAP payload.",
      ]);
    }
    const detectionContext = toFiftyTwoWeekHighDetectionContext(context);
    const result = this.ftwValidator.validate(detectionContext);
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
            `52-Week High trade constructed (age ${setup.breakoutAge} bars).`,
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
        previous52WeekHigh: setup.previous52WeekHigh,
        currentBreakoutLevel: setup.currentBreakoutLevel,
        breakoutAge: setup.breakoutAge,
        distanceFromBreakout: setup.distanceFromBreakout,
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
        `FiftyTwoWeekHighTradeSetup ready — ${setup.positionType} · RR ${setup.riskReward}.`
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

export function createFiftyTwoWeekHighStrategyRegistration(
  config?: Partial<FiftyTwoWeekHighConfig>,
  tradeConfig?: Partial<FiftyTwoWeekHighTradeConfig>
) {
  return {
    id: FIFTY_TWO_WEEK_HIGH_STRATEGY_ID,
    name: FIFTY_TWO_WEEK_HIGH_STRATEGY_NAME,
    category: "Swing" as const,
    enabled: true,
    eligibilityId: FIFTY_TWO_WEEK_HIGH_STRATEGY_ID,
    version: "11B.3S",
    description:
      "52-Week High Breakout — O'Neil / Minervini institutional momentum with scoring.",
    create: () => new FiftyTwoWeekHighStrategy(config, tradeConfig),
  };
}

export function registerFiftyTwoWeekHighStrategy(
  registry: {
    register: (
      r: ReturnType<typeof createFiftyTwoWeekHighStrategyRegistration>
    ) => boolean;
  },
  config?: Partial<FiftyTwoWeekHighConfig>,
  tradeConfig?: Partial<FiftyTwoWeekHighTradeConfig>
): boolean {
  return registry.register(
    createFiftyTwoWeekHighStrategyRegistration(config, tradeConfig)
  );
}
