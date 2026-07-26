/**
 * Payment provider abstraction — Sprint 12B.
 * Secrets stay server-side; client only receives public checkout payloads.
 */

import type {
  CheckoutSession,
  PaymentGatewayId,
  TransactionRecord,
} from "../types";

export interface CreateCheckoutInput {
  userId: string;
  email: string;
  planId: CheckoutSession["planId"];
  cycle: CheckoutSession["cycle"];
  amount: number;
  currency: "INR" | "USD";
  couponCode?: string | null;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutResult {
  session: Omit<CheckoutSession, "userId"> & { userId: string };
  clientSecret?: string;
  publicKey?: string;
}

export interface RefundInput {
  externalPaymentId: string;
  amount: number;
  currency: "INR" | "USD";
  reason: string;
}

export interface RefundResult {
  externalRefundId: string;
  status: "pending" | "completed" | "failed";
}

export interface WebhookVerifyInput {
  rawBody: string;
  signature: string;
  timestamp?: string;
}

export interface PaymentProvider {
  readonly id: PaymentGatewayId;
  readonly displayName: string;
  createCheckout(input: CreateCheckoutInput): Promise<CheckoutResult>;
  createCustomer(email: string, name: string): Promise<{ customerId: string }>;
  verifyWebhook(input: WebhookVerifyInput): Promise<boolean>;
  parseWebhookEvent(rawBody: string): Promise<{
    eventId: string;
    type: string;
    paymentExternalId?: string;
    status?: string;
    amount?: number;
    currency?: string;
    metadata?: Record<string, string>;
  }>;
  refund(input: RefundInput): Promise<RefundResult>;
  cancelSubscription(externalSubscriptionId: string): Promise<{ ok: boolean }>;
}

export function isGatewayConfigured(id: PaymentGatewayId): boolean {
  if (id === "razorpay") {
    return Boolean(
      process.env.RAZORPAY_KEY_ID?.trim() &&
        process.env.RAZORPAY_KEY_SECRET?.trim()
    );
  }
  if (id === "stripe") {
    return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
  }
  return false;
}

export function gatewayMode(id: PaymentGatewayId): "live" | "sandbox" {
  if (!isGatewayConfigured(id)) return "sandbox";
  if (id === "stripe" && process.env.STRIPE_SECRET_KEY?.startsWith("sk_live"))
    return "live";
  if (id === "razorpay" && process.env.RAZORPAY_KEY_ID?.startsWith("rzp_live"))
    return "live";
  return "sandbox";
}
