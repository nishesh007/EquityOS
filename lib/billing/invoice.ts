/**
 * Invoice + receipt generation — Sprint 12B (PDF as institutional text/PDF payload).
 */

import { computeGst, formatGstSummary, taxTotal } from "./gst";
import type {
  BillingProfile,
  InvoiceLineItem,
  InvoiceRecord,
  TransactionRecord,
} from "./types";
import { createId, nowIso } from "@/lib/saas/utils";

let invoiceSeq = 1000;

export function nextInvoiceNumber(): string {
  invoiceSeq += 1;
  const y = new Date().getUTCFullYear();
  return `EOS-${y}-${String(invoiceSeq).padStart(5, "0")}`;
}

export function buildInvoice(input: {
  userId: string;
  profile: BillingProfile;
  transaction: TransactionRecord;
  lineItems: InvoiceLineItem[];
  discount: number;
}): InvoiceRecord {
  const subtotal = input.lineItems.reduce((s, l) => s + l.amount, 0);
  const taxable = Math.max(0, subtotal - input.discount);
  const tax = computeGst({
    taxableAmount: taxable,
    state: input.profile.state,
    gstin: input.profile.gstin,
    kind: input.profile.invoiceKind,
  });
  const total = Math.round((taxable + taxTotal(tax)) * 100) / 100;
  const invoiceNumber = nextInvoiceNumber();
  const createdAt = nowIso();
  const pdfText = [
    "EQUITYOS TAX INVOICE",
    `Invoice: ${invoiceNumber}`,
    `Transaction: ${input.transaction.id}`,
    `Customer: ${input.profile.billingName}`,
    `Company: ${input.profile.companyName || "—"}`,
    `GSTIN: ${input.profile.gstin || "—"}`,
    `Address: ${input.profile.billingAddress}`,
    `Kind: ${input.profile.invoiceKind}`,
    "",
    ...input.lineItems.map(
      (l) => `${l.description} x${l.quantity} = ${l.amount.toFixed(2)} ${input.transaction.currency}`
    ),
    "",
    `Subtotal: ${subtotal.toFixed(2)}`,
    `Discount: ${input.discount.toFixed(2)}`,
    `Tax: ${formatGstSummary(tax)}`,
    `Total: ${total.toFixed(2)} ${input.transaction.currency}`,
    `Paid: ${input.transaction.updatedAt}`,
    `Method: ${input.transaction.gateway}`,
  ].join("\n");

  return {
    id: createId("inv"),
    invoiceNumber,
    userId: input.userId,
    transactionId: input.transaction.id,
    customerName: input.profile.billingName,
    companyName: input.profile.companyName,
    gstin: input.profile.gstin,
    billingAddress: input.profile.billingAddress,
    kind: input.profile.invoiceKind,
    currency: input.transaction.currency,
    lineItems: input.lineItems,
    subtotal,
    discount: input.discount,
    tax,
    total,
    paidAt: input.transaction.status === "succeeded" ? createdAt : null,
    paymentMethodLabel: input.transaction.gateway,
    pdfText,
    createdAt,
  };
}

export function downloadInvoiceBlob(invoice: InvoiceRecord): void {
  if (typeof window === "undefined") return;
  try {
    const blob = new Blob([invoice.pdfText], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${invoice.invoiceNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    // surfaced by caller
  }
}
