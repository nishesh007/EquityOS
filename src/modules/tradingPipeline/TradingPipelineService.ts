/**
 * Trading Pipeline Service — Sprint 11B.2D.
 * Fetches InstitutionalMarketContext once, then runs the fixed pipeline.
 * No duplicate market-data fetching across stages.
 */

import {
  getInstitutionalMarketContext,
  type InstitutionalMarketContext,
} from "@/src/modules/marketContext";
import { getTradingPipeline, resetTradingPipeline } from "./TradingPipeline";
import type {
  PipelineMetricsSnapshot,
  PipelineValidationResult,
  TradingPipelineListener,
  TradingPipelineResult,
  TradingPipelineServiceOptions,
} from "./TradingPipelineTypes";
import { createFallbackPipelineResult } from "./TradingPipelineUtils";

export class TradingPipelineService {
  private readonly listeners = new Set<TradingPipelineListener>();
  private cache: TradingPipelineResult | null = null;
  private lastContext: InstitutionalMarketContext | null = null;
  private inflight: Promise<TradingPipelineResult> | null = null;

  /**
   * Run the full market-intelligence pipeline.
   * Context is fetched once; regime → confidence → eligibility reuse it.
   */
  async run(
    options: TradingPipelineServiceOptions = {}
  ): Promise<TradingPipelineResult> {
    if (!options.forceRefresh && this.cache) {
      return this.cache;
    }
    return this.refresh();
  }

  /**
   * Force-refresh institutional context and re-execute the pipeline.
   */
  async refresh(): Promise<TradingPipelineResult> {
    if (this.inflight) {
      return this.inflight;
    }

    this.inflight = this.computeFresh().finally(() => {
      this.inflight = null;
    });

    return this.inflight;
  }

  validate(
    result?: TradingPipelineResult | null
  ): PipelineValidationResult {
    return getTradingPipeline().validate(result ?? this.cache);
  }

  getMetrics(): PipelineMetricsSnapshot {
    return getTradingPipeline().getMetrics();
  }

  subscribe(listener: TradingPipelineListener): () => void {
    this.listeners.add(listener);
    if (this.cache) {
      listener(this.cache);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  getCachedResult(): TradingPipelineResult | null {
    return this.cache;
  }

  clearCache(): void {
    this.cache = null;
    this.lastContext = null;
    getTradingPipeline().clearCache();
  }

  private async computeFresh(): Promise<TradingPipelineResult> {
    const pipeline = getTradingPipeline();
    try {
      let context: InstitutionalMarketContext;
      try {
        context = await getInstitutionalMarketContext({ forceRefresh: true });
      } catch {
        const fallback = createFallbackPipelineResult(
          new Date(),
          "Institutional market context fetch failed — pipeline continued with fallback."
        );
        // Still attempt remaining stages via pipeline with no context injection
        // so regime/confidence/eligibility run against fallback context.
        const result = pipeline.execute({
          context: fallback.context,
          forceRefresh: true,
        });
        result.errors = dedupe([
          ...result.errors,
          "Institutional market context fetch failed.",
        ]);
        result.warnings = dedupe([
          ...result.warnings,
          "Pipeline recovered using fallback institutional context.",
        ]);
        this.cache = result;
        this.lastContext = result.context;
        this.notify(result);
        return result;
      }

      this.lastContext = context;
      const result = pipeline.execute({
        context,
        forceRefresh: true,
      });
      this.cache = result;
      this.notify(result);
      return result;
    } catch (error) {
      const reason =
        error instanceof Error
          ? error.message
          : "Trading pipeline service failed.";
      const fallback = createFallbackPipelineResult(new Date(), reason);
      this.cache = fallback;
      this.lastContext = null;
      this.notify(fallback);
      return fallback;
    }
  }

  private notify(result: TradingPipelineResult): void {
    for (const listener of this.listeners) {
      try {
        listener(result);
      } catch {
        // Listener errors must not break the service.
      }
    }
  }
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = value.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

let serviceSingleton: TradingPipelineService | null = null;

export function getTradingPipelineService(): TradingPipelineService {
  if (!serviceSingleton) {
    serviceSingleton = new TradingPipelineService();
  }
  return serviceSingleton;
}

export function resetTradingPipelineService(): void {
  if (serviceSingleton) serviceSingleton.clearCache();
  serviceSingleton = null;
  resetTradingPipeline();
}

export async function runTradingPipeline(
  options?: TradingPipelineServiceOptions
): Promise<TradingPipelineResult> {
  return getTradingPipelineService().run(options);
}

export async function refreshTradingPipeline(): Promise<TradingPipelineResult> {
  return getTradingPipelineService().refresh();
}

export function subscribeTradingPipeline(
  listener: TradingPipelineListener
): () => void {
  return getTradingPipelineService().subscribe(listener);
}

export function validateTradingPipeline(
  result?: TradingPipelineResult | null
): PipelineValidationResult {
  return getTradingPipelineService().validate(result);
}

export function getTradingPipelineMetrics(): PipelineMetricsSnapshot {
  return getTradingPipelineService().getMetrics();
}
