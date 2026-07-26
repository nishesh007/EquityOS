/**
 * Client-safe sandbox checkout / refund — no Node crypto.
 */

import type { CheckoutSession, PaymentGatewayId } from "../types";
import type { CreateCheckoutInput, CheckoutResult, RefundResult } from "./types";
import { createId, nowIso, randomToken } from "@/lib/saas/utils";

export function createSandboxCheckout(
  gateway: PaymentGatewayId,
  input: CreateCheckoutInput
): CheckoutResult {
  const externalId = `order_sandbox_${randomToken(8)}`;
  const sessionId = createId("chk");
  const session: CheckoutSession = {
    id: sessionId,
    userId: input.userId,
    gateway,
    planId: input.planId,
    cycle: input.cycle,
    amount: input.amount,
    currency: input.currency,
    couponCode: input.couponCode ?? null,
    status: "created",
    checkoutUrl: `${input.successUrl}${input.successUrl.includes("?") ? "&" : "?"}checkout=${sessionId}&gateway=${gateway}&sandbox=1`,
    externalId,
    createdAt: nowIso(),
  };
  return {
    publicKey:
      gateway === "stripe"
        ? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "pk_test_sandbox"
        : process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "rzp_test_sandbox",
    session,
  };
}

export function sandboxRefund(): RefundResult {
  return {
    externalRefundId: `rfnd_sandbox_${randomToken(6)}`,
    status: "completed",
  };
}
