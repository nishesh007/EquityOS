/**
 * Circuit breaker for LLM provider failures.
 */

export type CircuitState = "closed" | "open" | "half-open";

interface CircuitBreakerState {
  state: CircuitState;
  failures: number;
  openedAt: number | null;
}

const FAILURE_THRESHOLD = 5;
const OPEN_DURATION_MS = 60_000;

const circuits = new Map<string, CircuitBreakerState>();

function getState(key: string): CircuitBreakerState {
  const existing = circuits.get(key);
  if (existing) return existing;
  const initial: CircuitBreakerState = { state: "closed", failures: 0, openedAt: null };
  circuits.set(key, initial);
  return initial;
}

export function canExecuteCircuit(key: string): boolean {
  const state = getState(key);
  if (state.state === "closed") return true;

  if (state.state === "open" && state.openedAt) {
    if (Date.now() - state.openedAt >= OPEN_DURATION_MS) {
      state.state = "half-open";
      return true;
    }
    return false;
  }

  return state.state === "half-open";
}

export function recordCircuitSuccess(key: string): void {
  circuits.set(key, { state: "closed", failures: 0, openedAt: null });
}

export function recordCircuitFailure(key: string): void {
  const state = getState(key);
  state.failures += 1;
  if (state.failures >= FAILURE_THRESHOLD) {
    state.state = "open";
    state.openedAt = Date.now();
  }
}

export function getCircuitState(key: string): CircuitState {
  return getState(key).state;
}
