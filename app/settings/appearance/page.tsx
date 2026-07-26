"use client";

import { SettingsShell } from "@/components/saas";
import { AppearanceSettings } from "@/components/settings/AppearanceSettings";
import { ThemeSelector } from "@/components/settings/ThemeSelector";
import { useCurrentUser } from "@/lib/saas";
import { Card } from "@/components/ui/Card";

export default function AppearanceSettingsPage() {
  const { profile, updateProfile } = useCurrentUser();
  if (!profile) return null;

  return (
    <SettingsShell title="Appearance" description="Theme and density preferences.">
      <ThemeSelector />
      <AppearanceSettings />
      <Card padding="lg" className="mt-4">
        <h2 className="text-sm font-semibold text-text-primary">Account theme prefs</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-text-faint">
            Mode
            <select
              value={profile.themePreferences.mode}
              onChange={(e) =>
                updateProfile({
                  themePreferences: {
                    ...profile.themePreferences,
                    mode: e.target.value as "system" | "dark" | "light",
                  },
                })
              }
              className="mt-1 w-full rounded-lg border border-surface-border-subtle bg-surface-raised px-3 py-2 text-sm"
            >
              <option value="system">System</option>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </label>
          <label className="block text-xs text-text-faint">
            Density
            <select
              value={profile.themePreferences.density}
              onChange={(e) =>
                updateProfile({
                  themePreferences: {
                    ...profile.themePreferences,
                    density: e.target.value as "comfortable" | "compact",
                  },
                })
              }
              className="mt-1 w-full rounded-lg border border-surface-border-subtle bg-surface-raised px-3 py-2 text-sm"
            >
              <option value="comfortable">Comfortable</option>
              <option value="compact">Compact</option>
            </select>
          </label>
        </div>
      </Card>
    </SettingsShell>
  );
}
