/**
 * VWAP Mean Reversion Strategy — Sprint 11B.3D.1 / 11B.3D.2.
 * Detection + trade construction. No portfolio execution or order placement.
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
  VWAP_MEAN_REVERSION_STRATEGY_ID,
  VWAP_MEAN_REVERSION_STRATEGY_NAME,
  type VWAPMeanReversionConfig,
} from "./VWAPMeanReversionConstants";
import { VWAPMeanReversionDetector } from "./VWAPMeanReversionDetector";
import { VWAPMeanReversionTradeBuilder } from "./VWAPMeanReversionTradeBuilder";
import type { VWAPMeanReversionDetection } from "./VWAPMeanReversionTypes";
import {
  isVWAPMeanReversionStrategyInput,
  toVWAPMeanReversionDetectionContext,
} from "./VWAPMeanReversionTypes";
import {
  resolveVWAPMeanReversionTradeConfig,
  type VWAPMeanReversionTradeConfig,
  type VWAPMeanReversionTradeSetup,
} from "./VWAPMeanReversionTradeTypes";
import {
  createEmptyVWAPMeanReversionDetection,
  resolveVWAPMeanReversionConfig,
} from "./VWAPMeanReversionUtils";
import { VWAPMeanReversionValidator } from "./VWAPMeanReversionValidator";

export class VWAPMeanReversionStrategy extends BaseStrategy {
  readonly id = VWAP_MEAN_REVERSION_STRATEGY_ID;
  readonly name = VWAP_MEAN_REVERSION_STRATEGY_NAME;
  readonly category = "Scalp" as const;
  readonly eligibilityId = VWAP_MEAN_REVERSION_STRATEGY_ID;

  private readonly detector: VWAPMeanReversionDetector;
  private readonly mrValidator: VWAPMeanReversionValidator;
  private readonly tradeBuilder: VWAPMeanReversionTradeBuilder;
  private readonly mrConfig: VWAPMeanReversionConfig;
  private readonly tradeConfig: VWAPMeanReversionTradeConfig;
  private lastDetection: VWAPMeanReversionDetection | null = null;
  private lastTradeSetup: VWAPMeanReversionTradeSetup | null = null;

  constructor(
    config?: Partial<VWAPMeanReversionConfig>,
    tradeConfig?: Partial<VWAPMeanReversionTradeConfig>
  ) {
    super();
    this.mrConfig = resolveVWAPMeanReversionConfig(config);
    this.tradeConfig = resolveVWAPMeanReversionTradeConfig(tradeConfig);
    this.detector = new VWAPMeanReversionDetector(this.mrConfig);
    this.mrValidator = new VWAPMeanReversionValidator(this.mrConfig);
    this.tradeBuilder = new VWAPMeanReversionTradeBuilder(this.tradeConfig);
  }

  /**
   * Sprint 11B.3D.1 API — VWAP Mean Reversion detection only.
   */
  detect(context: StrategyExecutionContext): VWAPMeanReversionDetection {
    const detectionContext = toVWAPMeanReversionDetectionContext(context);
    if (!detectionContext) {
      const empty = createEmptyVWAPMeanReversionDetection([
        "VWAP Mean Reversion market data missing on strategy input.",
      ]);
      this.lastDetection = empty;
      return empty;
    }
    const detection = this.detector.detect({
      ...detectionContext,
      config: this.mrConfig,
    });
    this.lastDetection = detection;
    return detection;
  }

  /**
   * Sprint 11B.3D.2 API — construct institutional trade setup from detection.
   */
  buildTradeSetup(
    context: StrategyExecutionContext
  ): VWAPMeanReversionTradeSetup {
    const detection = this.lastDetection ?? this.detect(context);
    if (!isVWAPMeanReversionStrategyInput(context.input)) {
      const rejected = this.tradeBuilder.build({
        detection,
        marketContext: context.marketContext,
        input: {
          symbol: context.input.symbol,
          lastPrice: context.input.lastPrice,
          vwapMeanReversion: {
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

  getLastDetection(): VWAPMeanReversionDetection | null {
    return this.lastDetection;
  }

  getLastTradeSetup(): VWAPMeanReversionTradeSetup | null {
    return this.lastTradeSetup;
  }

  override validate(
    context: StrategyExecutionContext
  ): StrategyValidationResult {
    if (!isVWAPMeanReversionStrategyInput(context.input)) {
      return this.failValidation([
        "VWAP Mean Reversion input requires candles5m / VWAP / bands payload.",
      ]);
    }
    const detectionContext = toVWAPMeanReversionDetectionContext(context);
    const result = this.mrValidator.validate(detectionContext);
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
            `VWAP Mean Reversion trade constructed (${setup.detection.direction}).`,
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
        deviation: detection.deviation,
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
   * Framework signal derived from a valid VWAPMeanReversionTradeSetup.
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
        `VWAPMeanReversionTradeSetup ready — ${setup.positionType} · RR ${setup.riskReward}.`
      );
    }
    lines.push(`Framework signal ${signal.signal}.`);
    return lines;
  }
}

export function createVWAPMeanReversionStrategyRegistration(
  config?: Partial<VWAPMeanReversionConfig>,
  tradeConfig?: Partial<VWAPMeanReversionTradeConfig>
) {
  return {
    id: VWAP_MEAN_REVERSION_STRATEGY_ID,
    name: VWAP_MEAN_REVERSION_STRATEGY_NAME,
    category: "Scalp" as const,
    enabled: true,
    eligibilityId: VWAP_MEAN_REVERSION_STRATEGY_ID,
    version: "11B.3D.2",
    description:
      "VWAP Mean Reversion — detection and institutional trade construction.",
    create: () => new VWAPMeanReversionStrategy(config, tradeConfig),
  };
}

export function registerVWAPMeanReversionStrategy(
  registry: {
    register: (
      r: ReturnType<typeof createVWAPMeanReversionStrategyRegistration>
    ) => boolean;
  },
  config?: Partial<VWAPMeanReversionConfig>,
  tradeConfig?: Partial<VWAPMeanReversionTradeConfig>
): boolean {
  return registry.register(
    createVWAPMeanReversionStrategyRegistration(config, tradeConfig)
  );
}
