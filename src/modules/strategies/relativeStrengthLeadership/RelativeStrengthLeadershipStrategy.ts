/**
 * Relative Strength Leadership Strategy — Sprint 11B.3O.
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
  RELATIVE_STRENGTH_LEADERSHIP_STRATEGY_ID,
  RELATIVE_STRENGTH_LEADERSHIP_STRATEGY_NAME,
  type RelativeStrengthLeadershipConfig,
} from "./RelativeStrengthLeadershipConstants";
import { RelativeStrengthLeadershipDetector } from "./RelativeStrengthLeadershipDetector";
import { RelativeStrengthLeadershipTradeBuilder } from "./RelativeStrengthLeadershipTradeBuilder";
import type { RelativeStrengthLeadershipDetection } from "./RelativeStrengthLeadershipTypes";
import {
  isRelativeStrengthLeadershipStrategyInput,
  toRelativeStrengthLeadershipDetectionContext,
} from "./RelativeStrengthLeadershipTypes";
import {
  resolveRelativeStrengthLeadershipTradeConfig,
  type RelativeStrengthLeadershipTradeConfig,
  type RelativeStrengthLeadershipTradeSetup,
} from "./RelativeStrengthLeadershipTradeTypes";
import {
  createEmptyRelativeStrengthLeadershipDetection,
  resolveRelativeStrengthLeadershipConfig,
} from "./RelativeStrengthLeadershipUtils";
import { RelativeStrengthLeadershipValidator } from "./RelativeStrengthLeadershipValidator";

export class RelativeStrengthLeadershipStrategy extends BaseStrategy {
  readonly id = RELATIVE_STRENGTH_LEADERSHIP_STRATEGY_ID;
  readonly name = RELATIVE_STRENGTH_LEADERSHIP_STRATEGY_NAME;
  readonly category = "Swing" as const;
  readonly eligibilityId = RELATIVE_STRENGTH_LEADERSHIP_STRATEGY_ID;

  private readonly detector: RelativeStrengthLeadershipDetector;
  private readonly rsValidator: RelativeStrengthLeadershipValidator;
  private readonly tradeBuilder: RelativeStrengthLeadershipTradeBuilder;
  private readonly rsConfig: RelativeStrengthLeadershipConfig;
  private readonly tradeConfig: RelativeStrengthLeadershipTradeConfig;
  private lastDetection: RelativeStrengthLeadershipDetection | null = null;
  private lastTradeSetup: RelativeStrengthLeadershipTradeSetup | null = null;

  constructor(
    config?: Partial<RelativeStrengthLeadershipConfig>,
    tradeConfig?: Partial<RelativeStrengthLeadershipTradeConfig>
  ) {
    super();
    this.rsConfig = resolveRelativeStrengthLeadershipConfig(config);
    this.tradeConfig = resolveRelativeStrengthLeadershipTradeConfig(tradeConfig);
    this.detector = new RelativeStrengthLeadershipDetector(this.rsConfig);
    this.rsValidator = new RelativeStrengthLeadershipValidator(this.rsConfig);
    this.tradeBuilder = new RelativeStrengthLeadershipTradeBuilder(
      this.tradeConfig
    );
  }

  detect(context: StrategyExecutionContext): RelativeStrengthLeadershipDetection {
    const detectionContext =
      toRelativeStrengthLeadershipDetectionContext(context);
    if (!detectionContext) {
      const empty = createEmptyRelativeStrengthLeadershipDetection([
        "Relative Strength Leadership market data missing on strategy input.",
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
  ): RelativeStrengthLeadershipTradeSetup {
    const detection = this.lastDetection ?? this.detect(context);
    if (!isRelativeStrengthLeadershipStrategyInput(context.input)) {
      const rejected = this.tradeBuilder.build({
        detection,
        marketContext: context.marketContext,
        input: {
          symbol: context.input.symbol,
          lastPrice: context.input.lastPrice,
          relativeStrengthLeadership: {
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

  getLastDetection(): RelativeStrengthLeadershipDetection | null {
    return this.lastDetection;
  }

  getLastTradeSetup(): RelativeStrengthLeadershipTradeSetup | null {
    return this.lastTradeSetup;
  }

  override validate(
    context: StrategyExecutionContext
  ): StrategyValidationResult {
    if (!isRelativeStrengthLeadershipStrategyInput(context.input)) {
      return this.failValidation([
        "Relative Strength Leadership input requires candlesDaily / EMA / ATR / VWAP / RS payload.",
      ]);
    }
    const detectionContext =
      toRelativeStrengthLeadershipDetectionContext(context);
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
      tradeValid && setup.detection.direction === "BUY" ? "Bullish" : "Neutral";

    return {
      bias,
      score: tradeValid ? setup.qualityScore : detection.confidence,
      notes: tradeValid
        ? [
            `RS Leadership trade constructed (percentile ${setup.leadershipPercentile}).`,
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
        relativeStrengthScore: setup.relativeStrengthScore,
        relativeStrengthRank: setup.relativeStrengthRank,
        sectorRank: setup.sectorRank,
        industryRank: setup.industryRank,
        leadershipPercentile: setup.leadershipPercentile,
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
        `RelativeStrengthLeadershipTradeSetup ready — ${setup.positionType} · RR ${setup.riskReward}.`
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

export function createRelativeStrengthLeadershipStrategyRegistration(
  config?: Partial<RelativeStrengthLeadershipConfig>,
  tradeConfig?: Partial<RelativeStrengthLeadershipTradeConfig>
) {
  return {
    id: RELATIVE_STRENGTH_LEADERSHIP_STRATEGY_ID,
    name: RELATIVE_STRENGTH_LEADERSHIP_STRATEGY_NAME,
    category: "Swing" as const,
    enabled: true,
    eligibilityId: RELATIVE_STRENGTH_LEADERSHIP_STRATEGY_ID,
    version: "11B.3O",
    description:
      "Relative Strength Leadership — O'Neil / CAN SLIM institutional momentum with RS ranking.",
    create: () => new RelativeStrengthLeadershipStrategy(config, tradeConfig),
  };
}

export function registerRelativeStrengthLeadershipStrategy(
  registry: {
    register: (
      r: ReturnType<typeof createRelativeStrengthLeadershipStrategyRegistration>
    ) => boolean;
  },
  config?: Partial<RelativeStrengthLeadershipConfig>,
  tradeConfig?: Partial<RelativeStrengthLeadershipTradeConfig>
): boolean {
  return registry.register(
    createRelativeStrengthLeadershipStrategyRegistration(config, tradeConfig)
  );
}
