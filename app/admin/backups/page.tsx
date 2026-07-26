"use client";

import { AdminShell, BackupCard, Panel } from "@/components/admin";
import { useSystemHealth } from "@/lib/ops";
import { backupService } from "@/lib/ops/services";
import { useState } from "react";

export default function AdminBackupsPage() {
  const { backups, createBackup, refresh } = useSystemHealth();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <AdminShell
      title="Backups"
      description="Scheduled and manual backups with retention and restore placeholder."
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white"
          onClick={() => void createBackup(`Manual backup ${new Date().toISOString()}`)}
        >
          Manual backup
        </button>
        <button
          type="button"
          className="rounded-lg border border-surface-border-subtle px-3 py-1.5 text-xs"
          onClick={() => {
            backupService.create("Scheduled nightly", true);
            refresh();
          }}
        >
          Run scheduled backup
        </button>
      </div>
      {msg && (
        <p role="status" className="mb-3 text-xs text-accent">
          {msg}
        </p>
      )}
      <Panel title="Backup history">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {backups.map((b) => (
            <BackupCard
              key={b.id}
              backup={b}
              onRestore={() => {
                const res = backupService.restorePlaceholder(b.id);
                setMsg(res.ok ? res.data.message : res.error);
              }}
            />
          ))}
          {backups.length === 0 && (
            <p className="text-sm text-text-secondary">No backups yet.</p>
          )}
        </div>
      </Panel>
    </AdminShell>
  );
}
