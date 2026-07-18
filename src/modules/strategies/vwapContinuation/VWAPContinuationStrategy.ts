/**
 * VWAP Continuation Strategy — Sprint 11B.3C.1.
 * Detection only. No entry / stop / target construction. No portfolio execution.
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
import type { VWAPContinuationDetection } from "./VWAPContinuationTypes";
import {
  isVWAPContinuationStrategyInput,
  toVWAPContinuationDetectionContext,
} from "./VWAPContinuationTypes";
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
  private readonly vwapConfig: VWAPContinuationConfig;
  private lastDetection: VWAPContinuationDetection | null = null;

  constructor(config?: Partial<VWAPContinuationConfig>) {
    super();
    this.vwapConfig = resolveVWAPContinuationConfig(config);
    this.detector = new VWAPContinuationDetector(this.vwapConfig);
    this.vwapValidator = new VWAPContinuationValidator(this.vwapConfig);
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

  getLastDetection(): VWAPContinuationDetection | null {
    return this.lastDetection;
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
    const bias =
      detection.detected && detection.direction === "BUY"
        ? "Bullish"
        : detection.detected && detection.direction === "SELL"
          ? "Bearish"
          : "Neutral";

    return {
      bias,
      score: detection.confidence,
      notes:
        detection.detected
          ? detection.reasons
          : detection.warnings.length > 0
            ? detection.warnings
            : detection.reasons,
      metrics: {
        detected: detection.detected ? 1 : 0,
        vwap: detection.vwap,
        distanceFromVWAP: detection.distanceFromVWAP,
        pullbackDetected: detection.pullbackDetected ? 1 : 0,
        bounceConfirmed: detection.bounceConfirmed ? 1 : 0,
        volumeConfirmed: detection.volumeConfirmed ? 1 : 0,
        breadthConfirmed: detection.breadthConfirmed ? 1 : 0,
        sectorConfirmed: detection.sectorConfirmed ? 1 : 0,
        marketConfirmed: detection.marketConfirmed ? 1 : 0,
        confidence: detection.confidence,
      },
    };
  }

  override generateSignal(
    _context: StrategyExecutionContext,
    analysis: StrategyAnalysisResult
  ): StrategySignal["signal"] {
    if (analysis.metrics.detected !== 1) return "IGNORE";
    if (analysis.bias === "Bullish") return "BUY";
    if (analysis.bias === "Bearish") return "SELL";
    return "IGNORE";
  }

  /** Detection sprint — trade levels deferred. */
  override calculateEntry(
    _context?: StrategyExecutionContext,
    _analysis?: StrategyAnalysisResult
  ): number {
    return 0;
  }

  override calculateStopLoss(
    _context?: StrategyExecutionContext,
    _analysis?: StrategyAnalysisResult,
    _entry?: number
  ): number {
    return 0;
  }

  override calculateTargets(
    _context?: StrategyExecutionContext,
    _analysis?: StrategyAnalysisResult,
    _entry?: number,
    _stopLoss?: number
  ): StrategyTargets {
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
        `VWAP Continuation ${detection.detected ? "detected" : "not detected"} · confidence ${detection.confidence}.`
      );
    }
    lines.push(`Framework signal ${signal.signal}.`);
    return lines;
  }
}

/**
 * Registry descriptor — StrategyFactory instantiates via create().
 */
export function createVWAPContinuationStrategyRegistration(
  config?: Partial<VWAPContinuationConfig>
) {
  return {
    id: VWAP_CONTINUATION_STRATEGY_ID,
    name: VWAP_CONTINUATION_STRATEGY_NAME,
    category: "Scalp" as const,
    enabled: true,
    eligibilityId: VWAP_CONTINUATION_STRATEGY_ID,
    version: "11B.3C.1",
    description:
      "VWAP Continuation — institutional detection only (no trade construction).",
    create: () => new VWAPContinuationStrategy(config),
  };
}

export function registerVWAPContinuationStrategy(
  registry: {
    register: (
      r: ReturnType<typeof createVWAPContinuationStrategyRegistration>
    ) => boolean;
  },
  config?: Partial<VWAPContinuationConfig>
): boolean {
  return registry.register(
    createVWAPContinuationStrategyRegistration(config)
  );
}
