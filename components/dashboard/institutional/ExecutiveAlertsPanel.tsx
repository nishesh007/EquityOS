"use client";

import type { ExecutiveAlertItem } from "@/lib/dashboard/institutional-executive-presentation";
import { EXECUTIVE_TONE_CLASS } from "@/lib/dashboard/institutional-executive-presentation";

export function ExecutiveAlertsPanel({
  alerts,
}: {
  alerts: ExecutiveAlertItem[];
}) {
  return (
    <div
      className="rounded-lg border border-surface-border-subtle/80 bg-surface-hover/10 px-3 py-3"
      data-testid="executive-alerts-panel"
    >
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-text-faint">
        Executive Alerts
      </p>
      <ul className="max-h-64 space-y-1.5 overflow-y-auto">
        {alerts.map((alert) => (
          <li
            key={alert.id}
            className="rounded-md border border-surface-border-subtle/60 bg-surface-raised/30 px-2.5 py-2"
            data-testid={`executive-alert-${alert.id}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className={`text-[11px] font-semibold ${EXECUTIVE_TONE_CLASS[alert.tone]}`}>
                {alert.title}
              </p>
              <span className="text-[9px] uppercase tracking-wider text-text-faint">
                {alert.source}
              </span>
            </div>
            <p className="mt-0.5 text-[10px] leading-relaxed text-text-muted">
              {alert.detail}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
