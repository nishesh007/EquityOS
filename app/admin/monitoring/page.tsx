"use client";

import { AdminShell, MonitoringCard, Panel } from "@/components/admin";
import { useMonitoring } from "@/lib/ops";

export default function AdminMonitoringPage() {
  const { metrics, apiHealth, refresh } = useMonitoring();

  return (
    <AdminShell
      title="Monitoring"
      description="Latency, error rate, request volume, and background job metrics."
    >
      <button
        type="button"
        onClick={refresh}
        className="mb-3 rounded-lg border border-surface-border-subtle px-3 py-1.5 text-xs hover:bg-surface-raised"
      >
        Background refresh
      </button>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <MonitoringCard key={m.id} metric={m} />
        ))}
      </div>
      {apiHealth && (
        <Panel title="API health">
          <dl className="grid gap-2 text-xs sm:grid-cols-3">
            <div>
              <dt className="text-text-faint">Availability</dt>
              <dd>{apiHealth.availabilityPct}%</dd>
            </div>
            <div>
              <dt className="text-text-faint">Webhook health</dt>
              <dd>{apiHealth.webhookHealthy ? "Healthy" : "Degraded"}</dd>
            </div>
            <div>
              <dt className="text-text-faint">Requests / hr</dt>
              <dd>{apiHealth.requestVolume}</dd>
            </div>
          </dl>
        </Panel>
      )}
    </AdminShell>
  );
}
