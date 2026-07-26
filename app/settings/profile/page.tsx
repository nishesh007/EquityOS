"use client";

import { FormEvent, useEffect, useState } from "react";
import { SettingsShell, RoleBadge } from "@/components/saas";
import { Card } from "@/components/ui/Card";
import { useAuth, useCurrentUser } from "@/lib/saas";

export default function ProfileSettingsPage() {
  const { profile, updateProfile } = useCurrentUser();
  const { logout } = useAuth();
  const [form, setForm] = useState({
    displayName: "",
    phone: "",
    timezone: "",
    country: "",
    preferredCurrency: "",
    language: "",
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setForm({
      displayName: profile.displayName,
      phone: profile.phone,
      timezone: profile.timezone,
      country: profile.country,
      preferredCurrency: profile.preferredCurrency,
      language: profile.language,
    });
  }, [profile]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const ok = await updateProfile(form);
    setSaved(ok);
  }

  if (!profile) return null;

  return (
    <SettingsShell
      title="Profile"
      description="Personal information and terminal identity."
    >
      <Card padding="lg">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/20 text-sm font-semibold text-accent">
            {profile.displayName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="font-medium text-text-primary">{profile.email}</div>
            <RoleBadge role={profile.role} />
          </div>
        </div>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={onSubmit}>
          {(
            [
              ["displayName", "Display name"],
              ["phone", "Phone"],
              ["timezone", "Timezone"],
              ["country", "Country"],
              ["preferredCurrency", "Preferred currency"],
              ["language", "Language"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block text-xs text-text-faint">
              {label}
              <input
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-surface-border-subtle bg-surface-raised px-3 py-2 text-sm"
              />
            </label>
          ))}
          <div className="sm:col-span-2 flex flex-wrap gap-2">
            <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">
              Save profile
            </button>
            <button
              type="button"
              onClick={() => logout()}
              className="rounded-lg border border-surface-border-subtle px-4 py-2 text-sm text-text-secondary"
            >
              Log out
            </button>
            {saved && (
              <span className="ml-1 self-center text-xs text-gain" role="status">
                Saved
              </span>
            )}
          </div>
        </form>
      </Card>
    </SettingsShell>
  );
}
