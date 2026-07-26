/**
 * Opportunity Engine persistence.
 *
 * Read order (startup / cold start):
 * 1. PostgreSQL when DATABASE_URL is set (primary)
 * 2. Read-only project `.data/` (local / existing file — never mkdir on Vercel)
 * 3. Serverless scratch under os.tmpdir() (/tmp on Vercel)
 * 4. Process memory (warm L1 after any successful hydrate)
 *
 * Write order:
 * 1. Process memory
 * 2. PostgreSQL when DATABASE_URL is set (primary durable)
 * 3. /tmp scratch on serverless
 * 4. Project `.data/` only when disk persistence is enabled (never /var/task)
 */

import fs from "node:fs";
import path from "node:path";
import type { Pool } from "pg";
import {
  diskPersistenceMode,
  getServerlessScratchDir,
  isDiskPersistenceEnabled,
  isServerlessRuntime,
} from "@/lib/platform/runtime-fs";
import type {
  OpportunityDaySnapshot,
  OpportunityEngineState,
} from "@/lib/opportunity-engine/types";

const PROJECT_DATA_DIR = path.join(process.cwd(), ".data", "opportunity-engine");
const PROJECT_STATE_FILE = path.join(PROJECT_DATA_DIR, "state.json");
const PROJECT_ARCHIVE_DIR = path.join(PROJECT_DATA_DIR, "archive");
const PROJECT_LOCK_FILE = path.join(PROJECT_DATA_DIR, "scheduler.lock");

const LOCK_TTL_MS = 5 * 60 * 1000;
const PG_STATE_KEY = "opportunity-engine:state";

export interface PersistedEngineData {
  state: OpportunityEngineState;
  firstDetectedMap: Record<string, string>;
}

export interface SchedulerLock {
  pid: number;
  acquiredAt: string;
  expiresAt: string;
}

export type PersistenceSource =
  | "memory"
  | "postgres"
  | "project-data"
  | "scratch"
  | "none";

/** Process-local L1 cache. */
let memoryData: PersistedEngineData | null = null;
let memorySource: PersistenceSource = "none";
const memoryArchives = new Map<string, OpportunityDaySnapshot>();
let memoryLock: SchedulerLock | null = null;
let remoteHydratePromise: Promise<PersistedEngineData | null> | null = null;
let remoteHydrated = false;
let loggedPersistenceMode = false;
let pgPool: Pool | null = null;
let pgSchemaReady: Promise<void> | null = null;

function scratchDir(): string | null {
  return getServerlessScratchDir("opportunity-engine");
}

function scratchStateFile(): string | null {
  const dir = scratchDir();
  return dir ? path.join(dir, "state.json") : null;
}

function scratchArchiveDir(): string | null {
  const dir = scratchDir();
  return dir ? path.join(dir, "archive") : null;
}

function scratchLockFile(): string | null {
  const dir = scratchDir();
  return dir ? path.join(dir, "scheduler.lock") : null;
}

function databaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL?.trim();
  return url || undefined;
}

export function isPostgresPersistenceEnabled(): boolean {
  return Boolean(databaseUrl());
}

function logPersistenceModeOnce(): void {
  if (loggedPersistenceMode) return;
  loggedPersistenceMode = true;
  console.info(
    `[OpportunityEngine] persistence primary=${
      isPostgresPersistenceEnabled() ? "postgres" : diskPersistenceMode()
    }` +
      ` diskWrites=${isDiskPersistenceEnabled()}` +
      ` serverless=${isServerlessRuntime()}` +
      ` scratch=${scratchDir() ?? "none"}`
  );
}

