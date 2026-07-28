/**
 * Central daily market state — single invalidation authority.
 *
 * Every market-derived cache must belong to exactly one NSE trading session
 * (YYYY-MM-DD). On session mismatch the manager invalidates and triggers rebuild
 * before UI consumers receive data.
 */

import {
  getTradingDateKey,
  getISTDateKey,
} from "@/lib/market/session";
import { clearMarketSnapshotCache } from "@/lib/market-orchestrator/marketsSnapshotProcessCache";
import { clearMarketIntelligenceCache } from "@/services/marketIntelligence";
import { getMarketContextService } from "@/src/modules/marketContext";
import { getMarketRegimeService } from "@/src/modules/marketRegime";
import { getTradingPipelineService } from "@/src/modules/tradingPipeline";
import { getStrategyEligibilityService } from "@/src/modules/strategyEligibility";
import { invalidateCacheByPrefix } from "@/lib/cache";
import type {
  MarketSessionEnvelope,
  MarketStatePhase,
  ModuleFreshness,
  TradingSessionId,
} from "@/lib/market/market-state-types";
import { MARKET_REBUILD_MAX_MS } from "@/lib/market/market-state-types";

export type {
  MarketSessionEnvelope,
  MarketStatePhase,
  ModuleFreshness,
  TradingSessionId,
} from "@/lib/market/market-state-types";
export { MARKET_REBUILD_MAX_MS } from "@/lib/market/market-state-types";

const IST = "Asia/Kolkata";
const NSE_CLOSE_HOUR = 15;
const NSE_CLOSE_MINUTE = 30;

let lastValidatedSessionId: TradingSessionId | null = null;
let rebuildInflight = false;
let rebuildStartedAtMs = 0;
let startupValidated = false;

/** Current NSE trading session id (same as Opportunity Engine tradingDate). */
export function getCurrentTradingSessionId(now = new Date()): TradingSessionId {
  return getTradingDateKey(now);
}

/** Calendar IST date (may differ from trading session on weekends). */
export function getCurrentCalendarDateKey(now = new Date()): string {
  return getISTDateKey(now);
}

/** 15:30 IST close for a session date. */
export function getMarketCloseTimeForSession(
  sessionDate: TradingSessionId
): string {
  return new Date(`${sessionDate}T15:30:00+05:30`).toISOString();
}

