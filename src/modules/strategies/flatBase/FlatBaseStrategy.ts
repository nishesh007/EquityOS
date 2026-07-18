/**
 * Flat Base Strategy — Sprint 11B.3R.
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
  FLAT_BASE_STRATEGY_ID,
  FLAT_BASE_STRATEGY_NAME,
  type FlatBaseConfig,
} from "./FlatBaseConstants";
import { FlatBaseDetector } from "./FlatBaseDetector";
import { FlatBaseTradeBuilder } from "./FlatBaseTradeBuilder";
import type { FlatBaseDetection } from "./FlatBaseTypes";
import {
  isFlatBaseStrategyInput,
  toFlatBaseDetectionContext,
} from "./FlatBaseTypes";
import {
  resolveFlatBaseTradeConfig,
  type FlatBaseTradeConfig,
  type FlatBaseTradeSetup,
} from "./FlatBaseTradeTypes";
import {
  createEmptyFlatBaseDetection,
  resolveFlatBaseConfig,
} from "./FlatBaseUtils";
import { FlatBaseValidator } from "./FlatBaseValidator";

export class FlatBaseStrategy extends BaseStrategy {
  readonly id = FLAT_BASE_STRATEGY_ID;
  readonly name = FLAT_BASE_STRATEGY_NAME;
  readonly category = "Swing" as const;
  readonly eligibilityId = FLAT_BASE_STRATEGY_ID;

  private readonly detector: FlatBaseDetector;
  private readonly fbValidator: FlatBaseValidator;
  private readonly tradeBuilder: FlatBaseTradeBuilder;
  private readonly fbConfig: FlatBaseConfig;
  private readonly tradeConfig: FlatBaseTradeConfig;
  private lastDetection: FlatBaseDetection | null = null;
  private lastTradeSetup: FlatBaseTradeSetup | null = null;

  constructor(
    config?: Partial<FlatBaseConfig>,
    tradeConfig?: Partial<FlatBaseTradeConfig>
  ) {
    super();
    this.fbConfig = resolveFlatBaseConfig(config);
    this.tradeConfig = resolveFlatBaseTradeConfig(tradeConfig);
    this.detector = new FlatBaseDetector(this.fbConfig);
    this.fbValidator = new FlatBaseValidator(this.fbConfig);
    this.tradeBuilder = new FlatBaseTradeBuilder(this.tradeConfig);
  }

  detect(context: StrategyExecutionContext): FlatBaseDetection {
    const detectionContext = toFlatBaseDetectionContext(context);
    if (!detectionContext) {
      const empty = createEmptyFlatBaseDetection([
        "Flat Base market data missing on strategy input.",
      ]);
      this.lastDetection = empty;
      return empty;
    }
    const detection = this.detector.detect({
      ...detectionContext,
      config: this.fbConfig,
    });
    this.lastDetection = detection;
    return detection;
  }

  buildTradeSetup(context: StrategyExecutionContext): FlatBaseTradeSetup {
    const detection = this.lastDetection ?? this.detect(context);
    if (!isFlatBaseStrategyInput(context.input)) {
      const rejected = this.tradeBuilder.build({
        detection,
        marketContext: context.marketContext,
        input: {
          symbol: context.input.symbol,
          lastPrice: context.input.lastPrice,
          flatBase: {
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

  getLastDetection(): FlatBaseDetection | null {
    return this.lastDetection;
  }

  getLastTradeSetup(): FlatBaseTradeSetup | null {
    return this.lastTradeSetup;
  }

  override validate(
    context: StrategyExecutionContext
  ): StrategyValidationResult {
    if (!isFlatBaseStrategyInput(context.input)) {
      return this.failValidation([
        "Flat Base input requires candlesDaily / EMA / ATR / VWAP payload.",
      ]);
    }
    const detectionContext = toFlatBaseDetectionContext(context);
    const result = this.fbValidator.validate(detectionContext);
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
            `Flat Base trade constructed (${setup.baseDuration} sessions).`,
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
        baseDepth: setup.baseDepth,
        baseDuration: setup.baseDuration,
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
        `FlatBaseTradeSetup ready — ${setup.positionType} · RR ${setup.riskReward}.`
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

export function createFlatBaseStrategyRegistration(
  config?: Partial<FlatBaseConfig>,
  tradeConfig?: Partial<FlatBaseTradeConfig>
) {
  return {
    id: FLAT_BASE_STRATEGY_ID,
    name: FLAT_BASE_STRATEGY_NAME,
    category: "Swing" as const,
    enabled: true,
    eligibilityId: FLAT_BASE_STRATEGY_ID,
    version: "11B.3R",
    description:
      "Flat Base — William O'Neil CAN SLIM flat consolidation with institutional scoring.",
    create: () => new FlatBaseStrategy(config, tradeConfig),
  };
}

export function registerFlatBaseStrategy(
  registry: {
    register: (
      r: ReturnType<typeof createFlatBaseStrategyRegistration>
    ) => boolean;
  },
  config?: Partial<FlatBaseConfig>,
  tradeConfig?: Partial<FlatBaseTradeConfig>
): boolean {
  return registry.register(
    createFlatBaseStrategyRegistration(config, tradeConfig)
  );
}
