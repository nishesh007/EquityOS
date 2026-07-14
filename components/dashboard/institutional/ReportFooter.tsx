"use client";

import type { ReportViewerFooter } from "@/lib/dashboard/institutional-report-viewer";

export function ReportFooter({ footer }: { footer: ReportViewerFooter }) {
  return (
    <footer
      data-testid="report-footer"
      className="space-y-2 border-t border-surface-border-subtle/80 pt-4"
    >
      <p className="text-[10px] leading-relaxed text-text-muted">{footer.disclaimer}</p>
      <p className="text-[10px] text-text-faint">{footer.copyright}</p>
      <p className="text-[10px] text-text-faint">{footer.aiNotice}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[9px] uppercase tracking-wider text-text-faint">
        <span>Validation · {footer.validationTimestamp}</span>
        <span>Trust · {footer.trustTimestamp}</span>
      </div>
    </footer>
  );
}
