/**
 * Billing domain services — Sprint 12B.
 */

import { computeRevenueAnalytics } from "./analytics";
import { validateCoupon } from "./coupon";
import { buildInvoice } from "./invoice";
import {
  applyLifecycleAction,
  mapSaasStatus,
  recordLifecycle,
  type LifecycleAction,
} from "./lifecycle";
import { loadBillingState, saveBillingState } from "./persistence";
import { priceFor } from "./pricing";
import { listProviders } from "./providers/manager-safe";
import {
  createSandboxCheckout,
  sandboxRefund,
} from "./providers/sandbox";
import {
  approveReferralCredits,
  applyReferralConversion,
  createReferral,
} from "./referral";
import {
  createPendingTransaction,
  generateReceiptText,
  scheduleRetry,
  updateTransactionStatus,
  createRetryState,
} from "./transaction";
import {
  createUsagePeriod,
  incrementUsage,
  usageRemaining,
  type UsageMetric,
} from "./usage";
import type {
  BillingCycle,
  BillingPersistedState,
  BillingProfile,
  CouponRecord,
  ExtendedSubscriptionStatus,
  InvoiceRecord,
  PaymentGatewayId,
  PaymentMethodKind,
  PaymentMethodRecord,
  RefundRecord,
  TransactionRecord,
} from "./types";
import type { PlanId } from "@/lib/saas/types";
import { addDays, createId, nowIso } from "@/lib/saas/utils";

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function persist(state: BillingPersistedState): ServiceResult<BillingPersistedState> {
  const saved = saveBillingState(state);
  if (!saved.ok) return { ok: false, error: saved.error ?? "Persist failed" };
  return { ok: true, data: state };
}

function defaultProfile(userId: string, email: string, name: string): BillingProfile {
  return {
    userId,
    companyName: "",
    billingName: name,
    billingEmail: email,
    billingAddress: "",
    city: "",
    state: "KA",
    country: "IN",
    pincode: "",
    gstin: null,
    invoiceKind: "consumer",
    autoRenew: true,
    preferredGateway: "razorpay",
    preferredCurrency: "INR",
    billingCycle: "monthly",
    updatedAt: nowIso(),
  };
}

function ensureUserScaffold(
  state: BillingPersistedState,
  userId: string,
  email: string,
  name: string
): BillingPersistedState {
  let next = state;
  if (!next.profiles.some((p) => p.userId === userId)) {
    next = {
      ...next,
      profiles: [...next.profiles, defaultProfile(userId, email, name)],
    };
  }
  if (!next.referrals.some((r) => r.userId === userId)) {
    next = {
      ...next,
      referrals: [...next.referrals, createReferral(userId)],
    };
  }
  if (!next.usage.some((u) => u.userId === userId)) {
    next = {
      ...next,
      usage: [...next.usage, createUsagePeriod(userId)],
    };
  }
  if (next.creditWallet[userId] == null) {
    next = {
      ...next,
      creditWallet: { ...next.creditWallet, [userId]: 0 },
    };
  }
  return next;
}

