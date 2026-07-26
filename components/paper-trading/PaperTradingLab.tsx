"use client";

import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { PaperLabWorkspaceNav } from "@/components/paper-trading/PaperLabWorkspaceNav";
import { PaperLabModulePanel } from "@/components/paper-trading/PaperLabModulePanel";
import { PaperLabModuleSkeleton } from "@/components/paper-trading/PaperLabModuleSkeleton";
import { PaperLabErrorState } from "@/components/paper-trading/PaperLabErrorState";
import { PaperLabOverviewModule } from "@/components/paper-trading/PaperLabOverviewModule";
import { PaperLabActiveModule } from "@/components/paper-trading/PaperLabActiveModule";
import { PaperLabClosedModule } from "@/components/paper-trading/PaperLabClosedModule";
import { PaperTradeDrawer } from "@/components/paper-trading/PaperTradeDrawer";
import {
  isPaperLabModuleId,
  type PaperLabModuleId,
} from "@/components/paper-trading/labModules";
import { PAPER_TRADING_CONFIG } from "@/lib/paper-trading/config";
import type {
  PaperStrategy,
  PaperTrade,
  PaperTradingDashboard,
} from "@/lib/paper-trading/types";
import { cn } from "@/lib/utils";
import { FOCUS_RING_CLASS } from "@/src/design/motion/motionPresets";

const PaperPerformanceAnalytics = lazy(() =>
  import("@/components/paper-trading/PaperPerformanceAnalytics").then(
    (m) => ({ default: m.PaperPerformanceAnalytics })
  )
);

const PaperAiIntelligenceDashboard = lazy(() =>
  import("@/components/paper-trading/PaperAiIntelligenceDashboard").then(
    (m) => ({ default: m.PaperAiIntelligenceDashboard })
  )
);

interface PaperTradingLabProps {
  initialDashboard: PaperTradingDashboard;
}

