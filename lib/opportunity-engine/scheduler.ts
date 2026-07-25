/**
 * Opportunity Engine Continuous Scheduler — institutional IST cadence.
 *
 * Master scan clock = scalping (every 5 minutes) during 09:00–15:30 IST
 * on trading days. Other strategies reuse the same master scan results.
 * Outside the session: no automatic scans; last successful scan is kept.
 */

import { isOpportunityScanSession } from "@/lib/market/session";
import {
  getOpportunityState,
  runOpportunityScan,
} from "@/lib/opportunity-engine/engine";
import {
  nextOpportunityScanAt,
  shouldRunOpportunityScan,
  SCALPING_SCAN_INTERVAL_MS,
} from "@/lib/opportunity-engine/scan-schedule";
import {
  acquireSchedulerLock,
  isSchedulerLockHolder,
  refreshSchedulerLock,
  releaseSchedulerLock,
} from "@/lib/opportunity-engine/persistence";
import {
  markSchedulerStarted,
  markSchedulerStopped,
  recordSchedulerFailure,
  recordSchedulerSuccess,
} from "@/lib/opportunity-engine/scheduler-observability";

/** Tick frequently; actual scans only fire on new 5-minute buckets. */
const TICK_MS = 30_000;
const LOCK_REFRESH_MS = 60_000;

let schedulerStarted = false;
let intervalHandle: ReturnType<typeof setInterval> | null = null;
let lockRefreshHandle: ReturnType<typeof setInterval> | null = null;
let softKickHandle: ReturnType<typeof setTimeout> | null = null;

async function tickScan(): Promise<void> {
  if (!isSchedulerLockHolder()) return;
  refreshSchedulerLock();

  if (!isOpportunityScanSession()) return;

  const state = getOpportunityState();
  if (state.isScanning) return;
  if (!shouldRunOpportunityScan(state.lastScannedAt)) return;

  try {
    await runOpportunityScan();
    recordSchedulerSuccess();
  } catch (error) {
    recordSchedulerFailure(error);
    console.error("[OpportunityEngine] Scheduled scan failed:", error);
  }
}

export function startOpportunityScheduler(): void {
  if (schedulerStarted) return;

  const hasLock = acquireSchedulerLock();
  if (!hasLock) {
    console.info(
      "[OpportunityEngine] Scheduler not started — another instance holds the lock"
    );
    return;
  }

  schedulerStarted = true;
  markSchedulerStarted();

  intervalHandle = setInterval(() => {
    void tickScan();
  }, TICK_MS);

  lockRefreshHandle = setInterval(() => {
    if (isSchedulerLockHolder()) {
      refreshSchedulerLock();
    }
  }, LOCK_REFRESH_MS);

  // Soft kick shortly after start so the current interval is filled without
  // blocking process boot / first paint.
  softKickHandle = setTimeout(() => {
    softKickHandle = null;
    void tickScan();
  }, 2_000);

  const next = nextOpportunityScanAt();
  console.info(
    `[OpportunityEngine] Scheduler started (pid ${process.pid}) — ` +
      `scalping ${SCALPING_SCAN_INTERVAL_MS / 60_000}m master clock during 09:00–15:30 IST` +
      (next ? `; next bucket ${next}` : "; outside scan window")
  );
}

export function stopOpportunityScheduler(): void {
  if (intervalHandle) clearInterval(intervalHandle);
  if (lockRefreshHandle) clearInterval(lockRefreshHandle);
  if (softKickHandle) clearTimeout(softKickHandle);
  intervalHandle = null;
  lockRefreshHandle = null;
  softKickHandle = null;
  schedulerStarted = false;
  markSchedulerStopped();
  releaseSchedulerLock();
}

export function isOpportunitySchedulerStarted(): boolean {
  return schedulerStarted;
}
