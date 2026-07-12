/**
 * Retry with exponential backoff.
 */

export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isRetryableHttpStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const baseDelayMs = options.baseDelayMs ?? 400;
  const maxDelayMs = options.maxDelayMs ?? 8_000;
  let lastError: unknown;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      const shouldRetry = options.shouldRetry?.(error, attempt) ?? attempt < options.maxAttempts;
      if (!shouldRetry) break;
      const delay = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      await sleep(delay);
    }
  }

  throw lastError;
}