async function fetchSync(): Promise<PaperTradingDashboard> {
  const res = await fetch("/api/paper-trading/sync", {
    method: "POST",
    cache: "no-store",
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(body?.error ?? "Unable to sync the paper trading engine.");
  }
  return res.json() as Promise<PaperTradingDashboard>;
}

function resolveModule(view: string | null): PaperLabModuleId {
  return isPaperLabModuleId(view) ? view : "overview";
}

export function PaperTradingLab({ initialDashboard }: PaperTradingLabProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeModule = resolveModule(searchParams.get("view"));

  const [dashboard, setDashboard] = useState(initialDashboard);
  const [strategyTab, setStrategyTab] = useState<PaperStrategy>("intraday");
  const [selected, setSelected] = useState<PaperTrade | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [lastSyncedLabel, setLastSyncedLabel] = useState<string | null>(
    initialDashboard.state.lastSyncAt
  );
  const [bootstrapped, setBootstrapped] = useState(false);

  const setActiveModule = useCallback(
    (id: PaperLabModuleId) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id === "overview") {
        params.delete("view");
      } else {
        params.set("view", id);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams]
  );

  const runSync = useCallback(() => {
    startTransition(async () => {
      try {
        setError(null);
        const next = await fetchSync();
        setDashboard(next);
        setLastSyncedLabel(next.state.lastSyncAt);
        setSelected((prev) => {
          if (!prev) return prev;
          return next.state.trades.find((t) => t.id === prev.id) ?? prev;
        });
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to sync the paper trading engine."
        );
      } finally {
        setBootstrapped(true);
      }
    });
  }, []);

  useEffect(() => {
    runSync();
    const id = window.setInterval(
      runSync,
      PAPER_TRADING_CONFIG.clientSyncIntervalMs
    );
    return () => window.clearInterval(id);
  }, [runSync]);

  const scopedOpen = useMemo(
    () => dashboard.openTrades.filter((t) => t.strategy === strategyTab),
    [dashboard.openTrades, strategyTab]
  );

  const scopedClosed = useMemo(
    () => dashboard.closedTrades.filter((t) => t.strategy === strategyTab),
    [dashboard.closedTrades, strategyTab]
  );

  const moduleCounts = useMemo(
    () => ({
      active: dashboard.kpis.openPositions,
      closed: dashboard.kpis.closedPositions,
    }),
    [dashboard.kpis.closedPositions, dashboard.kpis.openPositions]
  );

  const openTrade = useCallback((trade: PaperTrade) => {
    setSelected(trade);
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  const showBlockingError = Boolean(error) && !bootstrapped;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
            Automated Validation Engine
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            Modular workspace · virtual execution only · no manual buy/sell
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastSyncedLabel ? (
            <span className="text-[10px] text-text-faint" aria-live="polite">
              Synced{" "}
              {new Intl.DateTimeFormat("en-IN", {
                timeZone: "Asia/Kolkata",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
              }).format(new Date(lastSyncedLabel))}{" "}
              IST
            </span>
          ) : null}
          <button
            type="button"
            onClick={runSync}
            disabled={isPending}
            aria-label="Sync paper trading engine"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border border-surface-border-subtle bg-surface-overlay/50 px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary disabled:opacity-60",
              FOCUS_RING_CLASS
            )}
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", isPending && "animate-spin")}
              aria-hidden
            />
            {isPending ? "Syncing…" : "Sync Engine"}
          </button>
        </div>
      </div>

      <PaperLabWorkspaceNav
        active={activeModule}
        onChange={setActiveModule}
        counts={moduleCounts}
      />

      {error && bootstrapped ? (
        <div
          role="status"
          className="rounded-lg border border-loss/30 bg-loss/10 px-3 py-2 text-xs text-loss"
        >
          Sync issue: {error}{" "}
          <button
            type="button"
            onClick={runSync}
            className={cn(
              "ml-2 underline underline-offset-2 hover:text-text-primary",
              FOCUS_RING_CLASS
            )}
          >
            Retry
          </button>
        </div>
      ) : null}

      {showBlockingError ? (
        <PaperLabErrorState
          message={error ?? "Something went wrong loading the lab."}
          onRetry={runSync}
          retrying={isPending}
        />
      ) : (
        <div className="min-h-[28rem]">
          <PaperLabModulePanel id="overview" active={activeModule === "overview"}>
            <PaperLabOverviewModule
              dashboard={dashboard}
              onNavigate={setActiveModule}
            />
          </PaperLabModulePanel>

          <PaperLabModulePanel id="active" active={activeModule === "active"}>
            <PaperLabActiveModule
              trades={scopedOpen}
              strategyTab={strategyTab}
              onStrategyChange={setStrategyTab}
              onSelect={openTrade}
            />
          </PaperLabModulePanel>

          <PaperLabModulePanel id="closed" active={activeModule === "closed"}>
            <PaperLabClosedModule
              trades={scopedClosed}
              strategyTab={strategyTab}
              onStrategyChange={setStrategyTab}
              onSelect={openTrade}
            />
          </PaperLabModulePanel>

          <PaperLabModulePanel
            id="performance"
            active={activeModule === "performance"}
          >
            <Suspense
              fallback={<PaperLabModuleSkeleton variant="dashboard" />}
            >
              <PaperPerformanceAnalytics
                trades={dashboard.state.trades}
                testedRecommendationIds={dashboard.state.testedRecommendationIds}
                lastUpdated={dashboard.state.lastSyncAt}
                onSelectTrade={openTrade}
              />
            </Suspense>
          </PaperLabModulePanel>

          <PaperLabModulePanel
            id="intelligence"
            active={activeModule === "intelligence"}
          >
            <Suspense
              fallback={<PaperLabModuleSkeleton variant="dashboard" />}
            >
              <PaperAiIntelligenceDashboard
                trades={dashboard.state.trades}
                testedRecommendationIds={dashboard.state.testedRecommendationIds}
                onSelectTrade={openTrade}
              />
            </Suspense>
          </PaperLabModulePanel>
        </div>
      )}

      <PaperTradeDrawer
        trade={selected}
        open={drawerOpen}
        onClose={closeDrawer}
      />
    </div>
  );
}
