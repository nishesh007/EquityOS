/**
 * ORB Strategy — Sprint 11B.3B.1.
 * Opening Range Breakout detection only.
 * Does not compute entry / stop / targets or trade recommendations.
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
import type { ORBDetection } from "./ORBTypes";
import {
  isORBStrategyInput,
  toORBDetectionContext,
} from "./ORBTypes";
import { createEmptyORBDetection, resolveORBConfig } from "./ORBUtils";
import { ORBValidator } from "./ORBValidator";

export class ORBStrategy extends BaseStrategy {
  readonly id = ORB_STRATEGY_ID;
  readonly name = ORB_STRATEGY_NAME;
  readonly category = "Scalp" as const;
  readonly eligibilityId = ORB_STRATEGY_ID;

  private readonly detector: ORBDetector;
  private readonly orbValidator: ORBValidator;
  private readonly orbConfig: ORBConfig;
  private lastDetection: ORBDetection | null = null;

  constructor(config?: Partial<ORBConfig>) {
    super();
    this.orbConfig = resolveORBConfig(config);
    this.detector = new ORBDetector(this.orbConfig);
    this.orbValidator = new ORBValidator(this.orbConfig);
  }

  /**
   * Primary Sprint 11B.3B.1 API — ORB detection only.
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

  getLastDetection(): ORBDetection | null {
    return this.lastDetection;
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
    const bias =
      detection.direction === "BUY"
        ? "Bullish"
        : detection.direction === "SELL"
          ? "Bearish"
          : "Neutral";

    return {
      bias,
      score: detection.confidence,
      notes: detection.detected
        ? detection.reasons
        : detection.warnings.length > 0
          ? detection.warnings
          : detection.reasons,
      metrics: {
        detected: detection.detected ? 1 : 0,
        openingHigh: detection.openingHigh,
        openingLow: detection.openingLow,
        breakoutPrice: detection.breakoutPrice,
        confidence: detection.confidence,
        volumeConfirmed: detection.volumeConfirmed ? 1 : 0,
        breadthConfirmed: detection.breadthConfirmed ? 1 : 0,
        sectorConfirmed: detection.sectorConfirmed ? 1 : 0,
        marketConfirmed: detection.marketConfirmed ? 1 : 0,
        liquidityConfirmed: detection.liquidityConfirmed ? 1 : 0,
      },
    };
  }

  /**
   * Maps ORBDetection → framework signal type.
   * Detection payload is attached via explain — not a trade recommendation.
   */
  override generateSignal(
    _context: StrategyExecutionContext,
    analysis: StrategyAnalysisResult
  ): StrategySignal["signal"] {
    if (analysis.metrics.detected !== 1) return "IGNORE";
    if (analysis.bias === "Bullish") return "BUY";
    if (analysis.bias === "Bearish") return "SELL";
    return "IGNORE";
  }

  /** Intentionally unimplemented in 11B.3B.1 — detection only. */
  override calculateEntry(): number {
    return 0;
  }

  /** Intentionally unimplemented in 11B.3B.1 — detection only. */
  override calculateStopLoss(): number {
    return 0;
  }

  /** Intentionally unimplemented in 11B.3B.1 — detection only. */
  override calculateTargets(): StrategyTargets {
    return { target1: 0, target2: 0, finalTarget: 0 };
  }

  override calculateConfidence(
    _context: StrategyExecutionContext,
    analysis: StrategyAnalysisResult
  ): number {
    return analysis.score;
  }

  override explain(
    _context: StrategyExecutionContext,
    analysis: StrategyAnalysisResult,
    signal: StrategySignal
  ): string[] {
    const detection = this.lastDetection;
    const lines = [...analysis.notes];
    if (detection) {
      lines.push(
        `ORB detection ${detection.detected ? "positive" : "negative"} (${detection.direction}).`
      );
    }
    lines.push(
      `Framework signal ${signal.signal} — trade levels deferred to later sprint.`
    );
    return lines;
  }
}

/**
 * Registry descriptor — StrategyFactory instantiates via create().
 */
export function createORBStrategyRegistration(config?: Partial<ORBConfig>) {
  return {
    id: ORB_STRATEGY_ID,
    name: ORB_STRATEGY_NAME,
    category: "Scalp" as const,
    enabled: true,
    eligibilityId: ORB_STRATEGY_ID,
    version: "11B.3B.1",
    description:
      "Opening Range Breakout detection engine (no trade level calculation).",
    create: () => new ORBStrategy(config),
  };
}

export function registerORBStrategy(
  registry: {
    register: (
      r: ReturnType<typeof createORBStrategyRegistration>
    ) => boolean;
  },
  config?: Partial<ORBConfig>
): boolean {
  return registry.register(createORBStrategyRegistration(config));
}
