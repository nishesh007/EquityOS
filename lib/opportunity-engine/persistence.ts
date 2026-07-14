import fs from "node:fs";
import path from "node:path";
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

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function ensureArchiveDir(): void {
  ensureDataDir();
  if (!fs.existsSync(ARCHIVE_DIR)) {
    fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  }
}

function archiveFilePath(tradingDate: string): string {
  return path.join(ARCHIVE_DIR, `${tradingDate}.json`);
}

export function loadPersistedData(): PersistedEngineData | null {
  ensureDataDir();
  try {
    if (!fs.existsSync(STATE_FILE)) return null;
    const raw = fs.readFileSync(STATE_FILE, "utf8");
    const parsed = JSON.parse(raw) as PersistedEngineData;
    if (!parsed?.state) return null;
    return {
      state: parsed.state,
      firstDetectedMap: parsed.firstDetectedMap ?? {},
    };
  } catch {
    return null;
  }
}

export function persistEngineData(data: PersistedEngineData): void {
  ensureDataDir();
  const payload = JSON.stringify(data, null, 2);
  fs.writeFileSync(STATE_FILE, payload, "utf8");
}

export function archiveOpportunitySnapshot(snapshot: OpportunityDaySnapshot): void {
  ensureArchiveDir();
  const payload = JSON.stringify(snapshot, null, 2);
  fs.writeFileSync(archiveFilePath(snapshot.tradingDate), payload, "utf8");
}

export function loadArchivedOpportunitySnapshot(
  tradingDate: string
): OpportunityDaySnapshot | null {
  ensureArchiveDir();
  try {
    const file = archiveFilePath(tradingDate);
    if (!fs.existsSync(file)) return null;
    const raw = fs.readFileSync(file, "utf8");
    const parsed = JSON.parse(raw) as OpportunityDaySnapshot;
    if (!parsed?.tradingDate || !parsed?.state) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function loadFirstDetectedMap(): Map<string, string> {
  const data = loadPersistedData();
  if (!data) return new Map();
  return new Map(Object.entries(data.firstDetectedMap));
}

export function acquireSchedulerLock(): boolean {
  ensureDataDir();
  const now = Date.now();

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

  fs.writeFileSync(LOCK_FILE, JSON.stringify(lock, null, 2), "utf8");
  return true;
}

export function refreshSchedulerLock(): void {
  if (!fs.existsSync(LOCK_FILE)) return;
  try {
    const existing = JSON.parse(fs.readFileSync(LOCK_FILE, "utf8")) as SchedulerLock;
    if (existing.pid !== process.pid) return;
    const now = Date.now();
    const lock: SchedulerLock = {
      pid: process.pid,
      acquiredAt: existing.acquiredAt,
      expiresAt: new Date(now + LOCK_TTL_MS).toISOString(),
    };
    fs.writeFileSync(LOCK_FILE, JSON.stringify(lock, null, 2), "utf8");
  } catch {
    // Ignore lock refresh failures.
  }
}

export function releaseSchedulerLock(): void {
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
  if (!fs.existsSync(LOCK_FILE)) return false;
  try {
    const existing = JSON.parse(fs.readFileSync(LOCK_FILE, "utf8")) as SchedulerLock;
    const expiresAt = new Date(existing.expiresAt).getTime();
    if (expiresAt <= Date.now()) return false;
    return existing.pid === process.pid;
  } catch {
    return false;
  }
}
