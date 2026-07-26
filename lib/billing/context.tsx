"use client";

/**
 * Billing stores + hooks — Sprint 12B.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth, useCurrentUser, useSubscription } from "@/lib/saas";
import type { PlanId } from "@/lib/saas/types";
import {
  analyticsService,
  billingService,
  couponService,
  invoiceService,
  lifecycleService,
  paymentService,
  referralService,
  refundService,
  transactionService,
  usageService,
} from "./services";
import type {
  BillingProfile,
  CouponRecord,
  InvoiceRecord,
  PaymentGatewayId,
  PaymentMethodKind,
  PaymentMethodRecord,
  ReferralRecord,
  RefundRecord,
  RevenueAnalytics,
  TransactionRecord,
  UsageSnapshot,
  BillingCycle,
} from "./types";
import { downloadInvoiceBlob } from "./invoice";
import {
  downloadCsv,
  invoicesToCsv,
  revenueToCsv,
  transactionsToCsv,
  usageToCsv,
} from "./export";
import { priceFor } from "./pricing";

interface BillingContextValue {
  hydrated: boolean;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  refresh: () => void;
  profile: BillingProfile | null;
  paymentMethods: PaymentMethodRecord[];
  invoices: InvoiceRecord[];
  transactions: TransactionRecord[];
  coupons: CouponRecord[];
  referral: ReferralRecord | null;
  usage: UsageSnapshot | null;
  refunds: RefundRecord[];
  analytics: RevenueAnalytics;
  dashboard: ReturnType<typeof billingService.dashboard> | null;
  upgradeHistory: ReturnType<typeof lifecycleService.history>;
  updateProfile: (patch: Partial<BillingProfile>) => Promise<boolean>;
  setAutoRenew: (enabled: boolean) => Promise<boolean>;
  addPaymentMethod: (input: {
    gateway: PaymentGatewayId;
    kind: PaymentMethodKind;
    label: string;
    last4?: string | null;
    brand?: string | null;
    upiVpa?: string | null;
  }) => Promise<boolean>;
  removePaymentMethod: (id: string) => Promise<boolean>;
  setDefaultPaymentMethod: (id: string) => Promise<boolean>;
  startCheckout: (input: {
    planId: PlanId;
    cycle: BillingCycle;
    gateway: PaymentGatewayId;
    couponCode?: string | null;
  }) => Promise<string | null>;
  completeSandboxCheckout: (checkoutId: string) => Promise<boolean>;
  validateCoupon: (code: string, planId: PlanId) => {
    ok: boolean;
    discount: number;
    error?: string;
  };
  sendReferralInvite: () => Promise<string | null>;
  trackUsage: (metric: Parameters<typeof usageService.track>[1]) => void;
  downloadInvoice: (invoiceId: string) => void;
  emailInvoice: (invoiceId: string) => Promise<boolean>;
  exportTransactionsCsv: () => void;
  exportInvoicesCsv: () => void;
  exportUsageCsv: () => void;
  exportRevenueCsv: () => void;
  requestRefund: (transactionId: string, amount: number, reason: string) => Promise<boolean>;
}

const BillingContext = createContext<BillingContextValue | null>(null);

export function BillingProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { profile: user } = useCurrentUser();
  const { subscription } = useSubscription();
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<BillingProfile | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodRecord[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [coupons, setCoupons] = useState<CouponRecord[]>([]);
  const [referral, setReferral] = useState<ReferralRecord | null>(null);
  const [usage, setUsage] = useState<UsageSnapshot | null>(null);
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [analytics, setAnalytics] = useState<RevenueAnalytics>(() =>
    analyticsService.compute()
  );
  const [dashboard, setDashboard] = useState<ReturnType<
    typeof billingService.dashboard
  > | null>(null);
  const [upgradeHistory, setUpgradeHistory] = useState<
    ReturnType<typeof lifecycleService.history>
  >([]);

  const refresh = useCallback(() => {
    if (!user) {
      setProfile(null);
      setPaymentMethods([]);
      setInvoices([]);
      setTransactions([]);
      setReferral(null);
      setUsage(null);
      setRefunds([]);
      setDashboard(null);
      setUpgradeHistory([]);
      setCoupons(couponService.list());
      setAnalytics(analyticsService.compute());
      return;
    }
    billingService.ensureUser(user.id, user.email, user.displayName);
    usageService.resetIfNeeded(user.id);
    setProfile(billingService.getProfile(user.id));
    setPaymentMethods(paymentService.listMethods(user.id));
    setInvoices(invoiceService.list(user.id));
    setTransactions(transactionService.list(user.id));
    setCoupons(couponService.list());
    setReferral(referralService.get(user.id));
    setUsage(usageService.get(user.id));
    setRefunds(refundService.list(user.id));
    setUpgradeHistory(lifecycleService.history(user.id));
    setAnalytics(
      analyticsService.compute(subscription ? [subscription.planId] : [])
    );
    if (subscription) {
      setDashboard(
        billingService.dashboard(user.id, subscription.planId, subscription.status)
      );
    }
  }, [user, subscription]);

  useEffect(() => {
    refresh();
    setHydrated(true);
  }, [refresh, isAuthenticated]);

  const clearError = useCallback(() => setError(null), []);

  const updateProfile = useCallback(
    async (patch: Partial<BillingProfile>) => {
      if (!user) return false;
      setLoading(true);
      const res = billingService.updateProfile(user.id, patch);
      setLoading(false);
      if (!res.ok) {
        setError(res.error);
        return false;
      }
      refresh();
      return true;
    },
    [user, refresh]
  );

  const setAutoRenew = useCallback(
    async (enabled: boolean) => {
      if (!user) return false;
      const res = billingService.setAutoRenew(user.id, enabled);
      if (!res.ok) {
        setError(res.error);
        return false;
      }
      refresh();
      return true;
    },
    [user, refresh]
  );

  const addPaymentMethod = useCallback(
    async (input: {
      gateway: PaymentGatewayId;
      kind: PaymentMethodKind;
      label: string;
      last4?: string | null;
      brand?: string | null;
      upiVpa?: string | null;
    }) => {
      if (!user) return false;
      const res = paymentService.addMethod({ userId: user.id, ...input });
      if (!res.ok) {
        setError(res.error);
        return false;
      }
      refresh();
      return true;
    },
    [user, refresh]
  );

  const removePaymentMethod = useCallback(
    async (id: string) => {
      if (!user) return false;
      const res = paymentService.removeMethod(user.id, id);
      if (!res.ok) {
        setError(res.error);
        return false;
      }
      refresh();
      return true;
    },
    [user, refresh]
  );

  const setDefaultPaymentMethod = useCallback(
    async (id: string) => {
      if (!user) return false;
      const res = paymentService.setDefault(user.id, id);
      if (!res.ok) {
        setError(res.error);
        return false;
      }
      refresh();
      return true;
    },
    [user, refresh]
  );

  const startCheckout = useCallback(
    async (input: {
      planId: PlanId;
      cycle: BillingCycle;
      gateway: PaymentGatewayId;
      couponCode?: string | null;
    }) => {
      if (!user) return null;
      setLoading(true);
      const origin =
        typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
      const res = await paymentService.startCheckout({
        userId: user.id,
        email: user.email,
        name: user.displayName,
        planId: input.planId,
        cycle: input.cycle,
        gateway: input.gateway,
        couponCode: input.couponCode,
        successUrl: `${origin}/settings/subscription/billing?paid=1`,
        cancelUrl: `${origin}/settings/subscription/billing?cancelled=1`,
      });
      setLoading(false);
      if (!res.ok) {
        setError(res.error);
        return null;
      }
      refresh();
      return res.data.checkoutUrl;
    },
    [user, refresh]
  );

  const completeSandboxCheckout = useCallback(
    async (checkoutId: string) => {
      if (!user) return false;
      const res = paymentService.completeCheckout(user.id, checkoutId);
      if (!res.ok) {
        setError(res.error);
        return false;
      }
      refresh();
      return true;
    },
    [user, refresh]
  );

  const validateCouponFn = useCallback(
    (code: string, planId: PlanId) => {
      const amount = priceFor(planId, profile?.billingCycle ?? "monthly", profile?.preferredCurrency ?? "INR");
      const v = couponService.validate(code, planId, amount);
      return { ok: v.ok, discount: v.discount, error: v.error };
    },
    [profile]
  );

  const sendReferralInvite = useCallback(async () => {
    if (!user) return null;
    const res = referralService.sendInvite(user.id);
    if (!res.ok) {
      setError(res.error);
      return null;
    }
    refresh();
    return res.data.inviteLink;
  }, [user, refresh]);

  const trackUsage = useCallback(
    (metric: Parameters<typeof usageService.track>[1]) => {
      if (!user) return;
      usageService.track(user.id, metric);
      refresh();
    },
    [user, refresh]
  );

  const downloadInvoice = useCallback(
    (invoiceId: string) => {
      const inv = invoiceService.get(invoiceId);
      if (!inv) {
        setError("Invoice not found.");
        return;
      }
      downloadInvoiceBlob(inv);
    },
    []
  );

  const emailInvoice = useCallback(async (invoiceId: string) => {
    const res = invoiceService.emailPlaceholder(invoiceId);
    if (!res.ok) {
      setError(res.error);
      return false;
    }
    return true;
  }, []);

  const exportTransactionsCsv = useCallback(() => {
    downloadCsv("transactions.csv", transactionsToCsv(transactions));
  }, [transactions]);

  const exportInvoicesCsv = useCallback(() => {
    downloadCsv("invoices.csv", invoicesToCsv(invoices));
  }, [invoices]);

  const exportUsageCsv = useCallback(() => {
    if (!usage) return;
    downloadCsv("usage.csv", usageToCsv(usage));
  }, [usage]);

  const exportRevenueCsv = useCallback(() => {
    downloadCsv("revenue.csv", revenueToCsv(analytics));
  }, [analytics]);

  const requestRefund = useCallback(
    async (transactionId: string, amount: number, reason: string) => {
      setLoading(true);
      const res = await refundService.create({ transactionId, amount, reason });
      setLoading(false);
      if (!res.ok) {
        setError(res.error);
        return false;
      }
      refresh();
      return true;
    },
    [refresh]
  );

  const value = useMemo<BillingContextValue>(
    () => ({
      hydrated,
      loading,
      error,
      clearError,
      refresh,
      profile,
      paymentMethods,
      invoices,
      transactions,
      coupons,
      referral,
      usage,
      refunds,
      analytics,
      dashboard,
      upgradeHistory,
      updateProfile,
      setAutoRenew,
      addPaymentMethod,
      removePaymentMethod,
      setDefaultPaymentMethod,
      startCheckout,
      completeSandboxCheckout,
      validateCoupon: validateCouponFn,
      sendReferralInvite,
      trackUsage,
      downloadInvoice,
      emailInvoice,
      exportTransactionsCsv,
      exportInvoicesCsv,
      exportUsageCsv,
      exportRevenueCsv,
      requestRefund,
    }),
    [
      hydrated,
      loading,
      error,
      clearError,
      refresh,
      profile,
      paymentMethods,
      invoices,
      transactions,
      coupons,
      referral,
      usage,
      refunds,
      analytics,
      dashboard,
      upgradeHistory,
      updateProfile,
      setAutoRenew,
      addPaymentMethod,
      removePaymentMethod,
      setDefaultPaymentMethod,
      startCheckout,
      completeSandboxCheckout,
      validateCouponFn,
      sendReferralInvite,
      trackUsage,
      downloadInvoice,
      emailInvoice,
      exportTransactionsCsv,
      exportInvoicesCsv,
      exportUsageCsv,
      exportRevenueCsv,
      requestRefund,
    ]
  );

  return (
    <BillingContext.Provider value={value}>{children}</BillingContext.Provider>
  );
}

function useBillingContext(): BillingContextValue {
  const ctx = useContext(BillingContext);
  if (!ctx) throw new Error("useBilling must be used within BillingProvider");
  return ctx;
}

export function useBilling() {
  const ctx = useBillingContext();
  return {
    hydrated: ctx.hydrated,
    loading: ctx.loading,
    error: ctx.error,
    clearError: ctx.clearError,
    profile: ctx.profile,
    dashboard: ctx.dashboard,
    updateProfile: ctx.updateProfile,
    setAutoRenew: ctx.setAutoRenew,
    startCheckout: ctx.startCheckout,
    completeSandboxCheckout: ctx.completeSandboxCheckout,
    upgradeHistory: ctx.upgradeHistory,
    analytics: ctx.analytics,
  };
}

export function usePayments() {
  const ctx = useBillingContext();
  return {
    methods: ctx.paymentMethods,
    transactions: ctx.transactions,
    refunds: ctx.refunds,
    addPaymentMethod: ctx.addPaymentMethod,
    removePaymentMethod: ctx.removePaymentMethod,
    setDefaultPaymentMethod: ctx.setDefaultPaymentMethod,
    requestRefund: ctx.requestRefund,
    exportTransactionsCsv: ctx.exportTransactionsCsv,
    loading: ctx.loading,
    error: ctx.error,
  };
}

export function useInvoices() {
  const ctx = useBillingContext();
  return {
    invoices: ctx.invoices,
    downloadInvoice: ctx.downloadInvoice,
    emailInvoice: ctx.emailInvoice,
    exportInvoicesCsv: ctx.exportInvoicesCsv,
  };
}

export function useUsage() {
  const ctx = useBillingContext();
  return {
    usage: ctx.usage,
    trackUsage: ctx.trackUsage,
    exportUsageCsv: ctx.exportUsageCsv,
  };
}

export function useCoupons() {
  const ctx = useBillingContext();
  return {
    coupons: ctx.coupons,
    validateCoupon: ctx.validateCoupon,
  };
}

export function useReferral() {
  const ctx = useBillingContext();
  return {
    referral: ctx.referral,
    sendReferralInvite: ctx.sendReferralInvite,
  };
}
