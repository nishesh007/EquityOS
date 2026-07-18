/**
 * Stage Analysis Strategy — Sprint 11B.3M.
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
  STAGE_ANALYSIS_STRATEGY_ID,
  STAGE_ANALYSIS_STRATEGY_NAME,
  type StageAnalysisConfig,
} from "./StageAnalysisConstants";
import { StageAnalysisDetector } from "./StageAnalysisDetector";
import { StageAnalysisTradeBuilder } from "./StageAnalysisTradeBuilder";
import type { StageAnalysisDetection } from "./StageAnalysisTypes";
import {
  isStageAnalysisStrategyInput,
  toStageAnalysisDetectionContext,
} from "./StageAnalysisTypes";
import {
  resolveStageAnalysisTradeConfig,
  type StageAnalysisTradeConfig,
  type StageAnalysisTradeSetup,
} from "./StageAnalysisTradeTypes";
import {
  createEmptyStageAnalysisDetection,
  resolveStageAnalysisConfig,
} from "./StageAnalysisUtils";
import { StageAnalysisValidator } from "./StageAnalysisValidator";

export class StageAnalysisStrategy extends BaseStrategy {
  readonly id = STAGE_ANALYSIS_STRATEGY_ID;
  readonly name = STAGE_ANALYSIS_STRATEGY_NAME;
  readonly category = "Swing" as const;
  readonly eligibilityId = STAGE_ANALYSIS_STRATEGY_ID;

  private readonly detector: StageAnalysisDetector;
  private readonly saValidator: StageAnalysisValidator;
  private readonly tradeBuilder: StageAnalysisTradeBuilder;
  private readonly saConfig: StageAnalysisConfig;
  private readonly tradeConfig: StageAnalysisTradeConfig;
  private lastDetection: StageAnalysisDetection | null = null;
  private lastTradeSetup: StageAnalysisTradeSetup | null = null;

  constructor(
    config?: Partial<StageAnalysisConfig>,
    tradeConfig?: Partial<StageAnalysisTradeConfig>
  ) {
    super();
    this.saConfig = resolveStageAnalysisConfig(config);
    this.tradeConfig = resolveStageAnalysisTradeConfig(tradeConfig);
    this.detector = new StageAnalysisDetector(this.saConfig);
    this.saValidator = new StageAnalysisValidator(this.saConfig);
    this.tradeBuilder = new StageAnalysisTradeBuilder(this.tradeConfig);
  }

  detect(context: StrategyExecutionContext): StageAnalysisDetection {
    const detectionContext = toStageAnalysisDetectionContext(context);
    if (!detectionContext) {
      const empty = createEmptyStageAnalysisDetection([
        "Stage Analysis market data missing on strategy input.",
      ]);
      this.lastDetection = empty;
      return empty;
    }
    const detection = this.detector.detect({
      ...detectionContext,
      config: this.saConfig,
    });
    this.lastDetection = detection;
    return detection;
  }

  buildTradeSetup(context: StrategyExecutionContext): StageAnalysisTradeSetup {
    const detection = this.lastDetection ?? this.detect(context);
    if (!isStageAnalysisStrategyInput(context.input)) {
      const rejected = this.tradeBuilder.build({
        detection,
        marketContext: context.marketContext,
        input: {
          symbol: context.input.symbol,
          lastPrice: context.input.lastPrice,
          stageAnalysis: {
            candlesDaily: [],
            candlesWeekly: [],
            ma30Week: null,
            ema20: null,
            ema50: null,
            ema150: null,
            ema200: null,
            vwap: 0,
            atr: null,
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

  getLastDetection(): StageAnalysisDetection | null {
    return this.lastDetection;
  }

  getLastTradeSetup(): StageAnalysisTradeSetup | null {
    return this.lastTradeSetup;
  }

  override validate(
    context: StrategyExecutionContext
  ): StrategyValidationResult {
    if (!isStageAnalysisStrategyInput(context.input)) {
      return this.failValidation([
        "Stage Analysis input requires weekly/daily OHLC / 30W MA / EMA / VWAP payload.",
      ]);
    }
    const detectionContext = toStageAnalysisDetectionContext(context);
    const result = this.saValidator.validate(detectionContext);
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
            `Stage Analysis trade constructed (Stage ${setup.stage} · ${setup.detection.direction}).`,
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
        stage: setup.stage,
        previousStage: setup.previousStage,
        transitionConfidence: setup.transitionConfidence,
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
        `StageAnalysisTradeSetup ready — Stage ${setup.stage} · RR ${setup.riskReward}.`
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

export function createStageAnalysisStrategyRegistration(
  config?: Partial<StageAnalysisConfig>,
  tradeConfig?: Partial<StageAnalysisTradeConfig>
) {
  return {
    id: STAGE_ANALYSIS_STRATEGY_ID,
    name: STAGE_ANALYSIS_STRATEGY_NAME,
    category: "Swing" as const,
    enabled: true,
    eligibilityId: STAGE_ANALYSIS_STRATEGY_ID,
    version: "11B.3M",
    description:
      "Stage Analysis — Stan Weinstein stages with institutional scoring.",
    create: () => new StageAnalysisStrategy(config, tradeConfig),
  };
}

export function registerStageAnalysisStrategy(
  registry: {
    register: (
      r: ReturnType<typeof createStageAnalysisStrategyRegistration>
    ) => boolean;
  },
  config?: Partial<StageAnalysisConfig>,
  tradeConfig?: Partial<StageAnalysisTradeConfig>
): boolean {
  return registry.register(
    createStageAnalysisStrategyRegistration(config, tradeConfig)
  );
}
