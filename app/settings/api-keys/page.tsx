"use client";

import { SettingsShell, FeatureGate } from "@/components/saas";
import { Card } from "@/components/ui/Card";

export default function ApiKeysSettingsPage() {
  return (
    <SettingsShell
      title="API Keys"
      description="Developer credentials — Institutional+ entitlement required."
    >
      <FeatureGate feature="apiKeys" mode="overlay">
        <Card padding="lg">
          <p className="text-sm text-text-secondary">
            API key management is a placeholder for future developer platform work.
            Keys are not issued in Sprint 12A.
          </p>
          <button
            type="button"
            disabled
            className="mt-3 rounded-lg border border-surface-border-subtle px-3 py-2 text-xs text-text-faint"
          >
            Generate API key (future)
          </button>
        </Card>
      </FeatureGate>
    </SettingsShell>
  );
}
