/**
 * VWAP Continuation Strategy — Sprint 11B.3C.1 / 11B.3C.2 / 11B.3C.3.
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
  VWAP_CONTINUATION_STRATEGY_ID,
  VWAP_CONTINUATION_STRATEGY_NAME,
  type VWAPContinuationConfig,
} from "./VWAPContinuationConstants";
import { VWAPContinuationDetector } from "./VWAPContinuationDetector";
import { VWAPContinuationTradeBuilder } from "./VWAPContinuationTradeBuilder";
import type { VWAPContinuationDetection } from "./VWAPContinuationTypes";
import {
  isVWAPContinuationStrategyInput,
  toVWAPContinuationDetectionContext,
} from "./VWAPContinuationTypes";
import {
  resolveVWAPContinuationTradeConfig,
  type VWAPContinuationTradeConfig,
  type VWAPContinuationTradeSetup,
} from "./VWAPContinuationTradeTypes";
import {
  createEmptyVWAPContinuationDetection,
  resolveVWAPContinuationConfig,
} from "./VWAPContinuationUtils";
import { VWAPContinuationValidator } from "./VWAPContinuationValidator";

export class VWAPContinuationStrategy extends BaseStrategy {
  readonly id = VWAP_CONTINUATION_STRATEGY_ID;
  readonly name = VWAP_CONTINUATION_STRATEGY_NAME;
  readonly category = "Scalp" as const;
  readonly eligibilityId = VWAP_CONTINUATION_STRATEGY_ID;

  private readonly detector: VWAPContinuationDetector;
  private readonly vwapValidator: VWAPContinuationValidator;
  private readonly tradeBuilder: VWAPContinuationTradeBuilder;
  private readonly vwapConfig: VWAPContinuationConfig;
  private readonly tradeConfig: VWAPContinuationTradeConfig;
  private lastDetection: VWAPContinuationDetection | null = null;
  private lastTradeSetup: VWAPContinuationTradeSetup | null = null;

  constructor(
    config?: Partial<VWAPContinuationConfig>,
    tradeConfig?: Partial<VWAPContinuationTradeConfig>
  ) {
    super();
    this.vwapConfig = resolveVWAPContinuationConfig(config);
    this.tradeConfig = resolveVWAPContinuationTradeConfig(tradeConfig);
    this.detector = new VWAPContinuationDetector(this.vwapConfig);
    this.vwapValidator = new VWAPContinuationValidator(this.vwapConfig);
    this.tradeBuilder = new VWAPContinuationTradeBuilder(this.tradeConfig);
  }

  /**
   * Sprint 11B.3C.1 API — VWAP Continuation detection only.
   */
  detect(context: StrategyExecutionContext): VWAPContinuationDetection {
    const detectionContext = toVWAPContinuationDetectionContext(context);
    if (!detectionContext) {
      const empty = createEmptyVWAPContinuationDetection([
        "VWAP Continuation market data missing on strategy input.",
      ]);
      this.lastDetection = empty;
      return empty;
    }
    const detection = this.detector.detect({
      ...detectionContext,
      config: this.vwapConfig,
    });
    this.lastDetection = detection;
    return detection;
  }

  /**
   * Sprint 11B.3C.2 API — construct institutional trade setup from detection.
   */
  buildTradeSetup(
    context: StrategyExecutionContext
  ): VWAPContinuationTradeSetup {
    const detection = this.lastDetection ?? this.detect(context);
    if (!isVWAPContinuationStrategyInput(context.input)) {
      const rejected = this.tradeBuilder.build({
        detection,
        marketContext: context.marketContext,
        input: {
          symbol: context.input.symbol,
          lastPrice: context.input.lastPrice,
          vwapContinuation: {
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

  getLastDetection(): VWAPContinuationDetection | null {
    return this.lastDetection;
  }

  getLastTradeSetup(): VWAPContinuationTradeSetup | null {
    return this.lastTradeSetup;
  }

  override validate(
    context: StrategyExecutionContext
  ): StrategyValidationResult {
    if (!isVWAPContinuationStrategyInput(context.input)) {
      return this.failValidation([
        "VWAP Continuation input requires candles5m / VWAP / volume payload.",
      ]);
    }
    const detectionContext = toVWAPContinuationDetectionContext(context);
    const result = this.vwapValidator.validate(detectionContext);
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
            `VWAP Continuation trade constructed (${setup.detection.direction}).`,
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
        vwap: detection.vwap,
        distanceFromVWAP: detection.distanceFromVWAP,
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
      },
    };
  }

  /**
   * Framework signal derived from a valid VWAPContinuationTradeSetup.
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
        `VWAPContinuationTradeSetup ready — ${setup.positionType} · RR ${setup.riskReward}.`
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

/**
 * Registry descriptor — StrategyFactory instantiates via create().
 */
export function createVWAPContinuationStrategyRegistration(
  config?: Partial<VWAPContinuationConfig>,
  tradeConfig?: Partial<VWAPContinuationTradeConfig>
) {
  return {
    id: VWAP_CONTINUATION_STRATEGY_ID,
    name: VWAP_CONTINUATION_STRATEGY_NAME,
    category: "Scalp" as const,
    enabled: true,
    eligibilityId: VWAP_CONTINUATION_STRATEGY_ID,
    version: "11B.3C.3",
    description:
      "VWAP Continuation — detection, trade construction, and institutional scoring.",
    create: () => new VWAPContinuationStrategy(config, tradeConfig),
  };
}

export function registerVWAPContinuationStrategy(
  registry: {
    register: (
      r: ReturnType<typeof createVWAPContinuationStrategyRegistration>
    ) => boolean;
  },
  config?: Partial<VWAPContinuationConfig>,
  tradeConfig?: Partial<VWAPContinuationTradeConfig>
): boolean {
  return registry.register(
    createVWAPContinuationStrategyRegistration(config, tradeConfig)
  );
}