export function computeAgeMinutes(
  generatedAt: string,
  now = new Date()
): number {
  const ms = now.getTime() - new Date(generatedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return 0;
  return Math.round(ms / 60_000);
}

export function buildModuleFreshness(input: {
  sessionDate: TradingSessionId;
  generatedAt: string;
  sourceTimestamp?: string;
  now?: Date;
}): ModuleFreshness {
  const generatedAt = input.generatedAt;
  const sourceTimestamp = input.sourceTimestamp ?? generatedAt;
  return {
    sessionDate: input.sessionDate,
    generatedAt,
    marketCloseTime: getMarketCloseTimeForSession(input.sessionDate),
    sourceTimestamp,
    ageMinutes: computeAgeMinutes(generatedAt, input.now),
  };
}

/** Map an ISO timestamp to the trading session that produced it. */
export function tradingSessionFromTimestamp(
  iso: string,
  now = new Date()
): TradingSessionId {
  try {
    return getTradingDateKey(new Date(iso));
  } catch {
    return getCurrentTradingSessionId(now);
  }
}

export function isSessionCurrent(
  sessionDate: string | null | undefined,
  now = new Date()
): boolean {
  if (!sessionDate) return false;
  return sessionDate === getCurrentTradingSessionId(now);
}

export function isTimestampInCurrentSession(
  iso: string | null | undefined,
  now = new Date()
): boolean {
  if (!iso) return false;
  return tradingSessionFromTimestamp(iso, now) === getCurrentTradingSessionId(now);
}

/**
 * Invalidate all market-derived caches (single choke point).
 * Called on session boundary, startup mismatch, and before forced rebuild.
 */
export function invalidateAllMarketCaches(reason: string): void {
  clearMarketSnapshotCache();
  clearMarketIntelligenceCache();
  getMarketContextService().clearCache();
  getMarketRegimeService().clearCache();
  getTradingPipelineService().clearCache();
  getStrategyEligibilityService().clearCache();
  invalidateCacheByPrefix("market-breadth:");
  invalidateCacheByPrefix("market-heatmap:");
  invalidateCacheByPrefix("market-pulse");
  invalidateCacheByPrefix("market-indices");
  console.info(`[MarketStateManager] invalidated all market caches — ${reason}`);
}

/**
 * If cached session ≠ current session, invalidate everything.
 * Returns true when invalidation ran.
 */
export function ensureSessionAlignment(
  cachedSessionDate: string | null | undefined,
  now = new Date()
): boolean {
  const current = getCurrentTradingSessionId(now);
  if (cachedSessionDate && cachedSessionDate === current) {
    lastValidatedSessionId = current;
    return false;
  }
  if (lastValidatedSessionId === current && !cachedSessionDate) {
    return false;
  }
  invalidateAllMarketCaches(
    cachedSessionDate
      ? `session mismatch ${cachedSessionDate} → ${current}`
      : `no session on cache for ${current}`
  );
  lastValidatedSessionId = current;
  return true;
}

export function markMarketRebuildStart(): void {
  rebuildInflight = true;
  rebuildStartedAtMs = Date.now();
  console.info("[MarketState] Refresh started");
}

export function markMarketRebuildEnd(): void {
  if (rebuildInflight) {
    console.info("[MarketState] Refresh completed");
    console.info("[MarketState] Loading state cleared");
  }
  rebuildInflight = false;
  rebuildStartedAtMs = 0;
}

export function getMarketStatePhase(nowMs = Date.now()): MarketStatePhase {
  if (!rebuildInflight) return "ready";
  if (
    rebuildStartedAtMs > 0 &&
    nowMs - rebuildStartedAtMs >= MARKET_REBUILD_MAX_MS
  ) {
    rebuildInflight = false;
    rebuildStartedAtMs = 0;
    console.info("[MarketState] Refresh timed out");
    console.info("[MarketState] Loading state cleared");
    return "ready";
  }
  return "updating";
}

export function buildSessionEnvelope(input: {
  sessionDate: TradingSessionId;
  generatedAt: string;
  sourceTimestamp?: string;
  now?: Date;
}): MarketSessionEnvelope {
  const current = getCurrentTradingSessionId(input.now);
  const sessionValid = input.sessionDate === current;
  return {
    sessionId: input.sessionDate,
    phase: getMarketStatePhase(),
    freshness: buildModuleFreshness(input),
    sessionValid,
  };
}

/**
 * Gate before serving any market snapshot — invalidates stale layers,
 * marks rebuild in flight for UI.
 */
export async function ensureMarketStateForCurrentSession(): Promise<TradingSessionId> {
  const sessionId = getCurrentTradingSessionId();
  ensureSessionAlignment(lastValidatedSessionId);
  return sessionId;
}

/**
 * Startup validation — runs once per Node process on boot.
 * Invalidates stale session data without manual refresh / reseed.
 */
export function runMarketStateStartupValidation(now = new Date()): void {
  if (startupValidated) return;
  startupValidated = true;

  const sessionId = getCurrentTradingSessionId(now);
  const invalidated = ensureSessionAlignment(lastValidatedSessionId, now);
  console.info(
    `[MarketStateManager] startup validation session=${sessionId} invalidated=${invalidated}`
  );
}

/** @internal tests */
export function __resetMarketStateManagerForTests(): void {
  lastValidatedSessionId = null;
  rebuildInflight = false;
  rebuildStartedAtMs = 0;
  startupValidated = false;
}
