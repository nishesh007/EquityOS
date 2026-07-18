"use client";

import type {
  SchedulerHealth,
  SchedulerMarketState,
  SchedulerStatus,
} from "@/lib/opportunity-engine/scheduler-health";
import { formatOptionalText } from "@/lib/dashboard/display-value";
import { Activity, Clock3, Radar } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const HEALTH_POLL_MS = 30_000;

function formatClock(iso: string | null): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

function formatCountdown(iso: string | null, nowMs: number): string {
  if (!iso) return "—";
  const delta = new Date(iso).getTime() - nowMs;
  if (delta <= 0) return "00:00";
  const totalSec = Math.floor(delta / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const clock = `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
  return hours > 0 ? `${hours.toString().padStart(2, "0")}:${clock}` : clock;
}

function formatNextSession(iso: string | null): string | null {
  if (!iso) return null;
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

function formatRelativeSeconds(seconds: number | null): string | null {
  if (seconds == null) return null;
  if (seconds < 60) return `${seconds} sec ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m ago`;
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
  const muted =
    value === "N/A" ||
    value === "Unavailable" ||
    value.startsWith("No scans") ||
    value === "Collecting...";

  return (
    <div className="min-w-[7.5rem]">
      <div className="text-[10px] font-medium uppercase tracking-wider text-text-faint">
        {label}
      </div>
      <div
        className={`mt-0.5 text-sm font-medium tabular-nums ${
          valueClassName ?? (muted ? "text-text-muted" : "text-text-primary")
        }`}
      >
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
  const noScansToday = health.scansToday <= 0 || !health.lastSuccessfulScan;

  const lastScanValue = noScansToday
    ? "No scans completed yet today"
    : formatOptionalText(formatClock(health.lastSuccessfulScan), "Unavailable");

  const nextScanValue = isHoliday
    ? formatOptionalText(formatNextSession(health.nextScheduledScan), "N/A")
    : isClosed && health.schedulerStatus === "FROZEN"
      ? formatOptionalText(formatNextSession(health.nextScheduledScan), "N/A")
      : formatOptionalText(formatClock(health.nextScheduledScan), "N/A");

  return (
    <div className="mb-4 rounded-lg border border-surface-border-subtle/80 bg-surface-hover/20 px-4 py-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${statusDot(health.schedulerStatus)}`} />
          <span className={`text-sm font-semibold ${statusTone(health.schedulerStatus)}`}>
            {headline}
          </span>
          <span className="rounded border border-surface-border-subtle px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-text-muted">
            Market · {health.marketState}
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
          Automatic Scan Scheduler · 15 min
        </div>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-3">
        <Metric
          label="Scheduler Status"
          value={headline}
          valueClassName={statusTone(health.schedulerStatus)}
        />

        <Metric
          label="Last Scan"
          value={lastScanValue}
          sub={
            noScansToday
              ? undefined
              : formatRelativeSeconds(health.dataFreshnessSeconds) ?? undefined
          }
        />

        <Metric
          label="Next Scan"
          value={nextScanValue}
        />

        <Metric
          label="Refreshing In"
          value={formatCountdown(health.nextScheduledScan, nowMs)}
          valueClassName="font-mono text-accent"
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
