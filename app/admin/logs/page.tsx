"use client";

import { AdminShell, Panel } from "@/components/admin";
import { useMonitoring } from "@/lib/ops";
import { cn } from "@/lib/utils";

export default function AdminLogsPage() {
  const { logs, refresh } = useMonitoring();

  return (
    <AdminShell
      title="Logs"
      description="Structured application logs for operations and incident response."
    >
      <button
        type="button"
        onClick={refresh}
        className="mb-3 rounded-lg border border-surface-border-subtle px-3 py-1.5 text-xs hover:bg-surface-raised"
      >
        Refresh
      </button>
      <Panel title="Recent entries">
        <ul className="max-h-[480px] space-y-1 overflow-auto font-mono text-[11px]">
          {logs.map((l) => (
            <li
              key={l.id}
              className={cn(
                "rounded border border-surface-border-subtle/50 px-2 py-1",
                l.level === "error" && "text-danger",
                l.level === "warn" && "text-warning"
              )}
            >
              [{l.createdAt}] {l.level.toUpperCase()} {l.service} — {l.message}
            </li>
          ))}
          {logs.length === 0 && (
            <li className="text-text-secondary">No log entries yet.</li>
          )}
        </ul>
      </Panel>
    </AdminShell>
  );
}
