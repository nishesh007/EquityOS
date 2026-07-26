"use client";

import { SettingsShell } from "@/components/saas";
import { InvoiceCard, SubscriptionSubNav } from "@/components/billing";
import { useInvoices } from "@/lib/billing";

export default function InvoicesPage() {
  const { invoices, downloadInvoice, emailInvoice, exportInvoicesCsv } =
    useInvoices();

  return (
    <SettingsShell
      title="Invoices"
      description="GST-aware tax invoices with download and email."
    >
      <SubscriptionSubNav />
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={exportInvoicesCsv}
          className="rounded-lg border border-surface-border-subtle px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Export CSV
        </button>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {invoices.map((inv) => (
          <InvoiceCard
            key={inv.id}
            invoice={inv}
            onDownload={() => downloadInvoice(inv.id)}
            onEmail={() => void emailInvoice(inv.id)}
          />
        ))}
        {invoices.length === 0 && (
          <p className="text-sm text-text-secondary">No invoices yet.</p>
        )}
      </div>
    </SettingsShell>
  );
}
