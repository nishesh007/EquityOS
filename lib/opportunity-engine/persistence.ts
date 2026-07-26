/**
 * Opportunity Engine persistence — disk locally, in-memory on Vercel/serverless.
 * Never mkdir under process.cwd() when disk persistence is disabled.
 */

import fs from "node:fs";
import path from "node:path";
import { isDiskPersistenceEnabled } from "@/lib/platform/runtime-fs";
import type {
  OpportunityDaySnapshot,
  OpportunityEngineState,
} from "@/lib/opportunity-engine/types";

const DATA_DIR = path.join(process.cwd(), ".data", "opportunity-engine");
const STATE_FILE = path.join(DATA_DIR, "state.json");
const ARCHIVE_DIR = path.join(DATA_DIR, "archive");
const LOCK_FILE = path.join(DATA_DIR, "scheduler.lock");

const LOCK_TTL_MS = 5 * 60 * 1000;

export interface PersistedEngineData {
  state: OpportunityEngineState;
  firstDetectedMap: Record<string, string>;
}

export interface SchedulerLock {
  pid: number;
  acquiredAt: string;
  expiresAt: string;
}

/** Process-local fallbacks when the deployment FS is read-only. */
let memoryData: PersistedEngineData | null = null;
const memoryArchives = new Map<string, OpportunityDaySnapshot>();
let memoryLock: SchedulerLock | null = null;

function ensureDataDir(): boolean {
  // Hard gate — never mkdir on Vercel/read-only hosts (ENOENT under /var/task).
  if (!isDiskPersistenceEnabled()) return false;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    return true;
  } catch (error) {
    console.warn(
      "[OpportunityEngine] Disk persistence unavailable; using memory:",
      error instanceof Error ? error.message : error
    );
    return false;
  }
}

function ensureArchiveDir(): boolean {
  if (!ensureDataDir()) return false;
  try {
    if (!fs.existsSync(ARCHIVE_DIR)) {
      fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
    }
    return true;
  } catch {
    return false;
  }
}

function archiveFilePath(tradingDate: string): string {
  return path.join(ARCHIVE_DIR, `${tradingDate}.json`);
}

export function loadPersistedData(): PersistedEngineData | null {
  if (!isDiskPersistenceEnabled()) {
    return memoryData;
  }

  if (!ensureDataDir()) return memoryData;

  try {
    if (!fs.existsSync(STATE_FILE)) return memoryData;
    const raw = fs.readFileSync(STATE_FILE, "utf8");
    const parsed = JSON.parse(raw) as PersistedEngineData;
    if (!parsed?.state) return memoryData;
    memoryData = {
      state: parsed.state,
      firstDetectedMap: parsed.firstDetectedMap ?? {},
    };
    return memoryData;
  } catch {
    return memoryData;
  }
}

export function persistEngineData(data: PersistedEngineData): void {
  memoryData = data;

  if (!isDiskPersistenceEnabled()) return;
  if (!ensureDataDir()) return;

  try {
    const payload = JSON.stringify(data, null, 2);
    fs.writeFileSync(STATE_FILE, payload, "utf8");
  } catch (error) {
    console.warn(
      "[OpportunityEngine] persistEngineData disk write failed:",
      error instanceof Error ? error.message : error
    );
  }
}

export function archiveOpportunitySnapshot(snapshot: OpportunityDaySnapshot): void {
  memoryArchives.set(snapshot.tradingDate, snapshot);

  if (!isDiskPersistenceEnabled()) return;
  if (!ensureArchiveDir()) return;

  try {
    const payload = JSON.stringify(snapshot, null, 2);
    fs.writeFileSync(archiveFilePath(snapshot.tradingDate), payload, "utf8");
  } catch (error) {
    console.warn(
      "[OpportunityEngine] archive disk write failed:",
      error instanceof Error ? error.message : error
    );
  }
}

export function loadArchivedOpportunitySnapshot(
  tradingDate: string
): OpportunityDaySnapshot | null {
  const mem = memoryArchives.get(tradingDate);
  if (!isDiskPersistenceEnabled()) return mem ?? null;

  if (!ensureArchiveDir()) return mem ?? null;

  try {
    const file = archiveFilePath(tradingDate);
    if (!fs.existsSync(file)) return mem ?? null;
    const raw = fs.readFileSync(file, "utf8");
    const parsed = JSON.parse(raw) as OpportunityDaySnapshot;
    if (!parsed?.tradingDate || !parsed?.state) return mem ?? null;
    memoryArchives.set(tradingDate, parsed);
    return parsed;
  } catch {
    return mem ?? null;
  }
}

