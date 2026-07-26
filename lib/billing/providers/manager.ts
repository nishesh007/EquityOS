/**
 * Gateway manager — register providers without duplication.
 */

import type { PaymentGatewayId } from "../types";
import type { PaymentProvider } from "./types";
import { razorpayProvider } from "./razorpay";
import { stripeProvider } from "./stripe";
import { gatewayMode, isGatewayConfigured } from "./types";

const registry = new Map<PaymentGatewayId, PaymentProvider>([
  ["razorpay", razorpayProvider],
  ["stripe", stripeProvider],
]);

/** Future: PayPal / Paddle / LemonSqueezy register here. */
export function registerProvider(provider: PaymentProvider): void {
  registry.set(provider.id, provider);
}

export function getProvider(id: PaymentGatewayId): PaymentProvider {
  const p = registry.get(id);
  if (!p) {
    throw new Error(`Payment gateway not registered: ${id}`);
  }
  return p;
}

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
  ).map((id) => {
    const registered = registry.has(id);
    return {
      id,
      name: registered ? getProvider(id).displayName : id,
      configured: isGatewayConfigured(id),
      mode: gatewayMode(id),
      available: registered,
    };
  });
}
