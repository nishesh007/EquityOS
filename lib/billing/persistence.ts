/**
 * Billing persistence — Sprint 12B.
 */

import { DEFAULT_COUPONS } from "./coupon";
import {
  BILLING_STORAGE_KEY,
  type BillingPersistedState,
} from "./types";

let memoryState: BillingPersistedState | null = null;

export function emptyBillingState(): BillingPersistedState {
  return {
    version: 1,
    profiles: [],
    paymentMethods: [],
    transactions: [],
    invoices: [],
    coupons: [...DEFAULT_COUPONS],
    referrals: [],
    usage: [],
    refunds: [],
    webhooks: [],
    lifecycle: [],
    checkouts: [],
    creditWallet: {},
  };
}

export function resetBillingMemory(): void {
  memoryState = emptyBillingState();
}

export function loadBillingState(): BillingPersistedState {
  if (typeof window === "undefined") {
    return memoryState ?? emptyBillingState();
  }
  try {
    const raw = window.localStorage.getItem(BILLING_STORAGE_KEY);
    if (!raw) return emptyBillingState();
    const parsed = JSON.parse(raw) as Partial<BillingPersistedState>;
    if (parsed.version !== 1) return emptyBillingState();
    const base = emptyBillingState();
    return {
      ...base,
      ...parsed,
      version: 1,
      profiles: parsed.profiles ?? [],
      paymentMethods: parsed.paymentMethods ?? [],
      transactions: parsed.transactions ?? [],
      invoices: parsed.invoices ?? [],
      coupons: parsed.coupons?.length ? parsed.coupons : base.coupons,
      referrals: parsed.referrals ?? [],
      usage: parsed.usage ?? [],
      refunds: parsed.refunds ?? [],
      webhooks: parsed.webhooks ?? [],
      lifecycle: parsed.lifecycle ?? [],
      checkouts: parsed.checkouts ?? [],
      creditWallet: parsed.creditWallet ?? {},
    };
  } catch {
    return emptyBillingState();
  }
}

export function saveBillingState(
  state: BillingPersistedState
): { ok: boolean; error?: string } {
  memoryState = state;
  if (typeof window === "undefined") return { ok: true };
  try {
    window.localStorage.setItem(BILLING_STORAGE_KEY, JSON.stringify(state));
    return { ok: true };
  } catch {
    return { ok: false, error: "Unable to persist billing data." };
  }
}
