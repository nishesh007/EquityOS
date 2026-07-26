"use client";

import { SettingsShell } from "@/components/saas";
import { Card } from "@/components/ui/Card";
import { useCurrentUser } from "@/lib/saas";

export default function ResearchSettingsPage() {
  const { profile, updateProfile } = useCurrentUser();
  if (!profile) return null;
  const r = profile.researchPreferences;

  return (
    <SettingsShell title="Research" description="Default research workspace preferences.">
      <Card padding="lg">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-text-faint">
            Default universe
            <input
              value={r.defaultUniverse}
              onChange={(e) =>
                updateProfile({
                  researchPreferences: { ...r, defaultUniverse: e.target.value },
                })
              }
              className="mt-1 w-full rounded-lg border border-surface-border-subtle bg-surface-raised px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs text-text-faint">
            Risk tolerance
            <select
              value={r.riskTolerance}
              onChange={(e) =>
                updateProfile({
                  researchPreferences: {
                    ...r,
                    riskTolerance: e.target.value as "low" | "medium" | "high",
                  },
                })
              }
              className="mt-1 w-full rounded-lg border border-surface-border-subtle bg-surface-raised px-3 py-2 text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={r.showAiSuggestions}
              onChange={(e) =>
                updateProfile({
                  researchPreferences: {
                    ...r,
                    showAiSuggestions: e.target.checked,
                  },
                })
              }
            />
            Show AI suggestions
          </label>
        </div>
      </Card>
    </SettingsShell>
  );
}
