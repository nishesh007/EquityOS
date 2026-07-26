"use client";

import { SettingsShell } from "@/components/saas";
import {
  SubscriptionSubNav,
  SubscriptionTimeline,
} from "@/components/billing";
import { useBilling } from "@/lib/billing";

export default function UpgradeHistoryPage() {
  const { upgradeHistory } = useBilling();

  return (
    <SettingsShell
      title="Upgrade History"
      description="Subscription lifecycle: upgrades, renewals, grace, and reactivations."
    >
      <SubscriptionSubNav />
      <SubscriptionTimeline events={upgradeHistory} />
    </SettingsShell>
  );
}
