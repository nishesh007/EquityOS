/**
 * Relative Strength Intraday Strategy — Sprint 11B.3G.
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
  RELATIVE_STRENGTH_INTRADAY_STRATEGY_ID,
  RELATIVE_STRENGTH_INTRADAY_STRATEGY_NAME,
  type RelativeStrengthIntradayConfig,
} from "./RelativeStrengthIntradayConstants";
import { RelativeStrengthIntradayDetector } from "./RelativeStrengthIntradayDetector";
import { RelativeStrengthIntradayTradeBuilder } from "./RelativeStrengthIntradayTradeBuilder";
import type { RelativeStrengthIntradayDetection } from "./RelativeStrengthIntradayTypes";
import {
  isRelativeStrengthIntradayStrategyInput,
  toRelativeStrengthIntradayDetectionContext,
} from "./RelativeStrengthIntradayTypes";
import {
  resolveRelativeStrengthIntradayTradeConfig,
  type RelativeStrengthIntradayTradeConfig,
  type RelativeStrengthIntradayTradeSetup,
} from "./RelativeStrengthIntradayTradeTypes";
import {
  createEmptyRelativeStrengthIntradayDetection,
  resolveRelativeStrengthIntradayConfig,
} from "./RelativeStrengthIntradayUtils";
import { RelativeStrengthIntradayValidator } from "./RelativeStrengthIntradayValidator";

export class RelativeStrengthIntradayStrategy extends BaseStrategy {
  readonly id = RELATIVE_STRENGTH_INTRADAY_STRATEGY_ID;
  readonly name = RELATIVE_STRENGTH_INTRADAY_STRATEGY_NAME;
  readonly category = "Intraday" as const;
  readonly eligibilityId = RELATIVE_STRENGTH_INTRADAY_STRATEGY_ID;

  private readonly detector: RelativeStrengthIntradayDetector;
  private readonly rsValidator: RelativeStrengthIntradayValidator;
  private readonly tradeBuilder: RelativeStrengthIntradayTradeBuilder;
  private readonly rsConfig: RelativeStrengthIntradayConfig;
  private readonly tradeConfig: RelativeStrengthIntradayTradeConfig;
  private lastDetection: RelativeStrengthIntradayDetection | null = null;
  private lastTradeSetup: RelativeStrengthIntradayTradeSetup | null = null;

  constructor(
    config?: Partial<RelativeStrengthIntradayConfig>,
    tradeConfig?: Partial<RelativeStrengthIntradayTradeConfig>
  ) {
    super();
    this.rsConfig = resolveRelativeStrengthIntradayConfig(config);
    this.tradeConfig = resolveRelativeStrengthIntradayTradeConfig(tradeConfig);
    this.detector = new RelativeStrengthIntradayDetector(this.rsConfig);
    this.rsValidator = new RelativeStrengthIntradayValidator(this.rsConfig);
    this.tradeBuilder = new RelativeStrengthIntradayTradeBuilder(this.tradeConfig);
  }

  detect(context: StrategyExecutionContext): RelativeStrengthIntradayDetection {
    const detectionContext = toRelativeStrengthIntradayDetectionContext(context);
    if (!detectionContext) {
      const empty = createEmptyRelativeStrengthIntradayDetection([
        "Relative Strength Intraday market data missing on strategy input.",
      ]);
      this.lastDetection = empty;
      return empty;
    }
    const detection = this.detector.detect({
      ...detectionContext,
      config: this.rsConfig,
    });
    this.lastDetection = detection;
    return detection;
  }

  buildTradeSetup(
    context: StrategyExecutionContext
  ): RelativeStrengthIntradayTradeSetup {
    const detection = this.lastDetection ?? this.detect(context);
    if (!isRelativeStrengthIntradayStrategyInput(context.input)) {
      const rejected = this.tradeBuilder.build({
        detection,
        marketContext: context.marketContext,
        input: {
          symbol: context.input.symbol,
          lastPrice: context.input.lastPrice,
          relativeStrengthIntraday: {
            candles5m: [],
            vwap: 0,
            atr: null,
            ema20: null,
            ema50: null,
            relativeVolume: null,
            stockRelativeStrength: null,
            sectorRelativeStrength: null,
            benchmarkRelativeStrength: null,
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

  getLastDetection(): RelativeStrengthIntradayDetection | null {
    return this.lastDetection;
  }

  getLastTradeSetup(): RelativeStrengthIntradayTradeSetup | null {
    return this.lastTradeSetup;
  }

  override validate(
    context: StrategyExecutionContext
  ): StrategyValidationResult {
    if (!isRelativeStrengthIntradayStrategyInput(context.input)) {
      return this.failValidation([
        "Relative Strength Intraday input requires candles5m / EMA / VWAP / RS payload.",
      ]);
    }
    const detectionContext = toRelativeStrengthIntradayDetectionContext(context);
    const result = this.rsValidator.validate(detectionContext);
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
            `Relative Strength Intraday trade constructed (${setup.detection.direction}).`,
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
        relativeStrengthScore: detection.relativeStrengthScore,
        stockRelativeStrength: detection.stockRelativeStrength,
        sectorRelativeStrength: detection.sectorRelativeStrength,
        benchmarkRelativeStrength: detection.benchmarkRelativeStrength,
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
        `RelativeStrengthIntradayTradeSetup ready — ${setup.positionType} · RR ${setup.riskReward}.`
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

export function createRelativeStrengthIntradayStrategyRegistration(
  config?: Partial<RelativeStrengthIntradayConfig>,
  tradeConfig?: Partial<RelativeStrengthIntradayTradeConfig>
) {
  return {
    id: RELATIVE_STRENGTH_INTRADAY_STRATEGY_ID,
    name: RELATIVE_STRENGTH_INTRADAY_STRATEGY_NAME,
    category: "Intraday" as const,
    enabled: true,
    eligibilityId: RELATIVE_STRENGTH_INTRADAY_STRATEGY_ID,
    version: "11B.3G",
    description:
      "Relative Strength Intraday — leadership vs sector/benchmark with institutional scoring.",
    create: () => new RelativeStrengthIntradayStrategy(config, tradeConfig),
  };
}

export function registerRelativeStrengthIntradayStrategy(
  registry: {
    register: (
      r: ReturnType<typeof createRelativeStrengthIntradayStrategyRegistration>
    ) => boolean;
  },
  config?: Partial<RelativeStrengthIntradayConfig>,
  tradeConfig?: Partial<RelativeStrengthIntradayTradeConfig>
): boolean {
  return registry.register(
    createRelativeStrengthIntradayStrategyRegistration(config, tradeConfig)
  );
}
