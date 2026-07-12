/**
 * Unified OpenAI client — streaming, timeout, retry, circuit breaker, metrics.
 */

import { hasApiKey } from "@/lib/adapters/http";
import { ResearchEngineError } from "@/lib/ai/core/errors";
import {
  canExecuteCircuit,
  recordCircuitFailure,
  recordCircuitSuccess,
} from "@/lib/platform/circuit-breaker";
import { getPlatformEnv, isOpenAIConfigured } from "@/lib/platform/env";
import {
  estimateCostUsd,
  estimateTokensFromText,
  recordAIMetrics,
} from "@/lib/platform/metrics";
import { withRetry, isRetryableHttpStatus } from "@/lib/platform/retry";
import { loadProviderConfig } from "@/lib/providers/config";

export interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface StreamChatOptions {
  messages: OpenAIMessage[];
  temperature?: number;
  route: string;
  requestId: string;
  symbol?: string | null;
}

const CIRCUIT_KEY = "openai-chat";

export function resolveOpenAIModel(): string {
  return getPlatformEnv().OPENAI_MODEL;
}

export async function* streamChatCompletion(
  options: StreamChatOptions
): AsyncGenerator<string> {
  if (!isOpenAIConfigured()) {
    throw new ResearchEngineError(
      "OpenAI API key is not configured. Set OPENAI_API_KEY in .env.local.",
      503
    );
  }

  if (!canExecuteCircuit(CIRCUIT_KEY)) {
    throw new ResearchEngineError(
      "AI service is temporarily unavailable due to repeated failures. Please retry shortly.",
      503
    );
  }

  const env = getPlatformEnv();
  const config = loadProviderConfig();
  const model = resolveOpenAIModel();
  const startedAt = Date.now();
  const promptText = options.messages.map((m) => m.content).join("\n");
  let completionText = "";

  try {
    const response = await withRetry(
      async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), env.OPENAI_TIMEOUT_MS);

        try {
          const result = await fetch(`${config.openai.baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${config.openai.apiKey}`,
              "Content-Type": "application/json",
            },
            signal: controller.signal,
            body: JSON.stringify({
              model,
              stream: true,
              temperature: options.temperature ?? 0.35,
              messages: options.messages,
            }),
          });
          return result;
        } finally {
          clearTimeout(timeout);
        }
      },
      {
        maxAttempts: env.OPENAI_MAX_RETRIES + 1,
        shouldRetry: (error, attempt) => {
          if (error instanceof Error && error.name === "AbortError") return attempt < env.OPENAI_MAX_RETRIES + 1;
          if (error instanceof ResearchEngineError) return false;
          return attempt < env.OPENAI_MAX_RETRIES + 1;
        },
      }
    );

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      recordCircuitFailure(CIRCUIT_KEY);
      throw new ResearchEngineError(
        `OpenAI request failed (${response.status})${errorBody ? `: ${errorBody.slice(0, 200)}` : ""}`,
        isRetryableHttpStatus(response.status) ? 502 : response.status === 401 ? 503 : 400
      );
    }

    if (!response.body) {
      recordCircuitFailure(CIRCUIT_KEY);
      throw new ResearchEngineError("OpenAI returned an empty response body.", 502);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;

        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") break;

        try {
          const parsed = JSON.parse(payload) as {
            choices?: Array<{ delta?: { content?: string } }>;
          };
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            completionText += content;
            yield content;
          }
        } catch {
          // Skip malformed SSE chunks.
        }
      }
    }

    recordCircuitSuccess(CIRCUIT_KEY);

    const promptTokens = estimateTokensFromText(promptText);
    const completionTokens = estimateTokensFromText(completionText);
    recordAIMetrics({
      requestId: options.requestId,
      route: options.route,
      model,
      latencyMs: Date.now() - startedAt,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      estimatedCostUsd: estimateCostUsd(model, promptTokens, completionTokens),
      success: true,
      symbol: options.symbol,
    });
  } catch (error) {
    recordCircuitFailure(CIRCUIT_KEY);
    recordAIMetrics({
      requestId: options.requestId,
      route: options.route,
      model,
      latencyMs: Date.now() - startedAt,
      promptTokens: estimateTokensFromText(promptText),
      completionTokens: estimateTokensFromText(completionText),
      totalTokens: estimateTokensFromText(promptText) + estimateTokensFromText(completionText),
      estimatedCostUsd: 0,
      success: false,
      symbol: options.symbol,
    });

    if (error instanceof ResearchEngineError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new ResearchEngineError("OpenAI request timed out.", 504);
    }
    throw new ResearchEngineError(
      error instanceof Error ? error.message : "OpenAI request failed.",
      502
    );
  }
}

export function assertOpenAIReady(): void {
  if (!hasApiKey(loadProviderConfig().openai.apiKey) && !isOpenAIConfigured()) {
    throw new ResearchEngineError(
      "OpenAI API key is not configured. Set OPENAI_API_KEY in .env.local.",
      503
    );
  }
}
