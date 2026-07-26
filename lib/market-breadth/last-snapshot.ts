/**
 * Persist last usable market-breadth snapshot per universe.
 * Used as previous-session fallback when the in-memory cache is cold.
 *
 * Disk under `data/market-breadth` only when local FS is writable;
 * on Vercel/serverless uses process memory only.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { isDiskPersistenceEnabled } from "@/lib/platform/runtime-fs";
import type { MarketBreadth } from "@/types";
import type { BreadthUniverseId } from "./types";

const DATA_DIR = path.join(process.cwd(), "data", "market-breadth");
const SNAPSHOT_FILE = path.join(DATA_DIR, "last-breadth.json");

interface SnapshotStore {
  version: 1;
  byUniverse: Partial<Record<BreadthUniverseId, MarketBreadth>>;
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
    const raw = JSON.parse(readFileSync(SNAPSHOT_FILE, "utf8")) as Partial<SnapshotStore>;
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

export function readLastBreadthSnapshot(
  universe: BreadthUniverseId
): MarketBreadth | null {
  const hit = readStore().byUniverse[universe];
  return hit ?? null;
}

export function writeLastBreadthSnapshot(
  universe: BreadthUniverseId,
  breadth: MarketBreadth
): void {
  const store = readStore();
  store.byUniverse[universe] = breadth;
  writeStore(store);
}
