/**
 * Sector Rotation Strategy — Sprint 11B.3J.
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
  SECTOR_ROTATION_STRATEGY_ID,
  SECTOR_ROTATION_STRATEGY_NAME,
  type SectorRotationConfig,
} from "./SectorRotationConstants";
import { SectorRotationDetector } from "./SectorRotationDetector";
import { SectorRotationTradeBuilder } from "./SectorRotationTradeBuilder";
import type { SectorRotationDetection } from "./SectorRotationTypes";
import {
  isSectorRotationStrategyInput,
  toSectorRotationDetectionContext,
} from "./SectorRotationTypes";
import {
  resolveSectorRotationTradeConfig,
  type SectorRotationTradeConfig,
  type SectorRotationTradeSetup,
} from "./SectorRotationTradeTypes";
import {
  createEmptySectorRotationDetection,
  resolveSectorRotationConfig,
} from "./SectorRotationUtils";
import { SectorRotationValidator } from "./SectorRotationValidator";

export class SectorRotationStrategy extends BaseStrategy {
  readonly id = SECTOR_ROTATION_STRATEGY_ID;
  readonly name = SECTOR_ROTATION_STRATEGY_NAME;
  readonly category = "Intraday" as const;
  readonly eligibilityId = SECTOR_ROTATION_STRATEGY_ID;

  private readonly detector: SectorRotationDetector;
  private readonly srValidator: SectorRotationValidator;
  private readonly tradeBuilder: SectorRotationTradeBuilder;
  private readonly srConfig: SectorRotationConfig;
  private readonly tradeConfig: SectorRotationTradeConfig;
  private lastDetection: SectorRotationDetection | null = null;
  private lastTradeSetup: SectorRotationTradeSetup | null = null;

  constructor(
    config?: Partial<SectorRotationConfig>,
    tradeConfig?: Partial<SectorRotationTradeConfig>
  ) {
    super();
    this.srConfig = resolveSectorRotationConfig(config);
    this.tradeConfig = resolveSectorRotationTradeConfig(tradeConfig);
    this.detector = new SectorRotationDetector(this.srConfig);
    this.srValidator = new SectorRotationValidator(this.srConfig);
    this.tradeBuilder = new SectorRotationTradeBuilder(this.tradeConfig);
  }

  detect(context: StrategyExecutionContext): SectorRotationDetection {
    const detectionContext = toSectorRotationDetectionContext(context);
    if (!detectionContext) {
      const empty = createEmptySectorRotationDetection([
        "Sector Rotation market data missing on strategy input.",
      ]);
      this.lastDetection = empty;
      return empty;
    }
    const detection = this.detector.detect({
      ...detectionContext,
      config: this.srConfig,
    });
    this.lastDetection = detection;
    return detection;
  }

  buildTradeSetup(
    context: StrategyExecutionContext
  ): SectorRotationTradeSetup {
    const detection = this.lastDetection ?? this.detect(context);
    if (!isSectorRotationStrategyInput(context.input)) {
      const rejected = this.tradeBuilder.build({
        detection,
        marketContext: context.marketContext,
        input: {
          symbol: context.input.symbol,
          lastPrice: context.input.lastPrice,
          sectorRotation: {
            candles5m: [],
            vwap: 0,
            atr: null,
            ema20: null,
            ema50: null,
            relativeVolume: null,
            sectorName: "",
            sectorRelativeStrength: null,
            sectorMomentum: null,
            sectorBreadth: null,
            stockRelativeStrength: null,
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

  getLastDetection(): SectorRotationDetection | null {
    return this.lastDetection;
  }

  getLastTradeSetup(): SectorRotationTradeSetup | null {
    return this.lastTradeSetup;
  }

  override validate(
    context: StrategyExecutionContext
  ): StrategyValidationResult {
    if (!isSectorRotationStrategyInput(context.input)) {
      return this.failValidation([
        "Sector Rotation input requires candles5m / EMA / VWAP / sector payload.",
      ]);
    }
    const detectionContext = toSectorRotationDetectionContext(context);
    const result = this.srValidator.validate(detectionContext);
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
            `Sector Rotation trade constructed (${setup.detection.direction} · ${setup.detection.signalKind}).`,
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
        sectorRelativeStrength: detection.sectorRelativeStrength,
        sectorMomentum: detection.sectorMomentum,
        sectorBreadth: detection.sectorBreadth,
        stockRelativeStrength: detection.stockRelativeStrength,
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
        `SectorRotationTradeSetup ready — ${setup.positionType} · RR ${setup.riskReward}.`
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

export function createSectorRotationStrategyRegistration(
  config?: Partial<SectorRotationConfig>,
  tradeConfig?: Partial<SectorRotationTradeConfig>
) {
  return {
    id: SECTOR_ROTATION_STRATEGY_ID,
    name: SECTOR_ROTATION_STRATEGY_NAME,
    category: "Intraday" as const,
    enabled: true,
    eligibilityId: SECTOR_ROTATION_STRATEGY_ID,
    version: "11B.3J",
    description:
      "Sector Rotation — institutional capital flow into/out of sector leaders with scoring.",
    create: () => new SectorRotationStrategy(config, tradeConfig),
  };
}

export function registerSectorRotationStrategy(
  registry: {
    register: (
      r: ReturnType<typeof createSectorRotationStrategyRegistration>
    ) => boolean;
  },
  config?: Partial<SectorRotationConfig>,
  tradeConfig?: Partial<SectorRotationTradeConfig>
): boolean {
  return registry.register(
    createSectorRotationStrategyRegistration(config, tradeConfig)
  );
}
