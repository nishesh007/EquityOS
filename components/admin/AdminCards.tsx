"use client";

import { cn } from "@/lib/utils";
import type {
  AuditLogEntry,
  BackupRecord,
  FeatureFlag,
  MonitoringMetric,
  OpsNotification,
  SystemHealthSnapshot,
} from "@/lib/ops/types";
import { useSystemHealth } from "@/lib/ops";
import type { ReactNode } from "react";

export function AdminMetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-surface-border-subtle bg-surface-overlay/40 p-3">
      <div className="text-[11px] text-text-faint">{label}</div>
      <div className="mt-1 text-lg font-semibold text-text-primary">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-text-secondary">{hint}</div>}
    </div>
  );
}

export function SystemHealthCard({ health }: { health: SystemHealthSnapshot }) {
  return (
    <section aria-label="System health" className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span
          className={cn(
            "rounded-md px-2 py-1 font-semibold uppercase",
            health.overall === "healthy" && "bg-success/20 text-success",
            health.overall === "degraded" && "bg-warning/20 text-warning",
            health.overall === "down" && "bg-danger/20 text-danger"
          )}
        >
          {health.overall}
        </span>
        <span className="text-text-secondary">
          {health.environment} · build {health.buildVersion} ·{" "}
          {health.deploymentVersion}
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-3 text-xs">
        <AdminMetricCard label="Memory" value={`${health.memoryUsagePct}%`} />
        <AdminMetricCard label="CPU" value={`${health.cpuUsagePct}%`} />
        <AdminMetricCard label="Disk" value={`${health.diskUsagePct}%`} />
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {health.components.map((c) => (
          <div
            key={c.id}
            className="rounded-xl border border-surface-border-subtle bg-surface-overlay/40 p-3 text-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-text-primary">{c.label}</span>
              <span
                className={cn(
                  "capitalize",
                  c.status === "healthy" && "text-success",
                  c.status === "degraded" && "text-warning",
                  c.status === "down" && "text-danger"
                )}
              >
                {c.status}
              </span>
            </div>
            <p className="mt-1 text-text-secondary">{c.message}</p>
            {c.latencyMs != null && (
              <p className="mt-1 text-text-faint">{c.latencyMs} ms</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export function AuditTimeline({ entries }: { entries: AuditLogEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-text-secondary">No audit events.</p>;
  }
  return (
    <ol className="space-y-3 border-l border-surface-border-subtle pl-4">
      {entries.map((e) => (
        <li key={e.id} className="relative text-xs">
          <span className="absolute -left-[1.15rem] top-1 h-2 w-2 rounded-full bg-accent" />
          <div className="font-medium text-text-primary">{e.action}</div>
          <div className="text-text-secondary">{e.summary}</div>
          <div className="text-text-faint">
            {e.actorEmail ?? "system"} · {new Date(e.createdAt).toLocaleString()}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function MonitoringCard({ metric }: { metric: MonitoringMetric }) {
  return (
    <AdminMetricCard
      label={metric.name}
      value={`${metric.value}${metric.unit ? ` ${metric.unit}` : ""}`}
      hint={`${metric.trendPct >= 0 ? "+" : ""}${metric.trendPct}% trend`}
    />
  );
}

export function FeatureFlagCard({
  flag,
  onToggle,
  onEmergency,
}: {
  flag: FeatureFlag;
  onToggle?: () => void;
  onEmergency?: () => void;
}) {
  return (
    <article className="rounded-xl border border-surface-border-subtle bg-surface-overlay/40 p-4 text-xs">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-mono text-sm text-accent">{flag.key}</div>
          <p className="mt-1 text-text-secondary">{flag.description}</p>
        </div>
        <span
          className={cn(
            "rounded px-2 py-0.5 text-[10px] uppercase",
            flag.emergencyDisabled
              ? "bg-danger/20 text-danger"
              : flag.enabled
                ? "bg-success/20 text-success"
                : "bg-surface-raised text-text-faint"
          )}
        >
          {flag.emergencyDisabled ? "killed" : flag.enabled ? "on" : "off"}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2">
        <div>
          <dt className="text-text-faint">Scope</dt>
          <dd className="capitalize">{flag.scope}</dd>
        </div>
        <div>
          <dt className="text-text-faint">Rollout</dt>
          <dd>{flag.rolloutPercent}%</dd>
        </div>
      </dl>
      <div className="mt-3 flex flex-wrap gap-2">
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            className="rounded-lg border border-surface-border-subtle px-2.5 py-1 hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Toggle
          </button>
        )}
        {onEmergency && !flag.emergencyDisabled && (
          <button
            type="button"
            onClick={onEmergency}
            className="rounded-lg border border-danger/40 px-2.5 py-1 text-danger hover:bg-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
          >
            Emergency disable
          </button>
        )}
      </div>
    </article>
  );
}

export function BackupCard({
  backup,
  onRestore,
}: {
  backup: BackupRecord;
  onRestore?: () => void;
}) {
  return (
    <article className="rounded-xl border border-surface-border-subtle bg-surface-overlay/40 p-4 text-xs">
      <div className="font-medium text-text-primary">{backup.label}</div>
      <div className="mt-1 capitalize text-text-secondary">{backup.status}</div>
      <div className="mt-2 text-text-faint">
        {(backup.sizeBytes / 1024).toFixed(1)} KB · retain {backup.retentionDays}d ·{" "}
        {new Date(backup.createdAt).toLocaleString()}
      </div>
      {onRestore && backup.status === "completed" && (
        <button
          type="button"
          onClick={onRestore}
          className="mt-3 rounded-lg border border-surface-border-subtle px-2.5 py-1 hover:bg-surface-raised"
        >
          Restore (placeholder)
        </button>
      )}
    </article>
  );
}

export function MaintenanceBanner() {
  const { maintenance } = useSystemHealth();
  if (!maintenance.enabled) return null;
  return (
    <div
      role="status"
      className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning"
    >
      <strong>Maintenance mode:</strong> {maintenance.message}
      {maintenance.estimatedCompletionAt && (
        <span className="ml-2 text-xs">
          ETA {new Date(maintenance.estimatedCompletionAt).toLocaleString()}
        </span>
      )}
    </div>
  );
}

export function NotificationDrawer({
  items,
  onRead,
}: {
  items: OpsNotification[];
  onRead?: (id: string) => void;
}) {
  return (
    <div className="space-y-2" role="region" aria-label="Notifications">
      {items.map((n) => (
        <button
          key={n.id}
          type="button"
          onClick={() => onRead?.(n.id)}
          className={cn(
            "w-full rounded-xl border p-3 text-left text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
            n.read
              ? "border-surface-border-subtle bg-surface-overlay/20"
              : "border-accent/40 bg-accent/10"
          )}
        >
          <div className="font-medium text-text-primary">{n.title}</div>
          <div className="mt-1 text-text-secondary">{n.body}</div>
          <div className="mt-1 capitalize text-text-faint">
            {n.kind.replace("_", " ")} · {new Date(n.createdAt).toLocaleString()}
          </div>
        </button>
      ))}
      {items.length === 0 && (
        <p className="text-sm text-text-secondary">No notifications.</p>
      )}
    </div>
  );
}

export function Panel({
  title,
  children,
  actions,
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-surface-border-subtle bg-surface-overlay/40 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}
