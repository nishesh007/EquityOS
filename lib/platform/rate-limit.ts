/**
 * In-memory rate limiter for AI API routes.
 */

import { getPlatformEnv } from "@/lib/platform/env";

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateLimitBucket>();

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(key: string): RateLimitResult {
  const limit = getPlatformEnv().AI_RATE_LIMIT_PER_MINUTE;
  const now = Date.now();
  const windowMs = 60_000;

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, limit, remaining: limit - 1, resetAt };
  }

  if (bucket.count >= limit) {
    return { allowed: false, limit, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt,
  };
}

export function peekRateLimit(key: string): RateLimitResult {
  const limit = getPlatformEnv().AI_RATE_LIMIT_PER_MINUTE;
  const now = Date.now();
  const windowMs = 60_000;
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    return { allowed: true, limit, remaining: limit, resetAt: now + windowMs };
  }

  return {
    allowed: bucket.count < limit,
    limit,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt,
  };
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}
