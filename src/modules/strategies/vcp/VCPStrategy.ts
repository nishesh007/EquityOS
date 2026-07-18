/**
 * VCP Strategy — Sprint 11B.3L.
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
  VCP_STRATEGY_ID,
  VCP_STRATEGY_NAME,
  type VCPConfig,
} from "./VCPConstants";
import { VCPDetector } from "./VCPDetector";
import { VCPTradeBuilder } from "./VCPTradeBuilder";
import type { VCPDetection } from "./VCPTypes";
import {
  isVCPStrategyInput,
  toVCPDetectionContext,
} from "./VCPTypes";
import {
  resolveVCPTradeConfig,
  type VCPTradeConfig,
  type VCPTradeSetup,
} from "./VCPTradeTypes";
import {
  createEmptyVCPDetection,
  resolveVCPConfig,
} from "./VCPUtils";
import { VCPValidator } from "./VCPValidator";

export class VCPStrategy extends BaseStrategy {
  readonly id = VCP_STRATEGY_ID;
  readonly name = VCP_STRATEGY_NAME;
  readonly category = "Swing" as const;
  readonly eligibilityId = VCP_STRATEGY_ID;

  private readonly detector: VCPDetector;
  private readonly vcpValidator: VCPValidator;
  private readonly tradeBuilder: VCPTradeBuilder;
  private readonly vcpConfig: VCPConfig;
  private readonly tradeConfig: VCPTradeConfig;
  private lastDetection: VCPDetection | null = null;
  private lastTradeSetup: VCPTradeSetup | null = null;

  constructor(
    config?: Partial<VCPConfig>,
    tradeConfig?: Partial<VCPTradeConfig>
  ) {
    super();
    this.vcpConfig = resolveVCPConfig(config);
    this.tradeConfig = resolveVCPTradeConfig(tradeConfig);
    this.detector = new VCPDetector(this.vcpConfig);
    this.vcpValidator = new VCPValidator(this.vcpConfig);
    this.tradeBuilder = new VCPTradeBuilder(this.tradeConfig);
  }

  detect(context: StrategyExecutionContext): VCPDetection {
    const detectionContext = toVCPDetectionContext(context);
    if (!detectionContext) {
      const empty = createEmptyVCPDetection([
        "VCP market data missing on strategy input.",
      ]);
      this.lastDetection = empty;
      return empty;
    }
    const detection = this.detector.detect({
      ...detectionContext,
      config: this.vcpConfig,
    });
    this.lastDetection = detection;
    return detection;
  }

  buildTradeSetup(context: StrategyExecutionContext): VCPTradeSetup {
    const detection = this.lastDetection ?? this.detect(context);
    if (!isVCPStrategyInput(context.input)) {
      const rejected = this.tradeBuilder.build({
        detection,
        marketContext: context.marketContext,
        input: {
          symbol: context.input.symbol,
          lastPrice: context.input.lastPrice,
          vcp: {
            candlesDaily: [],
            vwap: 0,
            atr: null,
            ema20: null,
            ema50: null,
            ema150: null,
            ema200: null,
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

  getLastDetection(): VCPDetection | null {
    return this.lastDetection;
  }

  getLastTradeSetup(): VCPTradeSetup | null {
    return this.lastTradeSetup;
  }

  override validate(
    context: StrategyExecutionContext
  ): StrategyValidationResult {
    if (!isVCPStrategyInput(context.input)) {
      return this.failValidation([
        "VCP input requires candlesDaily / EMA / ATR / VWAP payload.",
      ]);
    }
    const detectionContext = toVCPDetectionContext(context);
    const result = this.vcpValidator.validate(detectionContext);
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
        : "Neutral";

    return {
      bias,
      score: tradeValid ? setup.qualityScore : detection.confidence,
      notes: tradeValid
        ? [
            `VCP trade constructed (${setup.contractionCount} contractions).`,
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
        contractionCount: setup.contractionCount,
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
        conviction: setup.conviction || setup.institutionalScore?.conviction || 0,
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
        `VCPTradeSetup ready — ${setup.positionType} · RR ${setup.riskReward}.`
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

export function createVCPStrategyRegistration(
  config?: Partial<VCPConfig>,
  tradeConfig?: Partial<VCPTradeConfig>
) {
  return {
    id: VCP_STRATEGY_ID,
    name: VCP_STRATEGY_NAME,
    category: "Swing" as const,
    enabled: true,
    eligibilityId: VCP_STRATEGY_ID,
    version: "11B.3L",
    description:
      "VCP — Minervini Volatility Contraction Pattern with institutional scoring.",
    create: () => new VCPStrategy(config, tradeConfig),
  };
}

export function registerVCPStrategy(
  registry: {
    register: (
      r: ReturnType<typeof createVCPStrategyRegistration>
    ) => boolean;
  },
  config?: Partial<VCPConfig>,
  tradeConfig?: Partial<VCPTradeConfig>
): boolean {
  return registry.register(
    createVCPStrategyRegistration(config, tradeConfig)
  );
}
