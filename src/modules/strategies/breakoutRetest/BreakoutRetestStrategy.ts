/**
 * Breakout Retest Strategy — Sprint 11B.3I.
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
  BREAKOUT_RETEST_STRATEGY_ID,
  BREAKOUT_RETEST_STRATEGY_NAME,
  type BreakoutRetestConfig,
} from "./BreakoutRetestConstants";
import { BreakoutRetestDetector } from "./BreakoutRetestDetector";
import { BreakoutRetestTradeBuilder } from "./BreakoutRetestTradeBuilder";
import type { BreakoutRetestDetection } from "./BreakoutRetestTypes";
import {
  isBreakoutRetestStrategyInput,
  toBreakoutRetestDetectionContext,
} from "./BreakoutRetestTypes";
import {
  resolveBreakoutRetestTradeConfig,
  type BreakoutRetestTradeConfig,
  type BreakoutRetestTradeSetup,
} from "./BreakoutRetestTradeTypes";
import {
  createEmptyBreakoutRetestDetection,
  resolveBreakoutRetestConfig,
} from "./BreakoutRetestUtils";
import { BreakoutRetestValidator } from "./BreakoutRetestValidator";

export class BreakoutRetestStrategy extends BaseStrategy {
  readonly id = BREAKOUT_RETEST_STRATEGY_ID;
  readonly name = BREAKOUT_RETEST_STRATEGY_NAME;
  readonly category = "Intraday" as const;
  readonly eligibilityId = BREAKOUT_RETEST_STRATEGY_ID;

  private readonly detector: BreakoutRetestDetector;
  private readonly retestValidator: BreakoutRetestValidator;
  private readonly tradeBuilder: BreakoutRetestTradeBuilder;
  private readonly retestConfig: BreakoutRetestConfig;
  private readonly tradeConfig: BreakoutRetestTradeConfig;
  private lastDetection: BreakoutRetestDetection | null = null;
  private lastTradeSetup: BreakoutRetestTradeSetup | null = null;

  constructor(
    config?: Partial<BreakoutRetestConfig>,
    tradeConfig?: Partial<BreakoutRetestTradeConfig>
  ) {
    super();
    this.retestConfig = resolveBreakoutRetestConfig(config);
    this.tradeConfig = resolveBreakoutRetestTradeConfig(tradeConfig);
    this.detector = new BreakoutRetestDetector(this.retestConfig);
    this.retestValidator = new BreakoutRetestValidator(this.retestConfig);
    this.tradeBuilder = new BreakoutRetestTradeBuilder(this.tradeConfig);
  }

  detect(context: StrategyExecutionContext): BreakoutRetestDetection {
    const detectionContext = toBreakoutRetestDetectionContext(context);
    if (!detectionContext) {
      const empty = createEmptyBreakoutRetestDetection([
        "Breakout Retest market data missing on strategy input.",
      ]);
      this.lastDetection = empty;
      return empty;
    }
    const detection = this.detector.detect({
      ...detectionContext,
      config: this.retestConfig,
    });
    this.lastDetection = detection;
    return detection;
  }

  buildTradeSetup(
    context: StrategyExecutionContext
  ): BreakoutRetestTradeSetup {
    const detection = this.lastDetection ?? this.detect(context);
    if (!isBreakoutRetestStrategyInput(context.input)) {
      const rejected = this.tradeBuilder.build({
        detection,
        marketContext: context.marketContext,
        input: {
          symbol: context.input.symbol,
          lastPrice: context.input.lastPrice,
          breakoutRetest: {
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

  getLastDetection(): BreakoutRetestDetection | null {
    return this.lastDetection;
  }

  getLastTradeSetup(): BreakoutRetestTradeSetup | null {
    return this.lastTradeSetup;
  }

  override validate(
    context: StrategyExecutionContext
  ): StrategyValidationResult {
    if (!isBreakoutRetestStrategyInput(context.input)) {
      return this.failValidation([
        "Breakout Retest input requires candles5m / EMA / VWAP payload.",
      ]);
    }
    const detectionContext = toBreakoutRetestDetectionContext(context);
    const result = this.retestValidator.validate(detectionContext);
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
            `Breakout Retest trade constructed (${setup.detection.direction}).`,
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
        breakoutQuality: detection.breakoutQuality,
        retestQuality: detection.retestQuality,
        breakoutLevel: detection.breakoutLevel,
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
        `BreakoutRetestTradeSetup ready — ${setup.positionType} · RR ${setup.riskReward}.`
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

export function createBreakoutRetestStrategyRegistration(
  config?: Partial<BreakoutRetestConfig>,
  tradeConfig?: Partial<BreakoutRetestTradeConfig>
) {
  return {
    id: BREAKOUT_RETEST_STRATEGY_ID,
    name: BREAKOUT_RETEST_STRATEGY_NAME,
    category: "Intraday" as const,
    enabled: true,
    eligibilityId: BREAKOUT_RETEST_STRATEGY_ID,
    version: "11B.3I",
    description:
      "Breakout Retest — resistance/support flip, retest confirmation, and institutional scoring.",
    create: () => new BreakoutRetestStrategy(config, tradeConfig),
  };
}

export function registerBreakoutRetestStrategy(
  registry: {
    register: (
      r: ReturnType<typeof createBreakoutRetestStrategyRegistration>
    ) => boolean;
  },
  config?: Partial<BreakoutRetestConfig>,
  tradeConfig?: Partial<BreakoutRetestTradeConfig>
): boolean {
  return registry.register(
    createBreakoutRetestStrategyRegistration(config, tradeConfig)
  );
}
