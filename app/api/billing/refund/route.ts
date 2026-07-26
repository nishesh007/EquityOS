/**
 * Live refund — server secrets only.
 */

import { NextResponse } from "next/server";
import { getProvider } from "@/lib/billing/providers/manager";
import { isGatewayConfigured } from "@/lib/billing/providers/types";
import type { PaymentGatewayId } from "@/lib/billing/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      gateway: PaymentGatewayId;
      externalPaymentId: string;
      amount: number;
      currency: "INR" | "USD";
      reason: string;
    };

    if (!isGatewayConfigured(body.gateway)) {
      return NextResponse.json({
        externalRefundId: `rfnd_sandbox_${Date.now()}`,
        status: "completed",
      });
    }

    const provider = getProvider(body.gateway);
    const result = await provider.refund({
      externalPaymentId: body.externalPaymentId,
      amount: body.amount,
      currency: body.currency,
      reason: body.reason,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Refund failed" },
      { status: 500 }
    );
  }
}
