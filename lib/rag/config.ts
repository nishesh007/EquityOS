/**
 * RAG configuration — environment-driven embedding and vector store settings.
 */

import { hasApiKey } from "@/lib/adapters/http";
import { loadProviderConfig } from "@/lib/providers/config";

export type EmbeddingProvider = "openai";

export interface RagConfig {
  databaseUrl?: string;
  embeddingProvider: EmbeddingProvider;
  embeddingModel: string;
  embeddingDimensions: number;
  topK: number;
}

function env(key: string, fallback = ""): string {
  return process.env[key]?.trim() ?? fallback;
}

function envInt(key: string, fallback: number): number {
  const raw = env(key);
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function loadRagConfig(): RagConfig {
  return {
    databaseUrl: env("DATABASE_URL") || undefined,
    embeddingProvider: (env("EMBEDDING_PROVIDER", "openai") as EmbeddingProvider),
    embeddingModel: env("EMBEDDING_MODEL", "text-embedding-3-large"),
    embeddingDimensions: envInt("EMBEDDING_DIMENSIONS", 3072),
    topK: envInt("RAG_TOP_K", 10),
  };
}

export function isVectorStoreConfigured(): boolean {
  const url = loadRagConfig().databaseUrl;
  return typeof url === "string" && url.length > 0;
}

export function isEmbedderConfigured(): boolean {
  const config = loadRagConfig();
  if (config.embeddingProvider === "openai") {
    return hasApiKey(loadProviderConfig().openai.apiKey);
  }
  return false;
}

export function isRagConfigured(): boolean {
  return isVectorStoreConfigured() && isEmbedderConfigured();
}
