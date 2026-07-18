/**
 * Trading Pipeline orchestrator — Sprint 11B.2D.
 * Fixed order: Market Context → Market Regime → Confidence → Eligibility.
 * Each stage executes at most once per run. Never crashes.
 */

import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import {
  classifyMarketRegime,
  createFallbackMarketRegime,
  getRegimeConfidenceEngine,
  type MarketRegime,
  type MarketRegimeClassification,
  type RegimeConfidenceAnalysis,
} from "@/src/modules/marketRegime";
import {
  getStrategyEligibilityEngine,
  type EligibleStrategy,
} from "@/src/modules/strategyEligibility";
import { PipelineMetrics } from "./PipelineMetrics";
import { PipelineValidator } from "./PipelineValidator";
import type {
  PipelineStageName,
  PipelineStageRecord,
  TradingPipelineConfig,
  TradingPipelineResult,
  TradingPipelineRunOptions,
} from "./TradingPipelineTypes";
import { PIPELINE_STAGE_ORDER } from "./TradingPipelineTypes";
import {
  buildPipelineCacheKey,
  calculatePipelineConfidence,
  calculatePipelineHealth,
  classifyPipelineHealthGrade,
  collectPipelineWarnings,
  createFallbackInstitutionalContext,
  createFallbackPipelineResult,
  createStageRecord,
  isContextUsable,
  nowMs,
  resolveTradingPipelineConfig,
} from "./TradingPipelineUtils";

interface PipelineCacheEntry {
  key: string;
  result: TradingPipelineResult;
  storedAt: number;
}

export class TradingPipeline {
  private readonly config: TradingPipelineConfig;
  private readonly metrics = new PipelineMetrics();
  private readonly validator: PipelineValidator;
  private cache: PipelineCacheEntry | null = null;
  private lastResult: TradingPipelineResult | null = null;
  private running = false;

  constructor(
    config?: Parameters<typeof resolveTradingPipelineConfig>[0]
  ) {
    this.config = resolveTradingPipelineConfig(config);
    this.validator = new PipelineValidator(this.config);
  }

  /**
   * Execute the full pipeline synchronously from an injected context.
   * Prefer {@link TradingPipelineService.run} for live market-data fetch.
   */
  execute(options: TradingPipelineRunOptions = {}): TradingPipelineResult {
    if (this.running) {
      const degraded = createFallbackPipelineResult(
        new Date(),
        "Pipeline already running — duplicate execution prevented."
      );
      this.lastResult = degraded;
      this.metrics.recordRun(degraded, false);
      return degraded;
    }

    this.running = true;
    const started = nowMs();
    const stages: PipelineStageRecord[] = [];
    const errors: string[] = [];
    const executed = new Set<PipelineStageName>();

    try {
      // Fast path: reuse cache when injected context fingerprint matches.
      if (!options.forceRefresh && this.cache && options.context) {
        const key = buildPipelineCacheKey(options.context, options);
        const age = Date.now() - this.cache.storedAt;
        if (key === this.cache.key && age <= this.config.cacheTtlMs) {
          const cached = {
            ...this.cache.result,
            stages: this.cache.result.stages.map((s) => ({
              ...s,
              status: "cached" as const,
              cacheHit: true,
            })),
          };
          this.lastResult = cached;
          this.metrics.recordRun(cached, true);
          return cached;
        }
      }

      // ─── Stage 1: Market Context ───
      const context = this.runStageOnce(
        "Market Context",
        executed,
        stages,
        errors,
        () => this.resolveContext(options)
      );

      if (!options.forceRefresh && this.cache) {
        const key = buildPipelineCacheKey(context, options);
        const age = Date.now() - this.cache.storedAt;
        if (key === this.cache.key && age <= this.config.cacheTtlMs) {
          const cached = {
            ...this.cache.result,
            stages: this.cache.result.stages.map((s) => ({
              ...s,
              status: "cached" as const,
              cacheHit: true,
            })),
          };
          this.lastResult = cached;
          this.metrics.recordRun(cached, true);
          return cached;
        }
      }

      // ─── Stage 2: Market Regime ───
      const classification = this.runStageOnce(
        "Market Regime",
        executed,
        stages,
        errors,
        () => this.classifyRegime(context)
      );

      // ─── Stage 3: Confidence ───
      const regime = this.runStageOnce(
        "Confidence",
        executed,
        stages,
        errors,
        () => this.enrichConfidence(context, classification)
      );

      const confidence: RegimeConfidenceAnalysis =
        regime.confidenceAnalysis;

      // ─── Stage 4: Eligibility ───
      const eligibleStrategies = this.runStageOnce(
        "Eligibility",
        executed,
        stages,
        errors,
        () => this.evaluateEligibility(context, regime)
      );

      const pipelineHealth = calculatePipelineHealth({
        context,
        regime,
        confidence,
        eligibleStrategies,
        stages,
        config: this.config,
      });
      const pipelineConfidence = calculatePipelineConfidence({
        context,
        regime,
        confidence,
        eligibleStrategies,
        config: this.config,
      });

      const executionTime = roundDuration(nowMs() - started);
      const timestamp = context.timestamp ?? new Date();
      const warnings = collectPipelineWarnings(context, stages);

      const result: TradingPipelineResult = {
        context,
        regime,
        confidence,
        eligibleStrategies,
        pipelineHealth,
        healthGrade: classifyPipelineHealthGrade(pipelineHealth, this.config),
        pipelineConfidence,
        executionTime,
        warnings,
        errors: [...errors],
        timestamp,
        stages: ensureAllStages(stages),
      };

      this.cache = {
        key: buildPipelineCacheKey(context, options),
        result,
        storedAt: Date.now(),
      };
      this.lastResult = result;
      this.metrics.recordRun(result, false);
      return result;
    } catch (error) {
      const reason =
        error instanceof Error
          ? error.message
          : "Trading pipeline failed unexpectedly.";
      const fallback = createFallbackPipelineResult(new Date(), reason);
      fallback.executionTime = roundDuration(nowMs() - started);
      this.lastResult = fallback;
      this.metrics.recordRun(fallback, false);
      return fallback;
    } finally {
      this.running = false;
    }
  }