export const billingService = {
  getState(): BillingPersistedState {
    return loadBillingState();
  },

  ensureUser(userId: string, email: string, name: string): ServiceResult<BillingProfile> {
    let state = ensureUserScaffold(loadBillingState(), userId, email, name);
    const saved = persist(state);
    if (!saved.ok) return saved;
    const profile = saved.data.profiles.find((p) => p.userId === userId)!;
    return { ok: true, data: profile };
  },

  getProfile(userId: string): BillingProfile | null {
    return loadBillingState().profiles.find((p) => p.userId === userId) ?? null;
  },

  updateProfile(
    userId: string,
    patch: Partial<BillingProfile>
  ): ServiceResult<BillingProfile> {
    const state = loadBillingState();
    const idx = state.profiles.findIndex((p) => p.userId === userId);
    if (idx < 0) return { ok: false, error: "Billing profile missing." };
    const updated: BillingProfile = {
      ...state.profiles[idx]!,
      ...patch,
      userId,
      updatedAt: nowIso(),
    };
    const profiles = [...state.profiles];
    profiles[idx] = updated;
    const saved = persist({ ...state, profiles });
    if (!saved.ok) return saved;
    return { ok: true, data: updated };
  },

  setAutoRenew(userId: string, autoRenew: boolean): ServiceResult<BillingProfile> {
    return this.updateProfile(userId, { autoRenew });
  },

  dashboard(userId: string, planId: PlanId, saasStatus: string) {
    const state = loadBillingState();
    const profile = state.profiles.find((p) => p.userId === userId);
    const txns = state.transactions.filter((t) => t.userId === userId);
    const succeeded = txns.filter((t) => t.status === "succeeded");
    const lifetimeSpend = succeeded.reduce((s, t) => s + t.amount, 0);
    const savings =
      (state.creditWallet[userId] ?? 0) +
      state.invoices
        .filter((i) => i.userId === userId)
        .reduce((s, i) => s + i.discount, 0);
    const outstanding = txns
      .filter((t) => t.status === "failed" || t.status === "pending")
      .reduce((s, t) => s + t.amount, 0);
    const pricing = priceFor(
      planId,
      profile?.billingCycle ?? "monthly",
      profile?.preferredCurrency ?? "INR"
    );
    const defaultMethod =
      state.paymentMethods.find((m) => m.userId === userId && m.isDefault) ??
      state.paymentMethods.find((m) => m.userId === userId) ??
      null;
    const upcoming = state.invoices
      .filter((i) => i.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    const status = mapSaasStatus(saasStatus, planId);
    return {
      planId,
      currentCost: pricing,
      currency: profile?.preferredCurrency ?? "INR",
      cycle: profile?.billingCycle ?? "monthly",
      paymentStatus: status,
      outstandingBalance: outstanding,
      lifetimeSpend,
      totalSavings: savings,
      couponDiscounts: state.invoices
        .filter((i) => i.userId === userId)
        .reduce((s, i) => s + i.discount, 0),
      referralCredits: state.creditWallet[userId] ?? 0,
      upcomingInvoice: upcoming ?? null,
      paymentMethod: defaultMethod,
      autoRenew: profile?.autoRenew ?? true,
      renewalDate: addDays(nowIso(), 30),
    };
  },
};

export const paymentService = {
  listMethods(userId: string): PaymentMethodRecord[] {
    return loadBillingState().paymentMethods.filter((m) => m.userId === userId);
  },

  addMethod(input: {
    userId: string;
    gateway: PaymentGatewayId;
    kind: PaymentMethodKind;
    label: string;
    last4?: string | null;
    brand?: string | null;
    upiVpa?: string | null;
    makeDefault?: boolean;
  }): ServiceResult<PaymentMethodRecord> {
    const state = loadBillingState();
    let methods = state.paymentMethods;
    if (input.makeDefault !== false) {
      methods = methods.map((m) =>
        m.userId === input.userId ? { ...m, isDefault: false } : m
      );
    }
    const record: PaymentMethodRecord = {
      id: createId("pm"),
      userId: input.userId,
      gateway: input.gateway,
      kind: input.kind,
      label: input.label,
      last4: input.last4 ?? null,
      brand: input.brand ?? null,
      upiVpa: input.upiVpa ?? null,
      isDefault: input.makeDefault !== false,
      createdAt: nowIso(),
      externalId: createId("ext_pm"),
    };
    const saved = persist({
      ...state,
      paymentMethods: [...methods, record],
    });
    if (!saved.ok) return saved;
    return { ok: true, data: record };
  },

  setDefault(userId: string, methodId: string): ServiceResult<PaymentMethodRecord[]> {
    const state = loadBillingState();
    const methods = state.paymentMethods.map((m) =>
      m.userId !== userId
        ? m
        : { ...m, isDefault: m.id === methodId }
    );
    const saved = persist({ ...state, paymentMethods: methods });
    if (!saved.ok) return saved;
    return { ok: true, data: methods.filter((m) => m.userId === userId) };
  },

  removeMethod(userId: string, methodId: string): ServiceResult<true> {
    const state = loadBillingState();
    const methods = state.paymentMethods.filter(
      (m) => !(m.userId === userId && m.id === methodId)
    );
    const saved = persist({ ...state, paymentMethods: methods });
    if (!saved.ok) return saved;
    return { ok: true, data: true };
  },

  async startCheckout(input: {
    userId: string;
    email: string;
    name: string;
    planId: PlanId;
    cycle: BillingCycle;
    gateway: PaymentGatewayId;
    couponCode?: string | null;
    successUrl: string;
    cancelUrl: string;
  }): Promise<
    ServiceResult<{
      checkoutUrl: string;
      sessionId: string;
      amount: number;
      currency: "INR" | "USD";
      publicKey?: string;
    }>
  > {
    let state = ensureUserScaffold(
      loadBillingState(),
      input.userId,
      input.email,
      input.name
    );
    const profile =
      state.profiles.find((p) => p.userId === input.userId) ??
      defaultProfile(input.userId, input.email, input.name);
    const currency = profile.preferredCurrency;
    let amount = priceFor(input.planId, input.cycle, currency);
    let couponApplied: string | null = null;
    let discount = 0;
    let trialExtensionDays = 0;

    if (input.couponCode) {
      const coupon =
        state.coupons.find(
          (c) => c.code.toUpperCase() === input.couponCode!.toUpperCase()
        ) ?? null;
      const v = validateCoupon({ coupon, planId: input.planId, amount });
      if (!v.ok) return { ok: false, error: v.error ?? "Invalid coupon" };
      discount = v.discount;
      trialExtensionDays = v.trialExtensionDays;
      amount = Math.max(0, amount - discount);
      couponApplied = coupon!.code;
    }

    const wallet = state.creditWallet[input.userId] ?? 0;
    const creditUse = Math.min(wallet, amount);
    amount = Math.round((amount - creditUse) * 100) / 100;

    if (input.planId === "free" || amount === 0) {
      const txn = createPendingTransaction({
        userId: input.userId,
        gateway: input.gateway,
        amount: 0,
        currency,
        description: `Activate ${input.planId}`,
        planId: input.planId,
        invoiceId: null,
        couponCode: couponApplied,
        externalId: createId("free"),
        receiptUrl: null,
        metadata: {
          cycle: input.cycle,
          trialExtensionDays: String(trialExtensionDays),
          creditUse: String(creditUse),
        },
      });
      const completed = updateTransactionStatus(txn, "succeeded");
      completed.receiptUrl = generateReceiptText(completed);
      state = {
        ...state,
        transactions: [...state.transactions, completed],
        creditWallet: {
          ...state.creditWallet,
          [input.userId]: wallet - creditUse,
        },
      };
      if (couponApplied) {
        state = {
          ...state,
          coupons: state.coupons.map((c) =>
            c.code === couponApplied ? { ...c, usedCount: c.usedCount + 1 } : c
          ),
        };
      }
      const invoice = buildInvoice({
        userId: input.userId,
        profile,
        transaction: completed,
        discount: discount + creditUse,
        lineItems: [
          {
            description: `${input.planId} (${input.cycle})`,
            quantity: 1,
            unitAmount: priceFor(input.planId, input.cycle, currency),
            amount: priceFor(input.planId, input.cycle, currency),
          },
        ],
      });
      state = {
        ...state,
        invoices: [...state.invoices, invoice],
        transactions: state.transactions.map((t) =>
          t.id === completed.id ? { ...t, invoiceId: invoice.id } : t
        ),
        lifecycle: [
          ...state.lifecycle,
          recordLifecycle({
            userId: input.userId,
            fromStatus: "free",
            toStatus: "active",
            planId: input.planId,
            note: "Zero-amount activation",
          }),
        ],
      };
      const saved = persist(state);
      if (!saved.ok) return saved;
      return {
        ok: true,
        data: {
          checkoutUrl: `${input.successUrl}${input.successUrl.includes("?") ? "&" : "?"}activated=1&plan=${input.planId}`,
          sessionId: completed.id,
          amount: 0,
          currency,
        },
      };
    }

    const result = createSandboxCheckout(input.gateway, {
      userId: input.userId,
      email: input.email,
      planId: input.planId,
      cycle: input.cycle,
      amount,
      currency,
      couponCode: couponApplied,
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
    });

    let checkoutSession = result.session;
    if (typeof window !== "undefined") {
      try {
        const live = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: input.userId,
            email: input.email,
            planId: input.planId,
            cycle: input.cycle,
            amount,
            currency,
            couponCode: couponApplied,
            gateway: input.gateway,
            successUrl: input.successUrl,
            cancelUrl: input.cancelUrl,
          }),
        });
        if (live.ok) {
          const payload = (await live.json()) as {
            session?: typeof result.session;
            publicKey?: string;
            useSandbox?: boolean;
          };
          if (payload.session && !payload.useSandbox) {
            checkoutSession = payload.session;
            if (payload.publicKey) result.publicKey = payload.publicKey;
          }
        }
      } catch {
        // keep sandbox
      }
    }

    const txn = createPendingTransaction({
      userId: input.userId,
      gateway: input.gateway,
      amount,
      currency,
      description: `Subscribe ${input.planId} (${input.cycle})`,
      planId: input.planId,
      invoiceId: null,
      couponCode: couponApplied,
      externalId: checkoutSession.externalId,
      receiptUrl: null,
      metadata: {
        checkoutId: checkoutSession.id,
        cycle: input.cycle,
        discount: String(discount),
        creditUse: String(creditUse),
        trialExtensionDays: String(trialExtensionDays),
      },
    });

    state = {
      ...state,
      checkouts: [...state.checkouts, checkoutSession],
      transactions: [...state.transactions, txn],
      creditWallet: {
        ...state.creditWallet,
        [input.userId]: wallet - creditUse,
      },
    };
    if (couponApplied) {
      state = {
        ...state,
        coupons: state.coupons.map((c) =>
          c.code === couponApplied ? { ...c, usedCount: c.usedCount + 1 } : c
        ),
      };
    }
    const saved = persist(state);
    if (!saved.ok) return saved;
    return {
      ok: true,
      data: {
        checkoutUrl: checkoutSession.checkoutUrl,
        sessionId: checkoutSession.id,
        amount,
        currency,
        publicKey: result.publicKey,
      },
    };
  },

  /** Complete sandbox / client-confirmed payment. */
  completeCheckout(
    userId: string,
    checkoutId: string
  ): ServiceResult<{ transaction: TransactionRecord; invoice: InvoiceRecord }> {
    let state = loadBillingState();
    const checkout = state.checkouts.find(
      (c) => c.id === checkoutId && c.userId === userId
    );
    if (!checkout) return { ok: false, error: "Checkout not found." };
    if (checkout.status === "completed") {
      const txn = state.transactions.find(
        (t) => t.metadata.checkoutId === checkoutId
      );
      const inv = txn?.invoiceId
        ? state.invoices.find((i) => i.id === txn.invoiceId)
        : null;
      if (txn && inv) return { ok: true, data: { transaction: txn, invoice: inv } };
    }

    const txnIdx = state.transactions.findIndex(
      (t) => t.metadata.checkoutId === checkoutId && t.userId === userId
    );
    if (txnIdx < 0) return { ok: false, error: "Transaction not found." };
    let txn = updateTransactionStatus(state.transactions[txnIdx]!, "succeeded");
    txn = { ...txn, receiptUrl: generateReceiptText(txn) };

    const profile =
      state.profiles.find((p) => p.userId === userId) ??
      defaultProfile(userId, "user@equityos.app", "Customer");
    const listPrice = priceFor(checkout.planId, checkout.cycle, checkout.currency);
    const discount = Number(txn.metadata.discount ?? 0) + Number(txn.metadata.creditUse ?? 0);
    const invoice = buildInvoice({
      userId,
      profile,
      transaction: txn,
      discount,
      lineItems: [
        {
          description: `${checkout.planId} (${checkout.cycle})`,
          quantity: 1,
          unitAmount: listPrice,
          amount: listPrice,
        },
      ],
    });
    txn = { ...txn, invoiceId: invoice.id };

    const transactions = [...state.transactions];
    transactions[txnIdx] = txn;
    const checkouts = state.checkouts.map((c) =>
      c.id === checkoutId ? { ...c, status: "completed" as const } : c
    );
    const lifecycle = [
      ...state.lifecycle,
      recordLifecycle({
        userId,
        fromStatus: "trial",
        toStatus: "active",
        planId: checkout.planId,
        note: `Payment via ${checkout.gateway}`,
      }),
    ];
    const saved = persist({
      ...state,
      transactions,
      checkouts,
      invoices: [...state.invoices, invoice],
      lifecycle,
    });
    if (!saved.ok) return saved;
    return { ok: true, data: { transaction: txn, invoice } };
  },

  failCheckout(userId: string, checkoutId: string, reason: string): ServiceResult<true> {
    const state = loadBillingState();
    const transactions = state.transactions.map((t) =>
      t.userId === userId && t.metadata.checkoutId === checkoutId
        ? updateTransactionStatus(t, "failed", {
            metadata: { ...t.metadata, failReason: reason },
          })
        : t
    );
    const checkouts = state.checkouts.map((c) =>
      c.id === checkoutId && c.userId === userId
        ? { ...c, status: "failed" as const }
        : c
    );
    const saved = persist({ ...state, transactions, checkouts });
    if (!saved.ok) return saved;
    return { ok: true, data: true };
  },

  listGateways: listProviders,
};

