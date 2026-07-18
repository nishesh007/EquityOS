/**
 * Abstract BaseStrategy — Sprint 11B.3A.
 * Every EquityOS strategy inherits this identical lifecycle contract.
 */

import type { StrategyFrameworkConfig } from "./StrategyConstants";
import { StrategyLifecycle } from "./StrategyLifecycle";
import type {
  StrategyAnalysisResult,
  StrategyCategory,
  StrategyExecutionContext,
  StrategySignal,
  StrategyTargets,
  StrategyValidationResult,
} from "./StrategyTypes";
import {
  buildStrategySignal,
  calculateRiskRewardRatio,
  clampScore,
  createIgnoreSignal,
  defaultHoldingPeriod,
  emptyValidationResult,
  resolveStrategyFrameworkConfig,
} from "./StrategyUtils";

export abstract class BaseStrategy {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly category: StrategyCategory;
  /** Optional eligibility-matrix id when framework id differs. */
  readonly eligibilityId?: string;
  readonly enabled: boolean = true;

  protected context: StrategyExecutionContext | null = null;
  protected analysis: StrategyAnalysisResult | null = null;
  protected config: StrategyFrameworkConfig =
    resolveStrategyFrameworkConfig();
  private lifecycleInstance: StrategyLifecycle | null = null;

  getLifecycle(): StrategyLifecycle {
    if (!this.lifecycleInstance) {
      this.lifecycleInstance = new StrategyLifecycle(this.id);
    }
    return this.lifecycleInstance;
  }

  /**
   * Bind execution context and prepare internal state.
   */
  initialize(context: StrategyExecutionContext): void {
    this.config = resolveStrategyFrameworkConfig(context.config);
    this.context = context;
    this.analysis = null;
    this.lifecycleInstance = new StrategyLifecycle(this.id);
    this.lifecycleInstance.transition("Initialized");
    this.onInitialize(context);
  }

  /**
   * Strategy-specific validation beyond framework gates.
   */
  abstract validate(
    context: StrategyExecutionContext
  ): StrategyValidationResult;

  /**
   * Produce strategy-local analysis metrics.
   */
  abstract analyze(
    context: StrategyExecutionContext
  ): StrategyAnalysisResult;

  /**
   * Emit directional intent prior to level calculation.
   */
  abstract generateSignal(
    context: StrategyExecutionContext,
    analysis: StrategyAnalysisResult
  ): StrategySignal["signal"];

  abstract calculateEntry(
    context: StrategyExecutionContext,
    analysis: StrategyAnalysisResult
  ): number;

  abstract calculateStopLoss(
    context: StrategyExecutionContext,
    analysis: StrategyAnalysisResult,
    entry: number
  ): number;

  abstract calculateTargets(
    context: StrategyExecutionContext,
    analysis: StrategyAnalysisResult,
    entry: number,
    stopLoss: number
  ): StrategyTargets;

  abstract calculateConfidence(
    context: StrategyExecutionContext,
    analysis: StrategyAnalysisResult
  ): number;

  calculateRiskReward(
    entry: number,
    stopLoss: number,
    targets: StrategyTargets
  ): number {
    return calculateRiskRewardRatio(
      entry,
      stopLoss,
      targets.finalTarget,
      this.config
    );
  }

  /**
   * Human-readable institutional explanation bullets.
   */
  abstract explain(
    context: StrategyExecutionContext,
    analysis: StrategyAnalysisResult,
    signal: StrategySignal
  ): string[];

  /**
   * Release resources / clear transient state.
   */
  cleanup(): void {
    this.onCleanup();
    this.context = null;
    this.analysis = null;
    const lifecycle = this.getLifecycle();
    if (lifecycle.getState() !== "Disposed") {
      if (lifecycle.getState() !== "Completed") {
        lifecycle.transition("Completed");
      }
      lifecycle.dispose();
    }
  }

