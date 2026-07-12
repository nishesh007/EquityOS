/**
 * Shared HTTP utilities for external API adapters.
 */

export interface FetchOptions {
  timeout?: number;
  headers?: Record<string, string>;
}

const DEFAULT_TIMEOUT_MS = 10_000;

export async function adapterFetch<T>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const timeout = options.timeout ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "EquityOS/1.0",
        ...options.headers,
      },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export function hasApiKey(key: string | undefined): key is string {
  return typeof key === "string" && key.length > 0 && key !== "your_api_key_here";
}
