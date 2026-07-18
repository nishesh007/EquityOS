/**
 * Earnings Momentum Strategy — Sprint 11B.3T.
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
  EARNINGS_MOMENTUM_STRATEGY_ID,
  EARNINGS_MOMENTUM_STRATEGY_NAME,
  type EarningsMomentumConfig,
} from "./EarningsMomentumConstants";
import { EarningsMomentumDetector } from "./EarningsMomentumDetector";
import { EarningsMomentumTradeBuilder } from "./EarningsMomentumTradeBuilder";
import type { EarningsMomentumDetection } from "./EarningsMomentumTypes";
import {
  isEarningsMomentumStrategyInput,
  toEarningsMomentumDetectionContext,
} from "./EarningsMomentumTypes";
import {
  resolveEarningsMomentumTradeConfig,
  type EarningsMomentumTradeConfig,
  type EarningsMomentumTradeSetup,
} from "./EarningsMomentumTradeTypes";
import {
  createEmptyEarningsMomentumDetection,
  resolveEarningsMomentumConfig,
} from "./EarningsMomentumUtils";
import { EarningsMomentumValidator } from "./EarningsMomentumValidator";

export class EarningsMomentumStrategy extends BaseStrategy {
  readonly id = EARNINGS_MOMENTUM_STRATEGY_ID;
  readonly name = EARNINGS_MOMENTUM_STRATEGY_NAME;
  readonly category = "Swing" as const;
  readonly eligibilityId = EARNINGS_MOMENTUM_STRATEGY_ID;

  private readonly detector: EarningsMomentumDetector;
  private readonly emValidator: EarningsMomentumValidator;
  private readonly tradeBuilder: EarningsMomentumTradeBuilder;
  private readonly emConfig: EarningsMomentumConfig;
  private readonly tradeConfig: EarningsMomentumTradeConfig;
  private lastDetection: EarningsMomentumDetection | null = null;
  private lastTradeSetup: EarningsMomentumTradeSetup | null = null;

  constructor(
    config?: Partial<EarningsMomentumConfig>,
    tradeConfig?: Partial<EarningsMomentumTradeConfig>
  ) {
    super();
    this.emConfig = resolveEarningsMomentumConfig(config);
    this.tradeConfig = resolveEarningsMomentumTradeConfig(tradeConfig);
    this.detector = new EarningsMomentumDetector(this.emConfig);
    this.emValidator = new EarningsMomentumValidator(this.emConfig);
    this.tradeBuilder = new EarningsMomentumTradeBuilder(this.tradeConfig);
  }

  detect(context: StrategyExecutionContext): EarningsMomentumDetection {
    const detectionContext = toEarningsMomentumDetectionContext(context);
    if (!detectionContext) {
      const empty = createEmptyEarningsMomentumDetection([
        "Earnings Momentum market data missing on strategy input.",
      ]);
      this.lastDetection = empty;
      return empty;
    }
    const detection = this.detector.detect({
      ...detectionContext,
      config: this.emConfig,
    });
    this.lastDetection = detection;
    return detection;
  }

  buildTradeSetup(
    context: StrategyExecutionContext
  ): EarningsMomentumTradeSetup {
    const detection = this.lastDetection ?? this.detect(context);
    if (!isEarningsMomentumStrategyInput(context.input)) {
      const rejected = this.tradeBuilder.build({
        detection,
        marketContext: context.marketContext,
        input: {
          symbol: context.input.symbol,
          lastPrice: context.input.lastPrice,
          earningsMomentum: {
            candlesDaily: [],
            vwap: 0,
            atr: null,
            ema20: null,
            ema50: null,
            relativeVolume: null,
            fundamentals: {
              epsActual: 0,
              epsEstimate: 0,
              revenueActual: 0,
              revenueEstimate: 0,
              guidance: "none",
            },
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

  getLastDetection(): EarningsMomentumDetection | null {
    return this.lastDetection;
  }

  getLastTradeSetup(): EarningsMomentumTradeSetup | null {
    return this.lastTradeSetup;
  }

  override validate(
    context: StrategyExecutionContext
  ): StrategyValidationResult {
    if (!isEarningsMomentumStrategyInput(context.input)) {
      return this.failValidation([
        "Earnings Momentum input requires fundamentals / candles / EMA / VWAP payload.",
      ]);
    }
    const detectionContext = toEarningsMomentumDetectionContext(context);
    const result = this.emValidator.validate(detectionContext);
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
            `Earnings Momentum ${setup.detection.direction} (EPS surprise ${setup.epsSurprise}).`,
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
        epsSurprise: setup.epsSurprise,
        revenueSurprise: setup.revenueSurprise,
        marginExpansion: setup.marginExpansion,
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
        `EarningsMomentumTradeSetup ready — ${setup.positionType} · RR ${setup.riskReward}.`
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

export function createEarningsMomentumStrategyRegistration(
  config?: Partial<EarningsMomentumConfig>,
  tradeConfig?: Partial<EarningsMomentumTradeConfig>
) {
  return {
    id: EARNINGS_MOMENTUM_STRATEGY_ID,
    name: EARNINGS_MOMENTUM_STRATEGY_NAME,
    category: "Swing" as const,
    enabled: true,
    eligibilityId: EARNINGS_MOMENTUM_STRATEGY_ID,
    version: "11B.3T",
    description:
      "Earnings Momentum — institutional EPS/revenue surprise with BUY and SELL signals.",
    create: () => new EarningsMomentumStrategy(config, tradeConfig),
  };
}

export function registerEarningsMomentumStrategy(
  registry: {
    register: (
      r: ReturnType<typeof createEarningsMomentumStrategyRegistration>
    ) => boolean;
  },
  config?: Partial<EarningsMomentumConfig>,
  tradeConfig?: Partial<EarningsMomentumTradeConfig>
): boolean {
  return registry.register(
    createEarningsMomentumStrategyRegistration(config, tradeConfig)
  );
}
