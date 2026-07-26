"use client";

import { useState } from "react";
import { AdminShell, AdminMetricCard, Panel, SystemHealthCard } from "@/components/admin";
import { useAdmin, useSystemHealth, useMonitoring } from "@/lib/ops";
import {
  auditToCsv,
  buildSystemReportText,
  downloadText,
  healthToCsv,
} from "@/lib/ops/reporting";
import { useAudit } from "@/lib/ops";

export default function AdminDashboardPage() {
  const { analytics, search, listUsers } = useAdmin();
  const { health } = useSystemHealth();
  const { apiHealth } = useMonitoring();
  const { audit } = useAudit();
  const [q, setQ] = useState("");
  const results = q.trim() ? search(q) : null;
  const users = listUsers();

  return (
    <AdminShell
      title="Administration"
      description="Enterprise operations dashboard — health, growth, and global search."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminMetricCard label="DAU" value={analytics.dau} />
        <AdminMetricCard label="MAU" value={analytics.mau} />
        <AdminMetricCard label="Active sessions" value={analytics.activeSessions} />
        <AdminMetricCard
          label="License util."
          value={`${analytics.licenseUtilizationPct}%`}
        />
        <AdminMetricCard label="Research usage" value={analytics.researchUsage} />
        <AdminMetricCard label="AI usage" value={analytics.aiUsage} />
        <AdminMetricCard
          label="API success"
          value={`${apiHealth?.successRatePct ?? 0}%`}
        />
        <AdminMetricCard
          label="API latency"
          value={`${apiHealth?.latencyMs ?? 0} ms`}
        />
      </div>

      <label className="mt-4 block max-w-xl text-xs">
        Global admin search
        <input
          className="mt-1 w-full rounded-lg border border-surface-border-subtle bg-surface-raised px-3 py-2"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Users, licenses, subscriptions, audit…"
          aria-label="Global admin search"
        />
      </label>
      {results && (
        <Panel title="Search results">
          <div className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="text-text-faint">Users</div>
              <ul>
                {results.users.slice(0, 5).map((u) => (
                  <li key={u.profile.id}>{u.profile.email}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-text-faint">Licenses</div>
              <ul>
                {results.licenses.slice(0, 5).map((l) => (
                  <li key={l.id} className="font-mono">
                    {l.licenseKey.slice(0, 16)}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-text-faint">Subscriptions</div>
              <ul>
                {results.subscriptions.slice(0, 5).map((s) => (
                  <li key={s.id}>
                    {s.registeredEmail} · {s.planId}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-text-faint">Audit</div>
              <ul>
                {results.audit.slice(0, 5).map((a) => (
                  <li key={a.id}>{a.action}</li>
                ))}
              </ul>
            </div>
          </div>
        </Panel>
      )}

      {health && (
        <Panel
          title="System health"
          actions={
            <div className="flex gap-2">
              <button
                type="button"
                className="text-xs text-accent hover:underline"
                onClick={() =>
                  downloadText("system-health.csv", healthToCsv(health))
                }
              >
                Export health CSV
              </button>
              <button
                type="button"
                className="text-xs text-accent hover:underline"
                onClick={() =>
                  downloadText(
                    "system-report.txt",
                    buildSystemReportText({
                      health,
                      auditCount: audit.length,
                      userCount: users.length,
                    }),
                    "text/plain"
                  )
                }
              >
                System report
              </button>
              <button
                type="button"
                className="text-xs text-accent hover:underline"
                onClick={() => downloadText("audit.csv", auditToCsv(audit))}
              >
                Audit CSV
              </button>
            </div>
          }
        >
          <SystemHealthCard health={health} />
        </Panel>
      )}
    </AdminShell>
  );
}
