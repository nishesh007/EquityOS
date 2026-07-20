/**
 * Request-scoped in-flight Promise deduplication.
 * No TTL, no persistence, no long-lived cache — only coalesce concurrent callers.
 */

const inFlight = new Map<string, Promise<unknown>>();

/**
 * If a request with the same key is already in flight, return that Promise.
 * Otherwise run `factory`, share the Promise with concurrent callers, and
 * clear the entry automatically on settle (success or failure).
 */
export function dedupeInFlight<T>(
  key: string,
  factory: () => Promise<T>
): Promise<T> {
  const pending = inFlight.get(key);
  if (pending) {
    return pending as Promise<T>;
  }

  const promise = factory().finally(() => {
    inFlight.delete(key);
  });

  inFlight.set(key, promise);
  return promise;
}

/** Test / diagnostics helper — not part of the public orchestrator API. */
export function clearInFlightDedup(): void {
  inFlight.clear();
}