export const invoiceService = {
  list(userId: string): InvoiceRecord[] {
    return loadBillingState()
      .invoices.filter((i) => i.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  get(invoiceId: string): InvoiceRecord | null {
    return loadBillingState().invoices.find((i) => i.id === invoiceId) ?? null;
  },

  emailPlaceholder(invoiceId: string): ServiceResult<{ queued: true }> {
    const inv = this.get(invoiceId);
    if (!inv) return { ok: false, error: "Invoice not found." };
    return { ok: true, data: { queued: true } };
  },
};

export const couponService = {
  list(): CouponRecord[] {
    return loadBillingState().coupons;
  },

  validate(code: string, planId: PlanId, amount: number) {
    const coupon =
      loadBillingState().coupons.find(
        (c) => c.code.toUpperCase() === code.trim().toUpperCase()
      ) ?? null;
    return validateCoupon({ coupon, planId, amount });
  },

  upsert(coupon: CouponRecord): ServiceResult<CouponRecord> {
    const state = loadBillingState();
    const idx = state.coupons.findIndex((c) => c.id === coupon.id);
    const coupons =
      idx >= 0
        ? state.coupons.map((c, i) => (i === idx ? coupon : c))
        : [...state.coupons, coupon];
    const saved = persist({ ...state, coupons });
    if (!saved.ok) return saved;
    return { ok: true, data: coupon };
  },

  deactivate(code: string): ServiceResult<true> {
    const state = loadBillingState();
    const saved = persist({
      ...state,
      coupons: state.coupons.map((c) =>
        c.code.toUpperCase() === code.toUpperCase() ? { ...c, active: false } : c
      ),
    });
    if (!saved.ok) return saved;
    return { ok: true, data: true };
  },
};

export const referralService = {
  get(userId: string) {
    return loadBillingState().referrals.find((r) => r.userId === userId) ?? null;
  },

  sendInvite(userId: string): ServiceResult<{ inviteLink: string }> {
    const state = loadBillingState();
    const referrals = state.referrals.map((r) =>
      r.userId === userId ? { ...r, invitesSent: r.invitesSent + 1 } : r
    );
    const ref = referrals.find((r) => r.userId === userId);
    if (!ref) return { ok: false, error: "Referral profile missing." };
    const saved = persist({ ...state, referrals });
    if (!saved.ok) return saved;
    return { ok: true, data: { inviteLink: ref.inviteLink } };
  },

  convert(code: string, credit = 500): ServiceResult<true> {
    const state = loadBillingState();
    const idx = state.referrals.findIndex(
      (r) => r.code.toUpperCase() === code.toUpperCase()
    );
    if (idx < 0) return { ok: false, error: "Invalid referral code." };
    const referrals = [...state.referrals];
    referrals[idx] = applyReferralConversion(referrals[idx]!, credit);
    const saved = persist({ ...state, referrals });
    if (!saved.ok) return saved;
    return { ok: true, data: true };
  },

  approve(userId: string, amount: number): ServiceResult<true> {
    const state = loadBillingState();
    const prev = state.referrals.find((r) => r.userId === userId);
    if (!prev) return { ok: false, error: "Referral profile missing." };
    const updated = approveReferralCredits(prev, amount);
    const credited = updated.walletBalance - prev.walletBalance;
    const referrals = state.referrals.map((r) =>
      r.userId === userId ? updated : r
    );
    const creditWallet = {
      ...state.creditWallet,
      [userId]: (state.creditWallet[userId] ?? 0) + credited,
    };
    const saved = persist({ ...state, referrals, creditWallet });
    if (!saved.ok) return saved;
    return { ok: true, data: true };
  },

  leaderboardPlaceholder() {
    return loadBillingState()
      .referrals.map((r) => ({
        code: r.code,
        conversions: r.conversions,
        credits: r.approvedCredits,
      }))
      .sort((a, b) => b.conversions - a.conversions)
      .slice(0, 10);
  },
};

export const usageService = {
  get(userId: string) {
    return (
      loadBillingState().usage.find((u) => u.userId === userId) ??
      createUsagePeriod(userId)
    );
  },

  track(userId: string, metric: UsageMetric, by = 1): ServiceResult<true> {
    const state = loadBillingState();
    let usage = state.usage;
    const idx = usage.findIndex((u) => u.userId === userId);
    if (idx < 0) {
      usage = [...usage, incrementUsage(createUsagePeriod(userId), metric, by)];
    } else {
      usage = usage.map((u, i) =>
        i === idx ? incrementUsage(u, metric, by) : u
      );
    }
    const saved = persist({ ...state, usage });
    if (!saved.ok) return saved;
    return { ok: true, data: true };
  },

  remaining(userId: string, planId: PlanId) {
    return usageRemaining(this.get(userId), planId);
  },

  resetIfNeeded(userId: string): ServiceResult<true> {
    const state = loadBillingState();
    const snap = state.usage.find((u) => u.userId === userId);
    if (!snap) return { ok: true, data: true };
    if (new Date(snap.periodEnd).getTime() > Date.now()) return { ok: true, data: true };
    const usage = state.usage.map((u) =>
      u.userId === userId ? createUsagePeriod(userId) : u
    );
    const saved = persist({ ...state, usage });
    if (!saved.ok) return saved;
    return { ok: true, data: true };
  },
};

export const transactionService = {
  list(userId?: string): TransactionRecord[] {
    const all = loadBillingState().transactions;
    return (userId ? all.filter((t) => t.userId === userId) : all).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
  },

  get(id: string): TransactionRecord | null {
    return loadBillingState().transactions.find((t) => t.id === id) ?? null;
  },

  retryFailed(transactionId: string): ServiceResult<TransactionRecord> {
    const state = loadBillingState();
    const idx = state.transactions.findIndex((t) => t.id === transactionId);
    if (idx < 0) return { ok: false, error: "Transaction not found." };
    const txn = state.transactions[idx]!;
    if (txn.status !== "failed") {
      return { ok: false, error: "Only failed payments can be retried." };
    }
    const retryMeta = txn.metadata.retryAttempts
      ? Number(txn.metadata.retryAttempts)
      : 0;
    const retry = scheduleRetry({
      ...createRetryState(3),
      attempts: retryMeta,
    });
    if (retry.exhausted) {
      return { ok: false, error: "Retry failed — attempts exhausted." };
    }
    const updated = updateTransactionStatus(txn, "processing", {
      metadata: {
        ...txn.metadata,
        retryAttempts: String(retry.attempts),
        nextRetryAt: retry.nextRetryAt ?? "",
      },
    });
    // sandbox: succeed on retry
    const succeeded = updateTransactionStatus(updated, "succeeded", {
      receiptUrl: generateReceiptText({ ...updated, status: "succeeded" }),
    });
    const transactions = [...state.transactions];
    transactions[idx] = succeeded;
    const saved = persist({ ...state, transactions });
    if (!saved.ok) return saved;
    return { ok: true, data: succeeded };
  },
};

export const refundService = {
  list(userId?: string): RefundRecord[] {
    const all = loadBillingState().refunds;
    return userId ? all.filter((r) => r.userId === userId) : all;
  },

  async create(input: {
    transactionId: string;
    amount: number;
    reason: string;
    automatic?: boolean;
  }): Promise<ServiceResult<RefundRecord>> {
    const state = loadBillingState();
    const txn = state.transactions.find((t) => t.id === input.transactionId);
    if (!txn) return { ok: false, error: "Transaction not found." };
    if (txn.status !== "succeeded" && txn.status !== "partially_refunded") {
      return { ok: false, error: "Transaction not refundable." };
    }
    if (input.amount <= 0 || input.amount > txn.amount) {
      return { ok: false, error: "Invalid refund amount." };
    }

    let gatewayResult = sandboxRefund();
    if (typeof window !== "undefined") {
      try {
        const live = await fetch("/api/billing/refund", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gateway: txn.gateway,
            externalPaymentId: txn.externalId,
            amount: input.amount,
            currency: txn.currency,
            reason: input.reason,
          }),
        });
        if (live.ok) {
          gatewayResult = (await live.json()) as typeof gatewayResult;
        }
      } catch {
        // sandbox refund
      }
    } else {
      try {
        const { getProvider } = await import("./providers/manager");
        gatewayResult = await getProvider(txn.gateway).refund({
          externalPaymentId: txn.externalId,
          amount: input.amount,
          currency: txn.currency,
          reason: input.reason,
        });
      } catch {
        gatewayResult = sandboxRefund();
      }
    }

    const refund: RefundRecord = {
      id: createId("rfnd"),
      transactionId: txn.id,
      userId: txn.userId,
      amount: input.amount,
      currency: txn.currency,
      reason: input.reason,
      status:
        gatewayResult.status === "completed"
          ? "completed"
          : gatewayResult.status === "failed"
            ? "failed"
            : "processing",
      automatic: Boolean(input.automatic),
      createdAt: nowIso(),
      completedAt: gatewayResult.status === "completed" ? nowIso() : null,
    };

    const partial = input.amount < txn.amount;
    const transactions = state.transactions.map((t) =>
      t.id === txn.id
        ? updateTransactionStatus(
            t,
            partial ? "partially_refunded" : "refunded"
          )
        : t
    );
    const saved = persist({
      ...state,
      refunds: [...state.refunds, refund],
      transactions,
    });
    if (!saved.ok) return saved;
    return { ok: true, data: refund };
  },
};

