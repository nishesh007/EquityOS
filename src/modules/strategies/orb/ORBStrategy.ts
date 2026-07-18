/**
 * ORB Strategy — Sprint 11B.3B.1 / 11B.3B.2.
 * Detection (3B.1) + trade construction (3B.2).
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
  ORB_STRATEGY_ID,
  ORB_STRATEGY_NAME,
  type ORBConfig,
} from "./ORBConstants";
import { ORBDetector } from "./ORBDetector";
import { ORBTradeBuilder } from "./ORBTradeBuilder";
import type { ORBDetection } from "./ORBTypes";
import {
  isORBStrategyInput,
  toORBDetectionContext,
} from "./ORBTypes";
import {
  resolveORBTradeConfig,
  type ORBTradeConfig,
  type ORBTradeSetup,
} from "./ORBTradeTypes";
import { createEmptyORBDetection, resolveORBConfig } from "./ORBUtils";
import { ORBValidator } from "./ORBValidator";

export class ORBStrategy extends BaseStrategy {
  readonly id = ORB_STRATEGY_ID;
  readonly name = ORB_STRATEGY_NAME;
  readonly category = "Scalp" as const;
  readonly eligibilityId = ORB_STRATEGY_ID;

  private readonly detector: ORBDetector;
  private readonly orbValidator: ORBValidator;
  private readonly tradeBuilder: ORBTradeBuilder;
  private readonly orbConfig: ORBConfig;
  private readonly tradeConfig: ORBTradeConfig;
  private lastDetection: ORBDetection | null = null;
  private lastTradeSetup: ORBTradeSetup | null = null;

  constructor(
    config?: Partial<ORBConfig>,
    tradeConfig?: Partial<ORBTradeConfig>
  ) {
    super();
    this.orbConfig = resolveORBConfig(config);
    this.tradeConfig = resolveORBTradeConfig(tradeConfig);
    this.detector = new ORBDetector(this.orbConfig);
    this.orbValidator = new ORBValidator(this.orbConfig);
    this.tradeBuilder = new ORBTradeBuilder(this.tradeConfig);
  }

  /**
   * Sprint 11B.3B.1 API — ORB detection only.
   */
  detect(context: StrategyExecutionContext): ORBDetection {
    const orbContext = toORBDetectionContext(context);
    if (!orbContext) {
      const empty = createEmptyORBDetection([
        "ORB market data missing on strategy input.",
      ]);
      this.lastDetection = empty;
      return empty;
    }
    const detection = this.detector.detect({
      ...orbContext,
      config: this.orbConfig,
    });
    this.lastDetection = detection;
    return detection;
  }

  /**
   * Sprint 11B.3B.2 API — construct institutional trade setup from detection.
   */
  buildTradeSetup(context: StrategyExecutionContext): ORBTradeSetup {
    const detection = this.lastDetection ?? this.detect(context);
    if (!isORBStrategyInput(context.input)) {
      const rejected = this.tradeBuilder.build({
        detection,
        marketContext: context.marketContext,
        input: {
          symbol: context.input.symbol,
          lastPrice: context.input.lastPrice,
          orb: {
            candles5m: [],
            vwap: null,
            relativeVolume: null,
            atr: null,
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

  getLastDetection(): ORBDetection | null {
    return this.lastDetection;
  }

  getLastTradeSetup(): ORBTradeSetup | null {
    return this.lastTradeSetup;
  }

  override validate(
    context: StrategyExecutionContext
  ): StrategyValidationResult {
    if (!isORBStrategyInput(context.input)) {
      return this.failValidation([
        "ORB input requires candles5m / volume / VWAP / ATR payload.",
      ]);
    }
    const orbContext = toORBDetectionContext(context);
    const result = this.orbValidator.validate(orbContext);
    if (!result.valid) {
      return this.failValidation(result.errors, result.warnings);
    }
    return this.okValidation(result.warnings);
  }

  override analyze(
    context: StrategyExecutionContext
  ): StrategyAnalysisResult {
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
            `ORB trade constructed (${setup.detection.direction}).`,
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
        openingHigh: detection.openingHigh,
        openingLow: detection.openingLow,
        breakoutPrice: detection.breakoutPrice,
        entry: setup.entry,
        stopLoss: setup.stopLoss,
        target1: setup.target1,
        target2: setup.target2,
        finalTarget: setup.finalTarget,
        riskReward: setup.riskReward,
        qualityScore: setup.qualityScore,
        confidence: detection.confidence,
      },
    };
  }

  /**
   * Framework signal type derived from a valid ORBTradeSetup.
   * Call {@link buildTradeSetup} / {@link getLastTradeSetup} for the full setup.
   */
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
        `ORBTradeSetup ready — ${setup.positionType} · RR ${setup.riskReward}.`
      );
    }
    lines.push(`Framework signal ${signal.signal}.`);
    return lines;
  }
}

/**
 * Registry descriptor — StrategyFactory instantiates via create().
 */
export function createORBStrategyRegistration(
  config?: Partial<ORBConfig>,
  tradeConfig?: Partial<ORBTradeConfig>
) {
  return {
    id: ORB_STRATEGY_ID,
    name: ORB_STRATEGY_NAME,
    category: "Scalp" as const,
    enabled: true,
    eligibilityId: ORB_STRATEGY_ID,
    version: "11B.3B.2",
    description:
      "Opening Range Breakout detection + institutional trade construction.",
    create: () => new ORBStrategy(config, tradeConfig),
  };
}

export function registerORBStrategy(
  registry: {
    register: (
      r: ReturnType<typeof createORBStrategyRegistration>
    ) => boolean;
  },
  config?: Partial<ORBConfig>,
  tradeConfig?: Partial<ORBTradeConfig>
): boolean {
  return registry.register(createORBStrategyRegistration(config, tradeConfig));
}
