"use client";

import { FormEvent, useState } from "react";
import { SettingsShell } from "@/components/saas";
import { Card } from "@/components/ui/Card";
import { useAuth, useDevices } from "@/lib/saas";

export default function SecuritySettingsPage() {
  const { changePassword, error, clearError } = useAuth();
  const { loginHistory } = useDevices();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [ok, setOk] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    setOk(await changePassword(current, next));
  }

  return (
    <SettingsShell title="Security" description="Password, sessions, and account activity.">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card padding="lg">
          <h2 className="text-sm font-semibold text-text-primary">Change password</h2>
          <form className="mt-3 space-y-3" onSubmit={onSubmit}>
            <label className="block text-xs text-text-faint">
              Current password
              <input
                type="password"
                required
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                className="mt-1 w-full rounded-lg border border-surface-border-subtle bg-surface-raised px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs text-text-faint">
              New password
              <input
                type="password"
                required
                minLength={8}
                value={next}
                onChange={(e) => setNext(e.target.value)}
                className="mt-1 w-full rounded-lg border border-surface-border-subtle bg-surface-raised px-3 py-2 text-sm"
              />
            </label>
            {error && <p className="text-sm text-loss">{error}</p>}
            {ok && <p className="text-sm text-gain">Password updated.</p>}
            <button type="submit" className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white">
              Update password
            </button>
          </form>
        </Card>

        <Card padding="lg">
          <h2 className="text-sm font-semibold text-text-primary">Two-factor authentication</h2>
          <p className="mt-2 text-xs text-text-secondary">
            Placeholder for Sprint 12B+ — TOTP enrollment and recovery codes will land with billing hardening.
          </p>
          <button
            type="button"
            disabled
            className="mt-3 rounded-lg border border-surface-border-subtle px-3 py-2 text-xs text-text-faint"
          >
            Enable 2FA (coming soon)
          </button>
          <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-text-faint">
            Recovery codes
          </h3>
          <p className="mt-1 text-xs text-text-secondary">Placeholder — codes will be generated when 2FA is enabled.</p>
        </Card>
      </div>

      <Card padding="lg" className="mt-4">
        <h2 className="text-sm font-semibold text-text-primary">Recent login history</h2>
        {loginHistory.length === 0 ? (
          <p className="mt-3 text-sm text-text-secondary">No active session history yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {loginHistory.slice(0, 12).map((h) => (
              <li
                key={h.id}
                className="flex flex-wrap justify-between gap-2 rounded-lg border border-surface-border-subtle px-3 py-2 text-xs"
              >
                <span>
                  {h.browser} · {h.os} · {h.success ? "Success" : "Failed"}
                </span>
                <span className="text-text-faint">
                  {new Date(h.at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </SettingsShell>
  );
}
