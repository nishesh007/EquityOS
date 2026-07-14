"use client";

import type { ExecutiveFooterView } from "@/lib/dashboard/institutional-executive-presentation";

export function ExecutiveFooter({ footer }: { footer: ExecutiveFooterView }) {
  return (
    <footer
      className="space-y-1 border-t border-surface-border-subtle/80 pt-3"
      data-testid="executive-footer"
    >
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[9px] uppercase tracking-wider text-text-faint">
        <span>Platform · {footer.platformVersion}</span>
        <span>Build · {footer.buildNumber}</span>
        <span>Env · {footer.environment}</span>
        <span>Updated · {footer.lastUpdated}</span>
      </div>
      <p className="text-[10px] text-text-faint">{footer.copyright}</p>
      <p className="text-[10px] leading-relaxed text-text-muted">
        {footer.institutionalNotice}
      </p>
    </footer>
  );
}
