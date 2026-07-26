"use client";

import { SettingsShell } from "@/components/saas";
import { Card } from "@/components/ui/Card";
import { useCurrentUser } from "@/lib/saas";

export default function NotificationsSettingsPage() {
  const { profile, updateProfile } = useCurrentUser();
  if (!profile) return null;
  const n = profile.notificationPreferences;

  function toggle(key: keyof typeof n) {
    updateProfile({
      notificationPreferences: { ...n, [key]: !n[key] },
    });
  }

  return (
    <SettingsShell title="Notifications" description="Alert and digest preferences.">
      <Card padding="lg">
        <div className="space-y-3">
          {(
            [
              ["emailAlerts", "Email alerts"],
              ["pushAlerts", "Push alerts"],
              ["weeklyDigest", "Weekly digest"],
              ["productUpdates", "Product updates"],
            ] as const
          ).map(([key, label]) => (
            <label
              key={key}
              className="flex items-center justify-between gap-3 rounded-lg border border-surface-border-subtle px-3 py-2 text-sm"
            >
              <span>{label}</span>
              <input
                type="checkbox"
                checked={n[key]}
                onChange={() => toggle(key)}
              />
            </label>
          ))}
        </div>
      </Card>
    </SettingsShell>
  );
}
