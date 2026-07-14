"use client";

import { Share2 } from "lucide-react";

/**
 * Share Report — placeholder only. No backend implementation.
 */
export function ReportSharePlaceholder({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-md border border-dashed border-surface-border-subtle px-2.5 py-1.5 ${className}`}
      data-testid="report-share-placeholder"
    >
      <Share2 className="h-3.5 w-3.5 text-text-faint" />
      <div>
        <p className="text-[11px] font-medium text-text-secondary">Share Report</p>
        <p className="text-[9px] uppercase tracking-wider text-text-faint">
          Coming Soon
        </p>
      </div>
    </div>
  );
}
