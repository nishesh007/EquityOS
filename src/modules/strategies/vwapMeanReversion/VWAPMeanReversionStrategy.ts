/**
 * VWAP Mean Reversion Strategy — Sprint 11B.3D.1.
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
  VWAP_MEAN_REVERSION_STRATEGY_ID,
  VWAP_MEAN_REVERSION_STRATEGY_NAME,
  type VWAPMeanReversionConfig,
} from "./VWAPMeanReversionConstants";
import { VWAPMeanReversionDetector } from "./VWAPMeanReversionDetector";
import type { VWAPMeanReversionDetection } from "./VWAPMeanReversionTypes";
import {
  isVWAPMeanReversionStrategyInput,
  toVWAPMeanReversionDetectionContext,
} from "./VWAPMeanReversionTypes";
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
  private readonly mrConfig: VWAPMeanReversionConfig;
  private lastDetection: VWAPMeanReversionDetection | null = null;

  constructor(config?: Partial<VWAPMeanReversionConfig>) {
    super();
    this.mrConfig = resolveVWAPMeanReversionConfig(config);
    this.detector = new VWAPMeanReversionDetector(this.mrConfig);
    this.mrValidator = new VWAPMeanReversionValidator(this.mrConfig);
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

  getLastDetection(): VWAPMeanReversionDetection | null {
    return this.lastDetection;
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
        deviation: detection.deviation,
        deviationBand: detection.deviationBand,
        rsi: detection.rsi,
        reversalConfirmed: detection.reversalConfirmed ? 1 : 0,
        volumeStable: detection.volumeStable ? 1 : 0,
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
        `VWAP Mean Reversion ${detection.detected ? "detected" : "not detected"} · confidence ${detection.confidence}.`
      );
    }
    lines.push(`Framework signal ${signal.signal}.`);
    return lines;
  }
}

export function createVWAPMeanReversionStrategyRegistration(
  config?: Partial<VWAPMeanReversionConfig>
) {
  return {
    id: VWAP_MEAN_REVERSION_STRATEGY_ID,
    name: VWAP_MEAN_REVERSION_STRATEGY_NAME,
    category: "Scalp" as const,
    enabled: true,
    eligibilityId: VWAP_MEAN_REVERSION_STRATEGY_ID,
    version: "11B.3D.1",
    description:
      "VWAP Mean Reversion — institutional detection only (no trade construction).",
    create: () => new VWAPMeanReversionStrategy(config),
  };
}

export function registerVWAPMeanReversionStrategy(
  registry: {
    register: (
      r: ReturnType<typeof createVWAPMeanReversionStrategyRegistration>
    ) => boolean;
  },
  config?: Partial<VWAPMeanReversionConfig>
): boolean {
  return registry.register(
    createVWAPMeanReversionStrategyRegistration(config)
  );
}
