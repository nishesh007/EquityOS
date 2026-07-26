/**
 * Live checkout — server secrets only.
 */

import { NextResponse } from "next/server";
import { getProvider } from "@/lib/billing/providers/manager";
import { isGatewayConfigured } from "@/lib/billing/providers/types";
import type { BillingCycle, PaymentGatewayId } from "@/lib/billing/types";
import type { PlanId } from "@/lib/saas/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      userId: string;
      email: string;
      planId: PlanId;
      cycle: BillingCycle;
      amount: number;
      currency: "INR" | "USD";
      couponCode?: string | null;
      gateway: PaymentGatewayId;
      successUrl: string;
      cancelUrl: string;
    };

    if (!body.gateway || !body.userId || !body.planId) {
      return NextResponse.json({ error: "Invalid checkout payload" }, { status: 400 });
    }

    if (!isGatewayConfigured(body.gateway)) {
      return NextResponse.json({ useSandbox: true });
    }

    const provider = getProvider(body.gateway);
    const result = await provider.createCheckout({
      userId: body.userId,
      email: body.email,
      planId: body.planId,
      cycle: body.cycle,
      amount: body.amount,
      currency: body.currency,
      couponCode: body.couponCode,
      successUrl: body.successUrl,
      cancelUrl: body.cancelUrl,
    });

    return NextResponse.json({
      session: result.session,
      publicKey: result.publicKey,
      clientSecret: result.clientSecret,
      useSandbox: false,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Checkout failed", useSandbox: true },
      { status: 500 }
    );
  }
}
