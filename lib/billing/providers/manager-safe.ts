/**
 * Client-safe gateway listing (no provider crypto imports).
 */

import type { PaymentGatewayId } from "../types";
import { isGatewayConfigured, gatewayMode } from "./types";

const DISPLAY: Record<PaymentGatewayId, string> = {
  razorpay: "Razorpay",
  stripe: "Stripe",
  paypal: "PayPal",
  paddle: "Paddle",
  lemonsqueezy: "LemonSqueezy",
};

const AVAILABLE: PaymentGatewayId[] = ["razorpay", "stripe"];

export function listProviders(): Array<{
  id: PaymentGatewayId;
  name: string;
  configured: boolean;
  mode: "live" | "sandbox";
  available: boolean;
}> {
  return (
    [
      "razorpay",
      "stripe",
      "paypal",
      "paddle",
      "lemonsqueezy",
    ] as PaymentGatewayId[]
  ).map((id) => ({
    id,
    name: DISPLAY[id],
    configured: isGatewayConfigured(id),
    mode: gatewayMode(id),
    available: AVAILABLE.includes(id),
  }));
}
