/**
 * Webhook engine — signature, idempotency, audit — Sprint 12B.
 */

import { createHash } from "crypto";
import { getProvider } from "./providers/manager";
import type {
  PaymentGatewayId,
  WebhookEventRecord,
  WebhookEventType,
} from "./types";
import { createId, nowIso } from "@/lib/saas/utils";

const TYPE_MAP: Record<string, WebhookEventType> = {
  "payment.captured": "payment.success",
  "payment.failed": "payment.failed",
  "checkout.session.completed": "payment.success",
  "invoice.paid": "invoice.generated",
  "customer.subscription.created": "subscription.created",
  "customer.subscription.updated": "subscription.renewed",
  "customer.subscription.deleted": "subscription.cancelled",
  "charge.refunded": "refund.completed",
  "subscription.charged": "subscription.renewed",
};

export async function ingestWebhook(input: {
  gateway: PaymentGatewayId;
  rawBody: string;
  signature: string;
  existingEventIds: Set<string>;
}): Promise<{
  record: WebhookEventRecord;
  parsed: Awaited<ReturnType<ReturnType<typeof getProvider>["parseWebhookEvent"]>>;
}> {
  const provider = getProvider(input.gateway);
  const signatureValid = await provider.verifyWebhook({
    rawBody: input.rawBody,
    signature: input.signature,
  });
  const parsed = await provider.parseWebhookEvent(input.rawBody);
  const duplicate = input.existingEventIds.has(parsed.eventId);
  const payloadHash = createHash("sha256").update(input.rawBody).digest("hex");
  const mapped =
    TYPE_MAP[parsed.type] ??
    (parsed.type.includes("fail")
      ? "payment.failed"
      : parsed.type.includes("refund")
        ? "refund.completed"
        : "payment.success");

  const record: WebhookEventRecord = {
    id: createId("wh"),
    gateway: input.gateway,
    eventType: mapped,
    externalEventId: parsed.eventId,
    payloadHash,
    signatureValid,
    processed: false,
    duplicate,
    createdAt: nowIso(),
    error: signatureValid ? null : "Invalid webhook signature",
  };

  return { record, parsed };
}
