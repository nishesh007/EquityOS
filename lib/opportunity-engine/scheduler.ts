import { isMarketOpen, getMarketStatus } from "@/lib/market/session";
import {
  getOpportunityState,
  runOpportunityScan,
} from "@/lib/opportunity-engine/engine";
import { SCAN_INTERVAL_MS } from "@/lib/opportunity-engine/types";
import {
  acquireSchedulerLock,
  isSchedulerLockHolder,
  refreshSchedulerLock,
  releaseSchedulerLock,
} from "@/lib/opportunity-engine/persistence";

let schedulerStarted = false;
let intervalHandle: ReturnType<typeof setInterval> | null = null;
let marketCloseCheckHandle: ReturnType<typeof setInterval> | null = null;
let lockRefreshHandle: ReturnType<typeof setInterval> | null = null;

async function tickScan(): Promise<void> {
  if (!isSchedulerLockHolder()) return;
  refreshSchedulerLock();
  if (!isMarketOpen()) return;

  const state = getOpportunityState();
  if (state.isScanning) return;

  try {
    await runOpportunityScan();
  } catch (error) {
    console.error("[OpportunityEngine] Scheduled scan failed:", error);
  }
}

async function checkMarketClose(): Promise<void> {
  if (!isSchedulerLockHolder()) return;
  refreshSchedulerLock();

  const status = getMarketStatus();
  if (status !== "post_close") return;

  const state = getOpportunityState();
  if (state.isFrozen || state.isScanning) return;

  try {
    await runOpportunityScan(true);
  } catch (error) {
    console.error("[OpportunityEngine] Post-close scan failed:", error);
  }
}

export function startOpportunityScheduler(): void {
  if (schedulerStarted) return;

  const hasLock = acquireSchedulerLock();
  if (!hasLock) {
    console.info("[OpportunityEngine] Scheduler not started — another instance holds the lock");
    return;
  }

  schedulerStarted = true;

  void (async () => {
    try {
      const state = getOpportunityState();
      if (!state.lastScannedAt) {
        await runOpportunityScan(true);
      }
    } catch (error) {
      console.error("[OpportunityEngine] Initial scan failed:", error);
    }
  })();

  intervalHandle = setInterval(() => {
    void tickScan();
  }, SCAN_INTERVAL_MS);

  marketCloseCheckHandle = setInterval(() => {
    void checkMarketClose();
  }, 60_000);

  lockRefreshHandle = setInterval(() => {
    if (isSchedulerLockHolder()) {
      refreshSchedulerLock();
    }
  }, 60_000);

  console.info(
    `[OpportunityEngine] Scheduler started (pid ${process.pid}) — scanning every ${SCAN_INTERVAL_MS / 60_000} minutes during market hours`
  );
}

export function stopOpportunityScheduler(): void {
  if (intervalHandle) clearInterval(intervalHandle);
  if (marketCloseCheckHandle) clearInterval(marketCloseCheckHandle);
  if (lockRefreshHandle) clearInterval(lockRefreshHandle);
  intervalHandle = null;
  marketCloseCheckHandle = null;
  lockRefreshHandle = null;
  schedulerStarted = false;
  releaseSchedulerLock();
}
