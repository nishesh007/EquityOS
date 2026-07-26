"use client";

import { AdminShell, Panel } from "@/components/admin";
import { useAdmin } from "@/lib/ops";

export default function AdminSettingsPage() {
  const { settings, updateSettings } = useAdmin();

  return (
    <AdminShell
      title="System Settings"
      description="Branding, support contacts, legal URLs, timezone, and currency."
    >
      <Panel title="Branding & legal">
        <form
          className="grid max-w-xl gap-3 text-xs"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            void updateSettings({
              companyName: String(fd.get("companyName") ?? ""),
              supportEmail: String(fd.get("supportEmail") ?? ""),
              supportUrl: String(fd.get("supportUrl") ?? ""),
              privacyPolicyUrl: String(fd.get("privacyPolicyUrl") ?? ""),
              termsUrl: String(fd.get("termsUrl") ?? ""),
              cookiePolicyUrl: String(fd.get("cookiePolicyUrl") ?? ""),
              timezone: String(fd.get("timezone") ?? ""),
              defaultCurrency: (String(fd.get("defaultCurrency") ?? "INR") ===
              "USD"
                ? "USD"
                : "INR"),
            });
          }}
        >
          {(
            [
              ["companyName", "Company name", settings.companyName],
              ["supportEmail", "Support email", settings.supportEmail],
              ["supportUrl", "Support URL", settings.supportUrl],
              ["privacyPolicyUrl", "Privacy policy", settings.privacyPolicyUrl],
              ["termsUrl", "Terms", settings.termsUrl],
              ["cookiePolicyUrl", "Cookie policy", settings.cookiePolicyUrl],
              ["timezone", "Timezone", settings.timezone],
            ] as const
          ).map(([name, label, value]) => (
            <label key={name} className="block">
              {label}
              <input
                name={name}
                defaultValue={value}
                className="mt-1 w-full rounded-lg border border-surface-border-subtle bg-surface-raised px-2 py-1.5"
              />
            </label>
          ))}
          <label className="block">
            Default currency
            <select
              name="defaultCurrency"
              defaultValue={settings.defaultCurrency}
              className="mt-1 w-full rounded-lg border border-surface-border-subtle bg-surface-raised px-2 py-1.5"
            >
              <option value="INR">INR</option>
              <option value="USD">USD</option>
            </select>
          </label>
          <button
            type="submit"
            className="rounded-lg bg-accent px-3 py-2 font-semibold text-white"
          >
            Save settings
          </button>
        </form>
      </Panel>
    </AdminShell>
  );
}
