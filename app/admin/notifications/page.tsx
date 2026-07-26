"use client";

import { AdminShell, NotificationDrawer, Panel } from "@/components/admin";
import { useNotifications } from "@/lib/ops";
import { emailService } from "@/lib/ops/services";
import { listEmailTemplates } from "@/lib/ops/email-templates";

export default function AdminNotificationsPage() {
  const { notifications, markRead, push } = useNotifications();
  const outbox = emailService.outbox();

  return (
    <AdminShell
      title="Notifications"
      description="System alerts and email infrastructure outbox."
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white"
          onClick={() =>
            void push({
              kind: "system",
              title: "Ops ping",
              body: "Manual system notification from admin console.",
            })
          }
        >
          Send system notification
        </button>
        <button
          type="button"
          className="rounded-lg border border-surface-border-subtle px-3 py-1.5 text-xs"
          onClick={() =>
            emailService.queue("welcome", "analyst@equityos.demo", {
              name: "Demo Analyst",
            })
          }
        >
          Queue welcome email
        </button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Notification center">
          <NotificationDrawer items={notifications} onRead={markRead} />
        </Panel>
        <Panel title="Email templates & outbox">
          <p className="mb-2 text-xs text-text-secondary">
            Templates: {listEmailTemplates().join(", ")}
          </p>
          <ul className="max-h-80 space-y-1 overflow-auto text-xs">
            {outbox.map((e) => (
              <li key={e.id} className="rounded border border-surface-border-subtle px-2 py-1">
                <span className="font-mono text-accent">{e.templateId}</span> → {e.to} ·{" "}
                {e.status}
              </li>
            ))}
            {outbox.length === 0 && <li>Outbox empty.</li>}
          </ul>
        </Panel>
      </div>
    </AdminShell>
  );
}