  getLastResult(): TradingPipelineResult | null {
    return this.lastResult;
  }

  getMetrics() {
    return this.metrics.getSnapshot();
  }

  validate(result?: TradingPipelineResult | null) {
    return this.validator.validate(result ?? this.lastResult);
  }

  clearCache(): void {
    this.cache = null;
  }

  reset(): void {
    this.cache = null;
    this.lastResult = null;
    this.metrics.reset();
    this.running = false;
  }

  getConfiguration(): TradingPipelineConfig {
    return resolveTradingPipelineConfig(this.config);
  }

  private resolveContext(
    options: TradingPipelineRunOptions
  ): InstitutionalMarketContext {
    if (options.context) {
      if (!isContextUsable(options.context)) {
        return createFallbackInstitutionalContext(
          options.context.timestamp ?? new Date(),
          "Injected context incomplete — neutral fallback applied."
        );
      }
      return options.context;
    }
    return createFallbackInstitutionalContext(
      new Date(),
      "No institutional context provided to synchronous pipeline — use TradingPipelineService.run() for live fetch."
    );
  }

  private classifyRegime(
    context: InstitutionalMarketContext
  ): MarketRegimeClassification {
    return classifyMarketRegime(context);
  }

  private enrichConfidence(
    context: InstitutionalMarketContext,
    classification: MarketRegimeClassification
  ): MarketRegime {
    return getRegimeConfidenceEngine().enrich(context, classification);
  }

  private evaluateEligibility(
    context: InstitutionalMarketContext,
    regime: MarketRegime
  ): EligibleStrategy[] {
    const snapshot = getStrategyEligibilityEngine().evaluate(context, regime);
    return snapshot.eligible;
  }

  /**
   * Execute a stage exactly once. On failure, record error and return fallback.
   */
  private runStageOnce<T>(
    stage: PipelineStageName,
    executed: Set<PipelineStageName>,
    stages: PipelineStageRecord[],
    errors: string[],
    fn: () => T
  ): T {
    if (executed.has(stage)) {
      const message = `Duplicate execution blocked for stage "${stage}".`;
      errors.push(message);
      stages.push(
        createStageRecord(stage, "failed", 0, { error: message })
      );
      return this.fallbackForStage(stage) as T;
    }

    const expectedOrder = PIPELINE_STAGE_ORDER.indexOf(stage);
    if (stages.length !== expectedOrder) {
      const message = `Stage "${stage}" attempted out of order.`;
      errors.push(message);
      executed.add(stage);
      stages.push(
        createStageRecord(stage, "failed", 0, { error: message })
      );
      return this.fallbackForStage(stage) as T;
    }

    executed.add(stage);
    const started = nowMs();
    try {
      const value = fn();
      stages.push(
        createStageRecord(stage, "success", nowMs() - started, {
          cacheHit: false,
        })
      );
      return value;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : `${stage} failed.`;
      errors.push(message);
      stages.push(
        createStageRecord(stage, "failed", nowMs() - started, {
          error: message,
        })
      );
      return this.fallbackForStage(stage) as T;
    }
  }

  private fallbackForStage(stage: PipelineStageName): unknown {
    const timestamp = new Date();
    switch (stage) {
      case "Market Context":
        return createFallbackInstitutionalContext(
          timestamp,
          `${stage} failed — fallback context applied.`
        );
      case "Market Regime":
        return createFallbackMarketRegime(
          timestamp,
          `${stage} failed — Sideways fallback applied.`
        );
      case "Confidence": {
        const regime = createFallbackMarketRegime(
          timestamp,
          `${stage} failed — confidence reduced.`
        );
        return regime;
      }
      case "Eligibility":
        return [] as EligibleStrategy[];
      default:
        return null;
    }
  }
}

function ensureAllStages(
  stages: PipelineStageRecord[]
): PipelineStageRecord[] {
  const byName = new Map(stages.map((s) => [s.stage, s]));
  return PIPELINE_STAGE_ORDER.map((name, order) => {
    const existing = byName.get(name);
    if (existing) return existing;
    return createStageRecord(name, "skipped", 0, {
      warning: `Stage "${name}" was not recorded.`,
    });
  }).map((stage, index) => ({ ...stage, order: index }));
}

function roundDuration(ms: number): number {
  return Math.round(ms * 100) / 100;
}

let pipelineSingleton: TradingPipeline | null = null;

export function getTradingPipeline(
  config?: Parameters<typeof resolveTradingPipelineConfig>[0]
): TradingPipeline {
  if (!pipelineSingleton) {
    pipelineSingleton = new TradingPipeline(config);
  }
  return pipelineSingleton;
}

export function resetTradingPipeline(): void {
  if (pipelineSingleton) pipelineSingleton.reset();
  pipelineSingleton = null;
}
