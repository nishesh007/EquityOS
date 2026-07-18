/**
 * Darvas Box Strategy — Sprint 11B.3N.
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
  DARVAS_BOX_STRATEGY_ID,
  DARVAS_BOX_STRATEGY_NAME,
  type DarvasBoxConfig,
} from "./DarvasBoxConstants";
import { DarvasBoxDetector } from "./DarvasBoxDetector";
import { DarvasBoxTradeBuilder } from "./DarvasBoxTradeBuilder";
import type { DarvasBoxDetection } from "./DarvasBoxTypes";
import {
  isDarvasBoxStrategyInput,
  toDarvasBoxDetectionContext,
} from "./DarvasBoxTypes";
import {
  resolveDarvasBoxTradeConfig,
  type DarvasBoxTradeConfig,
  type DarvasBoxTradeSetup,
} from "./DarvasBoxTradeTypes";
import {
  createEmptyDarvasBoxDetection,
  resolveDarvasBoxConfig,
} from "./DarvasBoxUtils";
import { DarvasBoxValidator } from "./DarvasBoxValidator";

export class DarvasBoxStrategy extends BaseStrategy {
  readonly id = DARVAS_BOX_STRATEGY_ID;
  readonly name = DARVAS_BOX_STRATEGY_NAME;
  readonly category = "Swing" as const;
  readonly eligibilityId = DARVAS_BOX_STRATEGY_ID;

  private readonly detector: DarvasBoxDetector;
  private readonly dbValidator: DarvasBoxValidator;
  private readonly tradeBuilder: DarvasBoxTradeBuilder;
  private readonly dbConfig: DarvasBoxConfig;
  private readonly tradeConfig: DarvasBoxTradeConfig;
  private lastDetection: DarvasBoxDetection | null = null;
  private lastTradeSetup: DarvasBoxTradeSetup | null = null;

  constructor(
    config?: Partial<DarvasBoxConfig>,
    tradeConfig?: Partial<DarvasBoxTradeConfig>
  ) {
    super();
    this.dbConfig = resolveDarvasBoxConfig(config);
    this.tradeConfig = resolveDarvasBoxTradeConfig(tradeConfig);
    this.detector = new DarvasBoxDetector(this.dbConfig);
    this.dbValidator = new DarvasBoxValidator(this.dbConfig);
    this.tradeBuilder = new DarvasBoxTradeBuilder(this.tradeConfig);
  }

  detect(context: StrategyExecutionContext): DarvasBoxDetection {
    const detectionContext = toDarvasBoxDetectionContext(context);
    if (!detectionContext) {
      const empty = createEmptyDarvasBoxDetection([
        "Darvas Box market data missing on strategy input.",
      ]);
      this.lastDetection = empty;
      return empty;
    }
    const detection = this.detector.detect({
      ...detectionContext,
      config: this.dbConfig,
    });
    this.lastDetection = detection;
    return detection;
  }

  buildTradeSetup(context: StrategyExecutionContext): DarvasBoxTradeSetup {
    const detection = this.lastDetection ?? this.detect(context);
    if (!isDarvasBoxStrategyInput(context.input)) {
      const rejected = this.tradeBuilder.build({
        detection,
        marketContext: context.marketContext,
        input: {
          symbol: context.input.symbol,
          lastPrice: context.input.lastPrice,
          darvasBox: {
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

  getLastDetection(): DarvasBoxDetection | null {
    return this.lastDetection;
  }

  getLastTradeSetup(): DarvasBoxTradeSetup | null {
    return this.lastTradeSetup;
  }

  override validate(
    context: StrategyExecutionContext
  ): StrategyValidationResult {
    if (!isDarvasBoxStrategyInput(context.input)) {
      return this.failValidation([
        "Darvas Box input requires candlesDaily / EMA / ATR / VWAP payload.",
      ]);
    }
    const detectionContext = toDarvasBoxDetectionContext(context);
    const result = this.dbValidator.validate(detectionContext);
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
            `Darvas Box trade constructed (${setup.boxDuration} sessions).`,
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
        boxHigh: setup.boxHigh,
        boxLow: setup.boxLow,
        boxHeight: setup.boxHeight,
        boxDuration: setup.boxDuration,
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
        `DarvasBoxTradeSetup ready — ${setup.positionType} · RR ${setup.riskReward}.`
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

export function createDarvasBoxStrategyRegistration(
  config?: Partial<DarvasBoxConfig>,
  tradeConfig?: Partial<DarvasBoxTradeConfig>
) {
  return {
    id: DARVAS_BOX_STRATEGY_ID,
    name: DARVAS_BOX_STRATEGY_NAME,
    category: "Swing" as const,
    enabled: true,
    eligibilityId: DARVAS_BOX_STRATEGY_ID,
    version: "11B.3N",
    description:
      "Darvas Box — Nicolas Darvas consolidation breakout with institutional scoring.",
    create: () => new DarvasBoxStrategy(config, tradeConfig),
  };
}

export function registerDarvasBoxStrategy(
  registry: {
    register: (
      r: ReturnType<typeof createDarvasBoxStrategyRegistration>
    ) => boolean;
  },
  config?: Partial<DarvasBoxConfig>,
  tradeConfig?: Partial<DarvasBoxTradeConfig>
): boolean {
  return registry.register(
    createDarvasBoxStrategyRegistration(config, tradeConfig)
  );
}
