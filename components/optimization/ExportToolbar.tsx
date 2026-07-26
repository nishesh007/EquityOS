"use client";

import { memo } from "react";
import { Download } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { ExportFormat } from "@/lib/analytics";
import type { ExportState } from "@/lib/optimization";

const FORMATS: { id: ExportFormat; label: string }[] = [
  { id: "csv", label: "CSV" },
  { id: "excel", label: "Excel" },
  { id: "json", label: "JSON" },
  { id: "pdf", label: "PDF" },
];

export interface ExportToolbarProps {
  disabled: boolean;
  exportState: ExportState;
  onExport: (format: ExportFormat) => void;
}

export const ExportToolbar = memo(function ExportToolbar({
  disabled,
  exportState,
  onExport,
}: ExportToolbarProps) {
  return (
    <Card hover={false} padding="sm" data-testid="export-toolbar">
      <CardHeader
        title="Exports"
        subtitle="CSV · Excel · JSON · PDF via shared analytics export contracts"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {FORMATS.map((f) => (
          <button
            key={f.id}
            type="button"
            disabled={disabled || exportState.busy}
            onClick={() => onExport(f.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
              disabled || exportState.busy
                ? "cursor-not-allowed border-surface-border-subtle text-text-faint opacity-50"
                : "border-surface-border-subtle bg-surface-overlay/50 text-text-secondary hover:bg-surface-hover hover:text-text-primary"
            )}
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            {f.label}
          </button>
        ))}
      </div>
      {exportState.lastMessage ? (
        <p
          role="status"
          className={cn(
            "mt-2 text-[11px]",
            exportState.lastMessage.toLowerCase().includes("fail")
              ? "text-loss"
              : "text-accent"
          )}
        >
          {exportState.lastMessage}
        </p>
      ) : null}
    </Card>
  );
});
