"use client";

import type {
  DataFreshnessLevel,
  SchedulerHealth,
  SchedulerMarketState,
  SchedulerStatus,
} from "@/lib/opportunity-engine/scheduler-health";
import { Activity, Clock3, Radar } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const HEALTH_POLL_MS = 30_000;

function formatClock(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

function formatCountdown(iso: string | null, nowMs: number): string {
  if (!iso) return "";
  const delta = new Date(iso).getTime() - nowMs;
  if (delta <= 0) return "(due)";
  const totalSec = Math.floor(delta / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours > 0) return `(${hours}h ${minutes}m)`;
  if (minutes > 0) return `(${minutes}m ${seconds.toString().padStart(2, "0")}s)`;
  return `(${seconds}s)`;
}

function formatDurationMs(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(0)} sec`;
}

function formatRelativeSeconds(seconds: number | null): string {
  if (seconds == null) return "—";
  if (seconds < 60) return `${seconds} sec ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m ago`;
}

function formatNextSession(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

function statusTone(status: SchedulerStatus): string {
  switch (status) {
    case "RUNNING":
      return "text-gain";
    case "FROZEN":
      return "text-accent";
    case "PAUSED":
      return "text-amber-400";
    case "ERROR":
      return "text-loss";
  }
}

function statusDot(status: SchedulerStatus): string {
  switch (status) {
    case "RUNNING":
      return "bg-gain";
    case "FROZEN":
      return "bg-accent";
    case "PAUSED":
      return "bg-amber-400";
    case "ERROR":
      return "bg-loss";
  }
}

function freshnessTone(level: DataFreshnessLevel | null): string {
  switch (level) {
    case "Excellent":
      return "text-gain";
    case "Good":
      return "text-accent";
    case "Delayed":
      return "text-orange-400";
    case "Stale":
      return "text-loss";
    default:
      return "text-text-muted";
  }
}

function statusHeadline(
  status: SchedulerStatus,
  marketState: SchedulerMarketState
): string {
  if (marketState === "HOLIDAY") return "Scheduler Sleeping";
  switch (status) {
    case "RUNNING":
      return "Scheduler Running";
    case "FROZEN":
      return "Scheduler Frozen";
    case "PAUSED":
      return "Scheduler Paused";
    case "ERROR":
      return "Scheduler Error";
  }
}

function Metric({
  label,
  value,
  sub,
  valueClassName,
}: {
  label: string;
  value: string;
  sub?: string;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-[7.5rem]">
      <div className="text-[10px] font-medium uppercase tracking-wider text-text-faint">
        {label}
      </div>
      <div className={`mt-0.5 text-sm font-medium tabular-nums ${valueClassName ?? "text-text-primary"}`}>
        {value}
      </div>
      {sub ? <div className="text-[10px] text-text-muted">{sub}</div> : null}
    </div>
  );
}

export function SchedulerHealthCard() {
  const [health, setHealth] = useState<SchedulerHealth | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const refreshHealth = useCallback(async () => {
    try {
      const response = await fetch("/api/opportunities/scheduler-health");
      if (!response.ok) return;
      const payload = (await response.json()) as SchedulerHealth;
      setHealth(payload);
      setNowMs(Date.now());
    } catch {
      // Keep last known health snapshot on transient failures.
    }
  }, []);

  useEffect(() => {
    void refreshHealth();
    const interval = setInterval(() => {
      void refreshHealth();
    }, HEALTH_POLL_MS);
    return () => clearInterval(interval);
  }, [refreshHealth]);

  useEffect(() => {
    const tick = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  if (!health) {
    return (
      <div className="mb-4 rounded-lg border border-surface-border-subtle/80 bg-surface-hover/20 px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <Activity className="h-3.5 w-3.5 animate-pulse" />
          Loading scheduler health…
        </div>
      </div>
    );
  }

  const isHoliday = health.marketState === "HOLIDAY";
  const isClosed =
    health.marketState === "CLOSED" || health.schedulerStatus === "FROZEN";
  const headline = statusHeadline(health.schedulerStatus, health.marketState);

  return (
    <div className="mb-4 rounded-lg border border-surface-border-subtle/80 bg-surface-hover/20 px-4 py-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${statusDot(health.schedulerStatus)}`} />
          <span className={`text-sm font-semibold ${statusTone(health.schedulerStatus)}`}>
            {headline}
          </span>
          {isClosed && !isHoliday && health.schedulerStatus === "FROZEN" ? (
            <span className="text-[10px] uppercase tracking-wider text-text-muted">
              Final Scan Completed
            </span>
          ) : null}
          {isHoliday ? (
            <span className="text-[10px] uppercase tracking-wider text-amber-400/80">
              Market Holiday
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-text-faint">
          <Radar className="h-3 w-3" />
          Health {health.healthScore}/100
        </div>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-3">
        <Metric label="Market" value={health.marketState} />

        {isHoliday ? (
          <Metric
            label="Next Trading Session"
            value={formatNextSession(health.nextScheduledScan)}
          />
        ) : (
          <Metric
            label="Next Scan"
            value={
              isClosed && health.schedulerStatus === "FROZEN"
                ? formatNextSession(health.nextScheduledScan)
                : formatClock(health.nextScheduledScan)
            }
            sub={
              health.nextScheduledScan
                ? formatCountdown(health.nextScheduledScan, nowMs)
                : undefined
            }
          />
        )}

        <Metric
          label="Last Scan"
          value={formatClock(health.lastSuccessfulScan)}
          sub={formatRelativeSeconds(health.dataFreshnessSeconds)}
        />

        <Metric label="Today's Scans" value={String(health.scansToday)} />

        <Metric
          label="Data Freshness"
          value={health.dataFreshness ?? "—"}
          valueClassName={freshnessTone(health.dataFreshness)}
          sub={
            health.dataFreshnessSeconds != null
              ? `Updated ${formatRelativeSeconds(health.dataFreshnessSeconds)}`
              : undefined
          }
        />

        <Metric
          label="Average Scan"
          value={formatDurationMs(health.averageScanDuration)}
        />

        <Metric
          label="Symbols"
          value={health.symbolsScanned.toLocaleString("en-IN")}
        />

        <Metric
          label="Opportunities"
          value={health.opportunitiesGenerated.toLocaleString("en-IN")}
        />
      </div>

      {health.schedulerStatus === "ERROR" && health.lastError ? (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-loss/20 bg-loss/10 px-2.5 py-2 text-[11px] text-loss">
          <Clock3 className="mt-0.5 h-3 w-3 shrink-0" />
          <span>
            {health.lastError.message}
            {health.retryCount > 0 ? ` · retries ${health.retryCount}` : ""}
          </span>
        </div>
      ) : null}
    </div>
  );
}