function parsePersisted(raw: string): PersistedEngineData | null {
  try {
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

function readJsonFile(file: string): PersistedEngineData | null {
  try {
    if (!fs.existsSync(file)) return null;
    return parsePersisted(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function writeJsonFile(file: string, data: unknown): boolean {
  try {
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (error) {
    console.warn(
      "[OpportunityEngine] write failed:",
      file,
      error instanceof Error ? error.message : error
    );
    return false;
  }
}

function ensureProjectDataDir(): boolean {
  if (!isDiskPersistenceEnabled()) return false;
  try {
    if (!fs.existsSync(PROJECT_DATA_DIR)) {
      fs.mkdirSync(PROJECT_DATA_DIR, { recursive: true });
    }
    return true;
  } catch (error) {
    console.warn(
      "[OpportunityEngine] Disk persistence unavailable:",
      error instanceof Error ? error.message : error
    );
    return false;
  }
}

function ensureProjectArchiveDir(): boolean {
  if (!ensureProjectDataDir()) return false;
  try {
    if (!fs.existsSync(PROJECT_ARCHIVE_DIR)) {
      fs.mkdirSync(PROJECT_ARCHIVE_DIR, { recursive: true });
    }
    return true;
  } catch {
    return false;
  }
}

async function getPgPool(): Promise<Pool | null> {
  const url = databaseUrl();
  if (!url) return null;
  if (!pgPool) {
    const { Pool } = await import("pg");
    pgPool = new Pool({
      connectionString: url,
      max: 2,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 8_000,
    });
  }
  return pgPool;
}

async function ensurePgSchema(pool: Pool): Promise<void> {
  if (!pgSchemaReady) {
    pgSchemaReady = pool
      .query(
        `
        CREATE TABLE IF NOT EXISTS equityos_kv (
          key text PRIMARY KEY,
          value jsonb NOT NULL,
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `
      )
      .then(() => undefined)
      .catch((error) => {
        pgSchemaReady = null;
        throw error;
      });
  }
  await pgSchemaReady;
}

async function loadFromPostgres(): Promise<PersistedEngineData | null> {
  const pool = await getPgPool();
  if (!pool) return null;
  try {
    await ensurePgSchema(pool);
    const result = await pool.query<{ value: PersistedEngineData }>(
      `SELECT value FROM equityos_kv WHERE key = $1 LIMIT 1`,
      [PG_STATE_KEY]
    );
    const value = result.rows[0]?.value;
    if (!value?.state) return null;
    return {
      state: value.state,
      firstDetectedMap: value.firstDetectedMap ?? {},
    };
  } catch (error) {
    console.warn(
      "[OpportunityEngine] Postgres load failed:",
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

async function saveToPostgres(data: PersistedEngineData): Promise<void> {
  const pool = await getPgPool();
  if (!pool) return;
  try {
    await ensurePgSchema(pool);
    await pool.query(
      `
      INSERT INTO equityos_kv (key, value, updated_at)
      VALUES ($1, $2::jsonb, now())
      ON CONFLICT (key) DO UPDATE
        SET value = EXCLUDED.value,
            updated_at = now()
      `,
      [PG_STATE_KEY, JSON.stringify(data)]
    );
  } catch (error) {
    console.warn(
      "[OpportunityEngine] Postgres save failed:",
      error instanceof Error ? error.message : error
    );
  }
}

function adoptPersisted(
  data: PersistedEngineData,
  source: PersistenceSource
): PersistedEngineData {
  memoryData = data;
  memorySource = source;
  return data;
}

/** Sync fallbacks only — never touches Postgres. */
function hydrateLocalLayers(): PersistedEngineData | null {
  logPersistenceModeOnce();

  if (memoryData?.state) {
    return memoryData;
  }

  // Read-only project `.data` (no mkdir). Used for local development;
  // on Vercel the file is typically absent.
  const fromProject = readJsonFile(PROJECT_STATE_FILE);
  if (fromProject) {
    return adoptPersisted(fromProject, "project-data");
  }

  const scratch = scratchStateFile();
  if (scratch) {
    const fromScratch = readJsonFile(scratch);
    if (fromScratch) {
      return adoptPersisted(fromScratch, "scratch");
    }
  }

  return memoryData;
}

/**
 * Sync peek used by legacy callers. Prefer ensurePersistedDataHydrated().
 * Does not await Postgres — may return null on cold serverless until async hydrate.
 */
export function loadPersistedData(): PersistedEngineData | null {
  return hydrateLocalLayers();
}

/**
 * Startup / request hydrate — Postgres primary when DATABASE_URL is set.
 */
export async function ensurePersistedDataHydrated(): Promise<PersistedEngineData | null> {
  logPersistenceModeOnce();

  if (memoryData?.state && (remoteHydrated || !isPostgresPersistenceEnabled())) {
    return memoryData;
  }

  if (isPostgresPersistenceEnabled()) {
    if (!remoteHydratePromise) {
      remoteHydratePromise = loadFromPostgres().finally(() => {
        remoteHydratePromise = null;
      });
    }
    const remote = await remoteHydratePromise;
    remoteHydrated = true;
    if (remote?.state) {
      adoptPersisted(remote, "postgres");
      const scratch = scratchStateFile();
      if (scratch) writeJsonFile(scratch, remote);
      console.info(
        `[OpportunityEngine] hydrated from postgres candidates=${Object.values(
          remote.state.categories ?? {}
        ).reduce((n, list) => n + list.length, 0)} lastScannedAt=${
          remote.state.lastScannedAt ?? "null"
        }`
      );
      return memoryData;
    }
  }

  const local = hydrateLocalLayers();
  if (local?.state) {
    console.info(
      `[OpportunityEngine] hydrated from ${memorySource} lastScannedAt=${
        local.state.lastScannedAt ?? "null"
      }`
    );
  }
  return local;
}

export function persistEngineData(data: PersistedEngineData): void {
  adoptPersisted(data, memorySource === "none" ? "memory" : memorySource);
  if (memorySource === "none" || memorySource === "postgres") {
    memorySource = isPostgresPersistenceEnabled() ? "postgres" : "memory";
  }
  logPersistenceModeOnce();

  const candidateCount = Object.values(data.state.categories ?? {}).reduce(
    (n, list) => n + list.length,
    0
  );
  console.info(
    `[OpportunityEngine] persist store candidates=${candidateCount}` +
      ` recommendations=${data.state.recommendations?.length ?? 0}` +
      ` scanCount=${data.state.scanCount ?? 0}` +
      ` lastScannedAt=${data.state.lastScannedAt ?? "null"}` +
      ` primary=${isPostgresPersistenceEnabled() ? "postgres" : diskPersistenceMode()}`
  );

  // Primary durable write.
  if (isPostgresPersistenceEnabled()) {
    void saveToPostgres(data);
  }

  // Never write under /var/task — scratch only when project disk is disabled.
  const scratch = scratchStateFile();
  if (scratch) {
    writeJsonFile(scratch, data);
  }

  if (isDiskPersistenceEnabled() && ensureProjectDataDir()) {
    writeJsonFile(PROJECT_STATE_FILE, data);
  }
}

export function archiveOpportunitySnapshot(snapshot: OpportunityDaySnapshot): void {
  memoryArchives.set(snapshot.tradingDate, snapshot);

  if (isDiskPersistenceEnabled() && ensureProjectArchiveDir()) {
    writeJsonFile(
      path.join(PROJECT_ARCHIVE_DIR, `${snapshot.tradingDate}.json`),
      snapshot
    );
  }

  const archiveDir = scratchArchiveDir();
  if (archiveDir) {
    writeJsonFile(path.join(archiveDir, `${snapshot.tradingDate}.json`), snapshot);
  }
}

export function loadArchivedOpportunitySnapshot(
  tradingDate: string
): OpportunityDaySnapshot | null {
  const mem = memoryArchives.get(tradingDate);
  if (mem) return mem;

  const candidates = [
    path.join(PROJECT_ARCHIVE_DIR, `${tradingDate}.json`),
    scratchArchiveDir()
      ? path.join(scratchArchiveDir()!, `${tradingDate}.json`)
      : null,
  ].filter(Boolean) as string[];

  for (const file of candidates) {
    try {
      if (!fs.existsSync(file)) continue;
      const parsed = JSON.parse(
        fs.readFileSync(file, "utf8")
      ) as OpportunityDaySnapshot;
      if (!parsed?.tradingDate || !parsed?.state) continue;
      memoryArchives.set(tradingDate, parsed);
      return parsed;
    } catch {
      /* try next */
    }
  }
  return null;
}

export function loadFirstDetectedMap(): Map<string, string> {
  const data = loadPersistedData();
  if (!data) return new Map();
  return new Map(Object.entries(data.firstDetectedMap));
}

function readLockFile(file: string | null): SchedulerLock | null {
  if (!file || !fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as SchedulerLock;
  } catch {
    return null;
  }
}

export function acquireSchedulerLock(): boolean {
  const now = Date.now();

  if (memoryLock && new Date(memoryLock.expiresAt).getTime() > now) {
    return memoryLock.pid === process.pid;
  }

  const lockFiles = [
    isDiskPersistenceEnabled() ? PROJECT_LOCK_FILE : null,
    scratchLockFile(),
  ].filter(Boolean) as string[];

  for (const file of lockFiles) {
    const existing = readLockFile(file);
    if (existing && new Date(existing.expiresAt).getTime() > now) {
      return existing.pid === process.pid;
    }
  }

  const lock: SchedulerLock = {
    pid: process.pid,
    acquiredAt: new Date(now).toISOString(),
    expiresAt: new Date(now + LOCK_TTL_MS).toISOString(),
  };
  memoryLock = lock;

  if (isDiskPersistenceEnabled() && ensureProjectDataDir()) {
    writeJsonFile(PROJECT_LOCK_FILE, lock);
  }
  const scratch = scratchLockFile();
  if (scratch) writeJsonFile(scratch, lock);

  return true;
}

export function refreshSchedulerLock(): void {
  const now = Date.now();
  if (!memoryLock || memoryLock.pid !== process.pid) return;
  memoryLock = {
    ...memoryLock,
    expiresAt: new Date(now + LOCK_TTL_MS).toISOString(),
  };

  if (isDiskPersistenceEnabled() && fs.existsSync(PROJECT_LOCK_FILE)) {
    writeJsonFile(PROJECT_LOCK_FILE, memoryLock);
  }
  const scratch = scratchLockFile();
  if (scratch) writeJsonFile(scratch, memoryLock);
}

export function releaseSchedulerLock(): void {
  if (memoryLock?.pid === process.pid) {
    memoryLock = null;
  }

  for (const file of [PROJECT_LOCK_FILE, scratchLockFile()]) {
    if (!file || !fs.existsSync(file)) continue;
    try {
      const existing = readLockFile(file);
      if (existing?.pid === process.pid) fs.unlinkSync(file);
    } catch {
      /* ignore */
    }
  }
}

export function isSchedulerLockHolder(): boolean {
  const now = Date.now();
  if (memoryLock) {
    if (new Date(memoryLock.expiresAt).getTime() <= now) return false;
    return memoryLock.pid === process.pid;
  }

  for (const file of [PROJECT_LOCK_FILE, scratchLockFile()]) {
    const existing = readLockFile(file);
    if (!existing) continue;
    if (new Date(existing.expiresAt).getTime() <= now) continue;
    return existing.pid === process.pid;
  }
  return false;
}

export function peekMemoryPersistedData(): PersistedEngineData | null {
  return memoryData;
}

export function getPersistenceSource(): PersistenceSource {
  return memorySource;
}

/** Test helper — clears L1 so cold-start hydrate can be simulated. */
export function resetPersistenceMemoryForTests(): void {
  memoryData = null;
  memorySource = "none";
  remoteHydrated = false;
  remoteHydratePromise = null;
  memoryArchives.clear();
  memoryLock = null;
}
