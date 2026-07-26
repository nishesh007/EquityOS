/**
 * Razorpay provider — Sprint 12B.
 * Uses live credentials when present; otherwise deterministic sandbox.
 */

import { createHash, createHmac, timingSafeEqual } from "crypto";
import type {
  CheckoutResult,
  CreateCheckoutInput,
  PaymentProvider,
  RefundInput,
  RefundResult,
  WebhookVerifyInput,
} from "./types";
import { gatewayMode, isGatewayConfigured } from "./types";
import { createId, nowIso, randomToken } from "@/lib/saas/utils";

function sandboxCheckout(input: CreateCheckoutInput): CheckoutResult {
  const externalId = `order_sandbox_${randomToken(8)}`;
  const sessionId = createId("chk");
  return {
    publicKey: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "rzp_test_sandbox",
    session: {
      id: sessionId,
      userId: input.userId,
      gateway: "razorpay",
      planId: input.planId,
      cycle: input.cycle,
      amount: input.amount,
      currency: input.currency,
      couponCode: input.couponCode ?? null,
      status: "created",
      checkoutUrl: `${input.successUrl}${input.successUrl.includes("?") ? "&" : "?"}checkout=${sessionId}&gateway=razorpay&sandbox=1`,
      externalId,
      createdAt: nowIso(),
    },
  };
}

export const razorpayProvider: PaymentProvider = {
  id: "razorpay",
  displayName: "Razorpay",

  async createCheckout(input) {
    if (!isGatewayConfigured("razorpay")) {
      return sandboxCheckout(input);
    }
    // Live path: create order via Razorpay Orders API (server-side secret only).
    const keyId = process.env.RAZORPAY_KEY_ID!;
    const keySecret = process.env.RAZORPAY_KEY_SECRET!;
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const amountPaise = Math.round(input.amount * (input.currency === "INR" ? 100 : 100));
    try {
      const res = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency: input.currency,
          receipt: createId("rcpt"),
          notes: {
            userId: input.userId,
            planId: input.planId,
            cycle: input.cycle,
            coupon: input.couponCode ?? "",
          },
        }),
      });
      if (!res.ok) return sandboxCheckout(input);
      const order = (await res.json()) as { id: string };
      const sessionId = createId("chk");
      return {
        publicKey: keyId,
        session: {
          id: sessionId,
          userId: input.userId,
          gateway: "razorpay",
          planId: input.planId,
          cycle: input.cycle,
          amount: input.amount,
          currency: input.currency,
          couponCode: input.couponCode ?? null,
          status: "created",
          checkoutUrl: `${input.successUrl}${input.successUrl.includes("?") ? "&" : "?"}checkout=${sessionId}&gateway=razorpay&order=${order.id}`,
          externalId: order.id,
          createdAt: nowIso(),
        },
      };
    } catch {
      return sandboxCheckout(input);
    }
  },

  async createCustomer(email, name) {
    return { customerId: `cust_rzp_${createHash("sha256").update(`${email}:${name}`).digest("hex").slice(0, 16)}` };
  },

  async verifyWebhook(input: WebhookVerifyInput) {
    const secret =
      process.env.RAZORPAY_WEBHOOK_SECRET?.trim() ||
      process.env.RAZORPAY_KEY_SECRET?.trim() ||
      "sandbox_webhook_secret";
    const expected = createHmac("sha256", secret)
      .update(input.rawBody)
      .digest("hex");
    try {
      const a = Buffer.from(expected);
      const b = Buffer.from(input.signature);
      if (a.length !== b.length) return gatewayMode("razorpay") === "sandbox";
      return timingSafeEqual(a, b);
    } catch {
      return gatewayMode("razorpay") === "sandbox";
    }
  },

  async parseWebhookEvent(rawBody: string) {
    const json = JSON.parse(rawBody) as {
      event?: string;
      id?: string;
      payload?: {
        payment?: { entity?: { id?: string; status?: string; amount?: number; currency?: string; notes?: Record<string, string> } };
        subscription?: { entity?: { id?: string; status?: string } };
      };
    };
    const payment = json.payload?.payment?.entity;
    return {
      eventId: json.id ?? `rzp_evt_${randomToken(6)}`,
      type: json.event ?? "payment.captured",
      paymentExternalId: payment?.id,
      status: payment?.status,
      amount: payment?.amount ? payment.amount / 100 : undefined,
      currency: payment?.currency?.toUpperCase(),
      metadata: payment?.notes,
    };
  },

  async refund(input: RefundInput): Promise<RefundResult> {
    if (!isGatewayConfigured("razorpay")) {
      return {
        externalRefundId: `rfnd_sandbox_${randomToken(6)}`,
        status: "completed",
      };
    }
    const keyId = process.env.RAZORPAY_KEY_ID!;
    const keySecret = process.env.RAZORPAY_KEY_SECRET!;
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    try {
      const res = await fetch(
        `https://api.razorpay.com/v1/payments/${input.externalPaymentId}/refund`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: Math.round(input.amount * 100),
            notes: { reason: input.reason },
          }),
        }
      );
      if (!res.ok) {
        return { externalRefundId: "", status: "failed" };
      }
      const body = (await res.json()) as { id: string };
      return { externalRefundId: body.id, status: "completed" };
    } catch {
      return { externalRefundId: "", status: "failed" };
    }
  },

  async cancelSubscription(externalSubscriptionId: string) {
    void externalSubscriptionId;
    return { ok: true };
  },
};
