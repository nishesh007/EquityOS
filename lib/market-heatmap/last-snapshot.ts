/**
 * Persist last usable market-heatmap snapshot per universe.
 * Previous-session fallback when the in-memory cache is cold —
 * mirrors market-breadth last-snapshot (no OE coupling).
 *
 * SERVER ONLY — never import from Client Components or client barrels
 * (`lib/market-heatmap/index.ts` must not re-export this module).
 *
 * Disk under `data/market-heatmap` only when local FS is writable;
 * on Vercel/serverless uses process memory only.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { isDiskPersistenceEnabled } from "@/lib/platform/runtime-fs";
import type { HeatmapUniverseId, MarketHeatmapSnapshot } from "./types";

const DATA_DIR = path.join(process.cwd(), "data", "market-heatmap");
const SNAPSHOT_FILE = path.join(DATA_DIR, "last-heatmap.json");

interface SnapshotStore {
  version: 1;
  byUniverse: Partial<Record<HeatmapUniverseId, MarketHeatmapSnapshot>>;
}

let memoryStore: SnapshotStore = { version: 1, byUniverse: {} };

function readStore(): SnapshotStore {
  if (!isDiskPersistenceEnabled()) {
    return memoryStore;
  }

  try {
    if (!existsSync(SNAPSHOT_FILE)) {
      return memoryStore;
    }
    const raw = JSON.parse(
      readFileSync(SNAPSHOT_FILE, "utf8")
    ) as Partial<SnapshotStore>;
    memoryStore = {
      version: 1,
      byUniverse: { ...memoryStore.byUniverse, ...(raw.byUniverse ?? {}) },
    };
    return memoryStore;
  } catch {
    return memoryStore;
  }
}

function writeStore(store: SnapshotStore): void {
  memoryStore = store;
  if (!isDiskPersistenceEnabled()) return;

  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(SNAPSHOT_FILE, JSON.stringify(store), "utf8");
  } catch {
    /* degrade gracefully — live / memory cache still work */
  }
}

export function isUsableHeatmapSnapshot(
  snapshot: MarketHeatmapSnapshot | null | undefined
): boolean {
  if (!snapshot) return false;
  return (
    (snapshot.sectors?.length ?? 0) > 0 &&
    (snapshot.quotedStocks ?? 0) > 0
  );
}

export function readLastHeatmapSnapshot(
  universe: HeatmapUniverseId
): MarketHeatmapSnapshot | null {
  return readStore().byUniverse[universe] ?? null;
}

export function writeLastHeatmapSnapshot(
  universe: HeatmapUniverseId,
  snapshot: MarketHeatmapSnapshot
): void {
  if (!isUsableHeatmapSnapshot(snapshot)) return;
  const store = readStore();
  store.byUniverse[universe] = snapshot;
  writeStore(store);
}