  /**
   * Full evaluate path used by StrategyEngine after framework validation.
   * Never throws — failures yield IGNORE.
   */
  execute(context: StrategyExecutionContext): StrategySignal {
    try {
      this.initialize(context);

      const localValidation = this.validate(context);
      if (!localValidation.valid) {
        const ignore = createIgnoreSignal({
          strategyId: this.id,
          strategyName: this.name,
          category: this.category,
          symbol: context.input.symbol,
          reasons: localValidation.errors,
          warnings: localValidation.warnings,
          timestamp: context.timestamp ?? new Date(),
          config: this.config,
          metadata: { validation: localValidation },
        });
        this.getLifecycle().dispose();
        return ignore;
      }
      this.getLifecycle().transition("Validated");

      this.analysis = this.analyze(context);
      this.getLifecycle().transition("Analyzed");

      const direction = this.generateSignal(context, this.analysis);
      if (direction === "IGNORE") {
        const ignore = createIgnoreSignal({
          strategyId: this.id,
          strategyName: this.name,
          category: this.category,
          symbol: context.input.symbol,
          reasons: this.analysis.notes.length
            ? this.analysis.notes
            : ["Strategy analysis produced IGNORE."],
          warnings: [],
          timestamp: context.timestamp ?? new Date(),
          config: this.config,
        });
        this.getLifecycle().transition("SignalGenerated");
        this.getLifecycle().transition("Completed");
        return ignore;
      }

      const entry = this.calculateEntry(context, this.analysis);
      const stopLoss = this.calculateStopLoss(context, this.analysis, entry);
      const targets = this.calculateTargets(
        context,
        this.analysis,
        entry,
        stopLoss
      );
      const confidence = clampScore(
        this.calculateConfidence(context, this.analysis),
        this.config
      );
      const riskReward = this.calculateRiskReward(entry, stopLoss, targets);
      const quality = this.calculateQuality(
        context,
        this.analysis,
        confidence,
        riskReward
      );

      let signalType = direction;
      const warnings: string[] = [];
      if (
        (signalType === "BUY" || signalType === "SELL") &&
        confidence < this.config.minimumSignalConfidence
      ) {
        signalType = "WATCHLIST";
        warnings.push("Signal confidence below actionable threshold.");
      }
      if (
        (signalType === "BUY" || signalType === "SELL") &&
        riskReward < this.config.minimumRiskReward
      ) {
        signalType = "WATCHLIST";
        warnings.push("Risk/reward below institutional minimum.");
      }

      const draft = buildStrategySignal({
        strategyId: this.id,
        strategyName: this.name,
        category: this.category,
        signal: signalType,
        symbol: context.input.symbol,
        entry,
        stopLoss,
        targets,
        confidence,
        riskReward,
        quality,
        reasons: [],
        warnings,
        holdingPeriod: defaultHoldingPeriod(this.category, this.config),
        timestamp: context.timestamp ?? new Date(),
        config: this.config,
        metadata: {
          bias: this.analysis.bias,
          analysisScore: this.analysis.score,
          metrics: this.analysis.metrics,
        },
      });

      const reasons = this.explain(context, this.analysis, draft);
      const signal: StrategySignal = { ...draft, reasons };

      this.getLifecycle().transition("SignalGenerated");
      this.getLifecycle().transition("Completed");
      return signal;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Strategy execution failed.";
      return createIgnoreSignal({
        strategyId: this.id,
        strategyName: this.name,
        category: this.category,
        symbol: context.input?.symbol ?? "UNKNOWN",
        reasons: [message],
        warnings: ["Strategy execution caught an internal error."],
        timestamp: new Date(),
        config: this.config,
      });
    }
  }

  /** Override for custom quality scoring. */
  protected calculateQuality(
    context: StrategyExecutionContext,
    analysis: StrategyAnalysisResult,
    confidence: number,
    riskReward: number
  ): number {
    const w = this.config.qualityWeights;
    const regimeBoost = clampScore(
      context.confidence.score * w.regime,
      this.config
    );
    const analysisBoost = clampScore(analysis.score * w.analysis, this.config);
    const confidenceBoost = clampScore(confidence * w.confidence, this.config);
    const rrBoost = clampScore(
      Math.min(riskReward * this.config.riskRewardQualityScale, 100) *
        w.riskReward,
      this.config
    );
    return clampScore(
      regimeBoost + analysisBoost + confidenceBoost + rrBoost,
      this.config
    );
  }

  protected onInitialize(_context: StrategyExecutionContext): void {
    // Optional hook for subclasses.
  }

  protected onCleanup(): void {
    // Optional hook for subclasses.
  }

  protected okValidation(
    warnings: string[] = []
  ): StrategyValidationResult {
    const result = emptyValidationResult(true);
    result.warnings = warnings;
    result.issues = warnings.map((message) => ({
      code: "STRATEGY_WARNING",
      severity: "warning" as const,
      message,
    }));
    return result;
  }

  protected failValidation(
    errors: string[],
    warnings: string[] = []
  ): StrategyValidationResult {
    return {
      valid: false,
      issues: [
        ...errors.map((message) => ({
          code: "STRATEGY_ERROR",
          severity: "error" as const,
          message,
        })),
        ...warnings.map((message) => ({
          code: "STRATEGY_WARNING",
          severity: "warning" as const,
          message,
        })),
      ],
      errors,
      warnings,
    };
  }
}