export const webhookService = {
  list() {
    return loadBillingState().webhooks;
  },

  async ingest(input: {
    gateway: PaymentGatewayId;
    rawBody: string;
    signature: string;
  }): Promise<ServiceResult<{ duplicate: boolean; eventId: string }>> {
    const { ingestWebhook } = await import("./webhook");
    const state = loadBillingState();
    const existing = new Set(state.webhooks.map((w) => w.externalEventId));
    const { record, parsed } = await ingestWebhook({
      ...input,
      existingEventIds: existing,
    });
    if (!record.signatureValid) {
      const saved = persist({
        ...state,
        webhooks: [...state.webhooks, record],
      });
      if (!saved.ok) return saved;
      return { ok: false, error: "Webhook signature invalid." };
    }
    if (record.duplicate) {
      const saved = persist({
        ...state,
        webhooks: [...state.webhooks, { ...record, processed: true }],
      });
      if (!saved.ok) return saved;
      return { ok: true, data: { duplicate: true, eventId: parsed.eventId } };
    }

    let transactions = state.transactions;
    if (parsed.paymentExternalId) {
      transactions = transactions.map((t) => {
        if (t.externalId !== parsed.paymentExternalId) return t;
        if (record.eventType === "payment.success") {
          return updateTransactionStatus(t, "succeeded", {
            receiptUrl: generateReceiptText({ ...t, status: "succeeded" }),
          });
        }
        if (record.eventType === "payment.failed") {
          return updateTransactionStatus(t, "failed");
        }
        if (record.eventType === "refund.completed") {
          return updateTransactionStatus(t, "refunded");
        }
        return t;
      });
    }

    const saved = persist({
      ...state,
      transactions,
      webhooks: [
        ...state.webhooks,
        { ...record, processed: true, error: null },
      ],
    });
    if (!saved.ok) return saved;
    return { ok: true, data: { duplicate: false, eventId: parsed.eventId } };
  },
};

export const analyticsService = {
  compute(activePlanIds: PlanId[] = []) {
    const state = loadBillingState();
    const savings = Object.values(state.creditWallet).reduce((s, n) => s + n, 0);
    return computeRevenueAnalytics({
      transactions: state.transactions,
      activePlanIds:
        activePlanIds.length > 0
          ? activePlanIds
          : state.transactions
              .filter((t) => t.status === "succeeded" && t.planId)
              .map((t) => t.planId!),
      lifecycle: state.lifecycle,
      creditSavings: savings,
    });
  },
};

export const lifecycleService = {
  history(userId: string) {
    return loadBillingState()
      .lifecycle.filter((e) => e.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  transition(
    userId: string,
    from: ExtendedSubscriptionStatus,
    action: LifecycleAction,
    planId: PlanId,
    note: string
  ): ServiceResult<true> {
    const to = applyLifecycleAction(from, action);
    const state = loadBillingState();
    const saved = persist({
      ...state,
      lifecycle: [
        ...state.lifecycle,
        recordLifecycle({ userId, fromStatus: from, toStatus: to, planId, note }),
      ],
    });
    if (!saved.ok) return saved;
    return { ok: true, data: true };
  },
};