export function loadFirstDetectedMap(): Map<string, string> {
  const data = loadPersistedData();
  if (!data) return new Map();
  return new Map(Object.entries(data.firstDetectedMap));
}

export function acquireSchedulerLock(): boolean {
  const now = Date.now();

  if (!isDiskPersistenceEnabled()) {
    if (memoryLock && new Date(memoryLock.expiresAt).getTime() > now) {
      return memoryLock.pid === process.pid;
    }
    memoryLock = {
      pid: process.pid,
      acquiredAt: new Date(now).toISOString(),
      expiresAt: new Date(now + LOCK_TTL_MS).toISOString(),
    };
    return true;
  }

  if (!ensureDataDir()) {
    // Fall back to memory lock if disk cannot be prepared.
    memoryLock = {
      pid: process.pid,
      acquiredAt: new Date(now).toISOString(),
      expiresAt: new Date(now + LOCK_TTL_MS).toISOString(),
    };
    return true;
  }

  if (fs.existsSync(LOCK_FILE)) {
    try {
      const existing = JSON.parse(fs.readFileSync(LOCK_FILE, "utf8")) as SchedulerLock;
      const expiresAt = new Date(existing.expiresAt).getTime();
      if (expiresAt > now) {
        return existing.pid === process.pid;
      }
    } catch {
      // Stale or corrupt lock — overwrite below.
    }
  }

  const lock: SchedulerLock = {
    pid: process.pid,
    acquiredAt: new Date(now).toISOString(),
    expiresAt: new Date(now + LOCK_TTL_MS).toISOString(),
  };

  try {
    fs.writeFileSync(LOCK_FILE, JSON.stringify(lock, null, 2), "utf8");
    memoryLock = lock;
    return true;
  } catch {
    memoryLock = lock;
    return true;
  }
}

export function refreshSchedulerLock(): void {
  const now = Date.now();

  if (!isDiskPersistenceEnabled()) {
    if (!memoryLock || memoryLock.pid !== process.pid) return;
    memoryLock = {
      ...memoryLock,
      expiresAt: new Date(now + LOCK_TTL_MS).toISOString(),
    };
    return;
  }

  if (!fs.existsSync(LOCK_FILE)) {
    if (memoryLock?.pid === process.pid) {
      memoryLock = {
        ...memoryLock,
        expiresAt: new Date(now + LOCK_TTL_MS).toISOString(),
      };
    }
    return;
  }

  try {
    const existing = JSON.parse(fs.readFileSync(LOCK_FILE, "utf8")) as SchedulerLock;
    if (existing.pid !== process.pid) return;
    const lock: SchedulerLock = {
      pid: process.pid,
      acquiredAt: existing.acquiredAt,
      expiresAt: new Date(now + LOCK_TTL_MS).toISOString(),
    };
    fs.writeFileSync(LOCK_FILE, JSON.stringify(lock, null, 2), "utf8");
    memoryLock = lock;
  } catch {
    // Ignore lock refresh failures.
  }
}

export function releaseSchedulerLock(): void {
  if (memoryLock?.pid === process.pid) {
    memoryLock = null;
  }

  if (!isDiskPersistenceEnabled()) return;
  if (!fs.existsSync(LOCK_FILE)) return;

  try {
    const existing = JSON.parse(fs.readFileSync(LOCK_FILE, "utf8")) as SchedulerLock;
    if (existing.pid === process.pid) {
      fs.unlinkSync(LOCK_FILE);
    }
  } catch {
    // Ignore release failures.
  }
}

export function isSchedulerLockHolder(): boolean {
  const now = Date.now();

  if (!isDiskPersistenceEnabled()) {
    if (!memoryLock) return false;
    if (new Date(memoryLock.expiresAt).getTime() <= now) return false;
    return memoryLock.pid === process.pid;
  }

  if (!fs.existsSync(LOCK_FILE)) {
    if (!memoryLock) return false;
    if (new Date(memoryLock.expiresAt).getTime() <= now) return false;
    return memoryLock.pid === process.pid;
  }

  try {
    const existing = JSON.parse(fs.readFileSync(LOCK_FILE, "utf8")) as SchedulerLock;
    const expiresAt = new Date(existing.expiresAt).getTime();
    if (expiresAt <= now) return false;
    return existing.pid === process.pid;
  } catch {
    return false;
  }
}
