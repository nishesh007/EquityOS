/**
 * Sprint 12B — Billing, payments & subscription commercial types.
 */

import type { PlanId } from "@/lib/saas/types";

export type BillingCycle = "monthly" | "yearly";

export type PaymentGatewayId =
  | "razorpay"
  | "stripe"
  | "paypal"
  | "paddle"
  | "lemonsqueezy";

export type PaymentMethodKind =
  | "card"
  | "upi"
  | "netbanking"
  | "wallet"
  | "international_card";

export type TransactionStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "failed"
  | "refunded"
  | "partially_refunded"
  | "cancelled";

export type ExtendedSubscriptionStatus =
  | "free"
  | "trial"
  | "active"
  | "grace"
  | "past_due"
  | "cancelled"
  | "expired"
  | "suspended"
  | "reactivated";

export type InvoiceKind = "consumer" | "business";

export type CouponType =
  | "percentage"
  | "flat"
  | "trial_extension"
  | "referral";

export type RefundStatus = "pending" | "processing" | "completed" | "failed";

export type WebhookEventType =
  | "payment.success"
  | "payment.failed"
  | "subscription.created"
  | "subscription.renewed"
  | "subscription.cancelled"
  | "refund.completed"
  | "invoice.generated";

export interface PlanPricing {
  planId: PlanId;
  monthlyInr: number;
  yearlyInr: number;
  monthlyUsd: number;
  yearlyUsd: number;
  currencyDefault: "INR" | "USD";
}

export interface TaxBreakdown {
  cgst: number;
  sgst: number;
  igst: number;
  reverseCharge: boolean;
  gstin: string | null;
}

export interface BillingProfile {
  userId: string;
  companyName: string;
  billingName: string;
  billingEmail: string;
  billingAddress: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  gstin: string | null;
  invoiceKind: InvoiceKind;
  autoRenew: boolean;
  preferredGateway: PaymentGatewayId;
  preferredCurrency: "INR" | "USD";
  billingCycle: BillingCycle;
  updatedAt: string;
}

export interface PaymentMethodRecord {
  id: string;
  userId: string;
  gateway: PaymentGatewayId;
  kind: PaymentMethodKind;
  label: string;
  last4: string | null;
  brand: string | null;
  upiVpa: string | null;
  isDefault: boolean;
  createdAt: string;
  externalId: string;
}

export interface TransactionRecord {
  id: string;
  userId: string;
  gateway: PaymentGatewayId;
  amount: number;
  currency: "INR" | "USD";
  status: TransactionStatus;
  description: string;
  planId: PlanId | null;
  invoiceId: string | null;
  couponCode: string | null;
  externalId: string;
  receiptUrl: string | null;
  metadata: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitAmount: number;
  amount: number;
}

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  userId: string;
  transactionId: string | null;
  customerName: string;
  companyName: string;
  gstin: string | null;
  billingAddress: string;
  kind: InvoiceKind;
  currency: "INR" | "USD";
  lineItems: InvoiceLineItem[];
  subtotal: number;
  discount: number;
  tax: TaxBreakdown;
  total: number;
  paidAt: string | null;
  paymentMethodLabel: string | null;
  pdfText: string;
  createdAt: string;
}

export interface CouponRecord {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  trialExtensionDays: number;
  maxUses: number;
  usedCount: number;
  expiresAt: string | null;
  minPlanId: PlanId | null;
  maxDiscount: number | null;
  active: boolean;
  createdAt: string;
}

export interface ReferralRecord {
  id: string;
  userId: string;
  code: string;
  inviteLink: string;
  invitesSent: number;
  conversions: number;
  pendingCredits: number;
  approvedCredits: number;
  walletBalance: number;
  createdAt: string;
}

export interface UsageSnapshot {
  userId: string;
  periodStart: string;
  periodEnd: string;
  aiRequests: number;
  researchReports: number;
  exports: number;
  backtests: number;
  optimizationRuns: number;
  paperTradingSessions: number;
  watchlists: number;
  portfolioCount: number;
  apiCalls: number;
  storageGbUsed: number;
}

export interface RefundRecord {
  id: string;
  transactionId: string;
  userId: string;
  amount: number;
  currency: "INR" | "USD";
  reason: string;
  status: RefundStatus;
  automatic: boolean;
  createdAt: string;
  completedAt: string | null;
}

export interface WebhookEventRecord {
  id: string;
  gateway: PaymentGatewayId;
  eventType: WebhookEventType;
  externalEventId: string;
  payloadHash: string;
  signatureValid: boolean;
  processed: boolean;
  duplicate: boolean;
  createdAt: string;
  error: string | null;
}

export interface SubscriptionLifecycleEvent {
  id: string;
  userId: string;
  fromStatus: ExtendedSubscriptionStatus;
  toStatus: ExtendedSubscriptionStatus;
  planId: PlanId;
  note: string;
  createdAt: string;
}

export interface CheckoutSession {
  id: string;
  userId: string;
  gateway: PaymentGatewayId;
  planId: PlanId;
  cycle: BillingCycle;
  amount: number;
  currency: "INR" | "USD";
  couponCode: string | null;
  status: "created" | "completed" | "failed" | "cancelled";
  checkoutUrl: string;
  externalId: string;
  createdAt: string;
}

export interface RevenueAnalytics {
  mrr: number;
  arr: number;
  monthlyGrowthPct: number;
  activeSubscribers: number;
  churnRatePct: number;
  renewalRatePct: number;
  arpu: number;
  ltv: number;
  paymentSuccessRatePct: number;
  gatewayDistribution: Record<PaymentGatewayId, number>;
  lifetimeSpend: number;
  totalSavings: number;
}

export interface BillingPersistedState {
  version: 1;
  profiles: BillingProfile[];
  paymentMethods: PaymentMethodRecord[];
  transactions: TransactionRecord[];
  invoices: InvoiceRecord[];
  coupons: CouponRecord[];
  referrals: ReferralRecord[];
  usage: UsageSnapshot[];
  refunds: RefundRecord[];
  webhooks: WebhookEventRecord[];
  lifecycle: SubscriptionLifecycleEvent[];
  checkouts: CheckoutSession[];
  creditWallet: Record<string, number>;
}

export const BILLING_STORAGE_KEY = "equityos.billing.platform.v1";
export const GST_RATE = 0.18;
