"use client";

import { SettingsShell } from "@/components/saas";
import { ReferralCard, SubscriptionSubNav } from "@/components/billing";
import { useReferral } from "@/lib/billing";
import { referralService } from "@/lib/billing/services";

export default function ReferralPage() {
  const { referral, sendReferralInvite } = useReferral();
  const leaderboard = referralService.leaderboardPlaceholder();

  return (
    <SettingsShell
      title="Referral"
      description="Invite links, credit wallet, and referral statistics."
    >
      <SubscriptionSubNav />
      {referral ? (
        <ReferralCard
          referral={referral}
          onInvite={() => {
            void (async () => {
              const link = await sendReferralInvite();
              if (link && typeof navigator !== "undefined") {
                await navigator.clipboard.writeText(link);
              }
            })();
          }}
        />
      ) : (
        <p className="text-sm text-text-secondary">No referral profile.</p>
      )}
      <div className="mt-6">
        <h2 className="mb-2 text-sm font-semibold">Leaderboard (placeholder)</h2>
        <ul className="space-y-1 text-xs text-text-secondary">
          {leaderboard.map((row) => (
            <li key={row.code}>
              {row.code} — {row.conversions} conversions · {row.credits} credits
            </li>
          ))}
          {leaderboard.length === 0 && <li>No referrals yet.</li>}
        </ul>
      </div>
    </SettingsShell>
  );
}
