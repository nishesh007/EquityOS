/**
 * CSV / export helpers — Sprint 12B.
 */

import type {
  InvoiceRecord,
  RevenueAnalytics,
  TransactionRecord,
  UsageSnapshot,
} from "./types";

function csvEscape(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function transactionsToCsv(rows: TransactionRecord[]): string {
  const header = [
    "id",
    "gateway",
    "amount",
    "currency",
    "status",
    "date",
    "invoiceId",
    "externalId",
  ];
  const lines = rows.map((t) =>
    [
      t.id,
      t.gateway,
      t.amount,
      t.currency,
      t.status,
      t.createdAt,
      t.invoiceId,
      t.externalId,
    ]
      .map(csvEscape)
      .join(",")
  );
  return [header.join(","), ...lines].join("\n");
}

export function invoicesToCsv(rows: InvoiceRecord[]): string {
  const header = [
    "invoiceNumber",
    "customerName",
    "total",
    "currency",
    "gstin",
    "paidAt",
    "createdAt",
  ];
  const lines = rows.map((i) =>
    [
      i.invoiceNumber,
      i.customerName,
      i.total,
      i.currency,
      i.gstin,
      i.paidAt,
      i.createdAt,
    ]
      .map(csvEscape)
      .join(",")
  );
  return [header.join(","), ...lines].join("\n");
}

export function usageToCsv(snap: UsageSnapshot): string {
  const entries = Object.entries(snap).filter(
    ([k]) => !["userId", "periodStart", "periodEnd"].includes(k)
  );
  return ["metric,value", ...entries.map(([k, v]) => `${csvEscape(k)},${csvEscape(v as number)}`)].join(
    "\n"
  );
}

export function revenueToCsv(a: RevenueAnalytics): string {
  return [
    "metric,value",
    `mrr,${a.mrr}`,
    `arr,${a.arr}`,
    `activeSubscribers,${a.activeSubscribers}`,
    `churnRatePct,${a.churnRatePct}`,
    `renewalRatePct,${a.renewalRatePct}`,
    `arpu,${a.arpu}`,
    `ltv,${a.ltv}`,
    `paymentSuccessRatePct,${a.paymentSuccessRatePct}`,
    `lifetimeSpend,${a.lifetimeSpend}`,
    `totalSavings,${a.totalSavings}`,
  ].join("\n");
}

export function downloadCsv(filename: string, content: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
