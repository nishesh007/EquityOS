"use client";

import { AdminShell, Panel, SystemHealthCard } from "@/components/admin";
import { useSystemHealth, useMonitoring } from "@/lib/ops";
import { AdminMetricCard } from "@/components/admin";

export default function AdminHealthPage() {
  const { health, refresh } = useSystemHealth();
  const { apiHealth } = useMonitoring();

  return (
    <AdminShell
      title="System Health"
      description="Runtime, API, auth, billing, storage, webhooks, and resource usage."
    >
      <div className="mb-3">
        <button
          type="button"
          onClick={refresh}
          className="rounded-lg border border-surface-border-subtle px-3 py-1.5 text-xs hover:bg-surface-raised"
        >
          Refresh checks
        </button>
      </div>
      {apiHealth && (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <AdminMetricCard label="Latency" value={`${apiHealth.latencyMs} ms`} />
          <AdminMetricCard
            label="Availability"
            value={`${apiHealth.availabilityPct}%`}
          />
          <AdminMetricCard
            label="Error rate"
            value={`${apiHealth.errorRatePct}%`}
          />
          <AdminMetricCard
            label="Success rate"
            value={`${apiHealth.successRatePct}%`}
          />
          <AdminMetricCard
            label="Request volume"
            value={apiHealth.requestVolume}
            hint={apiHealth.webhookHealthy ? "Webhooks OK" : "Webhook issues"}
          />
        </div>
      )}
      {health && (
        <Panel title="Components">
          <SystemHealthCard health={health} />
        </Panel>
      )}
    </AdminShell>
  );
}
