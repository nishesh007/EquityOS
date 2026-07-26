"use client";

import { Download, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Export infrastructure placeholder (Sprint 11E.2).
 * CSV / PDF generation ships in Sprint 11E.3 — buttons stay disabled.
 */
export function PaperExportPlaceholders() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <DisabledExportButton
        icon={Download}
        label="Export CSV"
        tooltip="Coming in Sprint 11E.3"
      />
      <DisabledExportButton
        icon={FileText}
        label="Export PDF"
        tooltip="Coming in Sprint 11E.3"
      />
    </div>
  );
}

function DisabledExportButton({
  icon: Icon,
  label,
  tooltip,
}: {
  icon: typeof Download;
  label: string;
  tooltip: string;
}) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        disabled
        aria-disabled="true"
        title={tooltip}
        className={cn(
          "inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-surface-border-subtle bg-surface-overlay/40 px-3 py-1.5 text-xs font-medium text-text-faint opacity-70"
        )}
      >
        <Icon className="h-3.5 w-3.5" />
        {label}
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-surface-border-subtle bg-surface px-2 py-1 text-[10px] text-text-secondary shadow-lg group-hover:block group-focus-within:block"
      >
        {tooltip}
      </span>
    </span>
  );
}
