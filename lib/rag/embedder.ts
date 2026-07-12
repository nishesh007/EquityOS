/**
 * Embedding provider — OpenAI text-embedding-3-large (configurable).
 */

import { hasApiKey } from "@/lib/adapters/http";
import { loadProviderConfig } from "@/lib/providers/config";
import {
  isEmbedderConfigured,
  loadRagConfig,
  type EmbeddingProvider,
} from "@/lib/rag/config";

export class EmbedderError extends Error {
  readonly status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "EmbedderError";
    this.status = status;
  }
}

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  provider: EmbeddingProvider;
  dimensions: number;
}

function assertEmbedderReady(): void {
  if (!isEmbedderConfigured()) {
    throw new EmbedderError(
      "Embedding provider is not configured. Set OPENAI_API_KEY and EMBEDDING_PROVIDER.",
      503
    );
  }
}

async function embedWithOpenAI(texts: string[]): Promise<number[][]> {
  const ragConfig = loadRagConfig();
  const openai = loadProviderConfig().openai;

  if (!hasApiKey(openai.apiKey)) {
    throw new EmbedderError("OPENAI_API_KEY is not configured.", 503);
  }

  const response = await fetch(`${openai.baseUrl}/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openai.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: ragConfig.embeddingModel,
      input: texts,
      dimensions: ragConfig.embeddingDimensions,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new EmbedderError(
      `Embedding request failed (${response.status})${errorBody ? `: ${errorBody.slice(0, 200)}` : ""}`,
      response.status === 401 ? 503 : 502
    );
  }

  const payload = (await response.json()) as {
    data?: Array<{ embedding: number[]; index: number }>;
  };

  const rows = payload.data ?? [];
  return rows
    .sort((a, b) => a.index - b.index)
    .map((row) => row.embedding);
}

export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  assertEmbedderReady();
  const ragConfig = loadRagConfig();
  const [embedding] = await generateEmbeddings([text]);

  return {
    embedding,
    model: ragConfig.embeddingModel,
    provider: ragConfig.embeddingProvider,
    dimensions: embedding.length,
  };
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  assertEmbedderReady();

  const sanitized = texts
    .map((text) => text.trim())
    .filter((text) => text.length > 0);

  if (sanitized.length === 0) return [];

  const ragConfig = loadRagConfig();

  if (ragConfig.embeddingProvider === "openai") {
    return embedWithOpenAI(sanitized);
  }

  throw new EmbedderError(
    `Unsupported embedding provider: ${ragConfig.embeddingProvider}`,
    503
  );
}

export async function embedQuery(query: string): Promise<number[]> {
  const result = await generateEmbedding(query);
  return result.embedding;
}
