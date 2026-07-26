/**
 * Razorpay webhook — signature verified server-side.
 */

import { NextResponse } from "next/server";
import { ingestWebhook } from "@/lib/billing/webhook";
import { loadBillingState, saveBillingState } from "@/lib/billing/persistence";
import {
  generateReceiptText,
  updateTransactionStatus,
} from "@/lib/billing/transaction";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature =
    req.headers.get("x-razorpay-signature") ??
    req.headers.get("x-equityos-signature") ??
    "";

  const state = loadBillingState();
  const existing = new Set(state.webhooks.map((w) => w.externalEventId));
  const { record, parsed } = await ingestWebhook({
    gateway: "razorpay",
    rawBody,
    signature,
    existingEventIds: existing,
  });

  if (!record.signatureValid) {
    saveBillingState({ ...state, webhooks: [...state.webhooks, record] });
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (record.duplicate) {
    saveBillingState({
      ...state,
      webhooks: [...state.webhooks, { ...record, processed: true }],
    });
    return NextResponse.json({ ok: true, duplicate: true });
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
      return t;
    });
  }

  saveBillingState({
    ...state,
    transactions,
    webhooks: [...state.webhooks, { ...record, processed: true }],
  });

  return NextResponse.json({ ok: true, eventId: parsed.eventId });
}
