"use client";

import { useState } from "react";
import { AdminShell, AuditTimeline, Panel } from "@/components/admin";
import { useAudit } from "@/lib/ops";
import { auditToCsv, downloadText } from "@/lib/ops/reporting";
import { filterAudit } from "@/lib/ops/audit";

export default function AdminAuditPage() {
  const { audit } = useAudit();
  const [q, setQ] = useState("");
  const filtered = filterAudit(audit, q);

  return (
    <AdminShell
      title="Audit"
      description="Immutable-style trail of auth, billing, license, and admin actions."
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <input
          className="w-full max-w-md rounded-lg border border-surface-border-subtle bg-surface-raised px-3 py-2 text-xs"
          placeholder="Filter audit log"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Filter audit"
        />
        <button
          type="button"
          className="rounded-lg border border-surface-border-subtle px-3 py-1.5 text-xs"
          onClick={() => downloadText("audit-logs.csv", auditToCsv(filtered))}
        >
          Export CSV
        </button>
      </div>
      <Panel title="Timeline">
        <AuditTimeline entries={filtered.slice(0, 100)} />
      </Panel>
    </AdminShell>
  );
}
