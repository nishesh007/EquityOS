"use client";

import { useMemo, useState } from "react";
import { AdminShell, Panel } from "@/components/admin";
import { loadState } from "@/lib/saas/persistence";
import { subscriptionService } from "@/lib/saas";
import { auditService } from "@/lib/ops";
import type { PlanId } from "@/lib/saas/types";

export default function AdminSubscriptionsPage() {
  const [q, setQ] = useState("");
  const [tick, setTick] = useState(0);
  const rows = useMemo(() => {
    void tick;
    const saas = loadState();
    return saas.subscriptions.filter(
      (s) =>
        !q ||
        s.registeredEmail.includes(q.toLowerCase()) ||
        s.planId.includes(q.toLowerCase()) ||
        s.status.includes(q.toLowerCase())
    );
  }, [q, tick]);

  const act = (
    userId: string,
    action: "renew" | "cancel" | "upgrade" | "downgrade"
  ) => {
    if (action === "cancel") {
      // entitlement revoke via plan free
      subscriptionService.changePlan(userId, "free");
      auditService.record({
        action: "subscription.change",
        targetId: userId,
        summary: "Admin cancelled → free",
      });
    } else if (action === "upgrade") {
      subscriptionService.changePlan(userId, "institutional");
      auditService.record({
        action: "subscription.change",
        targetId: userId,
        summary: "Admin upgrade → institutional",
      });
    } else if (action === "downgrade") {
      subscriptionService.changePlan(userId, "starter" as PlanId);
      auditService.record({
        action: "subscription.change",
        targetId: userId,
        summary: "Admin downgrade → starter",
      });
    } else {
      subscriptionService.changePlan(userId, "professional");
      auditService.record({
        action: "subscription.change",
        targetId: userId,
        summary: "Admin renew / resume → professional",
      });
    }
    setTick((n) => n + 1);
  };

  return (
    <AdminShell
      title="Subscriptions"
      description="Search, renew, cancel, upgrade, downgrade, and manual adjustments."
    >
      <input
        className="mb-4 w-full max-w-md rounded-lg border border-surface-border-subtle bg-surface-raised px-3 py-2 text-xs"
        placeholder="Search subscriptions"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Search subscriptions"
      />
      <Panel title="Subscription table">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-xs">
            <thead className="border-b border-surface-border-subtle text-text-faint">
              <tr>
                <th className="py-2 pr-3">Email</th>
                <th className="py-2 pr-3">Plan</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Renewal</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-b border-surface-border-subtle/60">
                  <td className="py-2 pr-3">{s.registeredEmail}</td>
                  <td className="py-2 pr-3 capitalize">{s.planId}</td>
                  <td className="py-2 pr-3 capitalize">{s.status}</td>
                  <td className="py-2 pr-3">
                    {s.renewalDate
                      ? new Date(s.renewalDate).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="text-accent hover:underline"
                        onClick={() => act(s.userId, "renew")}
                      >
                        Renew
                      </button>
                      <button
                        type="button"
                        className="text-accent hover:underline"
                        onClick={() => act(s.userId, "upgrade")}
                      >
                        Upgrade
                      </button>
                      <button
                        type="button"
                        className="text-accent hover:underline"
                        onClick={() => act(s.userId, "downgrade")}
                      >
                        Downgrade
                      </button>
                      <button
                        type="button"
                        className="text-danger hover:underline"
                        onClick={() => act(s.userId, "cancel")}
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </AdminShell>
  );
}
