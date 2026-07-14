"use client";

import { ReportTableOfContents } from "@/components/dashboard/institutional/ReportTableOfContents";
import type { ReportViewerTocItem } from "@/lib/dashboard/institutional-report-viewer";

export function ReportNavigationSidebar({
  items,
  activeId,
  onNavigate,
  className = "",
}: {
  items: ReportViewerTocItem[];
  activeId?: string;
  onNavigate: (id: string) => void;
  className?: string;
}) {
  return (
    <aside
      className={`sticky top-0 max-h-[calc(100vh-2rem)] overflow-y-auto border-r border-surface-border-subtle/80 bg-surface-raised/40 px-3 py-4 ${className}`}
      data-testid="report-navigation-sidebar"
    >
      <ReportTableOfContents
        items={items}
        activeId={activeId}
        onNavigate={onNavigate}
      />
    </aside>
  );
}
