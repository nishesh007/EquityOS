/**
 * Liquidity Sweep Strategy — Sprint 11B.3E.
 * Detection + trade construction + institutional explainability / scoring.
 * No portfolio execution or order placement.
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
  LIQUIDITY_SWEEP_STRATEGY_ID,
  LIQUIDITY_SWEEP_STRATEGY_NAME,
  type LiquiditySweepConfig,
} from "./LiquiditySweepConstants";
import { LiquiditySweepDetector } from "./LiquiditySweepDetector";
import { LiquiditySweepTradeBuilder } from "./LiquiditySweepTradeBuilder";
import type { LiquiditySweepDetection } from "./LiquiditySweepTypes";
import {
  isLiquiditySweepStrategyInput,
  toLiquiditySweepDetectionContext,
} from "./LiquiditySweepTypes";
import {
  resolveLiquiditySweepTradeConfig,
  type LiquiditySweepTradeConfig,
  type LiquiditySweepTradeSetup,
} from "./LiquiditySweepTradeTypes";
import {
  createEmptyLiquiditySweepDetection,
  resolveLiquiditySweepConfig,
} from "./LiquiditySweepUtils";
import { LiquiditySweepValidator } from "./LiquiditySweepValidator";

export class LiquiditySweepStrategy extends BaseStrategy {
  readonly id = LIQUIDITY_SWEEP_STRATEGY_ID;
  readonly name = LIQUIDITY_SWEEP_STRATEGY_NAME;
  readonly category = "Scalp" as const;
  readonly eligibilityId = LIQUIDITY_SWEEP_STRATEGY_ID;

  private readonly detector: LiquiditySweepDetector;
  private readonly lsValidator: LiquiditySweepValidator;
  private readonly tradeBuilder: LiquiditySweepTradeBuilder;
  private readonly lsConfig: LiquiditySweepConfig;
  private readonly tradeConfig: LiquiditySweepTradeConfig;
  private lastDetection: LiquiditySweepDetection | null = null;
  private lastTradeSetup: LiquiditySweepTradeSetup | null = null;

  constructor(
    config?: Partial<LiquiditySweepConfig>,
    tradeConfig?: Partial<LiquiditySweepTradeConfig>
  ) {
    super();
    this.lsConfig = resolveLiquiditySweepConfig(config);
    this.tradeConfig = resolveLiquiditySweepTradeConfig(tradeConfig);
    this.detector = new LiquiditySweepDetector(this.lsConfig);
    this.lsValidator = new LiquiditySweepValidator(this.lsConfig);
    this.tradeBuilder = new LiquiditySweepTradeBuilder(this.tradeConfig);
  }

  detect(context: StrategyExecutionContext): LiquiditySweepDetection {
    const detectionContext = toLiquiditySweepDetectionContext(context);
    if (!detectionContext) {
      const empty = createEmptyLiquiditySweepDetection([
        "Liquidity Sweep market data missing on strategy input.",
      ]);
      this.lastDetection = empty;
      return empty;
    }
    const detection = this.detector.detect({
      ...detectionContext,
      config: this.lsConfig,
    });
    this.lastDetection = detection;
    return detection;
  }

  buildTradeSetup(context: StrategyExecutionContext): LiquiditySweepTradeSetup {
    const detection = this.lastDetection ?? this.detect(context);
    if (!isLiquiditySweepStrategyInput(context.input)) {
      const rejected = this.tradeBuilder.build({
        detection,
        marketContext: context.marketContext,
        input: {
          symbol: context.input.symbol,
          lastPrice: context.input.lastPrice,
          liquiditySweep: {
            candles5m: [],
            vwap: 0,
            atr: null,
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

  getLastDetection(): LiquiditySweepDetection | null {
    return this.lastDetection;
  }

  getLastTradeSetup(): LiquiditySweepTradeSetup | null {
    return this.lastTradeSetup;
  }

  override validate(
    context: StrategyExecutionContext
  ): StrategyValidationResult {
    if (!isLiquiditySweepStrategyInput(context.input)) {
      return this.failValidation([
        "Liquidity Sweep input requires candles5m / liquidity payload.",
      ]);
    }
    const detectionContext = toLiquiditySweepDetectionContext(context);
    const result = this.lsValidator.validate(detectionContext);
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
            `Liquidity Sweep trade constructed (${setup.detection.direction}).`,
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
        liquidityLevel: detection.liquidityLevel,
        sweepExtreme: detection.sweepExtreme,
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
        `LiquiditySweepTradeSetup ready — ${setup.positionType} · RR ${setup.riskReward}.`
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

export function createLiquiditySweepStrategyRegistration(
  config?: Partial<LiquiditySweepConfig>,
  tradeConfig?: Partial<LiquiditySweepTradeConfig>
) {
  return {
    id: LIQUIDITY_SWEEP_STRATEGY_ID,
    name: LIQUIDITY_SWEEP_STRATEGY_NAME,
    category: "Scalp" as const,
    enabled: true,
    eligibilityId: LIQUIDITY_SWEEP_STRATEGY_ID,
    version: "11B.3E",
    description:
      "Liquidity Sweep — stop-hunt detection, trade construction, and institutional scoring.",
    create: () => new LiquiditySweepStrategy(config, tradeConfig),
  };
}

export function registerLiquiditySweepStrategy(
  registry: {
    register: (
      r: ReturnType<typeof createLiquiditySweepStrategyRegistration>
    ) => boolean;
  },
  config?: Partial<LiquiditySweepConfig>,
  tradeConfig?: Partial<LiquiditySweepTradeConfig>
): boolean {
  return registry.register(
    createLiquiditySweepStrategyRegistration(config, tradeConfig)
  );
}
