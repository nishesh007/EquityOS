/**
 * Environment validation — Zod schema for production configuration.
 */

import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_API_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  OPENAI_TIMEOUT_MS: z.coerce.number().int().min(5000).max(120000).default(45000),
  OPENAI_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(2),
  AI_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).max(1000).default(30),
  AI_MAX_PROMPT_CHARS: z.coerce.number().int().min(100).max(32000).default(8000),
  AI_CONFIDENCE_THRESHOLD: z.coerce.number().int().min(0).max(100).default(45),
  DATABASE_URL: z.string().optional(),
  EMBEDDING_PROVIDER: z.string().default("openai"),
  EMBEDDING_MODEL: z.string().default("text-embedding-3-large"),
  EMBEDDING_DIMENSIONS: z.coerce.number().int().optional(),
  RAG_TOP_K: z.coerce.number().int().min(1).max(20).default(10),
});

export type PlatformEnv = z.infer<typeof envSchema>;

let cachedEnv: PlatformEnv | null = null;

export function getPlatformEnv(): PlatformEnv {
  if (cachedEnv) return cachedEnv;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  cachedEnv = parsed.data;
  return cachedEnv;
}

export function isOpenAIConfigured(): boolean {
  const key = getPlatformEnv().OPENAI_API_KEY?.trim();
  return Boolean(key && key !== "your_api_key_here");
}

export function resetPlatformEnvCache(): void {
  cachedEnv = null;
}
