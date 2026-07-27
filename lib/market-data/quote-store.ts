/**
 * Durable local quote store — every successful quote is retained.
 * Survives process restarts via `.data/quotes/store.json`.
 *
 * Server-only — never import from Client Components or shared barrels.
 */

import "server-only";

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export interface StoredQuote {
  symbol: string;
  price: number;
  volume: number;
  /** ISO timestamp when this quote was observed. */
  timestamp: string;
  provider: string;
  /** Age in milliseconds at read time (computed). */
  age: number;
}

interface StoredQuoteRecord {
  symbol: string;
  price: number;
  volume: number;
  timestamp: string;
  provider: string;
}

const STORE_PATH = resolve(process.cwd(), ".data", "quotes", "store.json");

let memory = new Map<string, StoredQuoteRecord>();
let loaded = false;
let dirty = false;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function ensureLoaded(): void {
  if (loaded) return;
  loaded = true;
  try {
    if (!existsSync(STORE_PATH)) return;
    const raw = readFileSync(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as { quotes?: StoredQuoteRecord[] };
    if (!Array.isArray(parsed.quotes)) return;
    for (const row of parsed.quotes) {
      if (
        !row?.symbol ||
        !Number.isFinite(row.price) ||
        row.price <= 0 ||
        !row.timestamp
      ) {
        continue;
      }
      memory.set(row.symbol.toUpperCase(), {
        symbol: row.symbol.toUpperCase(),
        price: row.price,
        volume: Number.isFinite(row.volume) ? row.volume : 0,
        timestamp: row.timestamp,
        provider: row.provider || "unknown",
      });
    }
  } catch {
    memory = new Map();
  }
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushQuoteStore();
  }, 2_000);
  if (typeof flushTimer === "object" && "unref" in flushTimer) {
    flushTimer.unref();
  }
}

export function flushQuoteStore(): void {
  if (!dirty) return;
  ensureLoaded();
  try {
    mkdirSync(dirname(STORE_PATH), { recursive: true });
    const quotes = Array.from(memory.values());
    writeFileSync(
      STORE_PATH,
      JSON.stringify({ updatedAt: new Date().toISOString(), quotes }, null, 0),
      "utf8"
    );
    dirty = false;
  } catch (error) {
    console.warn(
      "[QuoteStore] flush failed:",
      error instanceof Error ? error.message : error
    );
  }
}

export function saveSuccessfulQuote(input: {
  symbol: string;
  price: number;
  volume: number;
  timestamp?: string;
  provider: string;
}): StoredQuote {
  ensureLoaded();
  const symbol = input.symbol.toUpperCase();
  const timestamp = input.timestamp ?? new Date().toISOString();
  const record: StoredQuoteRecord = {
    symbol,
    price: input.price,
    volume: Number.isFinite(input.volume) ? input.volume : 0,
    timestamp,
    provider: input.provider,
  };
  memory.set(symbol, record);
  dirty = true;
  scheduleFlush();
  return withAge(record, Date.now());
}

export function getStoredQuote(
  symbol: string,
  now = Date.now()
): StoredQuote | null {
  ensureLoaded();
  const record = memory.get(symbol.toUpperCase());
  if (!record) return null;
  return withAge(record, now);
}

export function getStoredQuoteCount(): number {
  ensureLoaded();
  return memory.size;
}

function withAge(record: StoredQuoteRecord, now: number): StoredQuote {
  const ts = new Date(record.timestamp).getTime();
  const age = Number.isFinite(ts) ? Math.max(0, now - ts) : Number.POSITIVE_INFINITY;
  return { ...record, age };
}
