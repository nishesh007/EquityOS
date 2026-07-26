"use client";

import { memo, useState } from "react";
import type { ExportFormat } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const FORMATS: { id: ExportFormat; label: string }[] = [
  { id: "pdf", label: "PDF" },
  { id: "csv", label: "CSV" },
  { id: "excel", label: "Excel" },
  { id: "json", label: "JSON" },
];

export const ExportToolbar = memo(function ExportToolbar({
  onExport,
  disabled,
  message,
}: {
  onExport: (format: ExportFormat) => Promise<void> | void;
  disabled?: boolean;
  message?: string | null;
}) {
  const [busy, setBusy] = useState(false);

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      data-testid="export-toolbar"
      role="group"
      aria-label="Export strategies"
    >
      {FORMATS.map((f) => (
        <button
          key={f.id}
          type="button"
          disabled={disabled || busy}
          className={cn(
            "rounded-lg border border-surface-border-subtle px-3 py-1.5 text-xs font-medium text-text-secondary",
            "hover:bg-surface-raised disabled:opacity-50"
          )}
          onClick={async () => {
            setBusy(true);
            try {
              await onExport(f.id);
            } finally {
              setBusy(false);
            }
          }}
        >
          Export {f.label}
        </button>
      ))}
      {message && (
        <span className="text-xs text-text-secondary" role="status">
          {message}
        </span>
      )}
    </div>
  );
});
