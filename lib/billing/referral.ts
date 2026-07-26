/**
 * Referral engine — Sprint 12B.
 */

import type { ReferralRecord } from "./types";
import { createId, nowIso, randomToken } from "@/lib/saas/utils";

export function createReferral(userId: string, origin = "https://equityos.app"): ReferralRecord {
  const code = `EOS-${randomToken(3).toUpperCase()}`;
  return {
    id: createId("ref"),
    userId,
    code,
    inviteLink: `${origin}/signup?ref=${code}`,
    invitesSent: 0,
    conversions: 0,
    pendingCredits: 0,
    approvedCredits: 0,
    walletBalance: 0,
    createdAt: nowIso(),
  };
}

export function applyReferralConversion(
  referral: ReferralRecord,
  creditAmount: number
): ReferralRecord {
  return {
    ...referral,
    conversions: referral.conversions + 1,
    pendingCredits: referral.pendingCredits + creditAmount,
  };
}

export function approveReferralCredits(
  referral: ReferralRecord,
  amount: number
): ReferralRecord {
  const move = Math.min(amount, referral.pendingCredits);
  return {
    ...referral,
    pendingCredits: referral.pendingCredits - move,
    approvedCredits: referral.approvedCredits + move,
    walletBalance: referral.walletBalance + move,
  };
}
