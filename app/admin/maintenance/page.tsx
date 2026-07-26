"use client";

import { useState } from "react";
import { AdminShell, Panel } from "@/components/admin";
import { useSystemHealth } from "@/lib/ops";
import { addDays, nowIso } from "@/lib/saas/utils";

export default function AdminMaintenancePage() {
  const { maintenance, setMaintenance } = useSystemHealth();
  const [message, setMessage] = useState(maintenance.message);

  return (
    <AdminShell
      title="Maintenance"
      description="Enable maintenance mode with custom messaging and admin whitelist."
    >
      <Panel title="Controls">
        <div className="space-y-3 text-xs">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={maintenance.enabled}
              onChange={(e) =>
                void setMaintenance({
                  enabled: e.target.checked,
                  estimatedCompletionAt: e.target.checked
                    ? addDays(nowIso(), 1)
                    : null,
                })
              }
            />
            Maintenance mode enabled
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={maintenance.allowAdminLogin}
              onChange={(e) =>
                void setMaintenance({ allowAdminLogin: e.target.checked })
              }
            />
            Allow admin login during maintenance
          </label>
          <label className="block">
            Custom message
            <textarea
              className="mt-1 w-full rounded-lg border border-surface-border-subtle bg-surface-raised px-2 py-1.5"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onBlur={() => void setMaintenance({ message })}
            />
          </label>
          <p className="text-text-faint">
            Whitelist size: {maintenance.whitelistUserIds.length} · Updated{" "}
            {new Date(maintenance.updatedAt).toLocaleString()}
          </p>
        </div>
      </Panel>
    </AdminShell>
  );
}
