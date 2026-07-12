export type ProviderState =
  | "ready"
  | "disabled"
  | "success"
  | "error"
  | "not_attempted";

export interface ProviderHealth {
  provider: string;
  healthy: boolean;
  latency: number | null;
  lastSuccess: string | null;
  currentState: ProviderState;
}

interface ProviderHealthEntry {
  available: boolean;
  latency: number | null;
  lastSuccess: string | null;
  currentState: ProviderState;
}

const PROVIDERS = ["NSE", "Yahoo", "Finnhub"] as const;
const health = new Map<string, ProviderHealthEntry>();

function ensure(provider: string): ProviderHealthEntry {
  const existing = health.get(provider);
  if (existing) return existing;

  const entry: ProviderHealthEntry = {
    available: false,
    latency: null,
    lastSuccess: null,
    currentState: "not_attempted",
  };
  health.set(provider, entry);
  return entry;
}

export function setProviderAvailable(provider: string, available: boolean): void {
  const entry = ensure(provider);
  entry.available = available;
  if (!available && entry.currentState === "not_attempted") {
    entry.currentState = "disabled";
  }
  if (available && entry.currentState === "disabled") {
    entry.currentState = "ready";
  }
}

export function recordProviderSuccess(provider: string, latency: number): void {
  const entry = ensure(provider);
  entry.available = true;
  entry.latency = latency;
  entry.lastSuccess = new Date().toISOString();
  entry.currentState = "success";
}

export function recordProviderFailure(provider: string, latency: number): void {
  const entry = ensure(provider);
  entry.latency = latency;
  entry.currentState = entry.available ? "error" : "disabled";
}

export function getProviderHealth(): ProviderHealth[] {
  return PROVIDERS.map((provider) => {
    const entry = ensure(provider);
    return {
      provider,
      healthy: entry.available && entry.currentState !== "error" && entry.currentState !== "disabled",
      latency: entry.latency,
      lastSuccess: entry.lastSuccess,
      currentState: entry.currentState,
    };
  });
}
