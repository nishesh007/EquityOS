"use client";

import { AdminShell, FeatureFlagCard, Panel } from "@/components/admin";
import { useFeatureFlags } from "@/lib/ops";
import { createId, nowIso } from "@/lib/saas/utils";

export default function AdminFeatureFlagsPage() {
  const { flags, upsertFlag, emergencyDisable } = useFeatureFlags();

  return (
    <AdminShell
      title="Feature Flags"
      description="Global, user, plan, beta, canary rollouts and emergency kill switches."
    >
      <div className="mb-4">
        <button
          type="button"
          className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white"
          onClick={() =>
            void upsertFlag({
              id: createId("ff"),
              key: `beta.experiment_${Math.floor(Math.random() * 100)}`,
              description: "Admin-created beta flag",
              enabled: true,
              scope: "beta",
              rolloutPercent: 10,
              planIds: ["professional"],
              userIds: [],
              emergencyDisabled: false,
              updatedAt: nowIso(),
            })
          }
        >
          Create beta flag (10%)
        </button>
      </div>
      <Panel title="Flags">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {flags.map((f) => (
            <FeatureFlagCard
              key={f.id}
              flag={f}
              onToggle={() =>
                void upsertFlag({
                  ...f,
                  enabled: !f.enabled,
                  emergencyDisabled: false,
                })
              }
              onEmergency={() => void emergencyDisable(f.key)}
            />
          ))}
        </div>
      </Panel>
    </AdminShell>
  );
}
