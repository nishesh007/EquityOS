/**
 * Process-level Market Snapshot cache — isolated to break circular imports
 * between marketsSnapshot and market-state-manager.
 */

import type { MarketSnapshot } from "@/lib/market-orchestrator/types";

let processSnapshot: MarketSnapshot | null = null;
let processCachedAtMs = 0;
let processInflight: Promise<MarketSnapshot> | null = null;

export function getProcessMarketSnapshot(): MarketSnapshot | null {
  return processSnapshot;
}

export function getProcessMarketSnapshotCachedAtMs(): number {
  return processCachedAtMs;
}

export function setProcessMarketSnapshot(
  snapshot: MarketSnapshot,
  cachedAtMs: number
): void {
  processSnapshot = snapshot;
  processCachedAtMs = cachedAtMs;
}

export function clearProcessMarketSnapshotFields(): void {
  processSnapshot = null;
  processCachedAtMs = 0;
}

export function getProcessMarketSnapshotInflight(): Promise<MarketSnapshot> | null {
  return processInflight;
}

export function setProcessMarketSnapshotInflight(
  inflight: Promise<MarketSnapshot> | null
): void {
  processInflight = inflight;
}

export function clearMarketSnapshotCache(): void {
  processSnapshot = null;
  processCachedAtMs = 0;
  processInflight = null;
}
