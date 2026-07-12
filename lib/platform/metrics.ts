/**
 * AI latency, token usage, and cost instrumentation.
 */

import { logger } from "@/lib/platform/logger";

export interface AIMetricsRecord {
  requestId: string;
  route: string;
  model: string;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  success: boolean;
  symbol?: string | null;
}

const MODEL_COST_PER_1K: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
  "gpt-4o": { input: 0.0025, output: 0.01 },
};

function modelPricing(model: string): { input: number; output: number } {
  return MODEL_COST_PER_1K[model] ?? { input: 0.0005, output: 0.0015 };
}

export function estimateTokensFromText(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function estimateCostUsd(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const pricing = modelPricing(model);
  return (
    (promptTokens / 1000) * pricing.input + (completionTokens / 1000) * pricing.output
  );
}

export function recordAIMetrics(record: AIMetricsRecord): void {
  logger.info("ai_request_metrics", {
    requestId: record.requestId,
    route: record.route,
    model: record.model,
    durationMs: record.latencyMs,
    tokens: record.totalTokens,
    estimatedCostUsd: Number(record.estimatedCostUsd.toFixed(6)),
    symbol: record.symbol,
    success: record.success,
    promptTokens: record.promptTokens,
    completionTokens: record.completionTokens,
  });
}
